import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { JwtUser } from '../common/types/jwt-user.type';
import { effectivePermissions } from '../common/business/account-access';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret',
    });
  }

  async validate(payload: JwtUser): Promise<JwtUser> {
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.active) {
      throw new UnauthorizedException();
    }
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
    };
  }
}
