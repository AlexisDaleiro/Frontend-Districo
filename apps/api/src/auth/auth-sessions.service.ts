import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { TokenPayload } from './auth.service';
import { securityHash } from './mfa-crypto';

export type SessionToken = TokenPayload & { sid: string; jti: string; purpose: 'access' | 'refresh'; exp: number };

@Injectable()
export class AuthSessionsService {
  constructor(private readonly config: ConfigService, private readonly jwt: JwtService, private readonly prisma: PrismaService) {}

  private async tokens(payload: TokenPayload, sid: string) {
    const jti = randomUUID();
    const accessToken = await this.jwt.signAsync({ ...payload, sid, jti: randomUUID(), purpose: 'access' }, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret',
      expiresIn: (this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m') as JwtSignOptions['expiresIn'],
    });
    const refreshToken = await this.jwt.signAsync({ ...payload, sid, jti, purpose: 'refresh' }, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret',
      expiresIn: (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d') as JwtSignOptions['expiresIn'],
    });
    const expiresAt = new Date(this.jwt.decode<SessionToken>(refreshToken).exp * 1000);
    return { accessToken, refreshToken, jti, expiresAt };
  }

  async create(payload: TokenPayload, userAgent?: string, verified = false, transaction?: Prisma.TransactionClient) {
    const sid = randomUUID(), pair = await this.tokens(payload, sid);
    const save = async (tx: Prisma.TransactionClient) => {
      await tx.authSession.create({ data: { id: sid, userId: payload.sub, expiresAt: pair.expiresAt, userAgent: userAgent?.slice(0, 300), mfaVerifiedAt: verified ? new Date() : null } });
      await tx.refreshToken.create({ data: { id: pair.jti, userId: payload.sub, sessionId: sid, tokenHash: securityHash(pair.refreshToken), expiresAt: pair.expiresAt } });
    };
    if (transaction) await save(transaction); else await this.prisma.$transaction(save);
    return { accessToken: pair.accessToken, refreshToken: pair.refreshToken, user: payload };
  }

  async refresh(token: string, payloadOf: (id: string) => Promise<TokenPayload>) {
    const decoded = await this.verifyRefresh(token);
    const payload = await payloadOf(decoded.sub), pair = await this.tokens(payload, decoded.sid);
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.authSession.findFirst({ where: { id: decoded.sid, userId: decoded.sub, revokedAt: null, expiresAt: { gt: new Date() } }, include: { user: true } });
      if (!session || !session.user.active || session.user.mfaEnabledAt && (!session.mfaVerifiedAt || session.mfaVerifiedAt < session.user.mfaEnabledAt)) throw new UnauthorizedException('Sesión revocada.');
      const active = await tx.authSession.updateMany({ where: { id: session.id, revokedAt: null, expiresAt: { gt: new Date() } }, data: { lastSeenAt: new Date() } });
      if (!active.count) throw new UnauthorizedException('Sesión revocada.');
      const stored = await tx.refreshToken.findFirst({ where: { id: decoded.jti, userId: decoded.sub, sessionId: decoded.sid, revokedAt: null, expiresAt: { gt: new Date() } } });
      const hash = securityHash(token);
      if (!stored || stored.tokenHash.length !== hash.length || !timingSafeEqual(Buffer.from(stored.tokenHash), Buffer.from(hash))) throw new UnauthorizedException('Sesión inválida.');
      const consumed = await tx.refreshToken.updateMany({ where: { id: stored.id, revokedAt: null }, data: { revokedAt: new Date() } });
      if (consumed.count !== 1) throw new UnauthorizedException('Sesión ya renovada.');
      await tx.refreshToken.create({ data: { id: pair.jti, userId: decoded.sub, sessionId: decoded.sid, tokenHash: securityHash(pair.refreshToken), expiresAt: new Date(Math.min(pair.expiresAt.getTime(), session.expiresAt.getTime())) } });
      return { accessToken: pair.accessToken, refreshToken: pair.refreshToken, user: payload };
    });
  }

  private async verifyRefresh(token: string) {
    try {
      const payload = await this.jwt.verifyAsync<SessionToken>(token, { secret: this.config.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret' });
      if (!payload.sid || !payload.jti || payload.purpose !== 'refresh') throw new Error();
      return payload;
    } catch { throw new UnauthorizedException('Sesión inválida o vencida.'); }
  }

  async logout(token: string) {
    let payload: SessionToken;
    try { payload = await this.verifyRefresh(token); } catch { return { success: true }; }
    if (await this.prisma.authSession.findFirst({ where: { id: payload.sid, userId: payload.sub, revokedAt: null } })) await this.revoke(payload.sub, payload.sid);
    return { success: true };
  }

  async list(userId: string, sid: string) {
    const items = await this.prisma.authSession.findMany({ where: { userId, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: 'desc' }, select: { id: true, createdAt: true, lastSeenAt: true, expiresAt: true, userAgent: true, mfaVerifiedAt: true } });
    return items.map((session) => ({ ...session, current: session.id === sid }));
  }

  async revoke(userId: string, id: string, except?: string) {
    await this.prisma.$transaction(async (tx) => {
      const where: Prisma.AuthSessionWhereInput = { userId, revokedAt: null, ...(id === 'others' ? { id: { not: except } } : { id }) };
      if (id !== 'others' && !await tx.authSession.findFirst({ where })) throw new NotFoundException('Sesión no encontrada.');
      const sessions = await tx.authSession.findMany({ where, select: { id: true } });
      await tx.authSession.updateMany({ where, data: { revokedAt: new Date(), pendingMfaSecret: null, pendingMfaExpiresAt: null } });
      await tx.refreshToken.updateMany({ where: { sessionId: { in: sessions.map((s) => s.id) }, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.auditLog.create({ data: { userId, action: 'AUTH_SESSIONS_REVOKED', entityType: 'User', entityId: userId, metadata: { count: sessions.length } } });
    });
    return { success: true };
  }
}
