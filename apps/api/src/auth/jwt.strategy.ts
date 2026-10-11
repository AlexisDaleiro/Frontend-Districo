import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtUser } from '../common/types/jwt-user.type';
import { effectivePermissions } from '../common/business/account-access';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export const accessSessionSelect = {
  id: true, lastSeenAt: true, mfaVerifiedAt: true,
  user: { select: {
    id: true, email: true, role: true, active: true, customRoleId: true,
    customerAccountId: true, mfaEnabledAt: true,
    permissions: { select: { permission: true } },
    customerAccount: { select: { accountStatus: true } },
  } },
} satisfies Prisma.AuthSessionSelect;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret',
    });
  }

  async validate(payload: JwtUser): Promise<JwtUser> {
    if (typeof payload.sub !== 'string' || !payload.sub || typeof payload.sid !== 'string' || !payload.sid || payload.purpose !== 'access') throw new UnauthorizedException();
    // One current database snapshot, without loading the full account profile.
    const session = await this.prisma.authSession.findFirst({
      relationLoadStrategy: 'join',
      where: { id: payload.sid, userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } },
      select: accessSessionSelect,
    });
    const user = session?.user;
    if (!user || !user.active) {
      throw new UnauthorizedException();
    }
    if (!session || user.mfaEnabledAt && (!session.mfaVerifiedAt || session.mfaVerifiedAt < user.mfaEnabledAt)) throw new UnauthorizedException();
    if (session.lastSeenAt.getTime() < Date.now() - 5 * 60000) await this.prisma.authSession.updateMany({ where: { id: session.id, revokedAt: null }, data: { lastSeenAt: new Date() } });
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      customRoleId: user.customRoleId,
      permissions: effectivePermissions(
        user.role,
        user.customerAccount?.accountStatus,
        user.permissions.map((permission) => permission.permission),
      ),
      customerAccountId: user.customerAccountId,
      sid: session.id,
      purpose: 'access',
    };
  }
}
