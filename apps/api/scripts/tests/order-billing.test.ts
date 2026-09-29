import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { invoiceFileType, OrderBillingService } from '../../src/orders/order-billing.service';
import { InvoiceStorageService } from '../../src/orders/invoice-storage.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../src/prisma/prisma.service';

test('records an abono and increments the paid amount atomically', async () => {
  let increment: string | undefined;
  let audited = false;
  const payment = { id: 'payment-1', orderId: 'order-1', amount: new Prisma.Decimal('25.50') };
  const tx = {
    order: {
      findUnique: async () => ({ total: new Prisma.Decimal('100'), paidTotal: new Prisma.Decimal('10'), status: OrderStatus.APPROVED }),
      updateMany: async ({ data }: { data: { paidTotal: { increment: Prisma.Decimal } } }) => {
        increment = data.paidTotal.increment.toString();
        return { count: 1 };
      },
    },
    orderPayment: { create: async () => payment },
    auditLog: { create: async () => { audited = true; } },
  };
  const prisma = {
    orderPayment: { findUnique: async () => null },
    $transaction: async (action: (client: typeof tx) => Promise<unknown>) => action(tx),
  } as unknown as PrismaService;
  const service = new OrderBillingService(prisma, {} as InvoiceStorageService);
  const result = await service.recordPayment('order-1', { amount: '25.50', requestId: '00000000-0000-4000-8000-000000000001' }, 'admin-1');
  assert.equal(result, payment);
  assert.equal(increment, '25.5');
  assert.equal(audited, true);
});

test('rejects an abono above the outstanding balance', async () => {
  const tx = { order: { findUnique: async () => ({ total: new Prisma.Decimal('100'), paidTotal: new Prisma.Decimal('80'), status: OrderStatus.APPROVED }) } };
  const prisma = {
    orderPayment: { findUnique: async () => null },
    $transaction: async (action: (client: typeof tx) => Promise<unknown>) => action(tx),
  } as unknown as PrismaService;
  const service = new OrderBillingService(prisma, {} as InvoiceStorageService);
  await assert.rejects(() => service.recordPayment('order-1', { amount: '20.01', requestId: '00000000-0000-4000-8000-000000000002' }, 'admin-1'), BadRequestException);
});

test('recognizes PDF and image signatures, rejecting unsupported content', () => {
  assert.equal(invoiceFileType(Buffer.from('%PDF-1.7')).mimeType, 'application/pdf');
  assert.equal(invoiceFileType(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])).extension, 'png');
  assert.equal(invoiceFileType(Buffer.from([255, 216, 255, 1])).extension, 'jpg');
  assert.throws(() => invoiceFileType(Buffer.from('<script>')), BadRequestException);
});

test('refuses a public invoice bucket', async () => {
  const config = { get: (key: string) => ({ SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_test' })[key as 'SUPABASE_URL' | 'SUPABASE_SECRET_KEY'] } as ConfigService;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ public: true });
  try {
    const storage = new InvoiceStorageService(config);
    await assert.rejects(() => storage.upload('orders/order-1/invoice.pdf', Buffer.from('%PDF-1.7'), 'application/pdf'), ServiceUnavailableException);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
