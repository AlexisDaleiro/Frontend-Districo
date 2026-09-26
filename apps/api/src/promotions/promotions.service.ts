import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PromotionMetric } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { calculatePromotionDiscounts, PromotionLine, PromotionSnapshot } from '../common/business/promotion-rules';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpirationPromotionDto } from './dto/create-expiration-promotion.dto';
import { CreatePromotionDto } from './dto/create-promotion.dto';

const promotionInclude = {
  conditions: true,
  rewards: true,
} satisfies Prisma.PromotionInclude;

@Injectable()
export class PromotionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  findMany() {
    return this.prisma.promotion.findMany({
      where: { deletedAt: null },
      include: promotionInclude,
      orderBy: [{ active: 'desc' }, { priority: 'desc' }],
    });
  }

  async create(dto: CreatePromotionDto, createdById?: string) {
    const promotion = await this.prisma.promotion.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        priority: dto.priority ?? 0,
        combinable: dto.combinable ?? false,
        createdById,
        conditions: {
          create: dto.conditions.map((condition) => ({
            targetType: condition.targetType,
            targetId: condition.targetId,
            metric: condition.metric ?? PromotionMetric.MIN_QUANTITY,
            minQuantity: condition.minQuantity,
            minAmount: condition.minAmount,
          })),
        },
        rewards: {
          create: dto.rewards.map((reward) => ({
            targetType: reward.targetType,
            targetId: reward.targetId,
            rewardType: reward.rewardType,
            percentage: reward.percentage,
            amount: reward.amount,
          })),
        },
      },
      include: promotionInclude,
    });
    await this.audit.log('PROMOTION_CREATED', 'Promotion', promotion.id, createdById, { name: promotion.name });
    return promotion;
  }

  async updateActive(id: string, active: boolean, userId?: string) {
    const promotion = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promotion) throw new NotFoundException('Promocion no encontrada.');
    const updated = await this.prisma.promotion.update({ where: { id }, data: { active }, include: promotionInclude });
    await this.audit.log('PROMOTION_UPDATED', 'Promotion', id, userId, { active });
    return updated;
  }

  createExpirationPromotion(dto: CreateExpirationPromotionDto, userId?: string) {
    return this.prisma.expirationPromotion.create({
      data: {
        productId: dto.productId,
        variantId: dto.variantId,
        batch: dto.batch,
        expirationDate: new Date(dto.expirationDate),
        discountPercentage: dto.discountPercentage,
        promotionalPrice: dto.promotionalPrice,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        quantityLimit: dto.quantityLimit,
        active: dto.active ?? true,
      },
    }).then(async (promotion) => {
      await this.audit.log('EXPIRATION_PROMOTION_CREATED', 'ExpirationPromotion', promotion.id, userId, { productId: dto.productId, variantId: dto.variantId });
      return promotion;
    });
  }

  findExpirationPromotions() {
    return this.prisma.expirationPromotion.findMany({
      orderBy: [{ active: 'desc' }, { expirationDate: 'asc' }],
    });
  }

  async calculateDiscounts(lines: PromotionLine[]) {
    const now = new Date();
    const promotions = await this.prisma.promotion.findMany({
      where: {
        active: true,
        deletedAt: null,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      include: promotionInclude,
      orderBy: { priority: 'desc' },
    });
    const snapshots: PromotionSnapshot[] = promotions.map((promotion) => ({
      id: promotion.id,
      name: promotion.name,
      type: promotion.type,
      priority: promotion.priority,
      combinable: promotion.combinable,
      conditions: promotion.conditions.map((condition) => ({
        targetType: condition.targetType,
        targetId: condition.targetId,
        metric: condition.metric,
        minQuantity: condition.minQuantity,
        minAmount: condition.minAmount ? Number(condition.minAmount) : null,
      })),
      rewards: promotion.rewards.map((reward) => ({
        targetType: reward.targetType,
        targetId: reward.targetId,
        rewardType: reward.rewardType,
        percentage: reward.percentage ? Number(reward.percentage) : null,
        amount: reward.amount ? Number(reward.amount) : null,
      })),
    }));

    return calculatePromotionDiscounts(lines, snapshots);
  }
}
