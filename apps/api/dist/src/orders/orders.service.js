"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const audit_service_1 = require("../audit/audit.service");
const commerce_rules_1 = require("../common/business/commerce-rules");
const inventory_service_1 = require("../inventory/inventory.service");
const notifications_service_1 = require("../notifications/notifications.service");
const prisma_service_1 = require("../prisma/prisma.service");
const promotions_service_1 = require("../promotions/promotions.service");
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
};
let OrdersService = class OrdersService {
    constructor(prisma, inventory, promotions, audit, notifications) {
        this.prisma = prisma;
        this.inventory = inventory;
        this.promotions = promotions;
        this.audit = audit;
        this.notifications = notifications;
    }
    async checkout(user, acceptManualReview = false) {
        this.assertCanCheckout(user);
        const cart = await this.prisma.cart.findUnique({
            where: { userId: user.sub },
            include: cartForCheckoutInclude,
        });
        if (!cart || !cart.items.length)
            throw new common_1.BadRequestException('El carrito esta vacio.');
        const creditStatus = cart.user.customerAccount?.creditStatus;
        const manualReview = (0, commerce_rules_1.requiresManualReview)(creditStatus);
        if (manualReview && !acceptManualReview) {
            throw new common_1.BadRequestException('Este pedido quedara sujeto a revision manual. Debe aceptar la condicion.');
        }
        const promotionLines = this.toPromotionLines(cart);
        const discounts = await this.promotions.calculateDiscounts(promotionLines);
        const discountByLine = new Map();
        for (const discount of discounts) {
            discountByLine.set(discount.lineIndex, (discountByLine.get(discount.lineIndex) ?? 0) + discount.amount);
        }
        const order = await this.prisma.$transaction(async (tx) => {
            await this.releaseActiveCartReservations(cart.id, tx, client_1.StockReservationStatus.RELEASED);
            const subtotal = cart.items.reduce((sum, item) => sum + this.lineGross(item), 0);
            const discountTotal = [...discountByLine.values()].reduce((sum, amount) => sum + amount, 0);
            const createdOrder = await tx.order.create({
                data: {
                    orderNumber: `DIS-${Date.now()}`,
                    userId: user.sub,
                    customerAccountId: user.customerAccountId,
                    status: (0, commerce_rules_1.submittedStatusForCredit)(creditStatus),
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
                    throw new common_1.ForbiddenException('Producto disponible exclusivamente para clientes habilitados.');
                }
                if (!variant.prices[0])
                    throw new common_1.BadRequestException('La variante no tiene precio vigente.');
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
    findMyOrders(user) {
        return this.prisma.order.findMany({
            where: { userId: user.sub },
            orderBy: { createdAt: 'desc' },
            include: { items: true },
        });
    }
    async findMyOrder(user, id) {
        const order = await this.prisma.order.findFirst({
            where: { id, userId: user.sub },
            include: { items: true, reservations: true },
        });
        if (!order)
            throw new common_1.NotFoundException('Pedido no encontrado.');
        return order;
    }
    findAdminOrders() {
        return this.prisma.order.findMany({
            orderBy: { createdAt: 'desc' },
            include: { items: true, user: { select: { email: true } }, customerAccount: true },
        });
    }
    async updateStatus(id, status, userId, reviewReason) {
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: { reservations: true, user: true },
        });
        if (!order)
            throw new common_1.NotFoundException('Pedido no encontrado.');
        await this.prisma.$transaction(async (tx) => {
            if (status === client_1.OrderStatus.APPROVED || status === client_1.OrderStatus.PROCESSING) {
                await this.consumeReservations(order.id, tx);
            }
            if (status === client_1.OrderStatus.REJECTED || status === client_1.OrderStatus.CANCELLED) {
                await this.releaseReservations(order.id, tx, client_1.StockReservationStatus.RELEASED);
            }
            await tx.order.update({ where: { id }, data: { status, reviewReason } });
        });
        await this.audit.log(`ORDER_${status}`, 'Order', id, userId, { reviewReason });
        await this.notifications.notify(`order.${status.toLowerCase()}`, order.user.email, { orderId: id });
        return this.prisma.order.findUnique({ where: { id }, include: { items: true, reservations: true } });
    }
    assertCanCheckout(user) {
        if (user.role === client_1.Role.ADMIN)
            return;
        if (!user.permissions.includes(client_1.Permission.CAN_PLACE_ORDERS)) {
            throw new common_1.ForbiddenException('La cuenta no esta habilitada para comprar.');
        }
    }
    canBuyMedication(user) {
        return user.role === client_1.Role.ADMIN || user.permissions.includes(client_1.Permission.CAN_BUY_MEDICATIONS);
    }
    lineGross(item) {
        return item.quantity * Number(item.productVariant.prices[0]?.amount ?? 0);
    }
    toPromotionLines(cart) {
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
    async releaseActiveCartReservations(cartId, tx, status) {
        const reservations = await tx.stockReservation.findMany({ where: { cartId, status: client_1.StockReservationStatus.ACTIVE } });
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
    async releaseReservations(orderId, tx, status) {
        const reservations = await tx.stockReservation.findMany({ where: { orderId, status: client_1.StockReservationStatus.ACTIVE } });
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
    async consumeReservations(orderId, tx) {
        const reservations = await tx.stockReservation.findMany({ where: { orderId, status: client_1.StockReservationStatus.ACTIVE } });
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
                data: { status: client_1.StockReservationStatus.CONSUMED, consumedAt: new Date() },
            });
        }
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        inventory_service_1.InventoryService,
        promotions_service_1.PromotionsService,
        audit_service_1.AuditService,
        notifications_service_1.NotificationsService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map