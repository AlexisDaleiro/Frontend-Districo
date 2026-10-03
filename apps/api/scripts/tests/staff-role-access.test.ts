import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from '../../src/common/guards/roles.guard';
import { defaultStaffAccess, staffAccessMatrix, staffFeatureForPath, staffFeatures } from '../../src/common/staff-role-access';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AdminService } from '../../src/admin/admin.service';
import { AuditService } from '../../src/audit/audit.service';
import { OrdersService } from '../../src/orders/orders.service';
import { ApplicationsService } from '../../src/applications/applications.service';

test('every staff feature has defaults and editing never exists without viewing', () => {
  for (const feature of staffFeatures) {
    for (const role of [Role.ADMIN, Role.SALES, Role.CATALOG, Role.FINANCE]) {
      const access = defaultStaffAccess(role, feature);
      assert.equal(typeof access.canView, 'boolean');
      assert.equal(typeof access.canEdit, 'boolean');
      assert.ok(!access.canEdit || access.canView);
    }
  }
  assert.deepEqual(staffAccessMatrix(Role.SALES, [{ feature: 'clientes', canView: true, canEdit: true }]).clientes, { canView: true, canEdit: true });
});

test('admin routes map to the section they protect', () => {
  assert.equal(staffFeatureForPath('/api/admin/orders/page?limit=20'), 'pedidos');
  assert.equal(staffFeatureForPath('/api/admin/orders/123/invoices/456'), 'facturacion');
  assert.equal(staffFeatureForPath('/api/admin/contact-inquiries/page'), 'consultas');
  assert.equal(staffFeatureForPath('/api/products/admin/list'), 'catalogo');
  assert.equal(staffFeatureForPath('/api/admin/banners'), 'banners');
  assert.equal(staffFeatureForPath('/api/admin/staff/access'), 'roles');
  assert.equal(staffFeatureForPath('/api/admin/staff/roles/123/access'), 'roles');
  assert.equal(staffFeatureForPath('/api/admin/staff/invitations'), 'personal');
  assert.equal(staffFeatureForPath('/api/admin/salespeople/123/customers'), 'vendedores');
  assert.equal(staffFeatureForPath('/api/admin/audit-logs'), undefined);
});

test('guard enforces saved view and edit rights across staff sections', async () => {
  let override: { canView: boolean; canEdit: boolean } | null = null;
  const prisma = { staffRoleAccess: { findUnique: async () => override },
    customerAccount: { findFirst: async () => ({ id: 'assigned-customer' }) },
    order: { findFirst: async () => ({ id: 'assigned-order' }) } } as unknown as PrismaService;
  const reflector = { getAllAndOverride: () => [Role.ADMIN, Role.CATALOG] } as unknown as Reflector;
  const guard = new RolesGuard(reflector, prisma);
  const context = (path: string, method: string, role: Role) => ({
    getHandler: () => function handler() {}, getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => ({ originalUrl: path, method, user: { role } }) }),
  }) as unknown as ExecutionContext;

  assert.equal(await guard.canActivate(context('/api/products/admin/list', 'GET', Role.SALES)), false);
  override = { canView: true, canEdit: false };
  assert.equal(await guard.canActivate(context('/api/products/admin/list', 'GET', Role.SALES)), true);
  assert.equal(await guard.canActivate(context('/api/products/123', 'PATCH', Role.SALES)), false);
  assert.equal(await guard.canActivate(context('/api/admin/orders/123/invoices/456', 'GET', Role.SALES)), false);
  override = { canView: true, canEdit: true };
  assert.equal(await guard.canActivate(context('/api/products/123', 'PATCH', Role.SALES)), true);
  assert.equal(await guard.canActivate(context('/api/admin/orders/123/invoices/456', 'GET', Role.SALES)), true);
  override = null;
  assert.equal(await guard.canActivate(context('/api/admin/staff/access', 'GET', Role.SALES)), false);
  assert.equal(await guard.canActivate(context('/api/admin/staff', 'GET', Role.SALES)), false);
  assert.equal(await guard.canActivate(context('/api/admin/salespeople', 'GET', Role.SALES)), false);
  override = { canView: true, canEdit: false };
  assert.equal(await guard.canActivate(context('/api/admin/staff/access', 'GET', Role.SALES)), true);
  assert.equal(await guard.canActivate(context('/api/admin/staff/roles', 'POST', Role.SALES)), false);
  assert.equal(await guard.canActivate(context('/api/admin/staff', 'GET', Role.SALES)), true);
  assert.equal(await guard.canActivate(context('/api/admin/staff/invitations', 'POST', Role.SALES)), false);
  assert.equal(await guard.canActivate(context('/api/admin/salespeople', 'GET', Role.SALES)), true);
  assert.equal(await guard.canActivate(context('/api/admin/salespeople/123', 'PATCH', Role.SALES)), false);
  override = { canView: true, canEdit: true };
  assert.equal(await guard.canActivate(context('/api/admin/staff/roles', 'POST', Role.SALES)), true);
  assert.equal(await guard.canActivate(context('/api/admin/staff/invitations', 'POST', Role.SALES)), true);
  assert.equal(await guard.canActivate(context('/api/admin/salespeople/123', 'PATCH', Role.SALES)), true);
  assert.equal(await guard.canActivate(context('/api/admin/staff/access', 'GET', Role.ADMIN)), true);
});

test('seller record access follows the current customer assignment', async () => {
  let assigned = true;
  const prisma = {
    staffRoleAccess: { findUnique: async () => null },
    customerAccount: { findFirst: async ({ where }: { where: { id: string; salesperson: { is: { userId: string } } } }) => {
      assert.equal(where.salesperson.is.userId, 'seller-1');
      return assigned ? { id: where.id } : null;
    } },
    order: { findFirst: async ({ where }: { where: { id: string; customerAccount: { is: { salesperson: { is: { userId: string } } } } } }) => {
      assert.equal(where.customerAccount.is.salesperson.is.userId, 'seller-1');
      return assigned ? { id: where.id } : null;
    } },
  } as unknown as PrismaService;
  const reflector = { getAllAndOverride: () => [Role.ADMIN, Role.SALES] } as unknown as Reflector;
  const guard = new RolesGuard(reflector, prisma);
  const context = (path: string, method: string) => ({
    getHandler: () => function handler() {}, getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => ({ originalUrl: path, method, user: { sub: 'seller-1', role: Role.SALES } }) }),
  }) as unknown as ExecutionContext;
  assert.equal(await guard.canActivate(context('/api/admin/customers/other-1', 'GET')), true);
  assert.equal(await guard.canActivate(context('/api/admin/orders/other-2/status', 'PATCH')), true);
  assigned = false;
  assert.equal(await guard.canActivate(context('/api/admin/customers/other-1', 'GET')), false);
  assert.equal(await guard.canActivate(context('/api/admin/customers/other-1', 'PATCH')), false);
  assert.equal(await guard.canActivate(context('/api/admin/orders/other-2', 'GET')), false);
  assert.equal(await guard.canActivate(context('/api/admin/orders/other-2/status', 'PATCH')), false);
  assert.equal(await guard.canActivate(context('/api/admin/customers/page', 'GET')), true);
  assert.equal(await guard.canActivate(context('/api/admin/orders/page', 'GET')), true);
});

test('seller customer and order pages are scoped before pagination', async () => {
  let customerWhere: unknown;
  let orderSellerId: string | undefined;
  const prisma = {
    customerAccount: {
      findMany: async ({ where }: { where: unknown }) => { customerWhere = where; return []; },
      count: async () => 0,
    },
    staffRoleAccess: { findUnique: async () => null },
  } as unknown as PrismaService;
  const orders = { findAdminOrdersPage: async (_query: unknown, salespersonUserId?: string) => {
    orderSellerId = salespersonUserId;
    return { items: [], meta: { total: 0, page: 1, limit: 20 } };
  } } as unknown as OrdersService;
  const service = new AdminService(prisma, {} as AuditService, orders, {} as ApplicationsService);
  const seller = { sub: 'seller-1', role: Role.SALES } as never;
  await service.customersPage({ page: 1, limit: 20 }, seller);
  assert.deepEqual(customerWhere, { salesperson: { is: { userId: 'seller-1' } } });
  await service.ordersPage({ page: 1, limit: 20 }, seller);
  assert.equal(orderSellerId, 'seller-1');
});

test('custom staff roles deny by default and honor only their saved permissions', async () => {
  let customAccess: { canView: boolean; canEdit: boolean } | null = null;
  const prisma = { customStaffRoleAccess: { findUnique: async () => customAccess } } as unknown as PrismaService;
  const reflector = { getAllAndOverride: () => [Role.ADMIN, Role.SALES] } as unknown as Reflector;
  const guard = new RolesGuard(reflector, prisma);
  const context = (path: string, method: string, customRoleId: string | null = 'custom-1') => ({
    getHandler: () => function handler() {}, getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => ({ originalUrl: path, method, user: { role: Role.CUSTOM, customRoleId } }) }),
  }) as unknown as ExecutionContext;
  assert.equal(await guard.canActivate(context('/api/admin/orders/page', 'GET', null)), false);
  assert.equal(await guard.canActivate(context('/api/admin/orders/page', 'GET')), false);
  customAccess = { canView: true, canEdit: false };
  assert.equal(await guard.canActivate(context('/api/admin/orders/page', 'GET')), true);
  assert.equal(await guard.canActivate(context('/api/admin/orders/order-1/status', 'PATCH')), false);
  assert.equal(await guard.canActivate(context('/api/admin/orders/order-1/invoices/invoice-1', 'GET')), false);
  customAccess = { canView: true, canEdit: true };
  assert.equal(await guard.canActivate(context('/api/admin/orders/order-1/invoices/invoice-1', 'GET')), true);
  assert.equal(await guard.canActivate(context('/api/admin/staff/roles', 'POST')), true);
});

test('custom role creation starts without access and rejects duplicate names', async () => {
  const roles: { id: string; name: string; key: string; accesses: [] }[] = [];
  const audit: string[] = [];
  const tx = {
    customStaffRole: { create: async ({ data }: { data: { name: string; key: string } }) => {
      const role = { id: 'custom-1', ...data, accesses: [] as [] };
      roles.push(role);
      return role;
    } },
    auditLog: { create: async ({ data }: { data: { action: string } }) => { audit.push(data.action); } },
  };
  const prisma = {
    customStaffRole: {
      findUnique: async ({ where }: { where: { key: string } }) => roles.find((item) => item.key === where.key) ?? null,
      findMany: async () => roles,
    },
    staffRoleAccess: { findMany: async () => [] },
    $transaction: async (action: (client: typeof tx) => Promise<unknown>) => action(tx),
  } as unknown as PrismaService;
  const service = new AdminService(prisma, {} as AuditService, {} as OrdersService, {} as ApplicationsService);
  const created = await service.createCustomRole('  Depósito  ', 'admin-1');
  assert.deepEqual({ id: created.id, name: created.name }, { id: 'custom-1', name: 'Depósito' });
  assert.equal((await service.staffRoleAccess()).find((item) => item.id === 'custom-1')?.access.catalogo.canView, false);
  assert.deepEqual(audit, ['STAFF_ROLE_CREATED']);
  await assert.rejects(service.createCustomRole('Deposito', 'admin-1'), /Ya existe/);
});

test('orders without billing view omit payment and invoice data', async () => {
  const prisma = { staffRoleAccess: { findUnique: async () => ({ canView: false, canEdit: false }) } } as unknown as PrismaService;
  const orders = { findAdminOrdersPage: async () => ({ items: [{
    id: 'order-1', total: 100, paidTotal: 50, creditedTotal: 0, refundedTotal: 0,
    payments: [{ amount: 50 }], invoices: [{ invoiceNumber: 'A-1' }], creditNotes: [], refunds: [],
  }], meta: { total: 1, page: 1, limit: 20 } }) } as unknown as OrdersService;
  const service = new AdminService(prisma, {} as AuditService, orders, {} as ApplicationsService);
  const result = await service.ordersPage({ page: 1, limit: 20 }, Role.SALES);
  assert.equal(result.items[0].id, 'order-1');
  for (const key of ['paidTotal', 'creditedTotal', 'refundedTotal', 'payments', 'invoices', 'creditNotes', 'refunds']) {
    assert.equal(key in result.items[0], false, key);
  }
});

test('editing orders requires billing visibility', async () => {
  const service = new AdminService({} as PrismaService, {} as AuditService, {} as OrdersService, {} as ApplicationsService);
  const entries = staffFeatures.map((feature) => ({ feature, canView: feature === 'pedidos', canEdit: feature === 'pedidos' }));
  await assert.rejects(service.updateStaffRoleAccess(Role.SALES, entries, 'admin-1'), /facturación/);
});

test('delegated role editor cannot grant access beyond their own rights', async () => {
  const prisma = {
    user: { findUnique: async () => ({ role: Role.SALES, customRoleId: null }) },
    staffRoleAccess: { findMany: async () => [{ feature: 'roles', canView: true, canEdit: true }] },
  } as unknown as PrismaService;
  const service = new AdminService(prisma, {} as AuditService, {} as OrdersService, {} as ApplicationsService);
  const entries = staffFeatures.map((feature) => ({ feature, canView: feature === 'catalogo', canEdit: false }));
  await assert.rejects(service.updateStaffRoleAccess(Role.CATALOG, entries, 'sales-1'), /No podés otorgar/);
});

test('delegated staff editor cannot assign an administrator role', async () => {
  const prisma = {
    user: { findUnique: async () => ({ role: Role.SALES, customRoleId: null }) },
    staffRoleAccess: { findMany: async () => [{ feature: 'personal', canView: true, canEdit: true }] },
  } as unknown as PrismaService;
  const service = new AdminService(prisma, {} as AuditService, {} as OrdersService, {} as ApplicationsService);
  await assert.rejects(service.updateStaffRole('target-1', Role.ADMIN, 'sales-1'), /Solo un administrador/);
  await assert.rejects(service.inviteStaff('nuevo@example.test', Role.ADMIN, 'sales-1'), /Solo un administrador/);
});
