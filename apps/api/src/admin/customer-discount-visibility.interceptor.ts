import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Role } from '@prisma/client';
import { map } from 'rxjs';
import { defaultStaffAccess } from '../common/staff-role-access';
import { JwtUser } from '../common/types/jwt-user.type';
import { PrismaService } from '../prisma/prisma.service';

const fields = new Set(['discountPercentage', 'discountMode', 'discountChanges',
  'customerDiscountPercentage', 'customerDiscountMode', 'customerDiscountTotal']);
export function omitCustomerDiscounts(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(omitCustomerDiscounts);
  // Preserve Decimal, dates, downloads and streams rather than cloning their internals.
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).filter(([key]) => !fields.has(key)).map(([key, item]) => [key, omitCustomerDiscounts(item)]));
  }
  return value;
}

@Injectable()
export class CustomerDiscountVisibilityInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<{ user?: JwtUser; originalUrl: string }>();
    const user = request.user;
    if (!user || user.role === Role.ADMIN || !/^\/api\/admin\/(customers|orders)(?:\/|\?|$)/.test(request.originalUrl)) return next.handle();
    const access = user.role === Role.CUSTOM
      ? user.customRoleId ? await this.prisma.customStaffRoleAccess.findUnique({ where: { roleId_feature: { roleId: user.customRoleId, feature: 'descuentos-clientes' } } }) : null
      : await this.prisma.staffRoleAccess.findUnique({ where: { role_feature: { role: user.role, feature: 'descuentos-clientes' } } }) ?? defaultStaffAccess(user.role, 'descuentos-clientes');
    return access?.canView ? next.handle() : next.handle().pipe(map(omitCustomerDiscounts));
  }
}
