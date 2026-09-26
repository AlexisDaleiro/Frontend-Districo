import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreditStatus, OrderStatus, Permission, Prisma, Role, StockReservationStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PromotionLine } from '../common/business/promotion-rules';
import { requiresManualReview, submittedStatusForCredit } from '../common/business/commerce-rules';
import { JwtUser } from '../common/types/jwt-user.type';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { PromotionsService } from '../promotions/promotions.service';

const cartForCheckoutInclude = {
  items: {
    include: {
      productVariant: {
        include: {
          product: { include: { categories: true, brand: true, laboratory: true } },
          prices: {
            where: {
              priceList: { active: true },
              validFrom: { lte: new Date() },
              OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
            },
            orderBy: { validFrom: 'desc' },
            take: 1,
          },
        },
      },
    },
  },
  user: { include: { customerAccount: true, permissions: true } },
} satisfies Prisma.CartInclude;

type CheckoutCart = Prisma.CartGetPayload<{ include: typeof cartForCheckoutInclude }>;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly promotions: PromotionsService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async checkout(user: JwtUser, acceptManualReview = false) {
    this.assertCanCheckout(user);
    const cart = await this.prisma.cart.findUnique({
      where: { userId: user.sub },
      include: cartForCheckoutInclude,
    });
    if (!cart || !cart.items.length) throw new BadRequestException('El carrito esta vacio.');

    const creditStatus = cart.user.customerAccount?.creditStatus;
    const manualReview = requiresManualReview(creditStatus);
    if (manualReview && !acceptManualReview) {
      throw new BadRequestException('Este pedido quedara sujeto a revision manual. Debe aceptar la condicion.');
    }

    const promotionLines = this.toPromotionLines(cart);
    const discounts = await this.promotions.calculateDiscounts(promotionLines);
    const discountByLine = new Map<number, number>();
    for (const discount of discounts) {
      discountByLine.set(discount.lineIndex, (discountByLine.get(discount.lineIndex) ?? 0) + discount.amount);
    }

    const order = await this.prisma.$transaction(async (tx) => {
      await this.releaseActiveCartReservations(cart.id, tx, StockReservationStatus.RELEASED);

      const subtotal = cart.items.reduce((sum, item) => sum + this.lineGross(item), 0);
      const discountTotal = [...discountByLine.values()].reduce((sum, amount) => sum + amount, 0);
      const createdOrder = await tx.order.create({
        data: {
          orderNumber: `DIS-${Date.now()}`,
          userId: user.sub,
          customerAccountId: user.customerAccountId,
          status: submittedStatusForCredit(creditStatus),
          requiresManualReview: manualReview,
          reviewReason: manualReview ? String(creditStatus) : undefined,
          acceptedManualReview: acceptManualReview,
          subtotal,
          discountTotal,
          total: Math.max(0, subtotal - discountTotal),
          currency: 'UYU',
        },
      });

      for (let index = 0; index < cart.items.length; index += 1) {
        const item = cart.items[index];
        const variant = item.productVariant;
        if (variant.product.requiresMedicationPermission && !this.canBuyMedication(user)) {
          throw new ForbiddenException('Producto disponible exclusivamente para clientes habilitados.');
        }
        if (!variant.prices[0]) throw new BadRequestException('La variante no tiene precio vigente.');
        this.inventory.validateAvailableStock(variant, item.quantity);

        const gross = this.lineGross(item);
        const discount = discountByLine.get(index) ?? 0;
        await tx.orderItem.create({
          data: {
            orderId: createdOrder.id,
            productId: variant.productId,
            variantId: variant.id,
            productName: variant.product.name,
            variantName: variant.name,
            sku: variant.sku,
            quantity: item.quantity,
            unitPrice: Number(variant.prices[0].amount),
            discount,
            subtotal: Math.max(0, gross - discount),
          },
        });

        await tx.productVariant.update({
          where: { id: variant.id },
          data: { reservedStock: { increment: item.quantity } },
        });
        await tx.stockReservation.create({
          data: {
            orderId: createdOrder.id,
            cartId: cart.id,
            variantId: variant.id,
            quantity: item.quantity,
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
          },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return tx.order.findUnique({
        where: { id: createdOrder.id },
        include: { items: true, reservations: true },
      });
    });

    await this.audit.log('ORDER_SUBMITTED', 'Order', order?.id, user.sub, {
      status: order?.status,
      requiresManualReview: manualReview,
      discounts: discounts.map((discount) => ({
        lineIndex: discount.lineIndex,
        promotionId: discount.promotionId,
        promotionName: discount.promotionName,
        amount: discount.amount,
      })),
    });
    await this.notifications.notify(manualReview ? 'order.pending_review' : 'order.received', user.email, { orderId: order?.id });
    return order;
  }

  findMyOrders(user: JwtUser) {
    return this.prisma.order.findMany({
      where: { userId: user.sub },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
  }

  async findMyOrder(user: JwtUser, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId: user.sub },
      include: { items: true, reservations: true },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado.');
    return order;
  }

  findAdminOrders() {
    return this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true, user: { select: { email: true } }, customerAccount: true },
    });
  }

  async updateStatus(id: string, status: OrderStatus, userId?: string, reviewReason?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { reservations: true, user: true },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado.');

    await this.prisma.$transaction(async (tx) => {
      if (status === OrderStatus.APPROVED || status === OrderStatus.PROCESSING) {
        await this.consumeReservations(order.id, tx);
      }
      if (status === OrderStatus.REJECTED || status === OrderStatus.CANCELLED) {
        await this.releaseReservations(order.id, tx, StockReservationStatus.RELEASED);
      }
      await tx.order.update({ where: { id }, data: { status, reviewReason } });
    });

    await this.audit.log(`ORDER_${status}`, 'Order', id, userId, { reviewReason });
    await this.notifications.notify(`order.${status.toLowerCase()}`, order.user.email, { orderId: id });
    return this.prisma.order.findUnique({ where: { id }, include: { items: true, reservations: true } });
  }

  private assertCanCheckout(user: JwtUser) {
    if (user.role === Role.ADMIN) return;
    if (!user.permissions.includes(Permission.CAN_PLACE_ORDERS)) {
      throw new ForbiddenException('La cuenta no esta habilitada para comprar.');
    }
  }

  private canBuyMedication(user: JwtUser) {
    return user.role === Role.ADMIN || user.permissions.includes(Permission.CAN_BUY_MEDICATIONS);
  }

  private lineGross(item: CheckoutCart['items'][number]) {
    return item.quantity * Number(item.productVariant.prices[0]?.amount ?? 0);
  }

  private toPromotionLines(cart: CheckoutCart): PromotionLine[] {
    return cart.items.map((item) => ({
      productId: item.productVariant.productId,
      variantId: item.productVariant.id,
      brandId: item.productVariant.product.brandId,
      laboratoryId: item.productVariant.product.laboratoryId,
      categoryIds: item.productVariant.product.categories.map((category) => category.categoryId),
      quantity: item.quantity,
      unitPrice: Number(item.productVariant.prices[0]?.amount ?? 0),
    }));
  }

  private async releaseActiveCartReservations(cartId: string, tx: Prisma.TransactionClient, status: StockReservationStatus) {
    const reservations = await tx.stockReservation.findMany({ where: { cartId, status: StockReservationStatus.ACTIVE } });
    for (const reservation of reservations) {
      await tx.productVariant.update({
        where: { id: reservation.variantId },
        data: { reservedStock: { decrement: reservation.quantity } },
      });
      await tx.stockReservation.update({
        where: { id: reservation.id },
        data: { status, releasedAt: new Date() },
      });
    }
  }

  private async releaseReservations(orderId: string, tx: Prisma.TransactionClient, status: StockReservationStatus) {
    const reservations = await tx.stockReservation.findMany({ where: { orderId, status: StockReservationStatus.ACTIVE } });
    for (const reservation of reservations) {
      await tx.productVariant.update({
        where: { id: reservation.variantId },
        data: { reservedStock: { decrement: reservation.quantity } },
      });
      await tx.stockReservation.update({
        where: { id: reservation.id },
        data: { status, releasedAt: new Date() },
      });
    }
  }

  private async consumeReservations(orderId: string, tx: Prisma.TransactionClient) {
    const reservations = await tx.stockReservation.findMany({ where: { orderId, status: StockReservationStatus.ACTIVE } });
    for (const reservation of reservations) {
      await tx.productVariant.update({
        where: { id: reservation.variantId },
        data: {
          physicalStock: { decrement: reservation.quantity },
          reservedStock: { decrement: reservation.quantity },
        },
      });
      await tx.stockReservation.update({
        where: { id: reservation.id },
        data: { status: StockReservationStatus.CONSUMED, consumedAt: new Date() },
      });
    }
  }
}
