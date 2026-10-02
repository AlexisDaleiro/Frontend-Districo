import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RecordOrderPaymentDto } from './dto/record-order-payment.dto';
import { AttachOrderInvoiceDto } from './dto/attach-order-invoice.dto';
import { VoidOrderRecordDto } from './dto/void-order-record.dto';
import { InvoiceStorageService } from './invoice-storage.service';
import { RecordCreditNoteDto } from './dto/record-credit-note.dto';
import { RecordRefundDto } from './dto/record-refund.dto';

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
        const order = await tx.order.findUnique({ where: { id: orderId }, select: { total: true, paidTotal: true, creditedTotal: true, refundedTotal: true, status: true } });
        if (!order) throw new NotFoundException('Pedido no encontrado.');
        if (([OrderStatus.DRAFT, OrderStatus.REJECTED, OrderStatus.CANCELLED] as OrderStatus[]).includes(order.status)) {
          throw new BadRequestException('Este pedido no admite pagos nuevos.');
        }
        if (amount.gt(order.total.minus(order.creditedTotal).minus(order.paidTotal).plus(order.refundedTotal))) {
          throw new BadRequestException('El importe supera el saldo pendiente.');
        }
        const updated = await tx.order.updateMany({
          where: { id: orderId, paidTotal: order.paidTotal, creditedTotal: order.creditedTotal, refundedTotal: order.refundedTotal },
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

  async voidPayment(orderId: string, paymentId: string, dto: VoidOrderRecordDto, adminId: string) {
    const reason = dto.reason.trim();
    if (reason.length < 3) throw new BadRequestException('Indica el motivo de la anulacion.');
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.orderPayment.findFirst({ where: { id: paymentId, orderId } });
      if (!payment) throw new NotFoundException('Pago no encontrado.');
      if (payment.voidedAt) {
        if (payment.voidRequestId === dto.requestId) return payment;
        throw new ConflictException('Este pago ya fue anulado.');
      }
      const changed = await tx.orderPayment.updateMany({
        where: { id: paymentId, orderId, voidedAt: null },
        data: { voidedAt: new Date(), voidedById: adminId, voidReason: reason, voidRequestId: dto.requestId },
      });
      if (!changed.count) throw new ConflictException('Este pago ya fue modificado.');
      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, select: { paidTotal: true, refundedTotal: true } });
      if (order.paidTotal.minus(payment.amount).lt(order.refundedTotal)) {
        throw new BadRequestException('Este pago ya respalda un reintegro. No se puede anular.');
      }
      const updated = await tx.order.updateMany({
        where: { id: orderId, paidTotal: order.paidTotal, refundedTotal: order.refundedTotal },
        data: { paidTotal: { decrement: payment.amount } },
      });
      if (!updated.count) throw new ConflictException('El saldo del pedido cambio.');
      await tx.auditLog.create({
        data: { action: 'ORDER_PAYMENT_VOIDED', entityType: 'Order', entityId: orderId, userId: adminId,
          metadata: { paymentId, amount: payment.amount.toString(), reason } },
      });
      return tx.orderPayment.findUniqueOrThrow({ where: { id: paymentId } });
    });
  }

  async attachInvoice(orderId: string, file: { buffer: Buffer; size: number; originalname: string } | undefined, dto: AttachOrderInvoiceDto, adminId: string) {
    const invoiceNumber = dto.invoiceNumber?.trim() || null;
    const replacementReason = dto.replacementReason?.trim() || null;
    if (dto.replacesInvoiceId && (!replacementReason || replacementReason.length < 3)) {
      throw new BadRequestException('Indica el motivo del reemplazo.');
    }
    if (!file && !invoiceNumber) throw new BadRequestException('Ingresá un número de factura o adjuntá un archivo.');
    if (file && (!file.buffer?.length || file.size > MAX_INVOICE_BYTES || file.buffer.length > MAX_INVOICE_BYTES)) {
      throw new BadRequestException('La factura debe pesar entre 1 byte y 5 MB.');
    }
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { id: true } });
    if (!order) throw new NotFoundException('Pedido no encontrado.');
    const existing = await this.prisma.orderInvoice.findUnique({ where: { requestId: dto.requestId }, select: { id: true, orderId: true, invoiceNumber: true, replacesInvoiceId: true, originalName: true, mimeType: true, size: true, createdAt: true } });
    if (existing) {
      if (existing.orderId !== orderId || existing.invoiceNumber !== invoiceNumber || existing.replacesInvoiceId !== (dto.replacesInvoiceId ?? null)) throw new ConflictException('La referencia de factura ya se utilizó.');
      const { orderId: _, replacesInvoiceId: __, ...invoice } = existing;
      return invoice;
    }
    const fileType = file ? invoiceFileType(file.buffer) : null;
    const stem = file?.originalname.split(/[\\/]/).pop()?.replace(/[\x00-\x1f\x7f]/g, '').replace(/\.[^.]+$/, '').trim().slice(0, 100) || 'factura';
    const originalName = fileType ? `${stem}.${fileType.extension}` : null;
    const storagePath = fileType ? `orders/${orderId}/${randomUUID()}.${fileType.extension}` : null;
    if (file && fileType && storagePath) await this.storage.upload(storagePath, file.buffer, fileType.mimeType);
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.replacesInvoiceId) {
          const old = await tx.orderInvoice.updateMany({
            where: { id: dto.replacesInvoiceId, orderId, voidedAt: null },
            data: { voidedAt: new Date(), voidedById: adminId, voidReason: replacementReason },
          });
          if (!old.count) throw new ConflictException('La factura original ya no esta vigente.');
        }
        const invoice = await tx.orderInvoice.create({
          data: { orderId, storagePath, requestId: dto.requestId, invoiceNumber, originalName, mimeType: fileType?.mimeType ?? null, size: file?.size ?? null, uploadedById: adminId, replacesInvoiceId: dto.replacesInvoiceId, replacementReason },
          select: { id: true, invoiceNumber: true, originalName: true, mimeType: true, size: true, createdAt: true },
        });
        await tx.auditLog.create({
          data: { action: dto.replacesInvoiceId ? 'ORDER_INVOICE_REPLACED' : 'ORDER_INVOICE_ATTACHED', entityType: 'Order', entityId: orderId, userId: adminId,
            metadata: { invoiceId: invoice.id, invoiceNumber, originalName, replacesInvoiceId: dto.replacesInvoiceId ?? null, replacementReason } },
        });
        return invoice;
      });
    } catch (error) {
      if (storagePath) await this.storage.remove(storagePath);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const invoice = await this.prisma.orderInvoice.findUnique({ where: { requestId: dto.requestId }, select: { id: true, orderId: true, invoiceNumber: true, replacesInvoiceId: true, originalName: true, mimeType: true, size: true, createdAt: true } });
        if (invoice && invoice.orderId === orderId && invoice.invoiceNumber === invoiceNumber && invoice.replacesInvoiceId === (dto.replacesInvoiceId ?? null)) {
          const { orderId: _, replacesInvoiceId: __, ...result } = invoice;
          return result;
        }
        throw new ConflictException('Ese número de factura ya está registrado en el pedido.');
      }
      throw error;
    }
  }

  async voidInvoice(orderId: string, invoiceId: string, dto: VoidOrderRecordDto, adminId: string) {
    const reason = dto.reason.trim();
    if (reason.length < 3) throw new BadRequestException('Indica el motivo de la anulacion.');
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.orderInvoice.findFirst({ where: { id: invoiceId, orderId } });
      if (!invoice) throw new NotFoundException('Factura no encontrada.');
      if (invoice.voidedAt) {
        if (invoice.voidRequestId === dto.requestId) return invoice;
        throw new ConflictException('Esta factura ya fue anulada.');
      }
      const changed = await tx.orderInvoice.updateMany({
        where: { id: invoiceId, orderId, voidedAt: null },
        data: { voidedAt: new Date(), voidedById: adminId, voidReason: reason, voidRequestId: dto.requestId },
      });
      if (!changed.count) throw new ConflictException('Esta factura ya fue modificada.');
      await tx.auditLog.create({
        data: { action: 'ORDER_INVOICE_VOIDED', entityType: 'Order', entityId: orderId, userId: adminId,
          metadata: { invoiceId, invoiceNumber: invoice.invoiceNumber, reason } },
      });
      return tx.orderInvoice.findUniqueOrThrow({ where: { id: invoiceId } });
    });
  }

  async invoice(orderId: string, invoiceId: string) {
    const invoice = await this.prisma.orderInvoice.findFirst({ where: { id: invoiceId, orderId } });
    if (!invoice?.storagePath || !invoice.mimeType || !invoice.originalName) throw new NotFoundException('Esta factura no tiene archivo adjunto.');
    return { bytes: await this.storage.download(invoice.storagePath), mimeType: invoice.mimeType, name: invoice.originalName };
  }

  async recordCreditNote(orderId: string, file: { buffer: Buffer; size: number; originalname: string } | undefined, dto: RecordCreditNoteDto, adminId: string) {
    const amount = new Prisma.Decimal(dto.amount);
    const reason = dto.reason.trim();
    const noteNumber = dto.noteNumber?.trim() || null;
    if (!amount.isFinite() || amount.lte(0) || reason.length < 3) throw new BadRequestException('Indicá un importe y motivo válidos.');
    if (!file && !noteNumber) throw new BadRequestException('Ingresá un número de nota de crédito o adjuntá un archivo.');
    if (file && (!file.buffer?.length || file.size > MAX_INVOICE_BYTES || file.buffer.length > MAX_INVOICE_BYTES)) {
      throw new BadRequestException('El archivo debe pesar entre 1 byte y 5 MB.');
    }
    const existing = await this.prisma.orderCreditNote.findUnique({ where: { requestId: dto.requestId } });
    if (existing) {
      if (existing.orderId !== orderId || !existing.amount.equals(amount) || existing.noteNumber !== noteNumber || existing.reason !== reason) throw new ConflictException('La referencia ya fue utilizada.');
      return existing;
    }
    const fileType = file ? invoiceFileType(file.buffer) : null;
    const stem = file?.originalname.split(/[\\/]/).pop()?.replace(/[\x00-\x1f\x7f]/g, '').replace(/\.[^.]+$/, '').trim().slice(0, 100) || 'nota-credito';
    const originalName = fileType ? `${stem}.${fileType.extension}` : null;
    const storagePath = fileType ? `credit-notes/orders/${orderId}/${randomUUID()}.${fileType.extension}` : null;
    if (file && fileType && storagePath) await this.storage.upload(storagePath, file.buffer, fileType.mimeType);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({ where: { id: orderId }, select: { total: true, creditedTotal: true, status: true } });
        if (!order) throw new NotFoundException('Pedido no encontrado.');
        if (([OrderStatus.DRAFT, OrderStatus.REJECTED, OrderStatus.CANCELLED] as OrderStatus[]).includes(order.status)) throw new BadRequestException('El pedido no admite devoluciones.');
        if (amount.gt(order.total.minus(order.creditedTotal))) throw new BadRequestException('El crédito supera el importe restante del pedido.');
        const changed = await tx.order.updateMany({ where: { id: orderId, creditedTotal: order.creditedTotal }, data: { creditedTotal: { increment: amount } } });
        if (!changed.count) throw new ConflictException('El pedido cambió. Actualizá e intentá nuevamente.');
        const note = await tx.orderCreditNote.create({ data: { orderId, amount, requestId: dto.requestId, noteNumber, reason, storagePath, originalName, mimeType: fileType?.mimeType, size: file?.size, recordedById: adminId } });
        await tx.auditLog.create({ data: { action: 'ORDER_CREDIT_NOTE_RECORDED', entityType: 'Order', entityId: orderId, userId: adminId, metadata: { noteId: note.id, amount: amount.toString(), noteNumber, reason } } });
        return note;
      });
    } catch (error) {
      if (storagePath) await this.storage.remove(storagePath);
      const note = await this.prisma.orderCreditNote.findUnique({ where: { requestId: dto.requestId } });
      if (note && note.orderId === orderId && note.amount.equals(amount) && note.noteNumber === noteNumber && note.reason === reason) return note;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Ese número de nota ya está registrado en el pedido.');
      throw error;
    }
  }

  async recordRefund(orderId: string, dto: RecordRefundDto, adminId: string) {
    const amount = new Prisma.Decimal(dto.amount);
    const reason = dto.reason.trim();
    const reference = dto.reference?.trim() || null;
    if (!amount.isFinite() || amount.lte(0) || reason.length < 3) throw new BadRequestException('Indicá un importe y motivo válidos.');
    const existing = await this.prisma.orderRefund.findUnique({ where: { requestId: dto.requestId } });
    if (existing) return this.sameRefund(existing, orderId, amount, reason, reference);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({ where: { id: orderId }, select: { paidTotal: true, creditedTotal: true, refundedTotal: true } });
        if (!order) throw new NotFoundException('Pedido no encontrado.');
        if (amount.gt(Prisma.Decimal.min(order.paidTotal, order.creditedTotal).minus(order.refundedTotal))) {
          throw new BadRequestException('El reintegro supera los pagos respaldados por notas de crédito.');
        }
        const changed = await tx.order.updateMany({ where: { id: orderId, paidTotal: order.paidTotal, creditedTotal: order.creditedTotal, refundedTotal: order.refundedTotal }, data: { refundedTotal: { increment: amount } } });
        if (!changed.count) throw new ConflictException('El pedido cambió. Actualizá e intentá nuevamente.');
        const refund = await tx.orderRefund.create({ data: { orderId, amount, requestId: dto.requestId, reason, reference, recordedById: adminId } });
        await tx.auditLog.create({ data: { action: 'ORDER_REFUND_RECORDED', entityType: 'Order', entityId: orderId, userId: adminId, metadata: { refundId: refund.id, amount: amount.toString(), reference, reason } } });
        return refund;
      });
    } catch (error) {
      const refund = await this.prisma.orderRefund.findUnique({ where: { requestId: dto.requestId } });
      if (refund) return this.sameRefund(refund, orderId, amount, reason, reference);
      throw error;
    }
  }

  private sameRefund<T extends { orderId: string; amount: Prisma.Decimal; reason: string; reference: string | null }>(refund: T, orderId: string, amount: Prisma.Decimal, reason: string, reference: string | null) {
    if (refund.orderId !== orderId || !refund.amount.equals(amount) || refund.reason !== reason || refund.reference !== reference) {
      throw new ConflictException('La referencia del reintegro ya se utilizó.');
    }
    return refund;
  }

  async creditNote(orderId: string, noteId: string) {
    const note = await this.prisma.orderCreditNote.findFirst({ where: { id: noteId, orderId } });
    if (!note?.storagePath || !note.mimeType || !note.originalName) throw new NotFoundException('Esta nota no tiene archivo adjunto.');
    return { bytes: await this.storage.download(note.storagePath), mimeType: note.mimeType, name: note.originalName };
  }
}
