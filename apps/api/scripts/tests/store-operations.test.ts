import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccountStatus, OrderStatus, Permission, Prisma, Role } from '@prisma/client';
import { effectivePermissions } from '../../src/common/business/account-access';
import { OrdersService } from '../../src/orders/orders.service';
import { OrderBillingService } from '../../src/orders/order-billing.service';
import { InvoiceStorageService } from '../../src/orders/invoice-storage.service';
import { BannerStorageService, bannerFileType } from '../../src/banners/banner-storage.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AdminController } from '../../src/admin/admin.controller';
import { ProductsController } from '../../src/catalog/products/products.controller';
import { ROLES_KEY } from '../../src/common/decorators/roles.decorator';
import { ApplicationsService, permitFileType } from '../../src/applications/applications.service';
import { AdminService } from '../../src/admin/admin.service';

test('staff roles can access only their operational routes', () => {
  const roles = (target: object, method: string) => Reflect.getMetadata(ROLES_KEY, Reflect.get(target, method)) as Role[] | undefined;
  assert.deepEqual(roles(AdminController.prototype, 'ordersPage'), [Role.ADMIN, Role.SALES, Role.FINANCE]);
  assert.deepEqual(roles(AdminController.prototype, 'recordRefund'), [Role.ADMIN, Role.FINANCE]);
  assert.deepEqual(roles(AdminController.prototype, 'downloadApplicationDocument'), [Role.ADMIN, Role.SALES]);
  assert.deepEqual(roles(AdminController.prototype, 'updateOrderStatus'), [Role.ADMIN, Role.SALES]);
  assert.deepEqual(roles(ProductsController.prototype, 'create'), [Role.ADMIN, Role.CATALOG]);
  assert.deepEqual(roles(AdminController.prototype, 'updateStaffRole'), undefined);
  assert.deepEqual(Reflect.getMetadata(ROLES_KEY, AdminController), [Role.ADMIN]);
});

test('application search returns bounded pages without password hashes', async () => {
  let listQuery: Record<string, unknown> | undefined;
  const prisma = { customerApplication: {
    findMany: async (query: Record<string, unknown>) => { listQuery = query; return [{ id: 'app-1' }]; },
    count: async () => 37,
  } } as unknown as PrismaService;
  const service = new ApplicationsService(prisma, {} as never, {} as never, {} as never);
  const result = await service.findPage({ page: 3, limit: 10, search: 'Pet', status: undefined });
  assert.deepEqual(result.meta, { total: 37, page: 3, limit: 10 });
  assert.equal(listQuery?.skip, 20);
  assert.equal(listQuery?.take, 10);
  assert.equal((listQuery?.select as Record<string, unknown>).passwordHash, undefined);
});

test('business permits are validated by content and saved privately with the application', async () => {
  assert.equal(permitFileType(Buffer.from('%PDF-1.7')).mimeType, 'application/pdf');
  assert.equal(permitFileType(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])).mimeType, 'image/png');
  assert.equal(permitFileType(Buffer.from([255, 216, 255])).mimeType, 'image/jpeg');
  assert.throws(() => permitFileType(Buffer.from('<script>')), BadRequestException);
  const uploads: string[] = [];
  const removed: string[] = [];
  let created: Record<string, unknown> | undefined;
  let createdCalls = 0;
  let failCreation = false;
  const storage = {
    upload: async (path: string) => { uploads.push(path); },
    remove: async (path: string) => { removed.push(path); uploads.splice(uploads.indexOf(path), 1); },
    download: async () => Buffer.from('%PDF-1.7'),
  } as unknown as InvoiceStorageService;
  const prisma = {
    user: { findUnique: async () => null },
    customerApplication: { findFirst: async () => null, create: async ({ data }: { data: Record<string, unknown> }) => {
      createdCalls += 1;
      if (failCreation) throw new Error('database unavailable');
      created = data;
      return { id: data.id, email: data.email, status: 'PENDING' };
    } },
    customerDocument: { findFirst: async ({ where }: { where: { applicationId: string } }) => ({
      fileUrl: uploads[0], mimeType: 'application/pdf', originalName: 'permiso.pdf', applicationId: where.applicationId,
    }) },
  } as unknown as PrismaService;
  const service = new ApplicationsService(prisma, {} as never, { notify: async () => undefined } as never, storage);
  const dto = { businessName: 'Prueba', legalName: 'Prueba SA', rut: '123456789012', email: 'test@example.com', password: 'password123' };
  await assert.rejects(() => service.create(dto), BadRequestException);
  assert.equal(createdCalls, 0);
  await assert.rejects(() => service.create(dto, [{ buffer: Buffer.from('<script>'), size: 8, mimetype: 'application/pdf', originalname: 'falso.pdf' }]), BadRequestException);
  assert.equal(uploads.length, 0);
  const application = await service.create(dto, [{ buffer: Buffer.from('%PDF-1.7'), size: 8, mimetype: 'application/pdf', originalname: 'permiso.pdf' }]);
  assert.equal(uploads.length, 1);
  assert.match(uploads[0], new RegExp(`^applications/${application.id}/`));
  assert.equal((created?.documents as { create: { fileUrl: string }[] }).create[0].fileUrl, uploads[0]);
  assert.equal((await service.document(application.id, 'document-1')).name, 'permiso.pdf');
  await assert.rejects(() => service.document('other-application', 'document-1'), NotFoundException);
  failCreation = true;
  await assert.rejects(() => service.create(dto, [{ buffer: Buffer.from('%PDF-1.7'), size: 8, mimetype: 'application/pdf', originalname: 'permiso.pdf' }]), /database unavailable/);
  assert.equal(uploads.length, 1);
  assert.equal(removed.length, 1);
});

test('applications without business permits cannot be approved', async () => {
  const prisma = { customerApplication: { findUnique: async () => ({ status: 'PENDING', documents: [] }) } } as unknown as PrismaService;
  const service = new ApplicationsService(prisma, {} as never, {} as never, {} as never);
  await assert.rejects(() => service.approve('application-1', 'reviewer-1', true), BadRequestException);
});

test('a second pending application with the same email or RUT is rejected before upload', async () => {
  let uploaded = false;
  const prisma = {
    user: { findUnique: async () => null },
    customerApplication: { findFirst: async () => ({ id: 'pending-1' }) },
  } as unknown as PrismaService;
  const storage = { upload: async () => { uploaded = true; } } as unknown as InvoiceStorageService;
  const service = new ApplicationsService(prisma, {} as never, {} as never, storage);
  const dto = { businessName: 'Prueba', legalName: 'Prueba SA', rut: '123456789012', email: 'test@example.com', password: 'password123' };
  await assert.rejects(() => service.create(dto, [{ buffer: Buffer.from('%PDF-1.7'), size: 8, mimetype: 'application/pdf', originalname: 'permiso.pdf' }]), BadRequestException);
  assert.equal(uploaded, false);
});

test('an approved application cannot be rejected afterward', async () => {
  let updated = false;
  const prisma = { customerApplication: {
    findUnique: async () => ({ status: 'APPROVED' }),
    update: async () => { updated = true; },
  } } as unknown as PrismaService;
  const service = new ApplicationsService(prisma, {} as never, {} as never, {} as never);
  await assert.rejects(() => service.reject('application-1', 'admin-1'), BadRequestException);
  assert.equal(updated, false);
});

test('admin attaches a missing permit privately and rolls back a failed database write', async () => {
  const uploaded: string[] = [];
  const removed: string[] = [];
  let count = 0;
  let fail = false;
  const storage = {
    upload: async (path: string) => { uploaded.push(path); },
    remove: async (path: string) => { removed.push(path); },
    download: async () => Buffer.from('%PDF-1.7'),
  } as unknown as InvoiceStorageService;
  const prisma = {
    customerApplication: { findUnique: async () => ({ status: 'PENDING', _count: { documents: count } }) },
    customerDocument: {
      create: async ({ data }: { data: { originalName: string } }) => {
        if (fail) throw new Error('database unavailable');
        count += 1;
        return { id: `document-${count}`, type: 'BUSINESS_PERMIT', originalName: data.originalName };
      },
      findFirst: async ({ where }: { where: { customerAccountId: string } }) => where.customerAccountId === 'customer-1'
        ? { fileUrl: uploaded[0], mimeType: 'application/pdf', originalName: 'permiso.pdf' } : null,
    },
  } as unknown as PrismaService;
  const audit: string[] = [];
  const service = new ApplicationsService(prisma, { log: async (action: string) => { audit.push(action); } } as never, {} as never, storage);
  const file = { buffer: Buffer.from('%PDF-1.7'), size: 8, mimetype: 'application/pdf', originalname: 'permiso.pdf' };
  await assert.rejects(() => service.addDocument('application-1', { ...file, buffer: Buffer.from('<script>') }, 'admin-1'), BadRequestException);
  assert.equal(uploaded.length, 0);
  assert.equal((await service.addDocument('application-1', file, 'admin-1')).originalName, 'permiso.pdf');
  assert.match(uploaded[0], /^applications\/application-1\//);
  assert.deepEqual(audit, ['APPLICATION_DOCUMENT_ADDED']);
  assert.equal((await service.customerDocument('customer-1', 'document-1')).name, 'permiso.pdf');
  await assert.rejects(() => service.customerDocument('customer-2', 'document-1'), NotFoundException);
  fail = true;
  await assert.rejects(() => service.addDocument('application-1', file, 'admin-1'), /database unavailable/);
  assert.equal(removed.length, 1);
  assert.equal(removed[0], uploaded[1]);
  fail = false;
  count = 3;
  await assert.rejects(() => service.addDocument('application-1', file, 'admin-1'), BadRequestException);
});

test('order CSV exports every filtered page and escapes spreadsheet formulas', async () => {
  const seen: number[] = [];
  const base = {
    id: 'order-1', orderNumber: '=SUM(1,1)', createdAt: new Date('2026-01-12T12:00:00Z'),
    customerAccount: { businessName: 'Comercio' }, user: { email: 'client@example.test' },
    status: 'SUBMITTED', currency: 'UYU', total: new Prisma.Decimal(100),
    creditedTotal: new Prisma.Decimal(0), paidTotal: new Prisma.Decimal(40), refundedTotal: new Prisma.Decimal(0),
  };
  const orders = { findAdminOrdersPage: async (query: { page: number }) => {
    seen.push(query.page);
    return { items: query.page === 1 ? Array.from({ length: 100 }, (_, index) => ({ ...base, id: `order-${index}` })) : [{ ...base, id: 'order-last' }],
      meta: { total: 101 } };
  } } as unknown as OrdersService;
  const service = new AdminService({} as PrismaService, {} as never, orders, {} as never);
  const stream = await service.ordersCsv({ page: 1, limit: 20, paymentStatus: 'PARTIAL' }, { role: Role.ADMIN } as never);
  let csv = '';
  for await (const chunk of stream) csv += chunk.toString();
  assert.deepEqual(seen, [1, 2]);
  assert.equal(csv.trimEnd().split('\r\n').length, 102);
  assert.match(csv, /"'=SUM\(1,1\)"/);
  assert.match(csv, /"Parcial","40","60"/);
});

test('only existing internal accounts can be assigned a staff role', async () => {
  let accountId: string | null = 'customer-1';
  let removedPermissions = false;
  const tx = {
    user: {
      findUnique: async () => ({ id: 'internal-1', email: 'staff@example.test', role: Role.CLIENT, active: true, customerAccountId: accountId }),
      update: async () => ({ id: 'internal-1', email: 'staff@example.test', role: Role.SALES, active: true }),
    },
    userPermission: { deleteMany: async () => { removedPermissions = true; } },
    auditLog: { create: async () => ({}) },
  };
  const prisma = { user: { findUnique: async () => ({ role: Role.ADMIN, customRoleId: null }) },
    $transaction: async (action: (client: typeof tx) => Promise<unknown>) => action(tx) } as unknown as PrismaService;
  const service = new AdminService(prisma, {} as never, {} as never, {} as never);
  await assert.rejects(() => service.updateStaffRole('internal-1', Role.SALES, 'admin-1'));
  accountId = null;
  const result = await service.updateStaffRole('internal-1', Role.SALES, 'admin-1');
  assert.equal(result.role, Role.SALES);
  assert.equal(removedPermissions, true);
  await assert.rejects(() => service.updateStaffRole('admin-1', Role.SALES, 'admin-1'), ForbiddenException);
});

test('suspended clients retain account access but lose purchase permission', () => {
  const permissions = [Permission.CAN_VIEW_PRICES, Permission.CAN_PLACE_ORDERS];
  assert.deepEqual(effectivePermissions(Role.CLIENT, AccountStatus.SUSPENDED, permissions), [Permission.CAN_VIEW_PRICES]);
  assert.deepEqual(effectivePermissions(Role.CLIENT, AccountStatus.APPROVED, permissions), permissions);
  assert.deepEqual(effectivePermissions(Role.ADMIN, undefined, permissions), []);
  assert.deepEqual(effectivePermissions(Role.SALES, undefined, permissions), []);
});

test('checkout rejects a suspended account even with an old token', async () => {
  const prisma = { cart: { findUnique: async () => ({ items: [{}], user: { customerAccount: { accountStatus: AccountStatus.SUSPENDED, addresses: [] } } }) } } as unknown as PrismaService;
  const orders = new OrdersService(prisma, {} as never, {} as never, {} as never, {} as never);
  await assert.rejects(() => orders.checkout({ sub: 'client-1', email: 'client@example.test', role: Role.CLIENT, permissions: [Permission.CAN_PLACE_ORDERS] }), ForbiddenException);
});

test('checkout requires one of the signed-in customer addresses when there are several', async () => {
  const prisma = { cart: { findUnique: async () => ({ items: [{}], user: { customerAccount: {
    accountStatus: AccountStatus.APPROVED,
    addresses: [
      { id: 'address-1', address: 'First' },
      { id: 'address-2', address: 'Second' },
    ],
  } } }) } } as unknown as PrismaService;
  const orders = new OrdersService(prisma, {} as never, {} as never, {} as never, {} as never);
  const user = { sub: 'client-1', email: 'client@example.test', role: Role.CLIENT, permissions: [Permission.CAN_PLACE_ORDERS] };
  await assert.rejects(() => orders.checkout(user), BadRequestException);
  await assert.rejects(() => orders.checkout(user, false, 'another-customers-address'), BadRequestException);
});

test('checkout puts orders above available credit into manual review', async () => {
  let created: Record<string, unknown> | undefined;
  const cart = { id: 'cart-1', items: [{ quantity: 1, productVariant: {
    id: 'variant-1', productId: 'product-1', name: 'Caja', sku: 'SKU-1',
    prices: [{ amount: new Prisma.Decimal('60') }],
    product: { name: 'Producto', brandId: null, laboratoryId: null, categories: [], requiresMedicationPermission: false },
  } }], user: { customerAccount: { accountStatus: AccountStatus.APPROVED, creditStatus: 'GOOD_STANDING', creditLimit: new Prisma.Decimal('100'), addresses: [{ id: 'address-1', label: 'Principal', address: 'Calle 1' }] } } };
  const tx = {
    $queryRaw: async () => [{ id: 'account-1' }],
    customerAccount: { findUniqueOrThrow: async () => ({ accountStatus: AccountStatus.APPROVED, creditLimit: new Prisma.Decimal('100') }) },
    order: {
      findMany: async () => [{ total: new Prisma.Decimal('80'), creditedTotal: new Prisma.Decimal('10'), paidTotal: new Prisma.Decimal('20'), refundedTotal: new Prisma.Decimal(0) }],
      create: async ({ data }: { data: Record<string, unknown> }) => { created = data; return { id: 'order-1' }; },
      findUnique: async () => ({ id: 'order-1', status: created?.status }),
    },
    stockReservation: { findMany: async () => [], create: async () => ({}) },
    orderItem: { create: async () => ({}) },
    productVariant: { update: async () => ({}) },
    cartItem: { deleteMany: async () => ({}) },
  };
  const prisma = { cart: { findUnique: async () => cart }, $transaction: async (action: (client: typeof tx) => Promise<unknown>) => action(tx) } as unknown as PrismaService;
  const orders = new OrdersService(prisma, { validateAvailableStock: () => {} } as never, { calculateDiscounts: async () => [] } as never, { log: async () => {} } as never, { notify: async () => {} } as never);
  const user = { sub: 'client-1', email: 'client@example.test', role: Role.CLIENT, customerAccountId: 'account-1', permissions: [Permission.CAN_PLACE_ORDERS] };
  const result = await orders.checkout(user, false, 'address-1');
  assert.equal(created?.status, OrderStatus.PENDING_REVIEW);
  assert.equal(created?.reviewReason, 'CREDIT_LIMIT_EXCEEDED');
  assert.equal(result?.status, OrderStatus.PENDING_REVIEW);
});

test('voiding a payment keeps the original and reduces the paid balance with audit', async () => {
  const amount = new Prisma.Decimal('25.50');
  let reduced = '';
  let changed: Record<string, unknown> | undefined;
  let audit: Record<string, unknown> | undefined;
  const tx = {
    orderPayment: {
      findFirst: async () => ({ id: 'payment-1', orderId: 'order-1', amount, voidedAt: null }),
      updateMany: async ({ data }: { data: Record<string, unknown> }) => { changed = data; return { count: 1 }; },
      findUniqueOrThrow: async () => ({ id: 'payment-1', ...changed }),
    },
    order: { findUniqueOrThrow: async () => ({ paidTotal: new Prisma.Decimal('25.50'), refundedTotal: new Prisma.Decimal(0) }), updateMany: async ({ data }: { data: { paidTotal: { decrement: Prisma.Decimal } } }) => { reduced = data.paidTotal.decrement.toString(); return { count: 1 }; } },
    auditLog: { create: async ({ data }: { data: Record<string, unknown> }) => { audit = data; } },
  };
  const prisma = { $transaction: async (action: (client: typeof tx) => Promise<unknown>) => action(tx) } as unknown as PrismaService;
  const service = new OrderBillingService(prisma, {} as InvoiceStorageService);
  await service.voidPayment('order-1', 'payment-1', { reason: 'Pago duplicado', requestId: '00000000-0000-4000-8000-000000000010' }, 'admin-1');
  assert.equal(reduced, '25.5');
  assert.equal(changed?.voidedById, 'admin-1');
  assert.equal(changed?.voidReason, 'Pago duplicado');
  assert.equal(audit?.action, 'ORDER_PAYMENT_VOIDED');
});

test('voiding a payment twice with a different request is rejected', async () => {
  const tx = { orderPayment: { findFirst: async () => ({ voidedAt: new Date(), voidRequestId: 'original' }) } };
  const prisma = { $transaction: async (action: (client: typeof tx) => Promise<unknown>) => action(tx) } as unknown as PrismaService;
  const service = new OrderBillingService(prisma, {} as InvoiceStorageService);
  await assert.rejects(() => service.voidPayment('order-1', 'payment-1', { reason: 'Error de importe', requestId: 'new' }, 'admin-1'), ConflictException);
});

test('replacing an invoice marks the original void and records the responsible admin', async () => {
  let voidData: Record<string, unknown> | undefined;
  let invoiceData: Record<string, unknown> | undefined;
  let audit: Record<string, unknown> | undefined;
  const tx = {
    orderInvoice: {
      updateMany: async ({ data }: { data: Record<string, unknown> }) => { voidData = data; return { count: 1 }; },
      create: async ({ data }: { data: Record<string, unknown> }) => { invoiceData = data; return { id: 'new-invoice' }; },
    },
    auditLog: { create: async ({ data }: { data: Record<string, unknown> }) => { audit = data; } },
  };
  const prisma = {
    order: { findUnique: async () => ({ id: 'order-1' }) },
    orderInvoice: { findUnique: async () => null },
    $transaction: async (action: (client: typeof tx) => Promise<unknown>) => action(tx),
  } as unknown as PrismaService;
  const service = new OrderBillingService(prisma, {} as InvoiceStorageService);
  await service.attachInvoice('order-1', undefined, {
    requestId: '00000000-0000-4000-8000-000000000011', invoiceNumber: 'A-2',
    replacesInvoiceId: 'old-invoice', replacementReason: 'Número incorrecto',
  }, 'admin-1');
  assert.equal(voidData?.voidedById, 'admin-1');
  assert.equal(invoiceData?.replacesInvoiceId, 'old-invoice');
  assert.equal(audit?.action, 'ORDER_INVOICE_REPLACED');
});

test('banner uploads require a public bucket and actual image bytes', async () => {
  assert.equal(bannerFileType(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])).mimeType, 'image/png');
  assert.throws(() => bannerFileType(Buffer.from('<script>')), BadRequestException);
  const config = { get: (key: string) => ({ SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_test' })[key as 'SUPABASE_URL' | 'SUPABASE_SECRET_KEY'] } as ConfigService;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ public: false });
  try {
    const storage = new BannerStorageService(config);
    await assert.rejects(() => storage.upload('banners/test.png', Buffer.from('image'), 'image/png'), ServiceUnavailableException);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
