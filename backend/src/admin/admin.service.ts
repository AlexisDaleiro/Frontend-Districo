import { Injectable, NotFoundException } from '@nestjs/common';
import { Permission, Prisma } from '@prisma/client';
import { ApplicationsService } from '../applications/applications.service';
import { AuditService } from '../audit/audit.service';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly orders: OrdersService,
    private readonly applications: ApplicationsService,
  ) {}

  async dashboard() {
    const [products, pendingApplications, pendingReviewOrders, activePromotions] = await Promise.all([
      this.prisma.product.count({ where: { deletedAt: null } }),
      this.prisma.customerApplication.count({ where: { status: 'PENDING' } }),
      this.prisma.order.count({ where: { status: 'PENDING_REVIEW' } }),
      this.prisma.promotion.count({ where: { active: true, deletedAt: null } }),
    ]);
    return { products, pendingApplications, pendingReviewOrders, activePromotions };
  }

  customers() {
    return this.prisma.customerAccount.findMany({
      orderBy: { createdAt: 'desc' },
      include: { users: { select: { id: true, email: true, permissions: true, active: true } } },
    });
  }

  async updateCustomer(id: string, dto: UpdateCustomerDto, userId?: string) {
    const customer = await this.prisma.customerAccount.findUnique({
      where: { id },
      include: { users: { include: { permissions: true } } },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado.');

    const updated = await this.prisma.customerAccount.update({
      where: { id },
      data: {
        accountStatus: dto.accountStatus,
        medicationPermission: dto.medicationPermission,
        creditStatus: dto.creditStatus,
        creditLimit: dto.creditLimit,
        internalCreditNote: dto.internalCreditNote,
      },
    });

    if (dto.medicationPermission !== undefined) {
      for (const user of customer.users) {
        const hasPermission = user.permissions.some((permission) => permission.permission === Permission.CAN_BUY_MEDICATIONS);
        if (dto.medicationPermission && !hasPermission) {
          await this.prisma.userPermission.create({ data: { userId: user.id, permission: Permission.CAN_BUY_MEDICATIONS } });
        }
        if (!dto.medicationPermission && hasPermission) {
          await this.prisma.userPermission.deleteMany({ where: { userId: user.id, permission: Permission.CAN_BUY_MEDICATIONS } });
        }
      }
    }

    await this.audit.log('CUSTOMER_UPDATED', 'CustomerAccount', id, userId, { ...dto } as Prisma.InputJsonObject);
    return updated;
  }

  ordersAdmin() {
    return this.orders.findAdminOrders();
  }

  applicationsAdmin() {
    return this.applications.findMany();
  }

  auditLogs() {
    return this.audit.findMany(200);
  }
}
