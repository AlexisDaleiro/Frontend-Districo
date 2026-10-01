import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RecordOrderPaymentDto } from './dto/record-order-payment.dto';
import { AttachOrderInvoiceDto } from './dto/attach-order-invoice.dto';
import { InvoiceStorageService } from './invoice-storage.service';

export const MAX_INVOICE_BYTES = 5_000_000;

export function invoiceFileType(bytes: Buffer) {
  if (bytes.subarray(0, 5).toString() === '%PDF-') return { mimeType: 'application/pdf', extension: 'pdf' };
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { mimeType: 'image/png', extension: 'png' };
  }
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  }
  throw new BadRequestException('Adjuntá un PDF, PNG o JPG válido.');
}

@Injectable()
export class OrderBillingService {
  constructor(private readonly prisma: PrismaService, private readonly storage: InvoiceStorageService) {}

  async recordPayment(orderId: string, dto: RecordOrderPaymentDto, adminId: string) {
    const amount = new Prisma.Decimal(dto.amount);
    if (!amount.isFinite() || amount.lte(0)) throw new BadRequestException('El importe debe ser mayor a cero.');

    const existing = await this.prisma.orderPayment.findUnique({ where: { requestId: dto.requestId } });
    if (existing) return this.samePayment(existing, orderId, amount);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({ where: { id: orderId }, select: { total: true, paidTotal: true, status: true } });
        if (!order) throw new NotFoundException('Pedido no encontrado.');
        if (([OrderStatus.DRAFT, OrderStatus.REJECTED, OrderStatus.CANCELLED] as OrderStatus[]).includes(order.status)) {
          throw new BadRequestException('Este pedido no admite pagos nuevos.');
        }
        if (amount.gt(order.total.minus(order.paidTotal))) {
          throw new BadRequestException('El importe supera el saldo pendiente.');
        }
        const updated = await tx.order.updateMany({
          where: { id: orderId, paidTotal: { lte: order.total.minus(amount) } },
          data: { paidTotal: { increment: amount } },
        });
        if (!updated.count) throw new ConflictException('El saldo cambió. Actualizá el pedido e intentá nuevamente.');
        const payment = await tx.orderPayment.create({
          data: { orderId, amount, requestId: dto.requestId, recordedById: adminId },
        });
        await tx.auditLog.create({
          data: { action: 'ORDER_PAYMENT_RECORDED', entityType: 'Order', entityId: orderId, userId: adminId,
            metadata: { paymentId: payment.id, amount: amount.toString() } },
        });
        return payment;
      });
    } catch (error) {
      const payment = await this.prisma.orderPayment.findUnique({ where: { requestId: dto.requestId } });
      if (payment) return this.samePayment(payment, orderId, amount);
      throw error;
    }
  }

  private samePayment<T extends { orderId: string; amount: Prisma.Decimal }>(payment: T, orderId: string, amount: Prisma.Decimal) {
    if (payment.orderId !== orderId || !payment.amount.equals(amount)) {
      throw new ConflictException('La referencia del pago ya se utilizó.');
    }
    return payment;
  }

  async attachInvoice(orderId: string, file: { buffer: Buffer; size: number; originalname: string } | undefined, dto: AttachOrderInvoiceDto, adminId: string) {
    const invoiceNumber = dto.invoiceNumber?.trim() || null;
    if (!file && !invoiceNumber) throw new BadRequestException('Ingresá un número de factura o adjuntá un archivo.');
    if (file && (!file.buffer?.length || file.size > MAX_INVOICE_BYTES || file.buffer.length > MAX_INVOICE_BYTES)) {
      throw new BadRequestException('La factura debe pesar entre 1 byte y 5 MB.');
    }
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { id: true } });
    if (!order) throw new NotFoundException('Pedido no encontrado.');
    const existing = await this.prisma.orderInvoice.findUnique({ where: { requestId: dto.requestId }, select: { id: true, orderId: true, invoiceNumber: true, originalName: true, mimeType: true, size: true, createdAt: true } });
    if (existing) {
      if (existing.orderId !== orderId || existing.invoiceNumber !== invoiceNumber) throw new ConflictException('La referencia de factura ya se utilizó.');
      const { orderId: _, ...invoice } = existing;
      return invoice;
    }
    const fileType = file ? invoiceFileType(file.buffer) : null;
    const stem = file?.originalname.split(/[\\/]/).pop()?.replace(/[\x00-\x1f\x7f]/g, '').replace(/\.[^.]+$/, '').trim().slice(0, 100) || 'factura';
    const originalName = fileType ? `${stem}.${fileType.extension}` : null;
    const storagePath = fileType ? `orders/${orderId}/${randomUUID()}.${fileType.extension}` : null;
    if (file && fileType && storagePath) await this.storage.upload(storagePath, file.buffer, fileType.mimeType);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const invoice = await tx.orderInvoice.create({
          data: { orderId, storagePath, requestId: dto.requestId, invoiceNumber, originalName, mimeType: fileType?.mimeType ?? null, size: file?.size ?? null, uploadedById: adminId },
          select: { id: true, invoiceNumber: true, originalName: true, mimeType: true, size: true, createdAt: true },
        });
        await tx.auditLog.create({
          data: { action: 'ORDER_INVOICE_ATTACHED', entityType: 'Order', entityId: orderId, userId: adminId,
            metadata: { invoiceId: invoice.id, invoiceNumber, originalName } },
        });
        return invoice;
      });
    } catch (error) {
      if (storagePath) await this.storage.remove(storagePath);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const invoice = await this.prisma.orderInvoice.findUnique({ where: { requestId: dto.requestId }, select: { id: true, orderId: true, invoiceNumber: true, originalName: true, mimeType: true, size: true, createdAt: true } });
        if (invoice && invoice.orderId === orderId && invoice.invoiceNumber === invoiceNumber) {
          const { orderId: _, ...result } = invoice;
          return result;
        }
        throw new ConflictException('Ese número de factura ya está registrado en el pedido.');
      }
      throw error;
    }
  }

  async invoice(orderId: string, invoiceId: string) {
    const invoice = await this.prisma.orderInvoice.findFirst({ where: { id: invoiceId, orderId } });
    if (!invoice?.storagePath || !invoice.mimeType || !invoice.originalName) throw new NotFoundException('Esta factura no tiene archivo adjunto.');
    return { bytes: await this.storage.download(invoice.storagePath), mimeType: invoice.mimeType, name: invoice.originalName };
  }
}
