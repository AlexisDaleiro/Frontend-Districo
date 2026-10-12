import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { PasswordRecoveryService, resetTokenHash } from '../../src/auth/password-recovery.service';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { emailSettings, EmailDeliveryError, openEmail, sealEmail, sendResend } from '../../src/notifications/email-provider';
import { NotificationsController } from '../../src/notifications/notifications.controller';
import { notificationContent } from '../../src/notifications/email-templates';
import { redactSecurityFields } from '../../src/common/interceptors/sensitive-fields.interceptor';

const key = randomBytes(32);
function config(extra: Record<string, string | undefined> = {}) {
  const values: Record<string, string | undefined> = { EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 're_fixture_only',
  EMAIL_FROM: 'DISTRICO <onboarding@resend.dev>', EMAIL_PUBLIC_URL: 'https://store.example.test', EMAIL_ENCRYPTION_KEY: key.toString('base64'),
  EMAIL_WORKER_ENABLED: 'false', EMAIL_DISPATCH_SECRET: 'x'.repeat(40), BCRYPT_SALT_ROUNDS: '4', ...extra };
  return { get: (name: string) => values[name] } as ConfigService;
}

function fixture() {
  const user = { id: 'user-1', email: 'owner@example.test', active: true, passwordHash: 'old', mfaEnabledAt: new Date(), mfaSecretEncrypted: 'keep-mfa' };
  const tokens: { id: string; userId: string; tokenHash: string; expiresAt: Date; consumedAt: Date | null; createdAt: Date }[] = [];
  const messages: Record<string, unknown>[] = [];
  const writes: Record<string, unknown>[] = [];
  let rejectClaim = false;
  const tx = {
    user: { findUnique: async ({ where }: { where: { email: string } }) => where.email === user.email ? user : null,
      update: async ({ data }: { data: object }) => { Object.assign(user, data); return user; } },
    passwordResetToken: {
      findFirst: async () => tokens.find((item) => item.createdAt.getTime() > Date.now() - 60000) ?? null,
      create: async ({ data }: { data: { userId: string; tokenHash: string; expiresAt: Date } }) => {
        const row = { ...data, id: `token-${tokens.length}`, createdAt: new Date(), consumedAt: null }; tokens.push(row); return row;
      },
      findUnique: async ({ where }: { where: { tokenHash: string } }) => {
        const row = tokens.find((item) => item.tokenHash === where.tokenHash); return row ? { ...row, user } : null;
      },
      updateMany: async ({ where, data }: { where: { id?: string; userId?: string }; data: { consumedAt: Date } }) => {
        if (where.id && rejectClaim) return { count: 0 };
        const rows = tokens.filter((row) => !row.consumedAt && (!where.id || row.id === where.id) && (!where.userId || row.userId === where.userId));
        rows.forEach((row) => Object.assign(row, data)); return { count: rows.length };
      },
    },
    notificationLog: { create: async ({ data }: { data: Record<string, unknown> }) => { messages.push(data); return data; }, updateMany: async (data: object) => { writes.push({ entity: 'notification', ...data }); return { count: 1 }; } },
    authSession: { updateMany: async (data: object) => { writes.push({ entity: 'sessions', ...data }); return { count: 2 }; } },
    refreshToken: { updateMany: async (data: object) => { writes.push({ entity: 'refresh', ...data }); return { count: 3 }; } },
    mfaChallenge: { updateMany: async (data: object) => { writes.push({ entity: 'mfa', ...data }); return { count: 1 }; } },
    auditLog: { create: async (data: object) => { writes.push({ entity: 'audit', ...data }); } },
  };
  const prisma = { ...tx, $transaction: async <T>(run: (client: typeof tx) => Promise<T>) => run(tx) };
  const mail = new NotificationsService(prisma as never, config());
  const recovery = new PasswordRecoveryService(config(), prisma as never, mail);
  return { user, tokens, messages, writes, prisma, mail, recovery, rejectClaim: () => { rejectClaim = true; } };
}

test('email configuration fails closed for missing keys, insecure production origins and missing dispatcher', () => {
  assert.equal(emailSettings(config()).ready, true);
  for (const extra of [{ RESEND_API_KEY: '' }, { EMAIL_ENCRYPTION_KEY: '' }, { EMAIL_PUBLIC_URL: 'http://attacker.test' },
    { EMAIL_PUBLIC_URL: 'https://store.example.test/path' }, { EMAIL_PUBLIC_URL: 'https://user:password@store.example.test' },
    { NODE_ENV: 'production', EMAIL_PUBLIC_URL: 'http://localhost:3002' }, { EMAIL_DISPATCH_SECRET: '' }]) assert.equal(emailSettings(config(extra)).ready, false, JSON.stringify(extra));
});

test('absent or partial email configuration disables both recovery steps without querying the database', async () => {
  const absent = { get: () => undefined } as unknown as ConfigService;
  for (const settings of [absent, config({ RESEND_API_KEY: '' }), config({ EMAIL_ENCRYPTION_KEY: '' }), config({ EMAIL_DISPATCH_SECRET: '' })]) {
    const mail = new NotificationsService({} as never, settings);
    const recovery = new PasswordRecoveryService(settings, {} as never, mail);
    await assert.rejects(() => recovery.request('owner@example.test'), ServiceUnavailableException);
    await assert.rejects(() => recovery.reset('r'.repeat(43), 'NewPassword123!'), ServiceUnavailableException);
    assert.deepEqual(await mail.dispatch(), { processed: 0 });
    mail.onModuleInit();
    assert.equal((mail as unknown as { timer?: unknown }).timer, undefined);
    mail.onModuleDestroy();
  }
});

test('Vercel never starts the persistent email worker even when the local setting is true', () => {
  const original = process.env.VERCEL;
  try {
    process.env.VERCEL = '1';
    const settings = config({ EMAIL_WORKER_ENABLED: 'true', EMAIL_DISPATCH_SECRET: '' });
    assert.equal(emailSettings(settings).worker, false);
    assert.equal(emailSettings(settings).ready, false);
    const mail = new NotificationsService({} as never, settings);
    mail.onModuleInit();
    assert.equal((mail as unknown as { timer?: unknown }).timer, undefined);
    mail.onModuleDestroy();
  } finally {
    if (original === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = original;
  }
});

test('recovery normalizes email, queues encrypted single-use links, hides tokens and suppresses repeated requests', async () => {
  const f = fixture();
  assert.deepEqual(await f.recovery.request(' OWNER@example.test '), { received: true });
  const log = f.messages[0];
  const message = openEmail(log.encryptedMessage as string, key, log.id as string);
  const raw = new URL(message.text.split('\n')[1]).hash.slice('#token='.length);
  assert.equal(raw.length, 43);
  assert.equal(f.tokens[0].tokenHash, resetTokenHash(raw));
  assert.ok(f.tokens[0].expiresAt.getTime() > Date.now() + 29 * 60000);
  assert.equal(JSON.stringify(f.tokens).includes(raw), false);
  assert.equal(JSON.stringify(f.messages).includes(raw), false);
  assert.deepEqual(await f.recovery.request('missing@example.test'), { received: true });
  assert.deepEqual(await f.recovery.request('owner@example.test'), { received: true });
  f.user.active = false;
  assert.deepEqual(await f.recovery.request('owner@example.test'), { received: true });
  assert.equal(f.messages.length, 1);
});

test('email ciphertext is bound to its row and authenticated against tampering', () => {
  const message = { from: 'test', to: ['owner@example.test'], subject: 'Reset', text: 'sensitive-link' };
  const value = sealEmail(message, key, 'first');
  assert.deepEqual(openEmail(value, key, 'first'), message);
  assert.throws(() => openEmail(value, key, 'second'));
  assert.throws(() => openEmail(value, randomBytes(32), 'first'));
  assert.equal(value.includes('sensitive-link'), false);
  assert.deepEqual(redactSecurityFields({ encryptedMessage: value, passwordResetTokens: [{ tokenHash: 'hidden' }], acceptedAt: null }), { acceptedAt: null });
});

test('reset changes only password, consumes all links, revokes sessions and challenges, preserves MFA and prevents replay', async () => {
  const f = fixture(), token = randomBytes(32).toString('base64url');
  f.tokens.push({ id: 'valid', userId: f.user.id, tokenHash: resetTokenHash(token), expiresAt: new Date(Date.now() + 60000), consumedAt: null, createdAt: new Date() });
  f.tokens.push({ ...f.tokens[0], id: 'other', tokenHash: 'other-hash' });
  assert.deepEqual(await f.recovery.reset(token, 'NewPassword123!'), { success: true });
  assert.equal(await bcrypt.compare('NewPassword123!', f.user.passwordHash), true);
  assert.equal(f.tokens.filter((item) => !item.consumedAt).length, 0);
  assert.equal(f.user.mfaSecretEncrypted, 'keep-mfa');
  assert.ok(f.user.mfaEnabledAt);
  for (const entity of ['sessions', 'refresh', 'mfa', 'audit']) assert.ok(f.writes.some((write) => write.entity === entity));
  const sessionWrite = f.writes.find((write) => write.entity === 'sessions')!;
  assert.deepEqual((sessionWrite as { where: object }).where, { userId: 'user-1', revokedAt: null });
  assert.equal((sessionWrite as { data: { pendingMfaSecret: unknown } }).data.pendingMfaSecret, null);
  await assert.rejects(() => f.recovery.reset(token, 'DifferentPassword!'), BadRequestException);
});

test('expired, inactive, concurrent lost claims and oversized UTF-8 passwords cannot change a password', async () => {
  for (const scenario of ['expired', 'inactive', 'lost-claim', 'utf8', 'malformed']) {
    const f = fixture(), token = randomBytes(32).toString('base64url');
    f.tokens.push({ id: 'valid', userId: f.user.id, tokenHash: resetTokenHash(token), expiresAt: new Date(Date.now() + (scenario === 'expired' ? -1 : 60000)), consumedAt: null, createdAt: new Date() });
    if (scenario === 'inactive') f.user.active = false;
    if (scenario === 'lost-claim') f.rejectClaim();
    await assert.rejects(() => f.recovery.reset(scenario === 'malformed' ? 'wrong' : token, scenario === 'utf8' ? 'ñ'.repeat(40) : 'NewPassword123!'), BadRequestException);
    assert.equal(f.user.passwordHash, 'old');
    assert.equal(f.writes.length, 0);
  }
});

test('Resend uses a stable idempotency key, bounded timeout and sanitized retryable errors', async () => {
  const original = global.fetch;
  const message = { from: 'test', to: ['owner@example.test'], subject: 'Reset', text: 'sensitive-link' };
  try {
    global.fetch = (async (url, options) => {
      assert.equal(url, 'https://api.resend.com/emails');
      assert.equal((options!.headers as Record<string, string>)['Idempotency-Key'], 'districo/log-1');
      assert.ok(options!.signal); return new Response('{}', { status: 200 });
    }) as typeof fetch;
    await sendResend(message, 'secret', 'log-1');
    for (const [status, retryable] of [[403, false], [429, true], [503, true]] as const) {
      global.fetch = (async () => new Response('secret and sensitive-link', { status })) as typeof fetch;
      await assert.rejects(() => sendResend(message, 'secret', 'log-1'), (error: unknown) =>
        error instanceof EmailDeliveryError && error.code === `HTTP_${status}` && error.retryable === retryable && !error.message.includes('sensitive-link'));
    }
  } finally { global.fetch = original; }
});

test('ordinary notification failures never fail committed business operations, disabled delivery is honest', async () => {
  let data: Record<string, unknown> = {};
  const disabled = new NotificationsService({ notificationLog: { create: async (input: { data: typeof data }) => { data = input.data; } } } as never, config({ RESEND_API_KEY: '' }));
  await disabled.notify('order.received', 'owner@example.test', { orderId: 'o1' });
  assert.equal(data.status, 'DISABLED');
  const failed = new NotificationsService({ notificationLog: { create: async () => { throw new Error('private'); } } } as never, config());
  assert.equal(await failed.notify('order.received', 'owner@example.test'), undefined);
  const absent = new NotificationsService({ notificationLog: { create: async () => { throw new Error('schema not migrated'); } } } as never,
    { get: () => undefined } as unknown as ConfigService);
  assert.equal(await absent.notify('order.received', 'owner@example.test'), undefined);
  assert.equal(notificationContent('order.shipped', { orderId: 'o1' }, 'https://store.example.test')?.subject, 'DISTRICO: pedido en camino');
});

test('outbox accepts only a successfully claimed row, retries failures and wipes accepted content', async () => {
  const original = global.fetch;
  try {
    for (const status of [200, 429, 403]) {
      const row = { id: 'log-1', attempts: 0, expiresAt: new Date(Date.now() + 60000), encryptedMessage: sealEmail({ from: 'test', to: ['owner@example.test'], subject: 'Test', text: 'secret' }, key, 'log-1') };
      const updates: { where: Record<string, unknown>; data: Record<string, unknown> }[] = [];
      const prisma = { notificationLog: { findMany: async () => [row], updateMany: async (input: typeof updates[number]) => { updates.push(input); return { count: 1 }; } } };
      global.fetch = (async () => new Response('{}', { status })) as typeof fetch;
      const mail = new NotificationsService(prisma as never, config());
      assert.deepEqual(await mail.dispatch(), { processed: 1 });
      const last = updates.at(-1)!.data;
      assert.equal(last.status, status === 200 ? 'ACCEPTED' : status === 429 ? 'PENDING' : 'FAILED');
      if (status !== 429) assert.equal(last.encryptedMessage, null);
      if (status === 200) assert.ok(last.acceptedAt);
      else assert.equal(last.errorCode, `HTTP_${status}`);
    }
    let sent = false;
    global.fetch = (async () => { sent = true; return new Response(); }) as typeof fetch;
    const mail = new NotificationsService({ notificationLog: { findMany: async () => [{ id: 'lost' }], updateMany: async () => ({ count: 0 }) } } as never, config());
    assert.deepEqual(await mail.dispatch(), { processed: 0 });
    assert.equal(sent, false);
  } finally { global.fetch = original; }
});

test('internal dispatcher is inaccessible without the dedicated secret', async () => {
  const controller = new NotificationsController({ settings: () => ({ dispatchSecret: 's'.repeat(40) }), dispatch: async () => ({ processed: 0 }) } as never);
  await assert.rejects(() => controller.dispatch());
  await assert.rejects(() => controller.dispatch('Bearer wrong'));
  assert.deepEqual(await controller.dispatch(`Bearer ${'s'.repeat(40)}`), { processed: 0 });
});
