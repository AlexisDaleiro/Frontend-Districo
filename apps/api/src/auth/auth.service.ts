import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
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
import { AuthSessionsService } from './auth-sessions.service';
import { MfaService } from './mfa.service';
import { JwtUser } from '../common/types/jwt-user.type';
import { PasswordRecoveryService } from './password-recovery.service';

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
    private readonly sessions: AuthSessionsService = new AuthSessionsService(config, jwtService, prisma),
    private readonly mfa: MfaService = new MfaService(config, prisma),
    private readonly recovery?: PasswordRecoveryService,
  ) {}

  async login(dto: LoginDto, userAgent?: string) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.active) {
      throw new UnauthorizedException('Credenciales invalidas.');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales invalidas.');
    }

    if (user.mfaEnabledAt) {
      const challenge = await this.prisma.mfaChallenge.create({ data: { userId: user.id, expiresAt: new Date(Date.now() + 5 * 60000) } });
      const challengeToken = await this.jwtService.signAsync({ sub: user.id, jti: challenge.id, purpose: 'mfa' }, { secret: this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret', expiresIn: '5m' });
      return { mfaRequired: true, challengeToken };
    }
    return this.sessions.create(this.payload(user), userAgent);
  }

  async refresh(refreshToken: string) {
    return this.sessions.refresh(refreshToken, async (id) => {
      const user = await this.usersService.findById(id);
      if (!user?.active) throw new UnauthorizedException('Usuario inactivo.');
      return this.payload(user);
    });
  }

  async logout(refreshToken: string) {
    return this.sessions.logout(refreshToken);
  }

  async verifyMfa(challengeToken: string, code: string, userAgent?: string) {
    let payload: { sub: string; jti: string; purpose: string };
    try {
      payload = await this.jwtService.verifyAsync(challengeToken, { secret: this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret' });
      if (!payload.sub || !payload.jti || payload.purpose !== 'mfa') throw new Error();
    } catch { throw new UnauthorizedException('El acceso venció. Ingresá nuevamente.'); }
    const attempted = await this.prisma.mfaChallenge.updateMany({ where: { id: payload.jti, userId: payload.sub, consumedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: 5 } }, data: { attempts: { increment: 1 } } });
    if (!attempted.count) throw new UnauthorizedException('El acceso venció. Ingresá nuevamente.');
    return this.prisma.$transaction(async (tx) => {
      await this.mfa.verifyCode(tx, payload.sub, code);
      const consumed = await tx.mfaChallenge.updateMany({ where: { id: payload.jti, userId: payload.sub, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
      if (!consumed.count) throw new UnauthorizedException('Acceso ya utilizado.');
      const user = await this.usersService.findById(payload.sub);
      if (!user?.active) throw new UnauthorizedException();
      return this.sessions.create(this.payload(user), userAgent, true, tx);
    });
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    if (!this.recovery) throw new ServiceUnavailableException('La recuperación por correo no está configurada.');
    return this.recovery.request(dto.email);
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (!this.recovery) throw new ServiceUnavailableException('La recuperación por correo no está configurada.');
    return this.recovery.reset(dto.resetToken, dto.password);
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

  private profileOverrides(user: Pick<JwtUser, 'role' | 'customRoleId'>) {
    return user.role === Role.CLIENT ? Promise.resolve([]) : user.role === Role.CUSTOM && user.customRoleId
      ? this.prisma.customStaffRoleAccess.findMany({ where: { roleId: user.customRoleId } })
      : this.prisma.staffRoleAccess.findMany({ where: { role: user.role } });
  }

  async me(input: string | JwtUser) {
    const actor = typeof input === 'string' ? undefined : input;
    const userId = typeof input === 'string' ? input : input.sub;
    const [user, prepared] = await Promise.all([
      this.usersService.findById(userId),
      actor ? this.profileOverrides(actor) : Promise.resolve(undefined),
    ]);
    if (!user || !user.active) {
      throw new UnauthorizedException();
    }
    const { passwordHash: _passwordHash, mfaSecretEncrypted: _mfaSecret, mfaLastStep: _step, ...safeUser } = user;
    const { internalCreditNote: _note, ...account } = user.customerAccount ?? {};
    // If the assignment changed during this request, reload the matching rights.
    const staffOverrides = prepared && user.role === actor?.role && user.customRoleId === actor.customRoleId
      ? prepared : await this.profileOverrides(user);
    return {
      ...safeUser,
      customerAccount: user.customerAccount ? account : null,
      staffAccess: user.role === Role.CLIENT ? undefined : staffAccessMatrix(user.role, staffOverrides),
      permissions: safeUser.permissions.filter((permission) =>
        effectivePermissions(user.role, user.customerAccount?.accountStatus, [permission.permission]).length > 0,
      ),
    };
  }

  private payload(user: NonNullable<Awaited<ReturnType<UsersService['findById']>>>): TokenPayload {
    return { sub: user.id, email: user.email, role: user.role, customerAccountId: user.customerAccountId,
      permissions: effectivePermissions(user.role, user.customerAccount?.accountStatus, user.permissions.map((entry) => entry.permission)),
    };
  }
}
