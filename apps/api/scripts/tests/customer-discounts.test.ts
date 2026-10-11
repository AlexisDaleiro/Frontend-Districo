import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CustomerDiscountMode, Permission, Prisma, Role } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { calculateCustomerDiscounts } from '../../src/common/business/customer-discounts';
import { defaultStaffAccess, staffFeatureForPath } from '../../src/common/staff-role-access';
import { AdminService } from '../../src/admin/admin.service';
import { UpdateCustomerDiscountDto } from '../../src/admin/dto/update-customer-discount.dto';
import { PrismaService } from '../../src/prisma/prisma.service';
import { OrdersService } from '../../src/orders/orders.service';
import { omitCustomerDiscounts } from '../../src/admin/customer-discount-visibility.interceptor';
import { StreamableFile } from '@nestjs/common';

const lines = [{ unitPrice: 100, quantity: 1 }, { unitPrice: 50, quantity: 2 }];
const promotion = [{ lineIndex: 0, amount: 30 }];
test('best discount is selected per line; ties preserve the promotion', () => {
  const result = calculateCustomerDiscounts(lines, promotion, { discountPercentage: 10 });
  assert.equal(result.subtotal, 200); assert.equal(result.discountTotal, 40); assert.equal(result.total, 160);
  assert.equal(result.promotionDiscountTotal, 30); assert.equal(result.customerDiscountTotal, 10);
  assert.equal(result.lines[0].customerDiscount, 0); assert.equal(result.lines[1].customerDiscount, 10);
  const tie = calculateCustomerDiscounts(lines, [{ lineIndex: 0, amount: 10 }], { discountPercentage: 10 });
  assert.equal(tie.lines[0].promotionDiscount, 10); assert.equal(tie.lines[0].customerDiscount, 0);
});
test('stack applies the customer percentage after promotions, not by summing percentages', () => {
  const result = calculateCustomerDiscounts(lines, promotion, { discountPercentage: 10, discountMode: CustomerDiscountMode.STACK });
  assert.equal(result.total, 153); assert.equal(result.customerDiscountTotal, 17); assert.equal(result.discountTotal, 47);
});
test('zero discounts preserve pricing; discounts never exceed the line price', () => {
  assert.equal(calculateCustomerDiscounts(lines, []).total, 200);
  for (const mode of Object.values(CustomerDiscountMode)) {
    const result = calculateCustomerDiscounts(lines, [{ lineIndex: 0, amount: 90 }, { lineIndex: 0, amount: 60 }], { discountPercentage: 100, discountMode: mode });
    assert.equal(result.total, 0); assert.equal(result.discountTotal, 200);
    assert.equal(result.customerDiscountTotal + result.promotionDiscountTotal, result.discountTotal);
  }
});
test('money is rounded once per line and reconciles exactly to cents', () => {
  const result = calculateCustomerDiscounts([{ unitPrice: 0.05, quantity: 1 }, { unitPrice: 0.05, quantity: 1 }], [], { discountPercentage: '10.00' });
  assert.equal(result.customerDiscountTotal, 0.02); assert.equal(result.total, 0.08);
  assert.equal(result.subtotal, result.total + result.discountTotal);
});
test('DTO rejects missing, null, nonnumeric, invalid modes and excessive precision', async () => {
  for (const input of [{}, { discountPercentage: null }, ...[-1, 101, 10.001, NaN, '10', true].map((discountPercentage) => ({ discountPercentage })), { discountPercentage: 10, discountMode: 'ANY' }]) {
    assert.ok((await validate(plainToInstance(UpdateCustomerDiscountDto, { discountMode: 'BEST_PRICE', ...input }))).length);
  }
  assert.equal((await validate(plainToInstance(UpdateCustomerDiscountDto, { discountPercentage: 10.25, discountMode: 'STACK' }))).length, 0);
});
test('assigned sellers can edit discounts independently from customer credit or medications', async () => {
  let owner = 'seller'; let override: { canView: boolean; canEdit: boolean } | null = null;
  let record = { id: 'account', discountPercentage: new Prisma.Decimal(0), discountMode: CustomerDiscountMode.BEST_PRICE as CustomerDiscountMode, updatedAt: new Date(), internalCreditNote: 'private', creditLimit: new Prisma.Decimal(800) };
  const audits: { action: string; metadata: unknown }[] = [];
  const tx = {
    $queryRaw: async () => [], staffRoleAccess: { findUnique: async ({ where }: { where: { role_feature: { feature: string } } }) => where.role_feature.feature === 'descuentos-clientes' ? override : null },
    customerAccount: { findUnique: async () => ({ ...record, salesperson: { userId: owner } }),
      update: async ({ data }: { data: { discountPercentage: number; discountMode: CustomerDiscountMode } }) => {
        record = { ...record, ...data, discountPercentage: new Prisma.Decimal(data.discountPercentage) }; return record;
      } },
    auditLog: { create: async ({ data }: { data: { action: string; metadata: unknown } }) => { audits.push(data); } },
  };
  const prisma = { $transaction: async (action: (client: typeof tx) => Promise<unknown>) => action(tx) } as unknown as PrismaService;
  const service = new AdminService(prisma, {} as never, {} as never, {} as never);
  const seller = { sub: 'seller', role: Role.SALES } as never;
  const dto = { discountPercentage: 12.5, discountMode: CustomerDiscountMode.STACK };
  const result = await service.updateCustomerDiscount('account', dto, seller);
  assert.equal(Number(result.discountPercentage), 12.5); assert.ok(!('internalCreditNote' in result)); assert.ok(!('creditLimit' in result));
  assert.equal(Number(record.creditLimit), 800); assert.equal(audits[0].action, 'CUSTOMER_DISCOUNT_UPDATED');
  assert.deepEqual(audits[0].metadata, { before: { discountPercentage: 0, discountMode: 'BEST_PRICE' }, after: dto });
  await service.updateCustomerDiscount('account', dto, seller); assert.equal(audits.length, 1, 'Unchanged retries do not duplicate history.');
  owner = 'other'; await assert.rejects(() => service.updateCustomerDiscount('account', { ...dto, discountPercentage: 20 }, seller), ForbiddenException);
  owner = 'seller'; override = { canView: true, canEdit: false };
  await assert.rejects(() => service.updateCustomerDiscount('account', { ...dto, discountPercentage: 20 }, seller), ForbiddenException);
  await assert.rejects(() => service.updateCustomerDiscount('account', dto, { role: Role.CLIENT } as never), ForbiddenException);
  await assert.rejects(() => service.updateCustomerDiscount('account', { ...dto, discountPercentage: 20.001 }, seller), BadRequestException);
  assert.equal(audits.length, 1);
  assert.equal(staffFeatureForPath('/api/admin/customers/account/discount'), 'descuentos-clientes');
  assert.equal(defaultStaffAccess(Role.SALES, 'clientes').canEdit, false);
});
test('checkout snapshots the locked current discount, uses net credit and installment amounts', async () => {
  let percentage = 10; let mode: CustomerDiscountMode = CustomerDiscountMode.BEST_PRICE;
  let created: Record<string, unknown> = {}; const items: { discount: number; subtotal: number }[] = [];
  const account = { accountStatus: 'APPROVED', creditStatus: 'GOOD_STANDING', discountPercentage: 0, addresses: [{ id: 'address', label: 'Principal', address: 'Calle QA' }] };
  const cart = { id: 'cart', user: { customerAccount: account }, items: lines.map((line, i) => ({ quantity: line.quantity, productVariant: {
    id: `v${i}`, productId: `p${i}`, sku: `SKU${i}`, name: 'Presentación', prices: [{ amount: new Prisma.Decimal(line.unitPrice) }],
    product: { name: 'Producto QA', categories: [], requiresMedicationPermission: false },
  } })) };
  const tx = { $queryRaw: async () => [],
    customerAccount: { findUniqueOrThrow: async () => ({ ...account, creditLimit: new Prisma.Decimal(175), discountPercentage: percentage, discountMode: mode }) },
    order: { findMany: async () => [{ total: new Prisma.Decimal(20), paidTotal: new Prisma.Decimal(0), creditedTotal: new Prisma.Decimal(0), refundedTotal: new Prisma.Decimal(0) }],
      create: async ({ data }: { data: Record<string, unknown> }) => { created = data; return { id: 'order' }; }, findUnique: async () => ({ id: 'order', ...created }) },
    orderItem: { create: async ({ data }: { data: { discount: number; subtotal: number } }) => { items.push(data); } },
    stockReservation: { findMany: async () => [], create: async () => ({}) }, productVariant: { update: async () => ({}) }, cartItem: { deleteMany: async () => ({}) },
  };
  const prisma = { $queryRaw: async () => [], cart: { findUnique: async () => cart }, $transaction: async (run: (db: typeof tx) => Promise<unknown>) => run(tx) } as unknown as PrismaService;
  const service = new OrdersService(prisma, { validateAvailableStock: () => {} } as never, { calculateDiscounts: async () => promotion } as never, { log: async () => {} } as never, { notify: async () => {} } as never);
  const user = { sub: 'buyer', role: Role.CLIENT, customerAccountId: 'account', permissions: [Permission.CAN_PLACE_ORDERS] } as never;
  await service.checkout(user, false, 'address', { paymentMethod: 'INSTALLMENTS', paymentTermMonths: 3 });
  assert.equal(Number(created.total), 160); assert.equal(created.customerDiscountPercentage, 10); assert.equal(created.customerDiscountTotal, 10);
  assert.equal(created.reviewReason, 'CREDIT_LIMIT_EXCEEDED'); assert.equal(items.reduce((sum, item) => sum + item.subtotal, 0), 160);
  assert.equal((created.paymentSchedule as { amountCents: number }[]).reduce((sum, item) => sum + item.amountCents, 0), 16000);
  const snapshot = { ...created }; mode = CustomerDiscountMode.STACK;
  await service.checkout(user, false, 'address'); assert.equal(Number(created.total), 153); assert.equal(created.requiresManualReview, false);
  percentage = 0; await service.checkout(user, false, 'address'); assert.equal(Number(created.total), 170);
  assert.equal(Number(snapshot.total), 160); assert.equal(snapshot.customerDiscountTotal, 10);
});
test('migration is additive and protects rate bounds without changing historical totals', () => {
  const sql = readFileSync(resolve(__dirname, '../../prisma/migrations/20261011002000_customer_discounts/migration.sql'), 'utf8');
  assert.match(sql, /DEFAULT 0/); assert.match(sql, /BETWEEN 0 AND 100/); assert.doesNotMatch(sql, /UPDATE\s+"Order"|DROP|DELETE/i);
});
test('discount visibility removes current and historical settings from nested lists without breaking money or downloads', () => {
  const date = new Date(); const price = new Prisma.Decimal('63.10'); const file = new StreamableFile(Buffer.from('PDF'));
  const result = omitCustomerDiscounts({ items: [{ total: price, date, customerDiscountPercentage: 10, customerDiscountTotal: 7,
    customerAccount: { id: 'account', discountPercentage: 10, discountMode: 'STACK', discountChanges: [] } }], file }) as { items: Record<string, unknown>[]; file: StreamableFile };
  assert.ok(!('customerDiscountPercentage' in result.items[0])); assert.ok(!('customerDiscountTotal' in result.items[0]));
  assert.deepEqual(result.items[0].customerAccount, { id: 'account' }); assert.equal(result.items[0].total, price); assert.equal(result.items[0].date, date);
  assert.equal(result.file, file); assert.equal(JSON.stringify(result.items[0].total), JSON.stringify(price));
});
