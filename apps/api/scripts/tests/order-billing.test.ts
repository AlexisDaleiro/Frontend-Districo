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

test('registers an invoice number without uploading a file', async () => {
  let created: Record<string, unknown> | undefined;
  let uploaded = false;
  const tx = {
    orderInvoice: { create: async ({ data }: { data: Record<string, unknown> }) => {
      created = data;
      return { id: 'invoice-1', invoiceNumber: data.invoiceNumber, originalName: null };
    } },
    auditLog: { create: async () => ({}) },
  };
  const prisma = {
    order: { findUnique: async () => ({ id: 'order-1' }) },
    orderInvoice: { findUnique: async () => null },
    $transaction: async (action: (client: typeof tx) => Promise<unknown>) => action(tx),
  } as unknown as PrismaService;
  const storage = { upload: async () => { uploaded = true; } } as unknown as InvoiceStorageService;
  const service = new OrderBillingService(prisma, storage);

  const result = await service.attachInvoice('order-1', undefined, {
    requestId: '00000000-0000-4000-8000-000000000003', invoiceNumber: ' A-123 ',
  }, 'admin-1');

  assert.deepEqual(result, { id: 'invoice-1', invoiceNumber: 'A-123', originalName: null });
  assert.equal(created?.storagePath, null);
  assert.equal(created?.size, null);
  assert.equal(uploaded, false);
});

test('registers a file and number together in private storage', async () => {
  let uploadedPath = '';
  let created: Record<string, unknown> | undefined;
  const tx = {
    orderInvoice: { create: async ({ data }: { data: Record<string, unknown> }) => {
      created = data;
      return { id: 'invoice-2', invoiceNumber: data.invoiceNumber, originalName: data.originalName };
    } },
    auditLog: { create: async () => ({}) },
  };
  const prisma = {
    order: { findUnique: async () => ({ id: 'order-1' }) },
    orderInvoice: { findUnique: async () => null },
    $transaction: async (action: (client: typeof tx) => Promise<unknown>) => action(tx),
  } as unknown as PrismaService;
  const storage = { upload: async (path: string) => { uploadedPath = path; } } as unknown as InvoiceStorageService;
  const service = new OrderBillingService(prisma, storage);
  const bytes = Buffer.from('%PDF-1.7');

  await service.attachInvoice('order-1', { buffer: bytes, size: bytes.length, originalname: 'factura.pdf' }, {
    requestId: '00000000-0000-4000-8000-000000000004', invoiceNumber: 'B-456',
  }, 'admin-1');

  assert.match(uploadedPath, /^orders\/order-1\/.+\.pdf$/);
  assert.equal(created?.invoiceNumber, 'B-456');
  assert.equal(created?.originalName, 'factura.pdf');
});

test('registers a file without an invoice number', async () => {
  let created: Record<string, unknown> | undefined;
  const tx = {
    orderInvoice: { create: async ({ data }: { data: Record<string, unknown> }) => {
      created = data;
      return { id: 'invoice-3', invoiceNumber: null, originalName: data.originalName };
    } },
    auditLog: { create: async () => ({}) },
  };
  const prisma = {
    order: { findUnique: async () => ({ id: 'order-1' }) },
    orderInvoice: { findUnique: async () => null },
    $transaction: async (action: (client: typeof tx) => Promise<unknown>) => action(tx),
  } as unknown as PrismaService;
  const storage = { upload: async () => ({}) } as unknown as InvoiceStorageService;
  const service = new OrderBillingService(prisma, storage);
  const bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  await service.attachInvoice('order-1', { buffer: bytes, size: bytes.length, originalname: 'scan.png' }, {
    requestId: '00000000-0000-4000-8000-000000000006',
  }, 'admin-1');

  assert.equal(created?.invoiceNumber, null);
  assert.equal(created?.originalName, 'scan.png');
});

test('rejects an empty invoice and does not download a number-only invoice', async () => {
  const prisma = {
    orderInvoice: { findFirst: async () => ({ storagePath: null, mimeType: null, originalName: null }) },
  } as unknown as PrismaService;
  const service = new OrderBillingService(prisma, {} as InvoiceStorageService);
  await assert.rejects(() => service.attachInvoice('order-1', undefined, {
    requestId: '00000000-0000-4000-8000-000000000005',
  }, 'admin-1'), BadRequestException);
  await assert.rejects(() => service.invoice('order-1', 'invoice-1'), /no tiene archivo adjunto/);
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
