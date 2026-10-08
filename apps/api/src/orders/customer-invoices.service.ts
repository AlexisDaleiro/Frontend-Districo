import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceStorageService } from './invoice-storage.service';
import { CustomerInvoiceQueryDto } from './dto/customer-invoice-query.dto';
import { invoicePdf } from './invoice-pdf';

@Injectable()
export class CustomerInvoicesService {
  constructor(private readonly prisma: PrismaService, private readonly storage: InvoiceStorageService) {}

  async list(userId: string, query: CustomerInvoiceQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.OrderInvoiceWhereInput = {
      order: { userId },
      OR: search ? [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
      ] : undefined,
    };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.orderInvoice.findMany({
        where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit, take: query.limit,
        select: { id: true, invoiceNumber: true, createdAt: true, voidedAt: true, storagePath: true, mimeType: true,
          order: { select: { id: true, orderNumber: true } } },
      }),
      this.prisma.orderInvoice.count({ where }),
    ]);
    return {
      items: records.map(({ storagePath, mimeType, ...invoice }) => ({
        ...invoice, hasFile: !!storagePath && ['application/pdf', 'image/png', 'image/jpeg'].includes(mimeType ?? ''),
      })),
      meta: { total, page: query.page, limit: query.limit },
    };
  }

  async pdf(userId: string, invoiceId: string) {
    const invoice = await this.prisma.orderInvoice.findFirst({
      where: { id: invoiceId, order: { userId }, voidedAt: null },
      select: { storagePath: true, mimeType: true },
    });
    if (!invoice?.storagePath || !invoice.mimeType) throw new NotFoundException('Factura no disponible para descargar.');
    const bytes = await this.storage.download(invoice.storagePath);
    return { bytes: await invoicePdf(bytes, invoice.mimeType), name: `factura-${invoiceId}.pdf` };
  }
}
