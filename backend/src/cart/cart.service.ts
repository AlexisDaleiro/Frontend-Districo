import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Permission, Prisma, Role, StockReservationStatus } from '@prisma/client';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUser } from '../common/types/jwt-user.type';

const RESERVATION_TTL_MS = 48 * 60 * 60 * 1000;

const variantInclude = () =>
  ({
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
  }) satisfies Prisma.ProductVariantInclude;

const cartInclude = () =>
  ({
    items: {
      orderBy: { createdAt: 'asc' },
      include: { productVariant: { include: variantInclude() } },
    },
    reservations: {
      where: { status: StockReservationStatus.ACTIVE },
      orderBy: { createdAt: 'asc' },
    },
  }) satisfies Prisma.CartInclude;

type CartWithItems = Prisma.CartGetPayload<{ include: ReturnType<typeof cartInclude> }>;
type CartVariant = CartWithItems['items'][number]['productVariant'];

@Injectable()
export class CartService implements OnModuleInit, OnModuleDestroy {
  private expirationJob?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  onModuleInit() {
    this.expirationJob = setInterval(() => {
      this.expireReservations().catch(() => undefined);
    }, 5 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.expirationJob) clearInterval(this.expirationJob);
  }

  async getCart(user: JwtUser) {
    const cart = await this.ensureCart(user.sub);
    return this.toCartResponse(cart);
  }

  async addItem(user: JwtUser, variantId: string, quantity: number) {
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

  async updateItem(user: JwtUser, itemId: string, quantity: number) {
    this.assertCanUseCart(user);
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId: user.sub } },
      include: { productVariant: { include: variantInclude() } },
    });
    if (!item) {
      throw new NotFoundException('Item de carrito no encontrado.');
    }

    this.validateVariantForUser(item.productVariant, quantity, user);
    await this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
    return this.getCart(user);
  }

  async removeItem(user: JwtUser, itemId: string) {
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cart: { userId: user.sub } } });
    if (!item) {
      throw new NotFoundException('Item de carrito no encontrado.');
    }
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.getCart(user);
  }

  async reserveCart(user: JwtUser) {
    this.assertCanUseCart(user);
    await this.expireReservations();
    const cart = await this.ensureCart(user.sub);
    if (!cart.items.length) {
      throw new BadRequestException('El carrito esta vacio.');
    }

    const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS);

    await this.prisma.$transaction(async (tx) => {
      await this.releaseActiveCartReservations(cart.id, tx, StockReservationStatus.RELEASED);

      for (const item of cart.items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.productVariantId },
          include: variantInclude(),
        });
        if (!variant) {
          throw new NotFoundException('Variante no encontrada.');
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

  async releaseCartReservations(user: JwtUser) {
    const cart = await this.ensureCart(user.sub);
    await this.prisma.$transaction((tx) => this.releaseActiveCartReservations(cart.id, tx, StockReservationStatus.RELEASED));
    return this.getCart(user);
  }

  async expireReservations() {
    const expired = await this.prisma.stockReservation.findMany({
      where: { status: StockReservationStatus.ACTIVE, expiresAt: { lte: new Date() } },
    });
    if (!expired.length) return { expired: 0 };

    await this.prisma.$transaction(async (tx) => {
      for (const reservation of expired) {
        await tx.productVariant.update({
          where: { id: reservation.variantId },
          data: { reservedStock: { decrement: reservation.quantity } },
        });
        await tx.stockReservation.update({
          where: { id: reservation.id },
          data: { status: StockReservationStatus.EXPIRED, releasedAt: new Date() },
        });
      }
    });

    return { expired: expired.length };
  }

  private async ensureCart(userId: string) {
    const cart = await this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: cartInclude(),
    });
    return cart;
  }

  private async findVariantForCart(variantId: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: variantInclude(),
    });
    if (!variant || variant.deletedAt || variant.product.deletedAt || !variant.product.active) {
      throw new NotFoundException('Variante no encontrada.');
    }
    return variant;
  }

  private validateVariantForUser(variant: CartVariant, quantity: number, user: JwtUser) {
    this.assertCanUseCart(user);
    if (variant.product.requiresMedicationPermission && !this.canBuyMedication(user)) {
      throw new ForbiddenException('Producto disponible exclusivamente para clientes habilitados.');
    }
    if (!variant.prices[0]) {
      throw new BadRequestException('La variante no tiene precio vigente.');
    }
    this.inventoryService.validateAvailableStock(variant, quantity);
  }

  private assertCanUseCart(user: JwtUser) {
    if (user.role === Role.ADMIN) return;
    if (!user.permissions.includes(Permission.CAN_VIEW_PRICES) || !user.permissions.includes(Permission.CAN_PLACE_ORDERS)) {
      throw new ForbiddenException('La cuenta no esta habilitada para comprar.');
    }
  }

  private canBuyMedication(user: JwtUser) {
    return user.role === Role.ADMIN || user.permissions.includes(Permission.CAN_BUY_MEDICATIONS);
  }

  private async releaseActiveCartReservations(cartId: string, tx: Prisma.TransactionClient, status: StockReservationStatus) {
    const reservations = await tx.stockReservation.findMany({
      where: { cartId, status: StockReservationStatus.ACTIVE },
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

  private toCartResponse(cart: CartWithItems) {
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
}
