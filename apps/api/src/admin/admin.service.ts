import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Permission, Prisma, Role } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';
import * as bcrypt from 'bcryptjs';
import { ApplicationsService } from '../applications/applications.service';
import { AuditService } from '../audit/audit.service';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerListQueryDto, OrderListQueryDto } from './dto/admin-list-query.dto';
import { defaultStaffAccess, staffAccessMatrix, staffFeatures, type StaffFeature } from '../common/staff-role-access';
import { StaffAccessEntryDto } from './dto/update-staff-access.dto';
import { JwtUser } from '../common/types/jwt-user.type';
import { slugify } from '../common/utils/slugify';

function csvCell(value: unknown) {
  const raw = String(value ?? '');
  const safe = /^[=+@\-\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly orders: OrdersService,
    private readonly applications: ApplicationsService,
  ) {}

  async staffRoleAccess() {
    const roles = [Role.ADMIN, Role.SALES, Role.CATALOG, Role.FINANCE];
    const [overrides, customRoles] = await Promise.all([
      this.prisma.staffRoleAccess.findMany({ where: { role: { in: roles } } }),
      this.prisma.customStaffRole.findMany({ include: { accesses: true }, orderBy: { name: 'asc' } }),
    ]);
    return [
      ...roles.map((role) => ({ role, id: null, name: null, access: staffAccessMatrix(role, overrides.filter((entry) => entry.role === role)) })),
      ...customRoles.map((item) => ({ role: Role.CUSTOM, id: item.id, name: item.name, access: staffAccessMatrix(Role.CUSTOM, item.accesses) })),
    ];
  }

  async updateStaffRoleAccess(role: Role, entries: StaffAccessEntryDto[], actorId: string) {
    if (role === Role.ADMIN || role === Role.CLIENT || role === Role.CUSTOM || !Object.values(Role).includes(role)) throw new BadRequestException('Este rol no se puede configurar.');
    this.validateStaffAccess(entries);
    await this.assertGrantBounded(actorId, entries);
    await this.prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        await tx.staffRoleAccess.upsert({
          where: { role_feature: { role, feature: entry.feature } },
          create: { role, feature: entry.feature, canView: entry.canView, canEdit: entry.canEdit },
          update: { canView: entry.canView, canEdit: entry.canEdit },
        });
      }
      await tx.auditLog.create({ data: {
        action: 'STAFF_ROLE_ACCESS_UPDATED', entityType: 'StaffRoleAccess', entityId: role,
        userId: actorId, metadata: { role, entries: entries.map((entry) => ({ feature: entry.feature, canView: entry.canView, canEdit: entry.canEdit })) },
      } });
    });
    return this.staffRoleAccess();
  }

  async createCustomRole(nameInput: string, actorId: string) {
    const name = nameInput.trim();
    const key = slugify(name);
    if (!key) throw new BadRequestException('Ingresá un nombre válido para el rol.');
    if (await this.prisma.customStaffRole.findUnique({ where: { key } })) throw new ConflictException('Ya existe un rol con ese nombre.');
    return this.prisma.$transaction(async (tx) => {
      const role = await tx.customStaffRole.create({ data: { name, key }, select: { id: true, name: true } });
      await tx.auditLog.create({ data: {
        action: 'STAFF_ROLE_CREATED', entityType: 'CustomStaffRole', entityId: role.id,
        userId: actorId, metadata: { name },
      } });
      return role;
    });
  }

  async updateCustomRoleAccess(id: string, entries: StaffAccessEntryDto[], actorId: string) {
    if (!await this.prisma.customStaffRole.findUnique({ where: { id } })) throw new NotFoundException('Rol no encontrado.');
    this.validateStaffAccess(entries);
    await this.assertGrantBounded(actorId, entries);
    await this.prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        await tx.customStaffRoleAccess.upsert({
          where: { roleId_feature: { roleId: id, feature: entry.feature } },
          create: { roleId: id, feature: entry.feature, canView: entry.canView, canEdit: entry.canEdit },
          update: { canView: entry.canView, canEdit: entry.canEdit },
        });
      }
      await tx.auditLog.create({ data: {
        action: 'STAFF_ROLE_ACCESS_UPDATED', entityType: 'CustomStaffRole', entityId: id,
        userId: actorId, metadata: { entries: entries.map((entry) => ({ feature: entry.feature, canView: entry.canView, canEdit: entry.canEdit })) },
      } });
    });
    return this.staffRoleAccess();
  }

  private async actorAccess(actorId: string) {
    const actor = await this.prisma.user.findUnique({ where: { id: actorId }, select: { role: true, customRoleId: true } });
    if (!actor || actor.role === Role.CLIENT) throw new ForbiddenException('No tenés permiso para administrar este acceso.');
    if (actor.role === Role.ADMIN) return null;
    const overrides = actor.role === Role.CUSTOM
      ? actor.customRoleId ? await this.prisma.customStaffRoleAccess.findMany({ where: { roleId: actor.customRoleId } }) : []
      : await this.prisma.staffRoleAccess.findMany({ where: { role: actor.role } });
    return staffAccessMatrix(actor.role, overrides);
  }

  private async assertGrantBounded(actorId: string, entries: { feature: StaffFeature; canView: boolean; canEdit: boolean }[]) {
    const access = await this.actorAccess(actorId);
    if (access && entries.some((entry) => (entry.canView && !access[entry.feature].canView) || (entry.canEdit && !access[entry.feature].canEdit))) {
      throw new ForbiddenException('No podés otorgar permisos que no tenés.');
    }
  }

  private async assertAssignableRole(actorId: string, role: Role, customRoleId?: string) {
    const access = await this.actorAccess(actorId);
    if (!access) return;
    if (role === Role.ADMIN) throw new ForbiddenException('Solo un administrador puede asignar ese rol.');
    const entries = role === Role.CUSTOM
      ? await this.prisma.customStaffRoleAccess.findMany({ where: { roleId: customRoleId } })
      : await this.prisma.staffRoleAccess.findMany({ where: { role } });
    const target = staffAccessMatrix(role, entries);
    if (staffFeatures.some((feature) => (target[feature].canView && !access[feature].canView) || (target[feature].canEdit && !access[feature].canEdit))) {
      throw new ForbiddenException('No podés asignar un rol con permisos que no tenés.');
    }
  }

  private validateStaffAccess(entries: StaffAccessEntryDto[]) {
    if (new Set(entries.map((entry) => entry.feature)).size !== staffFeatures.length ||
        entries.some((entry) => entry.canEdit && !entry.canView)) {
      throw new BadRequestException('Configuración de permisos inválida.');
    }
    if (entries.find((entry) => entry.feature === 'pedidos')?.canEdit &&
        !entries.find((entry) => entry.feature === 'facturacion')?.canView) {
      throw new BadRequestException('Para gestionar pedidos se debe poder ver facturación.');
    }
    if (entries.find((entry) => entry.feature === 'facturacion')?.canView &&
        !entries.find((entry) => entry.feature === 'pedidos')?.canView) {
      throw new BadRequestException('Para ver facturación se debe poder ver pedidos.');
    }
    if (entries.find((entry) => entry.feature === 'ventas')?.canView &&
        !entries.find((entry) => entry.feature === 'resumen')?.canView) {
      throw new BadRequestException('Para ver ventas se debe poder ver el resumen.');
    }
  }

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

  customers(user?: JwtUser) {
    return this.prisma.customerAccount.findMany({
      where: user?.role === Role.SALES ? { salesperson: { is: { userId: user.sub } } } : undefined,
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

  async customersPage(query: CustomerListQueryDto, user?: JwtUser) {
    const search = query.search?.trim();
    const where: Prisma.CustomerAccountWhereInput = {
      salesperson: user?.role === Role.SALES ? { is: { userId: user.sub } } : undefined,
      ...(search ? {
      OR: [
        { businessName: { contains: search, mode: 'insensitive' } },
        { legalName: { contains: search, mode: 'insensitive' } },
        { rut: { contains: search } },
        { phone: { contains: search } },
        { users: { some: { email: { contains: search, mode: 'insensitive' } } } },
      ],
      } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.customerAccount.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { users: { select: { id: true, email: true, permissions: true, active: true } },
          salesperson: { select: { id: true, name: true, userId: true, user: { select: { email: true } } } } },
      }),
      this.prisma.customerAccount.count({ where }),
    ]);
    return { items, meta: { total, page: query.page, limit: query.limit } };
  }

  async customerDetail(id: string, user: JwtUser) {
    const customer = await this.prisma.customerAccount.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, email: true, active: true } },
        addresses: { orderBy: { createdAt: 'asc' } },
        documents: { select: { id: true, type: true, originalName: true, mimeType: true, status: true, uploadedAt: true } },
        salesperson: { select: { id: true, name: true, userId: true, user: { select: { email: true } } } },
      },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado.');
    const billing = await this.canViewBilling(user);
    const openStatuses = [OrderStatus.SUBMITTED, OrderStatus.PENDING_REVIEW, OrderStatus.APPROVED, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED];
    const [recentOrders, orderCount, openOrders, audit] = await Promise.all([
      this.prisma.order.findMany({ where: { customerAccountId: id }, orderBy: { createdAt: 'desc' }, take: 10,
        select: { id: true, orderNumber: true, createdAt: true, status: true, total: true, currency: true } }),
      this.prisma.order.count({ where: { customerAccountId: id } }),
      billing ? this.prisma.order.findMany({ where: { customerAccountId: id, status: { in: openStatuses } },
        select: { total: true, creditedTotal: true, paidTotal: true, refundedTotal: true } }) : Promise.resolve([]),
      billing ? this.prisma.auditLog.findMany({ where: { entityType: 'CustomerAccount', entityId: id, action: { in: ['CUSTOMER_CREDIT_UPDATED', 'CUSTOMER_UPDATED'] } },
        orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, action: true, createdAt: true, metadata: true, user: { select: { email: true } } } }) : Promise.resolve([]),
    ]);
    const debt = openOrders.reduce((sum, order) => sum.plus(Prisma.Decimal.max(0, order.total.minus(order.creditedTotal).minus(order.paidTotal).plus(order.refundedTotal))), new Prisma.Decimal(0));
    const creditChanges = audit.filter((entry) => {
      if (entry.action === 'CUSTOMER_CREDIT_UPDATED') return true;
      const metadata = entry.metadata;
      return metadata !== null && typeof metadata === 'object' && !Array.isArray(metadata) &&
        ['creditLimit', 'creditStatus', 'internalCreditNote'].some((key) => key in metadata);
    });
    const { creditLimit, internalCreditNote, ...basic } = customer;
    return {
      ...basic,
      ...(billing ? { creditLimit, internalCreditNote, debt: Number(debt), availableCredit: creditLimit === null ? null : Math.max(0, Number(creditLimit.minus(debt))), creditChanges } : {}),
      recentOrders: recentOrders.map((order) => billing ? order : { id: order.id, orderNumber: order.orderNumber, createdAt: order.createdAt, status: order.status }),
      orderCount,
    };
  }

  async ordersPage(query: OrderListQueryDto, user: JwtUser | Role) {
    const canViewBilling = await this.canViewBilling(user);
    if (query.paymentStatus && !canViewBilling) throw new ForbiddenException('No tenés acceso a los estados de pago.');
    const result = await this.orders.findAdminOrdersPage(query, typeof user !== 'string' && user.role === Role.SALES ? user.sub : undefined);
    return canViewBilling ? result : { ...result, items: result.items.map((order) => this.withoutBilling(order)) };
  }

  async orderDetail(id: string, user: JwtUser) {
    const [order, billing] = await Promise.all([this.orders.findAdminOrder(id), this.canViewBilling(user)]);
    return billing ? order : this.withoutBilling(order);
  }

  async ordersCsv(query: OrderListQueryDto, user: JwtUser) {
    const billing = await this.canViewBilling(user);
    if (query.paymentStatus && !billing) throw new ForbiddenException('No tenés acceso a los estados de pago.');
    const orders = this.orders;
    async function* rows() {
      const columns = ['ID', 'Número', 'Fecha', 'Cliente', 'Correo', 'Estado', 'Moneda', 'Total'];
      if (billing) columns.push('Estado de pago', 'Abonado', 'Pendiente');
      yield `\uFEFF${columns.map(csvCell).join(',')}\r\n`;
      for (let page = 1; ; page++) {
        const result = await orders.findAdminOrdersPage({ ...query, page, limit: 100 }, user.role === Role.SALES ? user.sub : undefined);
        for (const order of result.items) {
          const fields: unknown[] = [order.id, order.orderNumber, order.createdAt.toISOString(), order.customerAccount?.businessName ?? '', order.user.email,
            order.status, order.currency, order.total.toString()];
          if (billing) {
            const netTotal = Prisma.Decimal.max(0, order.total.minus(order.creditedTotal));
            const netPaid = Prisma.Decimal.max(0, order.paidTotal.minus(order.refundedTotal));
            const state = netTotal.eq(0) ? 'Acreditado' : netPaid.gte(netTotal) ? 'Completo' : netPaid.gt(0) ? 'Parcial' : 'Pendiente';
            fields.push(state, netPaid.toString(), Prisma.Decimal.max(0, netTotal.minus(netPaid)).toString());
          }
          yield `${fields.map(csvCell).join(',')}\r\n`;
        }
        if (page * 100 >= result.meta.total) break;
      }
    }
    return Readable.from(rows());
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

    const creditChanged = (dto.creditStatus !== undefined && dto.creditStatus !== customer.creditStatus) ||
      (dto.creditLimit !== undefined && (customer.creditLimit === null || Number(dto.creditLimit) !== Number(customer.creditLimit))) ||
      (dto.internalCreditNote !== undefined && dto.internalCreditNote !== customer.internalCreditNote);
    await this.audit.log(creditChanged ? 'CUSTOMER_CREDIT_UPDATED' : 'CUSTOMER_UPDATED', 'CustomerAccount', id, userId,
      creditChanged ? { before: { creditStatus: customer.creditStatus, creditLimit: customer.creditLimit?.toString() ?? null, internalCreditNote: customer.internalCreditNote },
        after: { creditStatus: updated.creditStatus, creditLimit: updated.creditLimit?.toString() ?? null, internalCreditNote: updated.internalCreditNote } } : { ...dto } as Prisma.InputJsonObject);
    return updated;
  }

  async ordersAdmin(user: JwtUser | Role) {
    const [orders, canViewBilling] = await Promise.all([this.orders.findAdminOrders(typeof user !== 'string' && user.role === Role.SALES ? user.sub : undefined), this.canViewBilling(user)]);
    return canViewBilling ? orders : orders.map((order) => this.withoutBilling(order));
  }

  private async canViewBilling(input: JwtUser | Role) {
    const user = typeof input === 'string' ? { role: input, customRoleId: null } : input;
    if (user.role === Role.ADMIN) return true;
    if (user.role === Role.CUSTOM) {
      if (!user.customRoleId) return false;
      const access = await this.prisma.customStaffRoleAccess.findUnique({ where: { roleId_feature: { roleId: user.customRoleId, feature: 'facturacion' } } });
      return access?.canView ?? false;
    }
    const override = await this.prisma.staffRoleAccess.findUnique({ where: { role_feature: { role: user.role, feature: 'facturacion' } } });
    return (override ?? defaultStaffAccess(user.role, 'facturacion')).canView;
  }

  private withoutBilling<T extends { payments: unknown; invoices: unknown; creditNotes: unknown; refunds: unknown; paidTotal: unknown; creditedTotal: unknown; refundedTotal: unknown }>(order: T) {
    const { payments: _payments, invoices: _invoices, creditNotes: _creditNotes,
      refunds: _refunds, paidTotal: _paidTotal, creditedTotal: _creditedTotal,
      refundedTotal: _refundedTotal, ...visible } = order;
    return visible;
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
        id: true, email: true, role: true, customRoleId: true, customRole: { select: { id: true, name: true } }, active: true, emailVerified: true,
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

  async inviteStaff(emailInput: string, role: Role, actorId: string, customRoleId?: string) {
    await this.assertCustomRole(role, customRoleId);
    await this.assertAssignableRole(actorId, role, customRoleId);
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
        email, role, customRoleId: role === Role.CUSTOM ? customRoleId : null, active: false, emailVerified: false, passwordHash: placeholderHash,
      } });
      await tx.staffInvitation.updateMany({ where: { userId: user.id, acceptedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.user.update({ where: { id: user.id }, data: { role, customRoleId: role === Role.CUSTOM ? customRoleId : null } });
      await tx.staffInvitation.create({ data: { userId: user.id, tokenHash, invitedById: actorId, expiresAt } });
      await tx.auditLog.create({ data: {
        action: existing ? 'STAFF_REINVITED' : 'STAFF_INVITED', entityType: 'User', entityId: user.id,
        userId: actorId, metadata: { email, role, customRoleId, expiresAt: expiresAt.toISOString() },
      } });
      return { id: user.id, email, role, customRoleId: role === Role.CUSTOM ? customRoleId : null };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return { ...staff, token, expiresAt };
  }

  async updateStaffActive(id: string, active: boolean, actorId: string) {
    if (id === actorId && !active) throw new ForbiddenException('No podés desactivar tu propia cuenta.');
    const actorAccess = await this.actorAccess(actorId);
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id }, select: {
        id: true, email: true, role: true, active: true, emailVerified: true, customerAccountId: true,
        salesperson: { select: { _count: { select: { customers: true } } } },
      } });
      if (!user || user.customerAccountId) throw new NotFoundException('Usuario interno no encontrado.');
      if (actorAccess && user.role === Role.ADMIN) throw new ForbiddenException('Solo un administrador puede gestionar otra cuenta administradora.');
      if (active && !user.emailVerified) throw new BadRequestException('La cuenta debe aceptar su invitación antes de activarse.');
      if (!active && user.salesperson?._count.customers) throw new BadRequestException('Reasigná sus clientes antes de desactivar al vendedor.');
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

  async updateStaffRole(id: string, role: Role, actorId: string, customRoleId?: string) {
    await this.assertCustomRole(role, customRoleId);
    const actorAccess = await this.actorAccess(actorId);
    if (id === actorId) throw new ForbiddenException('No podés cambiar tu propio rol.');
    await this.assertAssignableRole(actorId, role, customRoleId);
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id }, select: { id: true, email: true, role: true, active: true, customerAccountId: true,
        salesperson: { select: { _count: { select: { customers: true } } } } } });
      if (!user || user.customerAccountId) throw new NotFoundException('Usuario interno no encontrado.');
      if (actorAccess && user.role === Role.ADMIN) throw new ForbiddenException('Solo un administrador puede gestionar otra cuenta administradora.');
      if (role !== Role.SALES && user.salesperson?._count.customers) throw new BadRequestException('Reasigná sus clientes antes de cambiar el rol del vendedor.');
      if (user.role === Role.ADMIN && role !== Role.ADMIN && user.active) {
        const admins = await tx.user.count({ where: { role: Role.ADMIN, active: true, customerAccountId: null } });
        if (admins <= 1) throw new BadRequestException('Debe quedar al menos un administrador activo.');
      }
      const updated = await tx.user.update({ where: { id }, data: { role, customRoleId: role === Role.CUSTOM ? customRoleId : null }, select: { id: true, email: true, role: true, customRoleId: true, active: true } });
      if (role !== Role.ADMIN) await tx.userPermission.deleteMany({ where: { userId: id } });
      await tx.auditLog.create({ data: { action: 'STAFF_ROLE_CHANGED', entityType: 'User', entityId: id, userId: actorId, metadata: { from: user.role, to: role, customRoleId } } });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async assertCustomRole(role: Role, customRoleId?: string) {
    if (role !== Role.CUSTOM) {
      if (customRoleId) throw new BadRequestException('Este rol no acepta un identificador personalizado.');
      return;
    }
    if (!customRoleId || !await this.prisma.customStaffRole.findUnique({ where: { id: customRoleId } })) {
      throw new BadRequestException('Seleccioná un rol existente.');
    }
  }
}
