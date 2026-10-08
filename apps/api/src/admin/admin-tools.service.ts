import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma, Role } from '@prisma/client';
import { defaultStaffAccess, StaffFeature } from '../common/staff-role-access';
import { JwtUser } from '../common/types/jwt-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { BulkBaseDto, BulkCustomerSellerDto, BulkHistoryDto, BulkProductActiveDto, BulkProductPricesDto } from './dto/admin-tools.dto';

type Entry = { id: string; name: string; before: string; after: string; changed: boolean };
type Preview = { token: string; entries: Entry[]; changed: number };
const actions = {
  active: 'ADMIN_BULK_PRODUCTS_ACTIVE', prices: 'ADMIN_BULK_PRODUCTS_PRICES', seller: 'ADMIN_BULK_CUSTOMERS_SALESPERSON',
};
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

@Injectable()
export class AdminToolsService {
  constructor(private readonly prisma: PrismaService) {}

  private async access(user: JwtUser, feature: StaffFeature) {
    if (user.role === Role.CLIENT) return { canView: false, canEdit: false };
    if (user.role === Role.ADMIN) return { canView: true, canEdit: true };
    if (user.role === Role.CUSTOM) {
      if (!user.customRoleId) return { canView: false, canEdit: false };
      return await this.prisma.customStaffRoleAccess.findUnique({ where: { roleId_feature: { roleId: user.customRoleId, feature } } })
        ?? { canView: false, canEdit: false };
    }
    return await this.prisma.staffRoleAccess.findUnique({ where: { role_feature: { role: user.role, feature } } }) ?? defaultStaffAccess(user.role, feature);
  }

  private async requireAccess(user: JwtUser, feature: StaffFeature, edit = false) {
    const permission = await this.access(user, feature);
    if (!permission.canView || (edit && !permission.canEdit)) throw new ForbiddenException('No tenes permiso para esta accion.');
  }

  async search(term: string, user: JwtUser) {
    const search = term.trim();
    if (search.length < 2 || search.length > 120) throw new BadRequestException('Ingresa entre 2 y 120 caracteres.');
    const [customersAccess, ordersAccess, productsAccess] = await Promise.all(['clientes', 'pedidos', 'catalogo'].map((feature) => this.access(user, feature as StaffFeature)));
    const contains = { contains: search, mode: 'insensitive' as const };
    const scope: Prisma.CustomerAccountWhereInput = user.role === Role.SALES ? { salesperson: { is: { userId: user.sub } } } : {};
    const [customers, orders, products] = await Promise.all([
      customersAccess.canView ? this.prisma.customerAccount.findMany({ where: { ...scope, OR: [
        { id: contains }, { businessName: contains }, { legalName: contains }, { rut: contains }, { phone: contains }, { users: { some: { email: contains } } },
      ] }, orderBy: [{ businessName: 'asc' }, { id: 'asc' }], take: 5,
      select: { id: true, businessName: true, rut: true, users: { select: { email: true }, take: 1 } } }) : [],
      ordersAccess.canView ? this.prisma.order.findMany({ where: { customerAccount: user.role === Role.SALES ? { is: scope } : undefined, OR: [
        { id: contains }, { orderNumber: contains }, { user: { is: { email: contains } } }, { customerAccount: { is: { businessName: contains } } },
      ] }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: 5,
      select: { id: true, orderNumber: true, status: true, user: { select: { email: true } }, customerAccount: { select: { businessName: true } } } }) : [],
      productsAccess.canView ? this.prisma.product.findMany({ where: { deletedAt: null, OR: [
        { id: contains }, { name: contains }, { slug: contains }, { variants: { some: { deletedAt: null, sku: contains } } },
      ] }, orderBy: [{ name: 'asc' }, { id: 'asc' }], take: 5, select: { id: true, slug: true, name: true, active: true } }) : [],
    ]);
    return { customers: customers.map(({ users, ...customer }) => ({ ...customer, email: users[0]?.email ?? '' })), orders, products };
  }

  async history(query: BulkHistoryDto, user: JwtUser) {
    await this.requireAccess(user, query.feature);
    if (query.feature === 'vendedores') await this.requireAccess(user, 'clientes');
    const where: Prisma.AuditLogWhereInput = { action: { in: query.feature === 'catalogo' ? [actions.active, actions.prices] : [actions.seller] },
      userId: user.role === Role.SALES ? user.sub : undefined };
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * query.limit, take: query.limit,
        select: { id: true, action: true, createdAt: true, metadata: true, user: { select: { email: true } } } }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, meta: { page: query.page, limit: query.limit, total } };
  }

  private async transaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') throw new ConflictException('Los datos cambiaron. Revisa la vista previa antes de confirmar de nuevo.');
      throw error;
    }
  }

  private input(dto: BulkBaseDto) {
    const { previewToken: _previewToken, ...input } = dto;
    return { ...input, ids: [...dto.ids].sort() };
  }

  private async previous(tx: Prisma.TransactionClient, dto: BulkBaseDto, action: string, actorId: string) {
    const saved = await tx.auditLog.findFirst({ where: { action: { in: Object.values(actions) }, userId: actorId,
      metadata: { path: ['requestId'], equals: dto.requestId } } });
    if (!saved) return;
    const metadata = saved.metadata as { inputHash: string; entries: Entry[]; changed: number };
    if (saved.action !== action || metadata.inputHash !== digest(this.input(dto))) throw new ConflictException('Este identificador ya pertenece a otra operacion.');
    return { batchId: saved.id, entries: metadata.entries, changed: metadata.changed };
  }

  private preview(dto: BulkBaseDto, state: unknown, entries: Entry[]): Preview {
    return { token: digest({ input: this.input(dto), state }), entries, changed: entries.filter((entry) => entry.changed).length };
  }

  private confirm(dto: BulkBaseDto, preview: Preview) {
    if (!dto.previewToken || dto.previewToken !== preview.token) throw new ConflictException('Los datos cambiaron o falta la vista previa. Revisalos antes de confirmar.');
  }

  private async record(tx: Prisma.TransactionClient, dto: BulkBaseDto, action: string, preview: Preview, actorId: string) {
    const batch = await tx.auditLog.create({ data: { action, entityType: 'AdminBulkOperation', entityId: dto.requestId, userId: actorId,
      metadata: { requestId: dto.requestId, inputHash: digest(this.input(dto)), reason: dto.reason, entries: preview.entries, changed: preview.changed } as Prisma.InputJsonObject } });
    return { batchId: batch.id, entries: preview.entries, changed: preview.changed };
  }

  async productsActive(dto: BulkProductActiveDto, user: JwtUser, previewOnly = false) {
    await this.requireAccess(user, 'catalogo', true);
    return this.transaction(async (tx) => {
      if (!previewOnly) { const saved = await this.previous(tx, dto, actions.active, user.sub); if (saved) return saved; }
      const products = await tx.product.findMany({ where: { id: { in: dto.ids }, deletedAt: null }, orderBy: { id: 'asc' }, select: { id: true, name: true, active: true, updatedAt: true } });
      if (products.length !== dto.ids.length) throw new BadRequestException('Hay productos que ya no estan disponibles.');
      const entries = products.map((p) => ({ id: p.id, name: p.name, before: p.active ? 'Activo' : 'Inactivo', after: dto.active ? 'Activo' : 'Inactivo', changed: p.active !== dto.active }));
      const preview = this.preview(dto, products, entries);
      if (previewOnly) return preview;
      this.confirm(dto, preview);
      for (const product of products.filter((p) => p.active !== dto.active)) {
        const updated = await tx.product.updateMany({ where: { id: product.id, updatedAt: product.updatedAt, deletedAt: null }, data: { active: dto.active } });
        if (updated.count !== 1) throw new ConflictException('Un producto cambio. Revisa la vista previa.');
      }
      return this.record(tx, dto, actions.active, preview, user.sub);
    });
  }

  async productsPrices(dto: BulkProductPricesDto, user: JwtUser, previewOnly = false) {
    await this.requireAccess(user, 'catalogo', true);
    if (!Number.isFinite(dto.value) || (dto.mode === 'PERCENTAGE' ? dto.value <= -100 || dto.value > 1000 || dto.value === 0 : dto.value <= 0 || dto.value > 9999999999.99)) {
      throw new BadRequestException('Revisa el porcentaje o importe ingresado.');
    }
    return this.transaction(async (tx) => {
      if (!previewOnly) { const saved = await this.previous(tx, dto, actions.prices, user.sub); if (saved) return saved; }
      const list = await tx.priceList.findUnique({ where: { name: 'Lista Mayorista Districo' } });
      if (!list?.active) throw new BadRequestException('La lista mayorista no esta activa.');
      const now = new Date();
      const products = await tx.product.findMany({ where: { id: { in: dto.ids }, deletedAt: null }, orderBy: { id: 'asc' },
        select: { id: true, name: true, updatedAt: true, variants: { where: { active: true, deletedAt: null }, orderBy: { id: 'asc' },
          select: { id: true, name: true, sku: true, updatedAt: true, prices: { where: { priceListId: list.id, validFrom: { lte: now }, OR: [{ validUntil: null }, { validUntil: { gt: now } }] }, orderBy: [{ validFrom: 'desc' }, { id: 'desc' }] } } } } });
      if (products.length !== dto.ids.length || products.some((p) => !p.variants.length)) throw new BadRequestException('Todos los productos deben tener presentaciones activas.');
      const prices = products.flatMap((p) => p.variants.map((v) => {
        const current = v.prices[0];
        if (dto.mode === 'PERCENTAGE' && !current) throw new BadRequestException(`${p.name} / ${v.name} no tiene precio vigente para ajustar.`);
        const currency = current?.currency ?? 'UYU';
        if (currency !== 'UYU') throw new BadRequestException('El lote solo admite precios en UYU.');
        const amount = (dto.mode === 'FIXED' ? new Prisma.Decimal(dto.value) : current!.amount.mul(new Prisma.Decimal(1).plus(new Prisma.Decimal(dto.value).div(100)))).toDecimalPlaces(2);
        if (amount.lte(0) || amount.gt('9999999999.99')) throw new BadRequestException('El ajuste produce un precio fuera de rango.');
        return { variant: v, amount, currency, entry: { id: v.id, name: `${p.name} / ${v.name} (${v.sku})`, before: current ? `${current.amount.toFixed(2)} ${currency}` : 'Sin precio', after: `${amount.toFixed(2)} ${currency}`, changed: !current || !current.amount.eq(amount) } };
      }));
      if (prices.length > 500) throw new BadRequestException('Selecciona menos productos: el lote admite hasta 500 presentaciones.');
      const preview = this.preview(dto, { list, products }, prices.map((price) => price.entry));
      if (previewOnly) return preview;
      this.confirm(dto, preview);
      const changed = prices.filter((price) => price.entry.changed);
      if (changed.length) {
        const previousIds = changed.flatMap(({ variant }) => variant.prices.map((price) => price.id));
        if (previousIds.length) await tx.price.updateMany({ where: { id: { in: previousIds } }, data: { validUntil: now } });
        await tx.price.createMany({ data: changed.map(({ variant, amount, currency }) => ({ productVariantId: variant.id, priceListId: list.id, amount, currency, validFrom: now })) });
        await tx.priceHistory.createMany({ data: changed.map(({ variant, amount, currency }) => ({ productVariantId: variant.id, previousPrice: variant.prices[0]?.amount, newPrice: amount, currency, changedById: user.sub })) });
      }
      return this.record(tx, dto, actions.prices, preview, user.sub);
    });
  }

  async customersSeller(dto: BulkCustomerSellerDto, user: JwtUser, previewOnly = false) {
    await this.requireAccess(user, 'vendedores', true);
    await this.requireAccess(user, 'clientes');
    return this.transaction(async (tx) => {
      if (!previewOnly) { const saved = await this.previous(tx, dto, actions.seller, user.sub); if (saved) return saved; }
      const seller = await tx.user.findUnique({ where: { id: dto.salespersonUserId }, select: { id: true, role: true, active: true, emailVerified: true, customerAccountId: true, salesperson: true } });
      if (!seller || seller.role !== Role.SALES || !seller.active || !seller.emailVerified || seller.customerAccountId || !seller.salesperson) throw new BadRequestException('Selecciona un vendedor activo con su ficha completa.');
      const customers = await tx.customerAccount.findMany({ where: { id: { in: dto.ids }, salesperson: user.role === Role.SALES ? { is: { userId: user.sub } } : undefined },
        orderBy: { id: 'asc' }, select: { id: true, businessName: true, salespersonId: true, updatedAt: true, salesperson: { select: { name: true } } } });
      if (customers.length !== dto.ids.length) throw new ForbiddenException('Uno o mas clientes no estan disponibles para esta asignacion.');
      const entries = customers.map((customer) => ({ id: customer.id, name: customer.businessName, before: customer.salesperson?.name ?? 'Sin vendedor', after: seller.salesperson!.name, changed: customer.salespersonId !== seller.salesperson!.id }));
      const preview = this.preview(dto, { seller, customers }, entries);
      if (previewOnly) return preview;
      this.confirm(dto, preview);
      for (const customer of customers.filter((c) => c.salespersonId !== seller.salesperson!.id)) {
        const updated = await tx.customerAccount.updateMany({ where: { id: customer.id, salespersonId: customer.salespersonId, updatedAt: customer.updatedAt }, data: { salespersonId: seller.salesperson!.id } });
        if (updated.count !== 1) throw new ConflictException('La asignacion cambio. Revisa la vista previa.');
        await tx.auditLog.create({ data: { action: 'CUSTOMER_SALESPERSON_ASSIGNED', entityType: 'CustomerAccount', entityId: customer.id, userId: user.sub,
          metadata: { businessName: customer.businessName, fromSalespersonId: customer.salespersonId, toSalespersonId: seller.salesperson!.id, batchRequestId: dto.requestId, reason: dto.reason } } });
      }
      return this.record(tx, dto, actions.seller, preview, user.sub);
    });
  }
}
