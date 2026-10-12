import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const invalidLink = () => new BadRequestException('El enlace es inválido, ya fue usado o venció. Solicitá uno nuevo.');
const recoveryUnavailable = () => new ServiceUnavailableException({ code: 'PASSWORD_RECOVERY_UNAVAILABLE',
  message: 'La recuperación por correo no está configurada. Contactá a DISTRICO.' });
export const resetTokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class PasswordRecoveryService {
  private readonly logger = new Logger(PasswordRecoveryService.name);
  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService) {}

  async request(email: string) {
    if (!this.notifications.settings().ready) throw recoveryUnavailable();
    const started = Date.now();
    const minimumDuration = 700 + randomInt(100);
    try {
      await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true, email: true, active: true } });
        if (!user?.active) return;
        const recent = await tx.passwordResetToken.findFirst({ where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 60000) } } });
        if (recent) return;
        const token = randomBytes(32).toString('base64url');
        const expiresAt = new Date(Date.now() + 30 * 60000);
        await tx.passwordResetToken.create({ data: { userId: user.id, tokenHash: resetTokenHash(token), expiresAt } });
        const link = `${this.notifications.settings().origin}/tienda/recuperar-acceso#token=${token}`;
        await this.notifications.enqueue('password.reset_requested', user.email, {
          subject: 'DISTRICO: recuperá tu contraseña',
          text: `Para elegir una nueva contraseña abrí este enlace:\n${link}\n\nVence en 30 minutos y sólo se puede usar una vez. Si no lo pediste, ignorá este correo. Tu contraseña no cambió.`,
        }, { userId: user.id }, tx, expiresAt);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch {
      // No account-existence signal, and no reset link in API responses or logs.
      this.logger.warn('PASSWORD_RECOVERY_ENQUEUE_FAILED');
    } finally {
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, minimumDuration - (Date.now() - started))));
    }
    return { received: true };
  }

  async reset(token: string, password: string) {
    if (!this.notifications.settings().ready) throw recoveryUnavailable();
    if (!/^[a-zA-Z0-9_-]{43}$/.test(token)) throw invalidLink();
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72)
      throw new BadRequestException('Usá una contraseña de al menos 8 caracteres y hasta 72 bytes.');
    const tokenHash = resetTokenHash(token);
    const candidate = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!candidate || candidate.consumedAt || candidate.expiresAt <= new Date()) throw invalidLink();
    const passwordHash = await bcrypt.hash(password, Number(this.config.get<string>('BCRYPT_SALT_ROUNDS') ?? 10));
    let email: string;
    try {
      email = await this.prisma.$transaction(async (tx) => {
        const current = await tx.passwordResetToken.findUnique({ where: { tokenHash }, include: { user: { select: { id: true, email: true, active: true } } } });
        const now = new Date();
        if (!current || !current.user.active || current.consumedAt || current.expiresAt <= now) throw invalidLink();
        const claimed = await tx.passwordResetToken.updateMany({ where: { id: current.id, consumedAt: null, expiresAt: { gt: now } }, data: { consumedAt: now } });
        if (claimed.count !== 1) throw invalidLink();
        await tx.user.update({ where: { id: current.userId }, data: { passwordHash } });
        await tx.passwordResetToken.updateMany({ where: { userId: current.userId, consumedAt: null }, data: { consumedAt: now } });
        await tx.authSession.updateMany({ where: { userId: current.userId, revokedAt: null }, data: { revokedAt: now, pendingMfaSecret: null, pendingMfaExpiresAt: null } });
        await tx.refreshToken.updateMany({ where: { userId: current.userId, revokedAt: null }, data: { revokedAt: now } });
        await tx.mfaChallenge.updateMany({ where: { userId: current.userId, consumedAt: null }, data: { consumedAt: now } });
        await tx.notificationLog.updateMany({ where: { event: 'password.reset_requested', status: 'PENDING', payload: { path: ['userId'], equals: current.userId } },
          data: { status: 'CANCELLED', encryptedMessage: null, errorCode: 'USED' } });
        await tx.auditLog.create({ data: { action: 'PASSWORD_RESET', entityType: 'User', entityId: current.userId, userId: current.userId } });
        return current.user.email;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') throw invalidLink();
      throw error;
    }
    // MFA secrets and recovery codes are deliberately preserved.
    try {
      await this.notifications.enqueue('password.changed', email, { subject: 'DISTRICO: contraseña actualizada',
        text: 'Tu contraseña fue actualizada y se cerraron tus sesiones. Si no hiciste este cambio, contactá a DISTRICO de inmediato.' });
    } catch { this.logger.warn('PASSWORD_CHANGED_EMAIL_FAILED'); }
    return { success: true };
  }
}
