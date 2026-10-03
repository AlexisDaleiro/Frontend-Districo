import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtUser } from '../types/jwt-user.type';
import { PrismaService } from '../../prisma/prisma.service';
import { defaultStaffAccess, staffFeatureForPath } from '../staff-role-access';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    const request = context.switchToHttp().getRequest<{ user?: JwtUser; originalUrl: string; method: string }>();
    const user = request.user;
    if (!roles?.length) return true;
    const feature = staffFeatureForPath(request.originalUrl);
    if (feature) {
      if (!user || user.role === Role.CLIENT) return false;
      if (user.role === Role.ADMIN) return true;
      if (user.role === Role.CUSTOM) {
        if (!user.customRoleId) return false;
        const access = await this.prisma.customStaffRoleAccess.findUnique({ where: { roleId_feature: { roleId: user.customRoleId, feature } } });
        if (!access) return false;
        if (request.method === 'GET' && /^\/api\/admin\/orders\/[^/]+\/(?:invoices|credit-notes)\/[^/?]+(?:\?|$)/.test(request.originalUrl)) {
          return access.canEdit;
        }
        return request.method === 'GET' ? access.canView : access.canEdit;
      }
      const override = await this.prisma.staffRoleAccess.findUnique({ where: { role_feature: { role: user.role, feature } } });
      const access = override ?? defaultStaffAccess(user.role, feature);
      if (request.method === 'GET' && /^\/api\/admin\/orders\/[^/]+\/(?:invoices|credit-notes)\/[^/?]+(?:\?|$)/.test(request.originalUrl)) {
        return access.canEdit;
      }
      return request.method === 'GET' ? access.canView : access.canEdit;
    }
    return Boolean(user && roles.includes(user.role));
  }
}
