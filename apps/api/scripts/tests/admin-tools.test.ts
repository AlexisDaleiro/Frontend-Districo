import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AdminToolsService } from '../../src/admin/admin-tools.service';
import { BulkProductActiveDto, BulkProductPricesDto } from '../../src/admin/dto/admin-tools.dto';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JwtUser } from '../../src/common/types/jwt-user.type';

const admin: JwtUser = { sub: 'admin-1', email: 'admin@example.test', role: Role.ADMIN, permissions: [] };
const base = () => ({ ids: ['product-1'], reason: 'Revision comercial', requestId: randomUUID() });

function fixture() {
  const product = { id: 'product-1', name: 'Producto', active: true, updatedAt: new Date('2026-01-01'), variants: [{
    id: 'variant-1', name: '5 kg', sku: 'SKU-1', updatedAt: new Date('2026-01-01'), prices: [{
      id: 'price-1', amount: new Prisma.Decimal('100.05'), currency: 'UYU', updatedAt: new Date('2026-01-01'), validFrom: new Date('2026-01-01'), validUntil: null as Date | null,
    }],
  }] };
  const records: { id: string; action: string; userId: string; metadata: Record<string, unknown> }[] = [];
  const effects: string[] = [];
  let available = true;
  let failUpdate = false;
  const tx = {
    product: {
      findMany: async () => available ? [product] : [],
      updateMany: async ({ data }: { data: { active: boolean } }) => { if (failUpdate) return { count: 0 }; effects.push(`active:${data.active}`); product.active = data.active; return { count: 1 }; },
    },
    priceList: { findUnique: async () => ({ id: 'list-1', active: true }) },
    price: { updateMany: async () => { effects.push('close-price'); }, createMany: async ({ data }: { data: { amount: Prisma.Decimal }[] }) => { for (const price of data) effects.push(`price:${price.amount.toFixed(2)}`); } },
    priceHistory: { createMany: async () => { effects.push('price-history'); } },
    auditLog: {
      findFirst: async ({ where }: { where: { userId: string; metadata: { equals: string } } }) => records.find((record) => record.userId === where.userId && record.metadata.requestId === where.metadata.equals) ?? null,
      create: async ({ data }: { data: Omit<typeof records[number], 'id'> }) => { const record = { id: randomUUID(), ...data }; records.push(record); return record; },
    },
  };
  const prisma = {
    ...tx,
    staffRoleAccess: { findUnique: async () => ({ canView: true, canEdit: false }) },
    customStaffRoleAccess: { findUnique: async () => null },
    $transaction: async (callback: (client: typeof tx) => Promise<unknown>, options: { isolationLevel: string }) => {
      assert.equal(options.isolationLevel, 'Serializable');
      const previousActive = product.active, previousEffects = effects.length, previousRecords = records.length;
      try { return await callback(tx); }
      catch (error) { product.active = previousActive; effects.splice(previousEffects); records.splice(previousRecords); throw error; }
    },
  } as unknown as PrismaService;
  return { service: new AdminToolsService(prisma), product, effects, records, setAvailable: (value: boolean) => { available = value; }, failUpdate: () => { failUpdate = true; } };
}

test('bulk activation previews without mutation and requires confirmation', async () => {
  const f = fixture();
  const dto = { ...base(), active: false };
  const preview = await f.service.productsActive(dto, admin, true);
  assert.ok('token' in preview);
  assert.equal(f.product.active, true);
  assert.equal(f.effects.length, 0);
  await assert.rejects(() => f.service.productsActive(dto, admin), ConflictException);
  const result = await f.service.productsActive({ ...dto, previewToken: preview.token }, admin);
  assert.equal(result.changed, 1);
  assert.equal(f.product.active, false);
  assert.equal(f.records[0].metadata.reason, dto.reason);
  assert.deepEqual(f.records[0].metadata.entries, [{ id: 'product-1', name: 'Producto', before: 'Activo', after: 'Inactivo', changed: true }]);
});

test('the same request cannot apply twice or change its payload', async () => {
  const f = fixture(), dto = { ...base(), active: false };
  const preview = await f.service.productsActive(dto, admin, true);
  assert.ok('token' in preview);
  const first = await f.service.productsActive({ ...dto, previewToken: preview.token }, admin);
  const repeated = await f.service.productsActive({ ...dto, previewToken: preview.token }, admin);
  assert.deepEqual(repeated, first);
  assert.equal(f.effects.length, 1);
  assert.equal(f.records.length, 1);
  await assert.rejects(() => f.service.productsActive({ ...dto, active: true, previewToken: preview.token }, admin), ConflictException);
});

test('a stale preview, deleted product, or concurrency conflict cannot apply a batch', async () => {
  const f = fixture(), dto = { ...base(), active: false };
  const preview = await f.service.productsActive(dto, admin, true);
  assert.ok('token' in preview);
  f.product.updatedAt = new Date('2026-02-01');
  await assert.rejects(() => f.service.productsActive({ ...dto, previewToken: preview.token }, admin), ConflictException);
  f.setAvailable(false);
  await assert.rejects(() => f.service.productsActive(dto, admin, true), BadRequestException);
  f.setAvailable(true);
  const refreshed = await f.service.productsActive(dto, admin, true);
  assert.ok('token' in refreshed);
  f.failUpdate();
  await assert.rejects(() => f.service.productsActive({ ...dto, previewToken: refreshed.token }, admin), ConflictException);
  assert.equal(f.effects.length, 0);
  assert.equal(f.records.length, 0);
});

test('read-only and custom denied roles cannot preview or execute mutations', async () => {
  const f = fixture(), dto = { ...base(), active: false };
  for (const member of [{ ...admin, role: Role.CATALOG }, { ...admin, role: Role.CUSTOM, customRoleId: 'role-1' }, { ...admin, role: Role.CLIENT }]) {
    await assert.rejects(() => f.service.productsActive(dto, member, true), ForbiddenException);
    await assert.rejects(() => f.service.productsActive(dto, member), ForbiddenException);
  }
});

test('price percentage uses decimal rounding, expires prices, and writes both histories', async () => {
  const f = fixture(), dto = { ...base(), mode: 'PERCENTAGE' as const, value: 10 };
  const preview = await f.service.productsPrices(dto, admin, true);
  assert.ok('token' in preview);
  assert.equal(preview.entries[0].before, '100.05 UYU');
  assert.equal(preview.entries[0].after, '110.06 UYU');
  assert.equal(f.effects.length, 0);
  await f.service.productsPrices({ ...dto, previewToken: preview.token }, admin);
  assert.deepEqual(f.effects, ['close-price', 'price:110.06', 'price-history']);
  assert.equal(f.records[0].action, 'ADMIN_BULK_PRODUCTS_PRICES');
});

test('fixed prices can fill missing prices while percentage adjustments fail atomically', async () => {
  const f = fixture(); f.product.variants[0].prices = [];
  await assert.rejects(() => f.service.productsPrices({ ...base(), mode: 'PERCENTAGE', value: 10 }, admin, true), BadRequestException);
  const fixed = await f.service.productsPrices({ ...base(), mode: 'FIXED', value: 123.45 }, admin, true);
  assert.ok('token' in fixed);
  assert.equal(fixed.entries[0].before, 'Sin precio');
  assert.equal(fixed.entries[0].after, '123.45 UYU');
  assert.equal(f.effects.length, 0);
});

test('invalid percentages and unsupported currencies are rejected', async () => {
  const f = fixture();
  for (const value of [-100, 0, 1001, NaN]) await assert.rejects(() => f.service.productsPrices({ ...base(), mode: 'PERCENTAGE', value }, admin, true), BadRequestException);
  f.product.variants[0].prices[0].currency = 'USD';
  await assert.rejects(() => f.service.productsPrices({ ...base(), mode: 'FIXED', value: 100 }, admin, true), BadRequestException);
});

test('search skips denied groups and scopes sellers to assigned accounts and orders', async () => {
  const calls: Record<string, Prisma.CustomerAccountWhereInput | Prisma.OrderWhereInput> = {};
  const prisma = {
    staffRoleAccess: { findUnique: async ({ where }: { where: { role_feature: { feature: string } } }) => ({ canView: where.role_feature.feature !== 'catalogo', canEdit: false }) },
    customerAccount: { findMany: async ({ where }: { where: Prisma.CustomerAccountWhereInput }) => { calls.customers = where; return []; } },
    order: { findMany: async ({ where }: { where: Prisma.OrderWhereInput }) => { calls.orders = where; return []; } },
    product: { findMany: async () => { assert.fail('must not query forbidden products'); } },
  } as unknown as PrismaService;
  const result = await new AdminToolsService(prisma).search('commerce', { ...admin, role: Role.SALES });
  assert.deepEqual(result, { customers: [], orders: [], products: [] });
  assert.deepEqual((calls.customers as Prisma.CustomerAccountWhereInput).salesperson, { is: { userId: admin.sub } });
  assert.deepEqual((calls.orders as Prisma.OrderWhereInput).customerAccount, { is: { salesperson: { is: { userId: admin.sub } } } });
});

test('DTO rejects duplicate IDs, oversized batches, empty motives and invalid price numbers', async () => {
  for (const data of [{ ...base(), ids: ['same', 'same'] }, { ...base(), ids: Array.from({ length: 101 }, (_, i) => `p-${i}`) }, { ...base(), reason: '  ' }]) {
    assert.ok((await validate(plainToInstance(BulkProductActiveDto, { ...data, active: false }))).length);
  }
  assert.ok((await validate(plainToInstance(BulkProductPricesDto, { ...base(), mode: 'FIXED', value: '100' }))).length);
});

test('customer reassignment requires both permissions, active seller and scoped customers', async () => {
  let sellerActive = false, scopeMismatch = false, failSecond = false;
  const owners: Record<string, string | null> = { one: 'previous', two: null };
  const records: unknown[] = [];
  const user = { ...admin, role: Role.SALES };
  const tx = {
    auditLog: { findFirst: async () => null, create: async ({ data }: { data: unknown }) => { records.push(data); return { id: 'batch-1' }; } },
    user: { findUnique: async () => ({ id: 'seller-2', role: Role.SALES, active: sellerActive, emailVerified: true, customerAccountId: null, salesperson: { id: 'profile-2', name: 'Seller Two' } }) },
    customerAccount: {
      findMany: async ({ where }: { where: Prisma.CustomerAccountWhereInput }) => {
        assert.deepEqual(where.salesperson, { is: { userId: user.sub } });
        return scopeMismatch ? [] : Object.entries(owners).map(([id, salespersonId]) => ({ id, businessName: id, salespersonId, updatedAt: new Date('2026-01-01'), salesperson: salespersonId ? { name: 'Previous' } : null }));
      },
      updateMany: async ({ where, data }: { where: { id: string }; data: { salespersonId: string } }) => {
        if (failSecond && where.id === 'two') return { count: 0 };
        owners[where.id] = data.salespersonId; return { count: 1 };
      },
    },
  };
  let allowed = true;
  const prisma = {
    staffRoleAccess: { findUnique: async () => ({ canView: allowed, canEdit: allowed }) },
    $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => {
      const before = { ...owners }, count = records.length;
      try { return await callback(tx); }
      catch (error) { Object.assign(owners, before); records.splice(count); throw error; }
    },
  } as unknown as PrismaService;
  const service = new AdminToolsService(prisma);
  const dto = { ...base(), ids: ['one', 'two'], salespersonUserId: 'seller-2' };
  await assert.rejects(() => service.customersSeller(dto, user, true), BadRequestException);
  sellerActive = true; allowed = false;
  await assert.rejects(() => service.customersSeller(dto, user, true), ForbiddenException);
  allowed = true; scopeMismatch = true;
  await assert.rejects(() => service.customersSeller(dto, user, true), ForbiddenException);
  scopeMismatch = false;
  const preview = await service.customersSeller(dto, user, true);
  assert.ok('token' in preview);
  assert.equal(preview.changed, 2);
  failSecond = true;
  await assert.rejects(() => service.customersSeller({ ...dto, previewToken: preview.token }, user), ConflictException);
  assert.deepEqual(owners, { one: 'previous', two: null });
  assert.equal(records.length, 0);
  failSecond = false;
  await service.customersSeller({ ...dto, previewToken: preview.token }, user);
  assert.deepEqual(owners, { one: 'profile-2', two: 'profile-2' });
  assert.equal(records.length, 3);
});

test('batch history never queries data without view access and limits SALES to their own batches', async () => {
  let allowed = false;
  const queries: Prisma.AuditLogWhereInput[] = [];
  const prisma = {
    staffRoleAccess: { findUnique: async () => ({ canView: allowed, canEdit: false }) },
    auditLog: {
      findMany: async ({ where }: { where: Prisma.AuditLogWhereInput }) => { queries.push(where); return []; },
      count: async () => 0,
    },
  } as unknown as PrismaService;
  const service = new AdminToolsService(prisma);
  const user = { ...admin, role: Role.SALES };
  await assert.rejects(() => service.history({ feature: 'vendedores', page: 1, limit: 10 }, user), ForbiddenException);
  assert.equal(queries.length, 0);
  allowed = true;
  await service.history({ feature: 'vendedores', page: 1, limit: 10 }, user);
  assert.equal(queries[0].userId, user.sub);
  assert.deepEqual(queries[0].action, { in: ['ADMIN_BULK_CUSTOMERS_SALESPERSON'] });
});
