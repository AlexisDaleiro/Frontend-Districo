import { ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { Permission, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { AcceptStaffInvitationDto } from './dto/accept-staff-invitation.dto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { effectivePermissions } from '../common/business/account-access';
import { staffAccessMatrix } from '../common/staff-role-access';

export interface TokenPayload {
  sub: string;
  email: string;
  role: Role;
  permissions: Permission[];
  customerAccountId?: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.active) {
      throw new UnauthorizedException('Credenciales invalidas.');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales invalidas.');
    }

    return this.issueTokenPair({
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: effectivePermissions(user.role, user.customerAccount?.accountStatus, user.permissions.map((permission) => permission.permission)),
      customerAccountId: user.customerAccountId,
    });
  }

  async refresh(refreshToken: string) {
    let payload: TokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<TokenPayload>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret',
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalido.');
    }

    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    const stored = await this.findMatchingRefreshToken(tokens, refreshToken);
    if (!stored) {
      throw new ForbiddenException('Refresh token revocado o vencido.');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.active) {
      throw new UnauthorizedException('Usuario inactivo.');
    }

    return this.issueTokenPair({
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: effectivePermissions(user.role, user.customerAccount?.accountStatus, user.permissions.map((permission) => permission.permission)),
      customerAccountId: user.customerAccountId,
    });
  }

  async logout(refreshToken: string) {
    const tokens = await this.prisma.refreshToken.findMany({ where: { revokedAt: null } });
    const stored = await this.findMatchingRefreshToken(tokens, refreshToken);
    if (stored) {
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });
    }
    return { success: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    void dto;
    throw new ServiceUnavailableException('La recuperación automática no está disponible. Contactá a DISTRICO.');
  }

  async resetPassword(dto: ResetPasswordDto) {
    void dto;
    throw new ServiceUnavailableException('La recuperación automática no está disponible. Contactá a DISTRICO.');
  }

  async acceptStaffInvitation(dto: AcceptStaffInvitationDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const passwordHash = await bcrypt.hash(dto.password, Number(this.config.get<string>('BCRYPT_SALT_ROUNDS') ?? 10));
    return this.prisma.$transaction(async (tx) => {
      const invitation = await tx.staffInvitation.findUnique({
        where: { tokenHash },
        include: { user: { select: { id: true, email: true, role: true, active: true, emailVerified: true, customerAccountId: true } } },
      });
      if (!invitation || invitation.acceptedAt || invitation.revokedAt || invitation.expiresAt <= new Date() ||
          invitation.user.active || invitation.user.emailVerified || invitation.user.customerAccountId || invitation.user.role === Role.CLIENT) {
        throw new UnauthorizedException('Invitación inválida o vencida. Solicitá un enlace nuevo.');
      }
      const consumed = await tx.staffInvitation.updateMany({
        where: { id: invitation.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
        data: { acceptedAt: new Date() },
      });
      if (consumed.count !== 1) throw new UnauthorizedException('Invitación ya utilizada.');
      await tx.user.update({ where: { id: invitation.userId }, data: { passwordHash, active: true, emailVerified: true } });
      await tx.refreshToken.updateMany({ where: { userId: invitation.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.auditLog.create({ data: {
        action: 'STAFF_INVITATION_ACCEPTED', entityType: 'User', entityId: invitation.userId,
        userId: invitation.userId, metadata: { email: invitation.user.email, role: invitation.user.role },
      } });
      return { success: true };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async me(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    const { passwordHash: _passwordHash, ...safeUser } = user;
    const staffOverrides = user.role === Role.CLIENT ? [] : user.role === Role.CUSTOM && user.customRoleId
      ? await this.prisma.customStaffRoleAccess.findMany({ where: { roleId: user.customRoleId } })
      : await this.prisma.staffRoleAccess.findMany({ where: { role: user.role } });
    return {
      ...safeUser,
      staffAccess: user.role === Role.CLIENT ? undefined : staffAccessMatrix(user.role, staffOverrides),
      permissions: safeUser.permissions.filter((permission) =>
        effectivePermissions(user.role, user.customerAccount?.accountStatus, [permission.permission]).length > 0,
      ),
    };
  }

  private async issueTokenPair(payload: TokenPayload) {
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret',
      expiresIn: (this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m') as JwtSignOptions['expiresIn'],
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret',
      expiresIn: (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d') as JwtSignOptions['expiresIn'],
    });

    const tokenHash = await bcrypt.hash(refreshToken, Number(this.config.get<string>('BCRYPT_SALT_ROUNDS') ?? 10));
    await this.prisma.refreshToken.create({
      data: {
        userId: payload.sub,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken, user: payload };
  }

  private async findMatchingRefreshToken(tokens: { id: string; tokenHash: string }[], refreshToken: string) {
    for (const token of tokens) {
      if (await bcrypt.compare(refreshToken, token.tokenHash)) {
        return token;
      }
    }
    return null;
  }
}
