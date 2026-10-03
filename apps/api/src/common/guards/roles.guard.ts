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
        return request.method === 'GET' && /^\/api\/admin\/orders\/[^/]+\/(?:invoices|credit-notes)\/[^/?]+(?:\?|$)/.test(request.originalUrl)
          ? access.canEdit : request.method === 'GET' ? access.canView : access.canEdit;
      }
      const override = await this.prisma.staffRoleAccess.findUnique({ where: { role_feature: { role: user.role, feature } } });
      const access = override ?? defaultStaffAccess(user.role, feature);
      const allowed = request.method === 'GET' && /^\/api\/admin\/orders\/[^/]+\/(?:invoices|credit-notes)\/[^/?]+(?:\?|$)/.test(request.originalUrl)
        ? access.canEdit : request.method === 'GET' ? access.canView : access.canEdit;
      if (!allowed || user.role !== Role.SALES) return allowed;
      const path = request.originalUrl.split('?')[0];
      const customerId = /^\/api\/admin\/customers\/(?!page(?:\/|$))([^/]+)/.exec(path)?.[1];
      if (customerId) return !!await this.prisma.customerAccount.findFirst({ where: { id: customerId, salesperson: { is: { userId: user.sub } } }, select: { id: true } });
      const orderId = /^\/api\/admin\/orders\/(?!page(?:\/|$)|export(?:\/|$))([^/]+)/.exec(path)?.[1];
      if (orderId) return !!await this.prisma.order.findFirst({ where: { id: orderId, customerAccount: { is: { salesperson: { is: { userId: user.sub } } } } }, select: { id: true } });
      return true;
    }
    return Boolean(user && roles.includes(user.role));
  }
}
