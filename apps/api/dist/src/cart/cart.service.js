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
exports.CartService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const inventory_service_1 = require("../inventory/inventory.service");
const prisma_service_1 = require("../prisma/prisma.service");
const RESERVATION_TTL_MS = 48 * 60 * 60 * 1000;
const variantInclude = () => ({
    product: { include: { brand: true, laboratory: true } },
    prices: {
        where: {
            priceList: { active: true },
            validFrom: { lte: new Date() },
            OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
        },
        orderBy: { validFrom: 'desc' },
        take: 1,
        include: { priceList: true },
    },
});
const cartInclude = () => ({
    items: {
        orderBy: { createdAt: 'asc' },
        include: { productVariant: { include: variantInclude() } },
    },
    reservations: {
        where: { status: client_1.StockReservationStatus.ACTIVE },
        orderBy: { createdAt: 'asc' },
    },
});
let CartService = class CartService {
    constructor(prisma, inventoryService) {
        this.prisma = prisma;
        this.inventoryService = inventoryService;
    }
    onModuleInit() {
        this.expirationJob = setInterval(() => {
            this.expireReservations().catch(() => undefined);
        }, 5 * 60 * 1000);
    }
    onModuleDestroy() {
        if (this.expirationJob)
            clearInterval(this.expirationJob);
    }
    async getCart(user) {
        const cart = await this.ensureCart(user.sub);
        return this.toCartResponse(cart);
    }
    async addItem(user, variantId, quantity) {
        this.assertCanUseCart(user);
        const cart = await this.ensureCart(user.sub);
        const variant = await this.findVariantForCart(variantId);
        this.validateVariantForUser(variant, quantity, user);
        await this.prisma.cartItem.upsert({
            where: { cartId_productVariantId: { cartId: cart.id, productVariantId: variantId } },
            create: { cartId: cart.id, productVariantId: variantId, quantity },
            update: { quantity },
        });
        return this.getCart(user);
    }
    async updateItem(user, itemId, quantity) {
        this.assertCanUseCart(user);
        const item = await this.prisma.cartItem.findFirst({
            where: { id: itemId, cart: { userId: user.sub } },
            include: { productVariant: { include: variantInclude() } },
        });
        if (!item) {
            throw new common_1.NotFoundException('Item de carrito no encontrado.');
        }
        this.validateVariantForUser(item.productVariant, quantity, user);
        await this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
        return this.getCart(user);
    }
    async removeItem(user, itemId) {
        const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cart: { userId: user.sub } } });
        if (!item) {
            throw new common_1.NotFoundException('Item de carrito no encontrado.');
        }
        await this.prisma.cartItem.delete({ where: { id: itemId } });
        return this.getCart(user);
    }
    async reserveCart(user) {
        this.assertCanUseCart(user);
        await this.expireReservations();
        const cart = await this.ensureCart(user.sub);
        if (!cart.items.length) {
            throw new common_1.BadRequestException('El carrito esta vacio.');
        }
        const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS);
        await this.prisma.$transaction(async (tx) => {
            await this.releaseActiveCartReservations(cart.id, tx, client_1.StockReservationStatus.RELEASED);
            for (const item of cart.items) {
                const variant = await tx.productVariant.findUnique({
                    where: { id: item.productVariantId },
                    include: variantInclude(),
                });
                if (!variant) {
                    throw new common_1.NotFoundException('Variante no encontrada.');
                }
                this.validateVariantForUser(variant, item.quantity, user);
                await tx.productVariant.update({
                    where: { id: variant.id },
                    data: { reservedStock: { increment: item.quantity } },
                });
                await tx.stockReservation.create({
                    data: {
                        cartId: cart.id,
                        variantId: variant.id,
                        quantity: item.quantity,
                        expiresAt,
                    },
                });
            }
        });
        return this.getCart(user);
    }
    async releaseCartReservations(user) {
        const cart = await this.ensureCart(user.sub);
        await this.prisma.$transaction((tx) => this.releaseActiveCartReservations(cart.id, tx, client_1.StockReservationStatus.RELEASED));
        return this.getCart(user);
    }
    async expireReservations() {
        const expired = await this.prisma.stockReservation.findMany({
            where: { status: client_1.StockReservationStatus.ACTIVE, expiresAt: { lte: new Date() } },
        });
        if (!expired.length)
            return { expired: 0 };
        await this.prisma.$transaction(async (tx) => {
            for (const reservation of expired) {
                await tx.productVariant.update({
                    where: { id: reservation.variantId },
                    data: { reservedStock: { decrement: reservation.quantity } },
                });
                await tx.stockReservation.update({
                    where: { id: reservation.id },
                    data: { status: client_1.StockReservationStatus.EXPIRED, releasedAt: new Date() },
                });
            }
        });
        return { expired: expired.length };
    }
    async ensureCart(userId) {
        const cart = await this.prisma.cart.upsert({
            where: { userId },
            create: { userId },
            update: {},
            include: cartInclude(),
        });
        return cart;
    }
    async findVariantForCart(variantId) {
        const variant = await this.prisma.productVariant.findUnique({
            where: { id: variantId },
            include: variantInclude(),
        });
        if (!variant || variant.deletedAt || variant.product.deletedAt || !variant.product.active) {
            throw new common_1.NotFoundException('Variante no encontrada.');
        }
        return variant;
    }
    validateVariantForUser(variant, quantity, user) {
        this.assertCanUseCart(user);
        if (variant.product.requiresMedicationPermission && !this.canBuyMedication(user)) {
            throw new common_1.ForbiddenException('Producto disponible exclusivamente para clientes habilitados.');
        }
        if (!variant.prices[0]) {
            throw new common_1.BadRequestException('La variante no tiene precio vigente.');
        }
        this.inventoryService.validateAvailableStock(variant, quantity);
    }
    assertCanUseCart(user) {
        if (user.role === client_1.Role.ADMIN)
            return;
        if (!user.permissions.includes(client_1.Permission.CAN_VIEW_PRICES) || !user.permissions.includes(client_1.Permission.CAN_PLACE_ORDERS)) {
            throw new common_1.ForbiddenException('La cuenta no esta habilitada para comprar.');
        }
    }
    canBuyMedication(user) {
        return user.role === client_1.Role.ADMIN || user.permissions.includes(client_1.Permission.CAN_BUY_MEDICATIONS);
    }
    async releaseActiveCartReservations(cartId, tx, status) {
        const reservations = await tx.stockReservation.findMany({
            where: { cartId, status: client_1.StockReservationStatus.ACTIVE },
        });
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
    toCartResponse(cart) {
        const items = cart.items.map((item) => {
            const variant = item.productVariant;
            const currentPrice = variant.prices[0];
            const unitPrice = currentPrice ? Number(currentPrice.amount) : 0;
            return {
                id: item.id,
                quantity: item.quantity,
                product: {
                    id: variant.product.id,
                    name: variant.product.name,
                    slug: variant.product.slug,
                    requiresMedicationPermission: variant.product.requiresMedicationPermission,
                    brand: variant.product.brand,
                    laboratory: variant.product.laboratory,
                },
                variant: {
                    id: variant.id,
                    sku: variant.sku,
                    ean: variant.ean,
                    name: variant.name,
                    presentation: variant.presentation,
                    saleMultiple: variant.saleMultiple,
                    minimumOrderQuantity: variant.minimumOrderQuantity,
                    availableStock: this.inventoryService.availableStock(variant),
                },
                unitPrice,
                currency: currentPrice?.currency ?? 'UYU',
                subtotal: unitPrice * item.quantity,
            };
        });
        return {
            id: cart.id,
            items,
            reservations: cart.reservations,
            total: items.reduce((sum, item) => sum + item.subtotal, 0),
        };
    }
};
exports.CartService = CartService;
exports.CartService = CartService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        inventory_service_1.InventoryService])
], CartService);
//# sourceMappingURL=cart.service.js.map