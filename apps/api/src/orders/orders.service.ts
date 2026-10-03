import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountStatus, CreditStatus, OrderStatus, Permission, Prisma, Role, StockReservationStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PromotionLine } from '../common/business/promotion-rules';
import { requiresManualReview, submittedStatusForCredit } from '../common/business/commerce-rules';
import { JwtUser } from '../common/types/jwt-user.type';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrderListQueryDto } from '../admin/dto/admin-list-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { PromotionsService } from '../promotions/promotions.service';

const adminOrderInclude = {
  items: true,
  user: { select: { email: true } },
  customerAccount: true,
  payments: { orderBy: { createdAt: 'desc' }, select: { id: true, amount: true, createdAt: true, recordedById: true, voidedAt: true, voidedById: true, voidReason: true } },
  invoices: { orderBy: { createdAt: 'desc' }, select: { id: true, invoiceNumber: true, originalName: true, mimeType: true, size: true, createdAt: true, uploadedById: true, voidedAt: true, voidedById: true, voidReason: true, replacesInvoiceId: true, replacementReason: true } },
  creditNotes: { orderBy: { createdAt: 'desc' } },
  refunds: { orderBy: { createdAt: 'desc' } },
} as const satisfies Prisma.OrderInclude;
type AdminOrder = Prisma.OrderGetPayload<{ include: typeof adminOrderInclude }>;

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
  user: { include: { customerAccount: { include: { addresses: true } }, permissions: true } },
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

  async checkout(user: JwtUser, acceptManualReview = false, deliveryAddressId?: string) {
    this.assertCanCheckout(user);
    const cart = await this.prisma.cart.findUnique({
      where: { userId: user.sub },
      include: cartForCheckoutInclude,
    });
    if (!cart || !cart.items.length) throw new BadRequestException('El carrito esta vacio.');
    if (user.role === Role.CLIENT && cart.user.customerAccount?.accountStatus !== AccountStatus.APPROVED) {
      throw new ForbiddenException('La cuenta no esta habilitada para comprar.');
    }

    const account = cart.user.customerAccount;
    const addresses = account?.addresses ?? [];
    const selectedAddress = deliveryAddressId
      ? addresses.find((address) => address.id === deliveryAddressId)
      : addresses.length === 1 ? addresses[0] : undefined;
    if (deliveryAddressId && !selectedAddress) {
      throw new BadRequestException('La direccion de entrega no pertenece a tu cuenta.');
    }
    if (addresses.length > 1 && !selectedAddress) {
      throw new BadRequestException('Elegi una direccion de entrega.');
    }
    const deliveryAddress = selectedAddress?.address ?? account?.address;
    if (user.role === Role.CLIENT && !deliveryAddress?.trim()) {
      throw new BadRequestException('Agrega una direccion de entrega antes de enviar el pedido.');
    }

    const creditStatus = cart.user.customerAccount?.creditStatus;
    const creditStatusReview = requiresManualReview(creditStatus);
    if (creditStatusReview && !acceptManualReview) {
      throw new BadRequestException('Este pedido quedara sujeto a revision manual. Debe aceptar la condicion.');
    }

    const promotionLines = this.toPromotionLines(cart);
    const discounts = await this.promotions.calculateDiscounts(promotionLines);
    const discountByLine = new Map<number, number>();
    for (const discount of discounts) {
      discountByLine.set(discount.lineIndex, (discountByLine.get(discount.lineIndex) ?? 0) + discount.amount);
    }

    let manualReview = creditStatusReview;
    const order = await this.prisma.$transaction(async (tx) => {
      await this.releaseActiveCartReservations(cart.id, tx, StockReservationStatus.RELEASED);

      const subtotal = cart.items.reduce((sum, item) => sum + this.lineGross(item), 0);
      const discountTotal = [...discountByLine.values()].reduce((sum, amount) => sum + amount, 0);
      const total = new Prisma.Decimal(Math.max(0, subtotal - discountTotal));
      let reviewReason = creditStatusReview ? String(creditStatus) : undefined;
      if (user.role === Role.CLIENT && user.customerAccountId) {
        // Checkout requests for the same customer must evaluate exposure serially.
        await tx.$queryRaw`SELECT "id" FROM "CustomerAccount" WHERE "id" = ${user.customerAccountId} FOR UPDATE`;
        const currentAccount = await tx.customerAccount.findUniqueOrThrow({ where: { id: user.customerAccountId }, select: { accountStatus: true, creditLimit: true, creditStatus: true } });
        if (currentAccount.accountStatus !== AccountStatus.APPROVED) throw new ForbiddenException('La cuenta no esta habilitada para comprar.');
        if (requiresManualReview(currentAccount.creditStatus)) {
          manualReview = true;
          reviewReason = String(currentAccount.creditStatus);
        }
        if (currentAccount.creditLimit !== null) {
          const open = await tx.order.findMany({
            where: { customerAccountId: user.customerAccountId, status: { in: [OrderStatus.SUBMITTED, OrderStatus.PENDING_REVIEW, OrderStatus.APPROVED, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED] } },
            select: { total: true, creditedTotal: true, paidTotal: true, refundedTotal: true },
          });
          const exposure = open.reduce((sum, item) => sum.plus(Prisma.Decimal.max(0, item.total.minus(item.creditedTotal).minus(item.paidTotal).plus(item.refundedTotal))), new Prisma.Decimal(0));
          if (exposure.plus(total).gt(currentAccount.creditLimit)) {
            manualReview = true;
            reviewReason = 'CREDIT_LIMIT_EXCEEDED';
          }
        }
      }
      const createdOrder = await tx.order.create({
        data: {
          orderNumber: `DIS-${Date.now()}`,
          userId: user.sub,
          customerAccountId: user.customerAccountId,
          status: manualReview ? OrderStatus.PENDING_REVIEW : submittedStatusForCredit(creditStatus),
          requiresManualReview: manualReview,
          reviewReason,
          acceptedManualReview: acceptManualReview,
          subtotal,
          discountTotal,
          total,
          currency: 'UYU',
          deliveryAddressId: selectedAddress?.id,
          deliveryLabel: selectedAddress?.label ?? (deliveryAddress ? 'Principal' : null),
          deliveryAddress,
          deliveryCity: selectedAddress?.city ?? account?.city,
          deliveryDepartment: selectedAddress?.department ?? account?.department,
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
      reviewReason: order?.reviewReason,
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
      include: {
        items: true,
        user: { select: { email: true } },
        customerAccount: true,
        payments: { orderBy: { createdAt: 'desc' }, select: { id: true, amount: true, createdAt: true } },
        invoices: { orderBy: { createdAt: 'desc' }, select: { id: true, invoiceNumber: true, originalName: true, mimeType: true, size: true, createdAt: true } },
        creditNotes: { orderBy: { createdAt: 'desc' } },
        refunds: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async findAdminOrdersPage(query: OrderListQueryDto) {
    const search = query.search?.trim();
    if ((query.dateFrom && !/^\d{4}-\d{2}-\d{2}$/.test(query.dateFrom)) ||
        (query.dateTo && !/^\d{4}-\d{2}-\d{2}$/.test(query.dateTo)) ||
        (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo)) {
      throw new BadRequestException('Revisá el rango de fechas.');
    }
    const from = query.dateFrom ? new Date(`${query.dateFrom}T00:00:00-03:00`) : undefined;
    const until = query.dateTo ? new Date(new Date(`${query.dateTo}T00:00:00-03:00`).getTime() + 86400000) : undefined;
    if ((from && Number.isNaN(from.getTime())) || (until && Number.isNaN(until.getTime()))) throw new BadRequestException('Fecha inválida.');
    const where: Prisma.OrderWhereInput = {
      status: query.status,
      customerAccountId: query.customerId,
      createdAt: from || until ? { gte: from, lt: until } : undefined,
      AND: query.customer ? [{ OR: [
        { customerAccount: { businessName: { contains: query.customer, mode: 'insensitive' } } },
        { customerAccount: { legalName: { contains: query.customer, mode: 'insensitive' } } },
        { customerAccount: { rut: { contains: query.customer } } },
        { user: { email: { contains: query.customer, mode: 'insensitive' } } },
      ] }] : undefined,
      OR: search ? [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { id: { contains: search } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { customerAccount: { businessName: { contains: search, mode: 'insensitive' } } },
        { customerAccount: { legalName: { contains: search, mode: 'insensitive' } } },
      ] : undefined,
    };
    let items: AdminOrder[];
    let total: number;
    if (query.paymentStatus) {
      const terms: Prisma.Sql[] = [];
      if (query.status) terms.push(Prisma.sql`o."status"::text = ${query.status}`);
      if (query.customerId) terms.push(Prisma.sql`o."customerAccountId" = ${query.customerId}`);
      if (query.customer) {
        const customer = `%${query.customer}%`;
        terms.push(Prisma.sql`(EXISTS (SELECT 1 FROM "User" u WHERE u."id" = o."userId" AND u."email" ILIKE ${customer})
          OR EXISTS (SELECT 1 FROM "CustomerAccount" c WHERE c."id" = o."customerAccountId" AND (c."businessName" ILIKE ${customer} OR c."legalName" ILIKE ${customer} OR c."rut" ILIKE ${customer})))`);
      }
      if (from) terms.push(Prisma.sql`o."createdAt" >= ${from}`);
      if (until) terms.push(Prisma.sql`o."createdAt" < ${until}`);
      if (search) {
        const pattern = `%${search}%`;
        terms.push(Prisma.sql`(o."orderNumber" ILIKE ${pattern} OR o."id" ILIKE ${pattern}
          OR EXISTS (SELECT 1 FROM "User" u WHERE u."id" = o."userId" AND u."email" ILIKE ${pattern})
          OR EXISTS (SELECT 1 FROM "CustomerAccount" c WHERE c."id" = o."customerAccountId" AND (c."businessName" ILIKE ${pattern} OR c."legalName" ILIKE ${pattern})))`);
      }
      const netTotal = Prisma.sql`GREATEST(o."total" - o."creditedTotal", 0)`;
      const netPaid = Prisma.sql`GREATEST(o."paidTotal" - o."refundedTotal", 0)`;
      if (query.paymentStatus === 'CREDITED') terms.push(Prisma.sql`${netTotal} = 0`);
      if (query.paymentStatus === 'PENDING') terms.push(Prisma.sql`${netTotal} > 0 AND ${netPaid} = 0`);
      if (query.paymentStatus === 'PARTIAL') terms.push(Prisma.sql`${netTotal} > 0 AND ${netPaid} > 0 AND ${netPaid} < ${netTotal}`);
      if (query.paymentStatus === 'PAID') terms.push(Prisma.sql`${netTotal} > 0 AND ${netPaid} >= ${netTotal}`);
      const predicate = Prisma.join(terms, ' AND ');
      const skip = (query.page - 1) * query.limit;
      const [ids, count] = await Promise.all([
        this.prisma.$queryRaw<{ id: string }[]>`SELECT o."id" FROM "Order" o WHERE ${predicate} ORDER BY o."createdAt" DESC, o."id" DESC LIMIT ${query.limit} OFFSET ${skip}`,
        this.prisma.$queryRaw<{ total: number }[]>`SELECT count(*)::integer AS total FROM "Order" o WHERE ${predicate}`,
      ]);
      total = count[0]?.total ?? 0;
      const found = ids.length ? await this.prisma.order.findMany({ where: { id: { in: ids.map((row) => row.id) } }, include: adminOrderInclude }) : [];
      const byId = new Map(found.map((order) => [order.id, order]));
      items = ids.flatMap((row) => { const order = byId.get(row.id); return order ? [order] : []; });
    } else {
      [items, total] = await Promise.all([this.prisma.order.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: adminOrderInclude,
      }), this.prisma.order.count({ where })]);
    }
    return { items: await this.withAdminActors(items), meta: { total, page: query.page, limit: query.limit } };
  }

  async findAdminOrder(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: adminOrderInclude });
    if (!order) throw new NotFoundException('Pedido no encontrado.');
    return (await this.withAdminActors([order]))[0];
  }

  private async withAdminActors(items: AdminOrder[]) {
    const actorIds = [...new Set(items.flatMap((order) => [
      ...order.payments.flatMap((payment) => [payment.recordedById, payment.voidedById]),
      ...order.invoices.flatMap((invoice) => [invoice.uploadedById, invoice.voidedById]),
      ...order.creditNotes.map((note) => note.recordedById),
      ...order.refunds.map((refund) => refund.recordedById),
    ]).filter((id): id is string => !!id))];
    const actors = actorIds.length ? await this.prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, email: true } }) : [];
    const emails = new Map(actors.map((actor) => [actor.id, actor.email]));
    return items.map((order) => ({
      ...order,
      payments: order.payments.map((payment) => ({ ...payment, recordedByEmail: emails.get(payment.recordedById) ?? null, voidedByEmail: payment.voidedById ? emails.get(payment.voidedById) ?? null : null })),
      invoices: order.invoices.map((invoice) => ({ ...invoice, uploadedByEmail: emails.get(invoice.uploadedById) ?? null, voidedByEmail: invoice.voidedById ? emails.get(invoice.voidedById) ?? null : null })),
      creditNotes: order.creditNotes.map((note) => ({ ...note, recordedByEmail: emails.get(note.recordedById) ?? null, storagePath: undefined })),
      refunds: order.refunds.map((refund) => ({ ...refund, recordedByEmail: emails.get(refund.recordedById) ?? null })),
    }));
  }

  async updateStatus(id: string, status: OrderStatus, userId?: string, reviewReason?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { reservations: true, user: true },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado.');
    if ((status === OrderStatus.REJECTED || status === OrderStatus.CANCELLED) && order.paidTotal.gt(order.refundedTotal)) {
      throw new BadRequestException('El pedido tiene pagos registrados. Gestioná la devolución antes de anularlo.');
    }

    await this.prisma.$transaction(async (tx) => {
      if (status === OrderStatus.APPROVED || status === OrderStatus.PROCESSING) {
        await this.consumeReservations(order.id, tx);
      }
      if (status === OrderStatus.REJECTED || status === OrderStatus.CANCELLED) {
        await this.releaseReservations(order.id, tx, StockReservationStatus.RELEASED);
      }
      if (status === OrderStatus.REJECTED || status === OrderStatus.CANCELLED) {
        const updated = await tx.order.updateMany({
          where: { id, paidTotal: order.paidTotal, refundedTotal: order.refundedTotal },
          data: { status, reviewReason },
        });
        if (!updated.count) throw new BadRequestException('El pedido tiene pagos registrados. Gestioná la devolución antes de anularlo.');
      } else {
        await tx.order.update({ where: { id }, data: { status, reviewReason } });
      }
    });

    await this.audit.log(`ORDER_${status}`, 'Order', id, userId, { reviewReason });
    await this.notifications.notify(`order.${status.toLowerCase()}`, order.user.email, { orderId: id });
    return this.prisma.order.findUnique({ where: { id }, include: { items: true, reservations: true } });
  }

  private assertCanCheckout(user: JwtUser) {
    if (user.role === Role.ADMIN) return;
    if (user.role !== Role.CLIENT || !user.permissions.includes(Permission.CAN_PLACE_ORDERS)) {
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
