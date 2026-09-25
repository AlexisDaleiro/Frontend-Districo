import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { Permission, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

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
      permissions: user.permissions.map((permission) => permission.permission),
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
      permissions: user.permissions.map((permission) => permission.permission),
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
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.active) {
      return { success: true };
    }
    const resetToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, purpose: 'password-reset' },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret',
        expiresIn: '30m',
      },
    );
    return { success: true, resetToken };
  }

  async resetPassword(dto: ResetPasswordDto) {
    let payload: { sub: string; purpose?: string };
    try {
      payload = await this.jwtService.verifyAsync(dto.resetToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret',
      });
    } catch {
      throw new UnauthorizedException('Token invalido o vencido.');
    }
    if (payload.purpose !== 'password-reset') {
      throw new UnauthorizedException('Token invalido.');
    }
    await this.prisma.user.update({
      where: { id: payload.sub },
      data: { passwordHash: await bcrypt.hash(dto.password, Number(this.config.get<string>('BCRYPT_SALT_ROUNDS') ?? 10)) },
    });
    await this.prisma.refreshToken.updateMany({
      where: { userId: payload.sub, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  async me(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
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
