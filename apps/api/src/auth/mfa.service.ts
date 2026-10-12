import { ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { toDataURL } from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { decryptMfa, encryptMfa, securityHash } from './mfa-crypto';

@Injectable()
export class MfaService {
  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService) {}
  private key() {
    const value = this.config.get<string>('MFA_ENCRYPTION_KEY');
    const bytes = Buffer.from(value ?? '', 'base64');
    if (bytes.length !== 32) throw new ServiceUnavailableException('La clave privada de doble factor no está configurada.');
    return bytes;
  }
  private decrypt(value: string, userId: string) {
    try { return decryptMfa(value, this.key(), userId); }
    catch { throw new ServiceUnavailableException('No se pudo leer la configuración de doble factor.'); }
  }
  async status(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { role: true, mfaEnabledAt: true } });
    return { enabled: !!user.mfaEnabledAt, available: user.role === Role.ADMIN, configured: Buffer.from(this.config.get<string>('MFA_ENCRYPTION_KEY') ?? '', 'base64').length === 32, recoveryCodesRemaining: await this.prisma.mfaRecoveryCode.count({ where: { userId, usedAt: null } }) };
  }
  async setup(userId: string, sid: string, password: string) {
    const user = await this.password(userId, password);
    if (user.role !== Role.ADMIN || user.mfaEnabledAt) throw new ForbiddenException('El doble factor opcional está disponible para administradores sin configuración activa.');
    const { generateSecret, generateURI } = await import('otplib');
    const secret = generateSecret(), encrypted = encryptMfa(secret, this.key(), userId);
    const saved = await this.prisma.authSession.updateMany({ where: { id: sid, userId, revokedAt: null, expiresAt: { gt: new Date() } }, data: { pendingMfaSecret: encrypted, pendingMfaExpiresAt: new Date(Date.now() + 10 * 60000) } });
    if (!saved.count) throw new UnauthorizedException();
    const uri = generateURI({ issuer: 'DISTRICO', label: user.email, secret });
    return { manualKey: secret, qrDataUrl: await toDataURL(uri, { width: 240, margin: 1 }) };
  }
  async enable(userId: string, sid: string, code: string) {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.authSession.findFirst({ where: { id: sid, userId, revokedAt: null, expiresAt: { gt: new Date() }, pendingMfaExpiresAt: { gt: new Date() } } });
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!session?.pendingMfaSecret || !user?.active || user.role !== Role.ADMIN || user.mfaEnabledAt) throw new UnauthorizedException('La configuración venció. Volvé a iniciarla.');
      const token = code.replace(/\s/g, '');
      if (!/^\d{6}$/.test(token)) throw new UnauthorizedException('Ingresá el código de seis dígitos de la app.');
      const { verify } = await import('otplib');
      const verified = await verify({ secret: this.decrypt(session.pendingMfaSecret, userId), token, epochTolerance: 30 });
      if (!verified.valid || !('timeStep' in verified)) throw new UnauthorizedException('Código incorrecto.');
      const now = new Date();
      const consumed = await tx.authSession.updateMany({ where: { id: sid, userId, revokedAt: null, expiresAt: { gt: now }, pendingMfaSecret: session.pendingMfaSecret, pendingMfaExpiresAt: { gt: now } }, data: { mfaVerifiedAt: now, pendingMfaSecret: null, pendingMfaExpiresAt: null } });
      if (!consumed.count) throw new UnauthorizedException('La configuración venció. Volvé a iniciarla.');
      const enabled = await tx.user.updateMany({ where: { id: userId, mfaEnabledAt: null }, data: { mfaSecretEncrypted: session.pendingMfaSecret, mfaEnabledAt: now, mfaLastStep: verified.timeStep } });
      if (!enabled.count) throw new UnauthorizedException('El doble factor ya fue configurado.');
      await this.revokeOthers(tx, userId, sid);
      const recoveryCodes = await this.recoveryCodes(tx, userId);
      await tx.auditLog.create({ data: { userId, action: 'MFA_ENABLED', entityType: 'User', entityId: userId } });
      return { recoveryCodes };
    });
  }
  async verifyCode(tx: Prisma.TransactionClient, userId: string, code: string) {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user?.active || !user.mfaEnabledAt || !user.mfaSecretEncrypted) throw new UnauthorizedException('Doble factor no disponible.');
    const token = code.replace(/[\s-]/g, '').toUpperCase();
    if (/^[A-F0-9]{32}$/.test(token)) {
      const consumed = await tx.mfaRecoveryCode.updateMany({ where: { userId, codeHash: securityHash(token), usedAt: null }, data: { usedAt: new Date() } });
      if (consumed.count !== 1) throw new UnauthorizedException('Código inválido o ya utilizado.');
      return;
    }
    if (!/^\d{6}$/.test(token)) throw new UnauthorizedException('Código incorrecto.');
    const { verify } = await import('otplib');
    const result = await verify({ secret: this.decrypt(user.mfaSecretEncrypted, userId), token, epochTolerance: 30, ...(user.mfaLastStep != null ? { afterTimeStep: user.mfaLastStep } : {}) });
    if (!result.valid || !('timeStep' in result)) throw new UnauthorizedException('Código incorrecto o ya utilizado. Esperá al siguiente código.');
    const consumed = await tx.user.updateMany({ where: { id: userId, mfaSecretEncrypted: user.mfaSecretEncrypted, OR: [{ mfaLastStep: null }, { mfaLastStep: { lt: result.timeStep } }] }, data: { mfaLastStep: result.timeStep } });
    if (consumed.count !== 1) throw new UnauthorizedException('Código ya utilizado.');
  }
  async change(userId: string, sid: string, password: string, code: string, disable: boolean) {
    await this.password(userId, password);
    return this.prisma.$transaction(async (tx) => {
      await this.verifyCode(tx, userId, code);
      if (disable) {
        await tx.user.update({ where: { id: userId }, data: { mfaSecretEncrypted: null, mfaEnabledAt: null, mfaLastStep: null } });
        await tx.mfaRecoveryCode.deleteMany({ where: { userId } });
      }
      await this.revokeOthers(tx, userId, sid);
      await tx.auditLog.create({ data: { userId, action: disable ? 'MFA_DISABLED' : 'MFA_RECOVERY_REGENERATED', entityType: 'User', entityId: userId } });
      return disable ? { success: true } : { recoveryCodes: await this.recoveryCodes(tx, userId) };
    });
  }
  private async password(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.active || !await bcrypt.compare(password, user.passwordHash)) throw new UnauthorizedException('Contraseña incorrecta.');
    return user;
  }
  private async recoveryCodes(tx: Prisma.TransactionClient, userId: string) {
    const codes = Array.from({ length: 8 }, () => randomBytes(16).toString('hex').toUpperCase());
    await tx.mfaRecoveryCode.deleteMany({ where: { userId } });
    await tx.mfaRecoveryCode.createMany({ data: codes.map((code) => ({ userId, codeHash: securityHash(code) })) });
    return codes.map((code) => code.match(/.{8}/g)!.join('-'));
  }
  private async revokeOthers(tx: Prisma.TransactionClient, userId: string, sid: string) {
    await tx.authSession.updateMany({ where: { userId, id: { not: sid }, revokedAt: null }, data: { revokedAt: new Date(), pendingMfaSecret: null, pendingMfaExpiresAt: null } });
    await tx.refreshToken.updateMany({ where: { userId, sessionId: { not: sid }, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.mfaChallenge.updateMany({ where: { userId, consumedAt: null }, data: { consumedAt: new Date() } });
  }
}
