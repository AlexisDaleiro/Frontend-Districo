import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from '../../src/common/guards/roles.guard';
import { sensitiveStaffFeatures, staffAccessForUser, staffAccessMatrix, staffFeatureForPath, staffFeatures, StaffAccess, StaffFeature } from '../../src/common/staff-role-access';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AdminService } from '../../src/admin/admin.service';
import { AdminToolsService } from '../../src/admin/admin-tools.service';
import { AuditService } from '../../src/audit/audit.service';
import { OrdersService } from '../../src/orders/orders.service';
import { ApplicationsService } from '../../src/applications/applications.service';

const allow = { canView: true, canEdit: true }, view = { canView: true, canEdit: false }, deny = { canView: false, canEdit: false };
const paths = {
  stock: '/api/inventory/variants/v1/stock', precios: '/api/pricing/variants/v1',
  cobros: '/api/admin/orders/o1/payments', 'anular-cobros': '/api/admin/orders/o1/payments/p1/void',
  reintegros: '/api/admin/orders/o1/refunds',
};
const actor = { sub: 'actor', email: 'actor@example.test', role: Role.CUSTOM, customRoleId: 'role', permissions: [] };
function fixture(saved: Partial<Record<StaffFeature, StaffAccess>>, role: Role = Role.CUSTOM) {
  let assigned = true;
  const find = async ({ where }: { where: { role_feature?: { feature: StaffFeature }; roleId_feature?: { feature: StaffFeature } } }) => saved[(where.role_feature ?? where.roleId_feature)!.feature] ?? null;
  const prisma = {
    staffRoleAccess: { findUnique: find }, customStaffRoleAccess: { findUnique: find },
    order: { findFirst: async () => assigned ? { id: 'o1' } : null },
  } as unknown as PrismaService;
  const guard = new RolesGuard({ getAllAndOverride: () => [Role.ADMIN] } as unknown as Reflector, prisma);
  const check = (path: string, method = 'POST', body?: Record<string, unknown>) => guard.canActivate({
    getHandler: () => function handler() {}, getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => ({ originalUrl: path, method, body, user: { ...actor, role } }) }),
  } as unknown as ExecutionContext);
  return { check, prisma, unassign: () => { assigned = false; } };
}

test('each action is independent of broad editing, including route casing and trailing slashes', async () => {
  for (const feature of Object.keys(paths) as (keyof typeof paths)[]) {
    const f = fixture({ catalogo: allow, facturacion: allow, [feature]: deny });
    for (const path of [paths[feature], `${paths[feature]}/?x=1`, paths[feature].toUpperCase()]) {
      assert.equal(staffFeatureForPath(path, 'POST'), feature);
      assert.equal(await f.check(path), false, `${feature}: ${path}`);
    }
    assert.equal(await f.check('/api/products/p1', 'PATCH', { name: 'Name' }), true);
    assert.equal(await f.check('/api/admin/orders/o1/invoices'), true);
  }
});

test('a single action needs only parent read access and never grants other actions or broad editing', async () => {
  for (const feature of Object.keys(paths) as (keyof typeof paths)[]) {
    const parent = sensitiveStaffFeatures[feature];
    const f = fixture({ catalogo: view, facturacion: view, [feature]: allow });
    assert.equal(await f.check(paths[feature]), true);
    for (const other of Object.keys(paths) as (keyof typeof paths)[]) if (other !== feature) assert.equal(await f.check(paths[other]), false);
    assert.equal(await f.check('/api/products/p1', 'PATCH'), false);
    assert.equal(await f.check('/api/admin/orders/o1/invoices'), false);
    const noRead = fixture({ [parent]: deny, [feature]: allow });
    assert.equal(await noRead.check(paths[feature]), false);
  }
});

test('legacy role matrices and runtime decisions agree, explicit action denial wins', async () => {
  for (const role of [Role.CATALOG, Role.FINANCE, Role.CUSTOM]) {
    const saved = { catalogo: allow, facturacion: view };
    const f = fixture(saved, role);
    const matrix = staffAccessMatrix(role, Object.entries(saved).map(([feature, access]) => ({ feature, ...access })));
    for (const feature of Object.keys(paths) as (keyof typeof paths)[]) assert.deepEqual(await staffAccessForUser(f.prisma, { ...actor, role }, feature), matrix[feature]);
    assert.equal(await f.check(paths.stock), true);
    assert.equal(await f.check(paths.cobros), false);
    assert.equal(await fixture({ ...saved, stock: deny }, role).check(paths.stock), false);
  }
  assert.equal(await fixture({}).check(paths.stock), false);
  for (const feature of Object.keys(paths) as (keyof typeof paths)[]) assert.equal(await fixture({}, Role.ADMIN).check(paths[feature]), true);
  assert.equal(await fixture({ catalogo: allow, stock: allow }, Role.CLIENT).check(paths.stock), false);
});

test('stock cannot be changed through product variant payloads without its separate permission', async () => {
  const f = fixture({ catalogo: allow, stock: deny });
  for (const path of ['/api/products/variants/v1', '/api/products/p1/variants', '/API/PRODUCTS/VARIANTS/v1/']) {
    assert.equal(await f.check(path, 'PATCH', { name: 'Name' }), true);
    assert.equal(await f.check(path, 'PATCH', { physicalStock: 0 }), false);
    assert.equal(await f.check(path, 'POST', { reservedStock: 0 }), false);
  }
  assert.equal(await fixture({ catalogo: allow, stock: allow }).check('/api/products/variants/v1', 'PATCH', { physicalStock: 1 }), true);
});

test('bulk pricing uses the price permission in both guard and service, before any data mutation', async () => {
  const f = fixture({ catalogo: allow, precios: deny });
  for (const path of ['/api/admin/bulk/products/prices', '/api/admin/bulk/products/prices/preview']) assert.equal(await f.check(path), false);
  const service = new AdminToolsService(f.prisma);
  const dto = { ids: ['p1'], reason: 'Test', requestId: '00000000-0000-4000-8000-000000000001', mode: 'FIXED' as const, value: 10 };
  await assert.rejects(service.productsPrices(dto, actor, true), ForbiddenException);
  await assert.rejects(service.productsPrices(dto, actor), ForbiddenException);
  const priceOnly = fixture({ catalogo: view, precios: allow });
  assert.equal(await priceOnly.check('/api/admin/bulk/products/prices/preview'), true);
  assert.equal(await priceOnly.check('/api/admin/bulk/products/active'), false);
});

test('seller payment permissions still respect their current customer assignment', async () => {
  const f = fixture({ facturacion: view, cobros: allow }, Role.SALES);
  assert.equal(await f.check(paths.cobros), true);
  f.unassign();
  assert.equal(await f.check(paths.cobros), false);
});

test('return registration does not authorize restocking without the stock action', async () => {
  const f = fixture({ pedidos: allow, catalogo: view, stock: deny });
  for (const path of ['/api/admin/orders/o1/returns', '/api/admin/orders/o1/returns/preview/']) {
    assert.equal(await f.check(path, 'POST', { items: [{ restockedQuantity: 0 }] }), true);
    assert.equal(await f.check(path, 'POST', { items: [{ restockedQuantity: 1 }] }), false);
    assert.equal(await fixture({ pedidos: allow, catalogo: view, stock: allow }).check(path, 'POST', { items: [{ restockedQuantity: 1 }] }), true);
  }
});

test('action configuration rejects missing parent access or split action checkboxes', async () => {
  const service = new AdminService({} as PrismaService, {} as AuditService, {} as OrdersService, {} as ApplicationsService);
  for (const invalid of [allow, view]) {
    const entries = staffFeatures.map((feature) => ({ feature, ...(feature === 'stock' ? invalid : deny) }));
    await assert.rejects(service.updateStaffRoleAccess(Role.CATALOG, entries, 'admin'), /acciones sensibles/);
  }
});

test('saving an action-only role preserves all five independent permissions in the audit history', async () => {
  const saved: { feature: string; canView: boolean; canEdit: boolean }[] = [];
  const records: unknown[] = [];
  const prisma = {
    user: { findUnique: async () => ({ role: Role.ADMIN }) },
    staffRoleAccess: { findMany: async () => saved }, customStaffRole: { findMany: async () => [] },
    $transaction: async (operation: (tx: unknown) => Promise<unknown>) => operation({
      staffRoleAccess: { upsert: async ({ create }: { create: typeof saved[number] }) => saved.push(create) },
      auditLog: { create: async ({ data }: { data: { metadata: unknown } }) => records.push(data.metadata) },
    }),
  } as unknown as PrismaService;
  const entries = staffFeatures.map((feature) => ({ feature, ...(feature === 'stock' ? allow : feature === 'catalogo' ? view : deny) }));
  const service = new AdminService(prisma, {} as AuditService, {} as OrdersService, {} as ApplicationsService);
  await service.updateStaffRoleAccess(Role.CATALOG, entries, 'admin');
  assert.equal(saved.length, staffFeatures.length);
  assert.deepEqual(records, [{ role: Role.CATALOG, entries }]);
  assert.deepEqual(saved.find((entry) => entry.feature === 'precios'), { role: Role.CATALOG, feature: 'precios', ...deny });
});

test('delegated role editors cannot duplicate implicit legacy actions they are explicitly denied', async () => {
  const prisma = {
    user: { findUnique: async () => ({ role: Role.CUSTOM, customRoleId: 'editor' }) },
    customStaffRoleAccess: { findMany: async () => [{ feature: 'catalogo', ...allow }, { feature: 'stock', ...deny }] },
  } as unknown as PrismaService;
  const service = new AdminService(prisma, {} as AuditService, {} as OrdersService, {} as ApplicationsService);
  await assert.rejects((service as unknown as { assertGrantBounded(actor: string, entries: unknown[]): Promise<void> }).assertGrantBounded('editor', [{ feature: 'catalogo', ...allow }]), ForbiddenException);
});
