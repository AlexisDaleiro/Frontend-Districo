import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtUser } from '../types/jwt-user.type';
import { PrismaService } from '../../prisma/prisma.service';
import { isSensitiveStaffFeature, sensitiveStaffFeatures, staffAccessForUser, staffFeatureForPath } from '../staff-role-access';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    const request = context.switchToHttp().getRequest<{ user?: JwtUser; originalUrl: string; method: string; body?: Record<string, unknown> }>();
    const user = request.user;
    if (!roles?.length) return true;
    const feature = staffFeatureForPath(request.originalUrl, request.method);
    if (feature) {
      if (!user || user.role === Role.CLIENT) return false;
      if (user.role === Role.ADMIN) return true;
      const access = await staffAccessForUser(this.prisma, user, feature);
      const allowed = request.method === 'GET' && /^\/(?:api\/)?admin\/orders\/[^/]+\/(?:invoices|credit-notes)\/[^/?]+\/?(?:\?|$)/i.test(request.originalUrl)
        ? access.canEdit : request.method === 'GET' ? access.canView : access.canView && access.canEdit;
      if (!allowed) return false;
      if (isSensitiveStaffFeature(feature) && !(await staffAccessForUser(this.prisma, user, sensitiveStaffFeatures[feature])).canView) return false;
      const path = request.originalUrl.split('?')[0].replace(/^\/api\//i, '/').replace(/\/+$/, '');
      const variantStock = /^\/products\/(?:variants\/[^/]+|[^/]+\/variants)$/i.test(path) &&
        ['physicalStock', 'reservedStock'].some((field) => Object.prototype.hasOwnProperty.call(request.body ?? {}, field));
      const returnedStock = /^\/admin\/orders\/[^/]+\/returns(?:\/preview)?$/i.test(path) &&
        Array.isArray(request.body?.items) && request.body.items.some((item: unknown) =>
          typeof item === 'object' && item !== null && Number((item as { restockedQuantity?: unknown }).restockedQuantity) > 0);
      if (request.method !== 'GET' && (variantStock || returnedStock)) {
        const stock = await staffAccessForUser(this.prisma, user, 'stock');
        const catalog = await staffAccessForUser(this.prisma, user, 'catalogo');
        if (!stock.canView || !stock.canEdit || !catalog.canView) return false;
      }
      if (user.role !== Role.SALES) return true;
      const customerId = /^\/admin\/customers\/(?!page(?:\/|$))([^/]+)/i.exec(path)?.[1];
      if (customerId) return !!await this.prisma.customerAccount.findFirst({ where: { id: customerId, salesperson: { is: { userId: user.sub } } }, select: { id: true } });
      const orderId = /^\/admin\/orders\/(?!page(?:\/|$)|export(?:\/|$))([^/]+)/i.exec(path)?.[1];
      if (orderId) return !!await this.prisma.order.findFirst({ where: { id: orderId, customerAccount: { is: { salesperson: { is: { userId: user.sub } } } } }, select: { id: true } });
      return true;
    }
    return Boolean(user && roles.includes(user.role));
  }
}
