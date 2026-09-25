import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(_err: unknown, user: TUser | false) {
    return user || null;
  }

  async canActivate(context: ExecutionContext) {
    await super.canActivate(context);
    return true;
  }
}
