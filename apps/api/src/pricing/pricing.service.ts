import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_PRICE_LIST_NAME = 'Lista Mayorista Districo';

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async defaultPriceList() {
    return this.prisma.priceList.upsert({
      where: { name: DEFAULT_PRICE_LIST_NAME },
      create: { name: DEFAULT_PRICE_LIST_NAME, active: true },
      update: { active: true },
    });
  }

  async currentVariantPrice(productVariantId: string, priceListId?: string) {
    const list = priceListId ? await this.findPriceList(priceListId) : await this.defaultPriceList();
    return this.prisma.price.findFirst({
      where: {
        productVariantId,
        priceListId: list.id,
        validFrom: { lte: new Date() },
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
      orderBy: { validFrom: 'desc' },
      include: { priceList: true },
    });
  }

  async setVariantPrice(productVariantId: string, amount: number, currency = 'UYU', changedById?: string, priceListId?: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: productVariantId, deletedAt: null },
    });
    if (!variant) {
      throw new NotFoundException('Variante no encontrada.');
    }

    const list = priceListId ? await this.findPriceList(priceListId) : await this.defaultPriceList();
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.price.findFirst({
        where: {
          productVariantId,
          priceListId: list.id,
          validFrom: { lte: now },
          OR: [{ validUntil: null }, { validUntil: { gte: now } }],
        },
        orderBy: { validFrom: 'desc' },
      });

      if (current) {
        await tx.price.update({
          where: { id: current.id },
          data: { validUntil: now },
        });
      }

      const price = await tx.price.create({
        data: {
          productVariantId,
          priceListId: list.id,
          amount,
          currency,
          validFrom: now,
        },
        include: { priceList: true },
      });

      await tx.priceHistory.create({
        data: {
          productVariantId,
          previousPrice: current?.amount,
          newPrice: amount,
          currency,
          changedById,
        },
      });

      return price;
    });
  }

  private async findPriceList(id: string) {
    const priceList = await this.prisma.priceList.findUnique({ where: { id } });
    if (!priceList || !priceList.active) {
      throw new NotFoundException('Lista de precios no encontrada.');
    }
    return priceList;
  }
}
