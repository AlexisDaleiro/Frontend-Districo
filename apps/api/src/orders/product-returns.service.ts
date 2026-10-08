import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma, StockReservationStatus } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RecordProductReturnDto } from './dto/record-product-return.dto';

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const normalized = (dto: RecordProductReturnDto) => ({ reason: dto.reason.trim(), items: dto.items.map(({ orderItemId, quantity, restockedQuantity }) => ({ orderItemId, quantity, restockedQuantity })).sort((a, b) => a.orderItemId.localeCompare(b.orderItemId)) });
const returnInclude = { items: true } as const;

@Injectable()
export class ProductReturnsService {
  constructor(private readonly prisma: PrismaService) {}

  async record(orderId: string, dto: RecordProductReturnDto, actorId: string, previewOnly = false) {
    const input = normalized(dto);
    if (!input.items.length || input.items.length > 100 || new Set(input.items.map((item) => item.orderItemId)).size !== input.items.length || input.reason.length < 3 || input.reason.length > 500 ||
        input.items.some((item) => !Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > 1000000 || !Number.isInteger(item.restockedQuantity) || item.restockedQuantity < 0 || item.restockedQuantity > item.quantity)) {
      throw new BadRequestException('Revisá los productos, cantidades y motivo de devolución.');
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Serialize receipts for the same order before checking cumulative quantities.
        await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
        const previous = await tx.orderReturn.findUnique({ where: { requestId: dto.requestId }, include: returnInclude });
        if (previous && !previewOnly) {
          const previousInput = { reason: previous.reason, items: previous.items.map(({ orderItemId, quantity, restockedQuantity }) => ({ orderItemId, quantity, restockedQuantity })).sort((a, b) => a.orderItemId.localeCompare(b.orderItemId)) };
          if (previous.orderId !== orderId || previous.recordedById !== actorId || hash(previousInput) !== hash(input)) throw new ConflictException('Este identificador ya pertenece a otra devolución.');
          return previous;
        }
        const order = await tx.order.findUnique({ relationLoadStrategy: 'join', where: { id: orderId }, include: { items: true, returns: { include: returnInclude }, reservations: true } });
        if (!order) throw new NotFoundException('Pedido no encontrado.');
        if (!([OrderStatus.SHIPPED, OrderStatus.DELIVERED] as OrderStatus[]).includes(order.status)) throw new BadRequestException('Solo se puede recibir mercadería de pedidos en camino o enviados.');
        const returned = new Map<string, number>();
        const restored = new Map<string, number>();
        for (const receipt of order.returns) for (const item of receipt.items) {
          returned.set(item.orderItemId, (returned.get(item.orderItemId) ?? 0) + item.quantity);
          const line = order.items.find((line) => line.id === item.orderItemId);
          if (line) restored.set(line.variantId, (restored.get(line.variantId) ?? 0) + item.restockedQuantity);
        }
        const consumed = new Map<string, number>();
        for (const reservation of order.reservations) if (reservation.status === StockReservationStatus.CONSUMED)
          consumed.set(reservation.variantId, (consumed.get(reservation.variantId) ?? 0) + reservation.quantity);
        const restock = new Map<string, number>();
        const entries = input.items.map((item) => {
          const line = order.items.find((line) => line.id === item.orderItemId);
          if (!line) throw new BadRequestException('Un producto no pertenece al pedido.');
          const alreadyReturned = returned.get(line.id) ?? 0;
          if (alreadyReturned + item.quantity > line.quantity) throw new BadRequestException(`${line.productName}: la devolución supera la cantidad pendiente.`);
          restock.set(line.variantId, (restock.get(line.variantId) ?? 0) + item.restockedQuantity);
          return { ...item, productName: line.productName, variantName: line.variantName, sku: line.sku, soldQuantity: line.quantity, alreadyReturned };
        });
        const stock: { variantId: string; before: number; after: number; quantity: number }[] = [];
        const movements = [...restock].filter(([, quantity]) => quantity > 0).sort(([a], [b]) => a.localeCompare(b));
        if (movements.length) await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "ProductVariant" WHERE "id" IN (${Prisma.join(movements.map(([id]) => id))}) ORDER BY "id" FOR UPDATE`);
        const variants = movements.length ? await tx.productVariant.findMany({ where: { id: { in: movements.map(([id]) => id) } }, select: { id: true, physicalStock: true, deletedAt: true } }) : [];
        const byId = new Map(variants.map((variant) => [variant.id, variant]));
        for (const [variantId, quantity] of movements) {
          if ((restored.get(variantId) ?? 0) + quantity > (consumed.get(variantId) ?? 0)) throw new BadRequestException('No hay salida de stock registrada suficiente para reincorporar esa mercadería.');
          const variant = byId.get(variantId);
          if (!variant || variant.deletedAt) throw new BadRequestException('La presentación fue eliminada y no puede recibir stock.');
          if (variant.physicalStock + quantity > 2147483647) throw new BadRequestException('La reincorporación supera el máximo de stock permitido.');
          stock.push({ variantId, quantity, before: variant.physicalStock, after: variant.physicalStock + quantity });
        }
        const preview = { token: hash({ orderId, requestId: dto.requestId, input, status: order.status, entries, stock }), entries, stock };
        if (previewOnly) return preview;
        if (dto.previewToken !== preview.token) throw new ConflictException('Las cantidades o el stock cambiaron. Revisá la devolución antes de confirmar.');
        const receipt = await tx.orderReturn.create({ data: { orderId, reason: input.reason, requestId: dto.requestId, recordedById: actorId, items: { create: input.items } }, include: returnInclude });
        for (const movement of stock) await tx.productVariant.update({ where: { id: movement.variantId }, data: { physicalStock: { increment: movement.quantity } } });
        await tx.auditLog.create({ data: { action: 'ORDER_PRODUCTS_RETURNED', entityType: 'Order', entityId: orderId, userId: actorId,
          metadata: { returnId: receipt.id, reason: input.reason, items: entries, stock } as Prisma.InputJsonObject } });
        return receipt;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 60000 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2002'].includes(error.code)) throw new ConflictException('La devolución cambió o ya fue registrada. Revisá el pedido antes de repetirla.');
      throw error;
    }
  }
}
