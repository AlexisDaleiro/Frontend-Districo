import 'dotenv/config';
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { ConfigService } from '@nestjs/config';
import { Prisma, Role } from '@prisma/client';
import { randomBytes, randomUUID } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PasswordRecoveryService } from '../../src/auth/password-recovery.service';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { openEmail } from '../../src/notifications/email-provider';

async function main() {
  if (process.env.RUN_RECOVERY_DB_TEST !== '1') throw new Error('Prueba aislada opt-in: configurar RUN_RECOVERY_DB_TEST=1.');
  const prisma = new PrismaService();
  const email = `recovery-qa-${randomUUID()}@example.invalid`;
  const key = randomBytes(32), oldPassword = randomBytes(16).toString('base64url'), newPassword = randomBytes(16).toString('base64url');
  const values: Record<string, string> = { EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 're_fixture_not_sent', EMAIL_FROM: 'test@example.invalid',
    EMAIL_PUBLIC_URL: 'https://store.example.invalid', EMAIL_ENCRYPTION_KEY: key.toString('base64'), EMAIL_DISPATCH_SECRET: randomBytes(32).toString('base64url'), BCRYPT_SALT_ROUNDS: '4' };
  const config = { get: (name: string) => values[name] } as ConfigService;
  const rolledBack = new Error('ROLLBACK_QA');
  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { email, passwordHash: await bcrypt.hash(oldPassword, 4), active: true, role: Role.ADMIN,
        mfaEnabledAt: new Date(), mfaSecretEncrypted: 'fixture-preserved-only' } });
      const expiresAt = new Date(Date.now() + 3600000);
      const session = await tx.authSession.create({ data: { userId: user.id, expiresAt } });
      await tx.refreshToken.create({ data: { userId: user.id, sessionId: session.id, tokenHash: 'fixture-hash', expiresAt } });
      await tx.refreshToken.create({ data: { userId: user.id, tokenHash: 'fixture-legacy-hash', expiresAt } });
      await tx.mfaChallenge.create({ data: { userId: user.id, expiresAt } });
      await tx.mfaRecoveryCode.create({ data: { userId: user.id, codeHash: randomUUID() } });
      const adapter = {
        user: tx.user, passwordResetToken: tx.passwordResetToken, authSession: tx.authSession,
        refreshToken: tx.refreshToken, mfaChallenge: tx.mfaChallenge, auditLog: tx.auditLog, notificationLog: tx.notificationLog,
        $transaction: <T>(run: (client: Prisma.TransactionClient) => Promise<T>) => run(tx),
      };
      const mail = new NotificationsService(adapter as never, config);
      const recovery = new PasswordRecoveryService(config, adapter as never, mail);
      assert.deepEqual(await recovery.request(email.toUpperCase()), { received: true });
      const log = await tx.notificationLog.findFirstOrThrow({ where: { event: 'password.reset_requested', recipient: email } });
      assert.equal(log.status, 'PENDING');
      const content = openEmail(log.encryptedMessage!, key, log.id);
      const token = new URL(content.text.split('\n')[1]).hash.slice('#token='.length);
      assert.equal(JSON.stringify(log).includes(token), false);
      const record = await tx.passwordResetToken.findFirstOrThrow({ where: { userId: user.id } });
      assert.notEqual(record.tokenHash, token);
      assert.deepEqual(await recovery.reset(token, newPassword), { success: true });
      const updated = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      assert.equal(await bcrypt.compare(newPassword, updated.passwordHash), true);
      assert.equal(await bcrypt.compare(oldPassword, updated.passwordHash), false);
      assert.equal(updated.mfaSecretEncrypted, user.mfaSecretEncrypted);
      assert.ok(updated.mfaEnabledAt);
      assert.equal(await tx.authSession.count({ where: { userId: user.id, revokedAt: null } }), 0);
      assert.equal(await tx.refreshToken.count({ where: { userId: user.id, revokedAt: null } }), 0);
      assert.equal(await tx.mfaChallenge.count({ where: { userId: user.id, consumedAt: null } }), 0);
      assert.equal(await tx.mfaRecoveryCode.count({ where: { userId: user.id, usedAt: null } }), 1);
      assert.equal(await tx.passwordResetToken.count({ where: { userId: user.id, consumedAt: null } }), 0);
      await assert.rejects(() => recovery.reset(token, oldPassword));
      const cancelled = await tx.notificationLog.findUniqueOrThrow({ where: { id: log.id } });
      assert.equal(cancelled.status, 'CANCELLED');
      assert.equal(cancelled.encryptedMessage, null);
      assert.equal(await tx.auditLog.count({ where: { userId: user.id, action: 'PASSWORD_RESET' } }), 1);
      const tables = await tx.$queryRaw<{ relname: string; relrowsecurity: boolean }[]>`SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('PasswordResetToken', 'NotificationLog')`;
      assert.equal(tables.length, 2);
      assert.ok(tables.every((table) => table.relrowsecurity));
      throw rolledBack;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 60000, maxWait: 15000 });
  } catch (error) {
    if (error !== rolledBack) throw error;
  } finally { await prisma.$disconnect(); }
  const verification = new PrismaService();
  try {
    assert.equal(await verification.user.count({ where: { email } }), 0);
    assert.equal(await verification.notificationLog.count({ where: { recipient: email } }), 0);
  } finally { await verification.$disconnect(); }
  console.log('Recuperacion, sesiones, MFA, auditoria y RLS verificados en Supabase. Fixtures revertidas; cero correos enviados.');
}

main().catch(() => { console.error('Fallo la verificacion aislada de recuperacion. No se imprimen datos ni secretos.'); process.exitCode = 1; });
