import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Permission, Prisma, Role } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { ApplicationsService } from '../applications/applications.service';
import { AuditService } from '../audit/audit.service';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerListQueryDto, OrderListQueryDto } from './dto/admin-list-query.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly orders: OrdersService,
    private readonly applications: ApplicationsService,
  ) {}

  async dashboard() {
    const [products, pendingApplications, pendingReviewOrders, activePromotions, newContactInquiries] = await Promise.all([
      this.prisma.product.count({ where: { deletedAt: null } }),
      this.prisma.customerApplication.count({ where: { status: 'PENDING' } }),
      this.prisma.order.count({ where: { status: 'PENDING_REVIEW' } }),
      this.prisma.promotion.count({ where: { active: true, deletedAt: null } }),
      this.prisma.contactInquiry.count({ where: { status: 'NEW' } }),
    ]);
    return { products, pendingApplications, pendingReviewOrders, activePromotions, newContactInquiries };
  }

  customers() {
    return this.prisma.customerAccount.findMany({
      orderBy: { createdAt: 'desc' },
      include: { users: { select: { id: true, email: true, permissions: true, active: true } } },
    });
  }

  async sales(period: 'today' | '7d' | '30d' | '90d') {
    const [boundary] = await this.prisma.$queryRaw<{ todayStart: Date }[]>`
      SELECT date_trunc('day', now() AT TIME ZONE 'America/Montevideo')
        AT TIME ZONE 'America/Montevideo' AS "todayStart"
    `;
    const days = period === 'today' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const todayStart = boundary.todayStart;
    const start = new Date(todayStart.getTime() - (days - 1) * 86400000);
    const previousStart = new Date(start.getTime() - days * 86400000);
    const now = new Date();
    const validStatuses: OrderStatus[] = [OrderStatus.SUBMITTED, OrderStatus.PENDING_REVIEW, OrderStatus.APPROVED, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED];
    const currentWhere: Prisma.OrderWhereInput = { createdAt: { gte: start, lte: now }, status: { in: validStatuses } };
    const previousWhere: Prisma.OrderWhereInput = { createdAt: { gte: previousStart, lt: start }, status: { in: validStatuses } };
    const todayWhere: Prisma.OrderWhereInput = { createdAt: { gte: todayStart, lte: now }, status: { in: validStatuses } };
    const bucket = period === 'today'
      ? Prisma.sql`to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Montevideo', 'HH24')`
      : Prisma.sql`to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Montevideo', 'YYYY-MM-DD')`;
    const [current, previous, today, units, topProducts, collected, series] = await Promise.all([
      this.prisma.order.aggregate({ where: currentWhere, _count: { id: true }, _sum: { total: true } }),
      this.prisma.order.aggregate({ where: previousWhere, _count: { id: true }, _sum: { total: true } }),
      this.prisma.order.aggregate({ where: todayWhere, _count: { id: true }, _sum: { total: true } }),
      this.prisma.orderItem.aggregate({ where: { order: currentWhere }, _sum: { quantity: true } }),
      this.prisma.orderItem.groupBy({
        by: ['productId', 'productName'], where: { order: currentWhere },
        _sum: { quantity: true, subtotal: true },
        orderBy: { _sum: { quantity: 'desc' } }, take: 8,
      }),
      this.prisma.orderPayment.aggregate({ where: { createdAt: { gte: start, lte: now }, voidedAt: null }, _sum: { amount: true } }),
      this.prisma.$queryRaw<{ bucket: string; orders: number; amount: number }[]>`
        SELECT ${bucket} AS bucket,
          count(*)::integer AS orders,
          coalesce(sum("total"), 0)::double precision AS amount
        FROM "Order"
        WHERE "createdAt" >= ${start} AND "createdAt" <= ${now}
          AND "status"::text IN ('SUBMITTED', 'PENDING_REVIEW', 'APPROVED', 'PROCESSING', 'SHIPPED', 'DELIVERED')
        GROUP BY 1 ORDER BY 1
      `,
    ]);
    const amount = Number(current._sum.total ?? 0);
    const previousAmount = Number(previous._sum.total ?? 0);
    return {
      period,
      timezone: 'America/Montevideo',
      startAt: start.toISOString(),
      today: { orders: today._count.id, amount: Number(today._sum.total ?? 0) },
      current: { orders: current._count.id, amount, units: units._sum.quantity ?? 0, collected: Number(collected._sum.amount ?? 0) },
      previous: { orders: previous._count.id, amount: previousAmount },
      changePercent: previousAmount > 0 ? Math.round(((amount - previousAmount) / previousAmount) * 1000) / 10 : null,
      series,
      topProducts: topProducts.map((item) => ({ id: item.productId, name: item.productName, units: item._sum.quantity ?? 0, amount: Number(item._sum.subtotal ?? 0) })),
    };
  }

  async customersPage(query: CustomerListQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.CustomerAccountWhereInput = search ? {
      OR: [
        { businessName: { contains: search, mode: 'insensitive' } },
        { legalName: { contains: search, mode: 'insensitive' } },
        { rut: { contains: search } },
        { phone: { contains: search } },
        { users: { some: { email: { contains: search, mode: 'insensitive' } } } },
      ],
    } : {};
    const [items, total] = await Promise.all([
      this.prisma.customerAccount.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { users: { select: { id: true, email: true, permissions: true, active: true } } },
      }),
      this.prisma.customerAccount.count({ where }),
    ]);
    return { items, meta: { total, page: query.page, limit: query.limit } };
  }

  ordersPage(query: OrderListQueryDto) {
    return this.orders.findAdminOrdersPage(query);
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
        phone: dto.phone === undefined ? undefined : dto.phone.trim() || null,
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

  staff() {
    return this.prisma.user.findMany({
      where: { customerAccountId: null },
      select: {
        id: true, email: true, role: true, active: true, emailVerified: true,
        staffInvitations: {
          select: { expiresAt: true, acceptedAt: true, revokedAt: true },
          orderBy: { createdAt: 'desc' }, take: 1,
        },
      },
      orderBy: { email: 'asc' },
    }).then((users) => users.map(({ staffInvitations, ...user }) => ({
      ...user,
      invitationPending: !user.active && !user.emailVerified &&
        !!staffInvitations[0] && !staffInvitations[0].acceptedAt &&
        !staffInvitations[0].revokedAt && staffInvitations[0].expiresAt > new Date(),
    })));
  }

  async inviteStaff(emailInput: string, role: Role, actorId: string) {
    const email = emailInput.trim().toLowerCase();
    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const placeholderHash = await bcrypt.hash(randomBytes(32).toString('base64url'), 10);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const staff = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { email } });
      if (existing && (existing.customerAccountId || existing.active || existing.emailVerified || existing.role === Role.CLIENT)) {
        throw new ConflictException('Ese correo ya pertenece a una cuenta activa o de cliente.');
      }
      const user = existing ?? await tx.user.create({ data: {
        email, role, active: false, emailVerified: false, passwordHash: placeholderHash,
      } });
      await tx.staffInvitation.updateMany({ where: { userId: user.id, acceptedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.user.update({ where: { id: user.id }, data: { role } });
      await tx.staffInvitation.create({ data: { userId: user.id, tokenHash, invitedById: actorId, expiresAt } });
      await tx.auditLog.create({ data: {
        action: existing ? 'STAFF_REINVITED' : 'STAFF_INVITED', entityType: 'User', entityId: user.id,
        userId: actorId, metadata: { email, role, expiresAt: expiresAt.toISOString() },
      } });
      return { id: user.id, email, role };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return { ...staff, token, expiresAt };
  }

  async updateStaffActive(id: string, active: boolean, actorId: string) {
    if (id === actorId && !active) throw new ForbiddenException('No podés desactivar tu propia cuenta.');
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id }, select: {
        id: true, email: true, role: true, active: true, emailVerified: true, customerAccountId: true,
      } });
      if (!user || user.customerAccountId) throw new NotFoundException('Usuario interno no encontrado.');
      if (active && !user.emailVerified) throw new BadRequestException('La cuenta debe aceptar su invitación antes de activarse.');
      if (!active && user.active && user.role === Role.ADMIN) {
        const admins = await tx.user.count({ where: { role: Role.ADMIN, active: true, customerAccountId: null } });
        if (admins <= 1) throw new BadRequestException('Debe quedar al menos un administrador activo.');
      }
      if (user.active === active) return { id: user.id, email: user.email, role: user.role, active: user.active };
      const updated = await tx.user.update({ where: { id }, data: { active }, select: { id: true, email: true, role: true, active: true } });
      if (!active) {
        await tx.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
        await tx.staffInvitation.updateMany({ where: { userId: id, acceptedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
      }
      await tx.auditLog.create({ data: {
        action: active ? 'STAFF_ACTIVATED' : 'STAFF_DEACTIVATED', entityType: 'User', entityId: id,
        userId: actorId, metadata: { email: user.email, role: user.role },
      } });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async updateStaffRole(id: string, role: Role, actorId: string) {
    if (id === actorId && role !== Role.ADMIN) throw new ForbiddenException('No podés quitarte tu propio acceso de administrador.');
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id }, select: { id: true, email: true, role: true, active: true, customerAccountId: true } });
      if (!user || user.customerAccountId) throw new NotFoundException('Usuario interno no encontrado.');
      if (user.role === Role.ADMIN && role !== Role.ADMIN && user.active) {
        const admins = await tx.user.count({ where: { role: Role.ADMIN, active: true, customerAccountId: null } });
        if (admins <= 1) throw new BadRequestException('Debe quedar al menos un administrador activo.');
      }
      const updated = await tx.user.update({ where: { id }, data: { role }, select: { id: true, email: true, role: true, active: true } });
      if (role !== Role.ADMIN) await tx.userPermission.deleteMany({ where: { userId: id } });
      await tx.auditLog.create({ data: { action: 'STAFF_ROLE_CHANGED', entityType: 'User', entityId: id, userId: actorId, metadata: { from: user.role, to: role } } });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
