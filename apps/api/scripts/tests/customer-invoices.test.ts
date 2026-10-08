import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PDFDocument, PDFName } from 'pdf-lib';
import { CustomerInvoicesService } from '../../src/orders/customer-invoices.service';
import { CustomerInvoiceQueryDto } from '../../src/orders/dto/customer-invoice-query.dto';
import { InvoiceStorageService } from '../../src/orders/invoice-storage.service';
import { invoicePdf } from '../../src/orders/invoice-pdf';
import { PrismaService } from '../../src/prisma/prisma.service';

test('lists only the authenticated customer invoices, paginates and never exposes storage paths', async () => {
  const queries: any[] = [];
  const prisma = {
    orderInvoice: {
      findMany: async (query: any) => { queries.push(query); return [{ id: 'invoice-1', invoiceNumber: 'A-1', createdAt: new Date(), voidedAt: null, storagePath: 'private/file', mimeType: 'image/png', order: { id: 'order-1', orderNumber: 'DIS-1' } }]; },
      count: async (query: any) => { queries.push(query); return 25; },
    },
    $transaction: async (tasks: Promise<unknown>[]) => Promise.all(tasks),
  } as unknown as PrismaService;
  const service = new CustomerInvoicesService(prisma, {} as InvoiceStorageService);
  const result = await service.list('customer-1', { page: 2, limit: 20, search: ' DIS-1 ' });
  assert.equal(queries[0].where.order.userId, 'customer-1');
  assert.deepEqual(queries[1].where, queries[0].where);
  assert.equal(queries[0].skip, 20);
  assert.equal(queries[0].take, 20);
  assert.equal(queries[0].where.OR[1].order.orderNumber.contains, 'DIS-1');
  assert.equal(result.items[0].hasFile, true);
  assert.equal('storagePath' in result.items[0], false);
  assert.equal('mimeType' in result.items[0], false);
  assert.deepEqual(result.meta, { total: 25, page: 2, limit: 20 });
});

test('foreign, missing and voided invoices cannot download or touch Storage', async () => {
  let downloads = 0;
  const prisma = { orderInvoice: { findFirst: async ({ where }: any) => {
    assert.deepEqual(where, { id: 'foreign', order: { userId: 'customer-1' }, voidedAt: null });
    return null;
  } } } as unknown as PrismaService;
  const service = new CustomerInvoicesService(prisma, { download: async () => { downloads++; } } as unknown as InvoiceStorageService);
  await assert.rejects(service.pdf('customer-1', 'foreign'), NotFoundException);
  assert.equal(downloads, 0);
});

test('invoice numbers without an attachment cannot be downloaded', async () => {
  const prisma = { orderInvoice: { findFirst: async () => ({ storagePath: null, mimeType: null }) } } as unknown as PrismaService;
  await assert.rejects(new CustomerInvoicesService(prisma, {} as InvoiceStorageService).pdf('customer-1', 'number-only'), NotFoundException);
});

test('original multipage PDFs are preserved byte-for-byte', async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage(); pdf.addPage();
  const original = Buffer.from(await pdf.save());
  const prisma = { orderInvoice: { findFirst: async () => ({ storagePath: 'private/file', mimeType: 'application/pdf' }) } } as unknown as PrismaService;
  const service = new CustomerInvoicesService(prisma, { download: async () => original } as unknown as InvoiceStorageService);
  const result = await service.pdf('customer-1', 'invoice-1');
  assert.equal(result.bytes, original);
  assert.equal(result.name, 'factura-invoice-1.pdf');
  assert.equal((await PDFDocument.load(result.bytes)).getPageCount(), 2);
});

for (const [filename, type] of [['hero-biofresh-castrados.png', 'image/png'], ['banner-mascotas.jpg', 'image/jpeg']]) {
  test(`${type} is embedded in a valid PDF with no clipping`, async () => {
    const image = await readFile(resolve(__dirname, '../../../web/public/images', filename));
    const bytes = await invoicePdf(image, type);
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
    const pdf = await PDFDocument.load(bytes);
    assert.equal(pdf.getPageCount(), 1);
    const page = pdf.getPage(0);
    assert.ok(page.getWidth() > 500 && page.getHeight() > 500);
    assert.ok(page.node.Resources()?.get(PDFName.of('XObject')));
  });
}

test('invalid images and unsupported formats fail without creating a fake invoice', async () => {
  await assert.rejects(invoicePdf(Buffer.from('invalid'), 'image/png'), ServiceUnavailableException);
  await assert.rejects(invoicePdf(Buffer.from('%PDF-invalid'), 'text/plain'), ServiceUnavailableException);
  const query = new CustomerInvoiceQueryDto();
  assert.equal(query.page, 1);
  assert.equal(query.limit, 20);
});
