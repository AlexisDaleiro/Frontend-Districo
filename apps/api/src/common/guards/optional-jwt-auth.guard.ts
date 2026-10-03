import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(err: unknown, user: TUser | false, _info: unknown, context: ExecutionContext) {
    if ((err || !user) && context.switchToHttp().getRequest().headers.authorization) {
      throw new UnauthorizedException('Sesión vencida o inválida.');
    }
    return user || null;
  }

  async canActivate(context: ExecutionContext) {
    await super.canActivate(context);
    return true;
  }
}
