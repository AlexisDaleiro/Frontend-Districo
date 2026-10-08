import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ProductReturnsService } from '../../src/orders/product-returns.service';
import { RecordProductReturnDto } from '../../src/orders/dto/record-product-return.dto';
import { PrismaService } from '../../src/prisma/prisma.service';
import { staffFeatureForPath } from '../../src/common/staff-role-access';

function setup() {
  const order = { id: 'order-1', status: 'SHIPPED', total: 100, paidTotal: 30, creditedTotal: 0,
    items: [{ id: 'item-1', variantId: 'variant-1', productName: 'Alimento', variantName: '10 kg', sku: 'A10', quantity: 5 }],
    returns: [] as { id: string; orderId: string; recordedById: string; reason: string; requestId: string; items: RecordProductReturnDto['items'] }[],
    reservations: [{ variantId: 'variant-1', quantity: 5, status: 'CONSUMED' }] };
  const variant = { id: 'variant-1', physicalStock: 10, reservedStock: 2, deletedAt: null as Date | null, active: false };
  const audit: unknown[] = [];
  const locks: string[] = [];
  const tx = {
    $queryRaw: async (query: TemplateStringsArray | Prisma.Sql) => { locks.push(Array.isArray(query) ? query.join('') : (query as Prisma.Sql).sql); return []; },
    order: { findUnique: async () => order },
    orderReturn: {
      findUnique: async ({ where }: { where: { requestId: string } }) => order.returns.find((item) => item.requestId === where.requestId) ?? null,
      create: async ({ data }: { data: { orderId: string; recordedById: string; reason: string; requestId: string; items: { create: RecordProductReturnDto['items'] } } }) => {
        const receipt = { ...data, id: `return-${order.returns.length}`, items: structuredClone(data.items.create) }; order.returns.push(receipt); return receipt;
      },
    },
    productVariant: {
      findMany: async () => [variant],
      update: async ({ data }: { data: { physicalStock: { increment: number } } }) => { variant.physicalStock += data.physicalStock.increment; return variant; },
    },
    auditLog: { create: async (input: unknown) => { audit.push(input); } },
  };
  const prisma = { $transaction: async (action: (client: typeof tx) => Promise<unknown>, options: { isolationLevel: string }) => {
    assert.equal(options.isolationLevel, 'Serializable');
    const snapshot = structuredClone({ order, variant, audit });
    try { return await action(tx); } catch (error) { Object.assign(order, snapshot.order); Object.assign(variant, snapshot.variant); audit.splice(0, audit.length, ...snapshot.audit); throw error; }
  } } as unknown as PrismaService;
  const service = new ProductReturnsService(prisma);
  const dto: RecordProductReturnDto = { requestId: '00000000-0000-4000-8000-000000000001', reason: 'Recepcion parcial', items: [{ orderItemId: 'item-1', quantity: 3, restockedQuantity: 2 }] };
  const preview = () => service.record(order.id, dto, 'actor-1', true) as Promise<{ token: string; stock: { before: number; after: number }[] }>;
  return { order, variant, audit, locks, tx, service, dto, preview };
}

test('preview is read-only; receipt restocks only sellable quantities and preserves billing', async () => {
  const s = setup();
  const preview = await s.preview();
  assert.deepEqual(preview.stock.map(({ before, after }) => ({ before, after })), [{ before: 10, after: 12 }]);
  assert.equal(s.order.returns.length, 0); assert.equal(s.variant.physicalStock, 10); assert.equal(s.audit.length, 0);
  await s.service.record(s.order.id, { ...s.dto, previewToken: preview.token }, 'actor-1');
  assert.equal(s.variant.physicalStock, 12); assert.equal(s.variant.reservedStock, 2); assert.equal(s.variant.active, false);
  assert.equal(s.order.returns[0].items[0].quantity, 3); assert.equal(s.order.returns[0].items[0].restockedQuantity, 2);
  assert.equal(s.order.paidTotal, 30); assert.equal(s.order.creditedTotal, 0); assert.equal(s.audit.length, 1);
  assert.match(s.locks[0], /Order.*FOR UPDATE/); assert.ok(s.locks.some((item) => /ProductVariant.*FOR UPDATE/.test(item)));
});

test('retry is idempotent and request identifiers cannot be reused with different input or actor', async () => {
  const s = setup(); const preview = await s.preview(); const dto = { ...s.dto, previewToken: preview.token };
  const receipt = await s.service.record(s.order.id, dto, 'actor-1');
  assert.equal(await s.service.record(s.order.id, dto, 'actor-1'), receipt);
  assert.equal(s.variant.physicalStock, 12); assert.equal(s.audit.length, 1);
  await assert.rejects(() => s.service.record(s.order.id, { ...dto, reason: 'Otro motivo' }, 'actor-1'), ConflictException);
  await assert.rejects(() => s.service.record(s.order.id, dto, 'actor-2'), ConflictException);
});

test('partial returns are cumulative and remaining quantities can be received without restocking', async () => {
  const s = setup(); await s.service.record(s.order.id, { ...s.dto, previewToken: (await s.preview()).token }, 'actor-1');
  s.dto.requestId = '00000000-0000-4000-8000-000000000002';
  await assert.rejects(s.preview, BadRequestException);
  s.dto.items[0].quantity = 2; s.dto.items[0].restockedQuantity = 0;
  await s.service.record(s.order.id, { ...s.dto, previewToken: (await s.preview()).token }, 'actor-1');
  assert.equal(s.order.returns.length, 2); assert.equal(s.variant.physicalStock, 12);
  s.dto.requestId = '00000000-0000-4000-8000-000000000003'; s.dto.items[0].quantity = 1;
  await assert.rejects(s.preview, BadRequestException);
});

test('cannot restock without a consumed reservation or into a deleted variant', async () => {
  const s = setup(); s.order.reservations = [];
  await assert.rejects(s.preview, /salida de stock/);
  s.dto.items[0].restockedQuantity = 0; await s.preview();
  s.order.reservations = [{ variantId: 'variant-1', quantity: 5, status: 'CONSUMED' }]; s.dto.items[0].restockedQuantity = 1; s.variant.deletedAt = new Date();
  await assert.rejects(s.preview, /eliminada/);
});

test('stale previews and missing confirmation cannot change stock or history', async () => {
  const s = setup(); const preview = await s.preview(); s.variant.physicalStock++;
  await assert.rejects(() => s.service.record(s.order.id, { ...s.dto, previewToken: preview.token }, 'actor-1'), ConflictException);
  await assert.rejects(() => s.service.record(s.order.id, s.dto, 'actor-1'), ConflictException);
  assert.equal(s.variant.physicalStock, 11); assert.equal(s.order.returns.length, 0); assert.equal(s.audit.length, 0);
});

test('validates status, ownership, duplicate items, integers, restock bounds and overflow', async () => {
  const s = setup(); s.order.status = 'PROCESSING'; await assert.rejects(s.preview, BadRequestException); s.order.status = 'DELIVERED';
  s.dto.items[0].orderItemId = 'foreign-item'; await assert.rejects(s.preview, BadRequestException); s.dto.items[0].orderItemId = 'item-1';
  s.dto.items.push({ ...s.dto.items[0] }); await assert.rejects(s.preview, BadRequestException); s.dto.items.pop();
  s.dto.items[0].quantity = 1.2; await assert.rejects(s.preview, BadRequestException); s.dto.items[0].quantity = 1;
  await assert.rejects(s.preview, BadRequestException); s.dto.items[0].restockedQuantity = 1; s.variant.physicalStock = 2147483647;
  await assert.rejects(s.preview, BadRequestException);
});

test('transaction rolls receipt and stock back if audit fails', async () => {
  const s = setup(); const preview = await s.preview(); s.tx.auditLog.create = async () => { throw new Error('audit unavailable'); };
  await assert.rejects(() => s.service.record(s.order.id, { ...s.dto, previewToken: preview.token }, 'actor-1'), /audit unavailable/);
  assert.equal(s.order.returns.length, 0); assert.equal(s.variant.physicalStock, 10);
});

test('nested input is validated and physical returns use order permissions rather than billing', async () => {
  const good = setup().dto;
  assert.equal((await validate(plainToInstance(RecordProductReturnDto, good))).length, 0);
  for (const input of [{ ...good, requestId: 'bad' }, { ...good, items: [] }, { ...good, items: [{ orderItemId: 'item-1', quantity: 1.5, restockedQuantity: -1 }] }])
    assert.ok((await validate(plainToInstance(RecordProductReturnDto, input))).length > 0);
  assert.equal(staffFeatureForPath('/api/admin/orders/order-1/returns/preview'), 'pedidos');
  assert.equal(staffFeatureForPath('/api/admin/staff/roles/role-1/duplicate'), 'roles');
});

test('concurrent conflicts are reported as recoverable conflicts', async () => {
  const prisma = { $transaction: async () => { throw new Prisma.PrismaClientKnownRequestError('race', { code: 'P2034', clientVersion: 'test' }); } } as unknown as PrismaService;
  await assert.rejects(() => new ProductReturnsService(prisma).record('order-1', setup().dto, 'actor-1'), ConflictException);
});
