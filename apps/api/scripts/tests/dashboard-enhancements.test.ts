import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Permission, Prisma, Role } from '@prisma/client';
import { FavoritesService } from '../../src/favorites/favorites.service';
import { ProductsRepository } from '../../src/catalog/products/products.repository';
import { ProductsService } from '../../src/catalog/products/products.service';
import { CatalogImagesService } from '../../src/catalog/images/catalog-images.service';
import { CategoryHierarchyService } from '../../src/catalog/categories/category-hierarchy.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AuditService } from '../../src/audit/audit.service';
import { PromotionsService } from '../../src/promotions/promotions.service';
import { RecommendationsService } from '../../src/recommendations/recommendations.service';
import { SalesReportsService } from '../../src/admin/sales-reports.service';
import { SalesQueryDto } from '../../src/admin/dto/sales-query.dto';
import { RuleListQueryDto } from '../../src/admin/dto/rule-list-query.dto';
import { marketingRuleWhere } from '../../src/common/business/marketing-list';
import { staffFeatureForPath } from '../../src/common/staff-role-access';
import { salesMidnight, salesRange } from '../../src/admin/sales-report-range';
import { JwtUser } from '../../src/common/types/jwt-user.type';

const customer: JwtUser = { sub: 'customer1', email: 'customer@example.test', role: Role.CLIENT, customerAccountId: 'account1', permissions: [] };

test('favorites are idempotent and scoped to the authenticated customer', async () => {
  const calls: unknown[] = [];
  const prisma = { product: { findFirst: async () => ({ id: 'p1' }) }, productFavorite: {
    upsert: async (args: unknown) => { calls.push(args); }, deleteMany: async (args: unknown) => { calls.push(args); },
    findMany: async (args: unknown) => { calls.push(args); return [{ productId: 'p1' }]; },
  } } as unknown as PrismaService;
  const service = new FavoritesService(prisma, {} as ProductsService);
  await service.add(customer, 'p1'); await service.add(customer, 'p1'); await service.remove(customer, 'p1');
  assert.deepEqual(calls[0], { where: { userId_productId: { userId: 'customer1', productId: 'p1' } }, create: { userId: 'customer1', productId: 'p1' }, update: {} });
  assert.deepEqual(calls[1], calls[0]); assert.deepEqual(calls[2], { where: { userId: 'customer1', productId: 'p1' } });
  assert.deepEqual(await service.ids(customer), ['p1']);
  assert.deepEqual(calls[3], { where: { userId: 'customer1', product: { active: true, deletedAt: null } }, select: { productId: true } });
  await assert.rejects(() => service.add({ ...customer, role: Role.ADMIN }, 'p1'), ForbiddenException);
  await assert.rejects(() => service.ids({ ...customer, customerAccountId: null }), ForbiddenException);
});

test('unavailable favorites are rejected and restricted prices stay private', async () => {
  const empty = new FavoritesService({ product: { findFirst: async () => null } } as unknown as PrismaService, {} as ProductsService);
  await assert.rejects(() => empty.add(customer, 'inactive'), NotFoundException);
  const product = { id: 'p1', source: 'DISTRICO', deletedAt: null, requiresMedicationPermission: true, categories: [], variants: [{ id: 'v1', name: 'Unit', physicalStock: 5, reservedStock: 2, prices: [{ amount: 200, currency: 'UYU', priceList: { name: 'Lista' } }] }] };
  const products = new ProductsService({ findFavorites: async () => ({ items: [product], meta: { total: 1, page: 1, limit: 20 } }) } as unknown as ProductsRepository, {} as CatalogImagesService);
  assert.equal((await products.findFavorites(customer, new RuleListQueryDto())).items[0].variants[0].price, undefined);
  assert.equal((await products.findFavorites({ ...customer, permissions: [Permission.CAN_VIEW_PRICES, Permission.CAN_BUY_MEDICATIONS] }, new RuleListQueryDto())).items[0].variants[0].price?.amount, 200);
});

test('rules are filtered and paginated in the database with a stable total', async () => {
  const calls: { where?: object; skip?: number; take?: number }[] = [];
  const model = { findMany: async (args: typeof calls[number]) => { calls.push(args); return []; }, count: async (args: typeof calls[number]) => { calls.push(args); return 42; } };
  const prisma = { promotion: model, recommendationRule: model } as unknown as PrismaService;
  const query = Object.assign(new RuleListQueryDto(), { page: 2, limit: 20, search: ' descuento ', status: 'EXPIRED' });
  const promotions = await new PromotionsService(prisma, {} as AuditService, {} as CategoryHierarchyService).findPage(query);
  assert.deepEqual(promotions.meta, { total: 42, page: 2, limit: 20 });
  assert.equal(calls[0].skip, 20); assert.equal(calls[0].take, 20);
  assert.equal((calls[0].where as { deletedAt: null }).deletedAt, null);
  assert.deepEqual((calls[0].where as { name: object }).name, { contains: 'descuento', mode: 'insensitive' });
  assert.equal((await new RecommendationsService(prisma, {} as AuditService, {} as CategoryHierarchyService).findPage(query)).meta.total, 42);
  const now = new Date();
  assert.deepEqual(marketingRuleWhere(Object.assign(new RuleListQueryDto(), { status: 'ACTIVE' }), now).AND, [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }, { startsAt: { lte: now } }]);
});

test('sales use Uruguay dates and validate complete, bounded ranges', () => {
  assert.equal(salesMidnight('2026-10-01').toISOString(), '2026-10-01T03:00:00.000Z');
  const now = new Date('2026-10-08T02:00:00Z'), range = salesRange({ period: 'today' }, now);
  assert.equal(range.dateFrom, '2026-10-07'); assert.equal(range.previousStart.toISOString(), '2026-10-06T03:00:00.000Z');
  for (const query of [{ period: 'custom', dateFrom: '2026-02-30', dateTo: '2026-03-01' }, { period: 'custom', dateFrom: '2024-01-01', dateTo: '2026-10-01' }, { period: 'custom', dateFrom: '2026-10-08', dateTo: '2026-10-08' }]) assert.throws(() => salesRange(query, now));
  assert.equal(staffFeatureForPath('/api/admin/sales/export'), 'ventas'); assert.equal(staffFeatureForPath('/api/admin/sales/options?search=x'), 'ventas');
});

test('reports bind seller and brand scope and export all groups without leaking payments', async () => {
  const statements: Prisma.Sql[] = [];
  const prisma = { staffRoleAccess: { findUnique: async () => ({ canView: false }) }, $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const sql = Prisma.sql(strings, ...values);
    statements.push(sql);
    if (sql.sql.includes("'current' AS period")) return [{ period: 'current', orders: 1, amount: 100, units: 2 }, { period: 'previous', orders: 0, amount: 0, units: 0 }, { period: 'today', orders: 1, amount: 100, units: 2 }];
    if (sql.sql.includes('count(*) OVER()')) return [{ id: 'b1', name: '=Brand', orders: 1, amount: 100, units: 2, total: 1 }];
    return [];
  } } as unknown as PrismaService;
  const service = new SalesReportsService(prisma), user = { ...customer, sub: 'seller1', role: Role.SALES };
  const query = Object.assign(new SalesQueryDto(), { brandId: 'brand1', customerId: 'c1', salespersonId: 's1', groupBy: 'brand' });
  assert.equal((await service.report(query, user)).current.collected, undefined);
  for (const sql of statements) {
    assert.ok(sql.sql.includes('s."userId" = ?')); assert.ok(sql.values.includes('seller1'));
    assert.ok(sql.values.includes('brand1')); assert.ok(sql.values.includes('c1')); assert.ok(sql.values.includes('s1')); assert.ok(sql.sql.includes('i."subtotal" AS amount'));
  }
  statements.length = 0;
  assert.ok((await service.export(query, user)).includes('"\'=Brand"'));
  const grouped = statements.find((sql) => sql.sql.includes('count(*) OVER()'))!;
  assert.ok(!grouped.sql.includes('LIMIT')); assert.ok(!grouped.sql.includes('OFFSET'));
  await assert.rejects(() => service.report(Object.assign(new SalesQueryDto(), { period: 'custom' }), user), BadRequestException);
});

test('sales reports omit payments when billing permission is denied', async () => {
  const statements: Prisma.Sql[] = [];
  const prisma = {
    staffRoleAccess: { findUnique: async () => ({ canView: false }) },
    customStaffRoleAccess: { findUnique: async () => ({ canView: false }) },
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => { statements.push(Prisma.sql(strings, ...values)); return []; },
  } as unknown as PrismaService;
  const service = new SalesReportsService(prisma);
  for (const role of [Role.SALES, Role.CUSTOM]) {
    statements.length = 0;
    const report = await service.report(new SalesQueryDto(), { ...customer, role, customRoleId: 'restricted-role' });
    assert.equal(report.current.collected, undefined);
    assert.ok(statements.every((sql) => !sql.sql.includes('"OrderPayment"')));
  }
});
