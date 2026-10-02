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
    const promotion = await this.prisma.promotion.findFirst({ where: { id, deletedAt: null } });
    if (!promotion) throw new NotFoundException('Promocion no encontrada.');
    const updated = await this.prisma.promotion.update({ where: { id }, data: { active }, include: promotionInclude });
    await this.audit.log('PROMOTION_UPDATED', 'Promotion', id, userId, { active });
    return updated;
  }

  async update(id: string, dto: CreatePromotionDto, userId?: string) {
    const existing = await this.prisma.promotion.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Promocion no encontrada.');
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.promotionCondition.deleteMany({ where: { promotionId: id } });
      await tx.promotionReward.deleteMany({ where: { promotionId: id } });
      return tx.promotion.update({ where: { id }, data: {
        name: dto.name,
        description: dto.description ?? null,
        type: dto.type,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        priority: dto.priority ?? 0,
        combinable: dto.combinable ?? false,
        conditions: { create: dto.conditions.map((condition) => ({
          targetType: condition.targetType, targetId: condition.targetId,
          metric: condition.metric ?? PromotionMetric.MIN_QUANTITY,
          minQuantity: condition.minQuantity, minAmount: condition.minAmount,
        })) },
        rewards: { create: dto.rewards.map((reward) => ({
          targetType: reward.targetType, targetId: reward.targetId,
          rewardType: reward.rewardType, percentage: reward.percentage, amount: reward.amount,
        })) },
      }, include: promotionInclude });
    });
    await this.audit.log('PROMOTION_UPDATED', 'Promotion', id, userId, { name: updated.name });
    return updated;
  }

  async remove(id: string, userId?: string) {
    const existing = await this.prisma.promotion.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Promocion no encontrada.');
    await this.prisma.promotion.update({ where: { id }, data: { active: false, deletedAt: new Date() } });
    await this.audit.log('PROMOTION_DELETED', 'Promotion', id, userId, { name: existing.name });
    return { success: true };
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

  async updateExpiration(id: string, dto: CreateExpirationPromotionDto, userId?: string) {
    const existing = await this.prisma.expirationPromotion.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Promocion por vencimiento no encontrada.');
    const updated = await this.prisma.expirationPromotion.update({ where: { id }, data: {
      productId: dto.productId ?? null,
      variantId: dto.variantId ?? null,
      batch: dto.batch ?? null,
      expirationDate: new Date(dto.expirationDate),
      discountPercentage: dto.discountPercentage ?? null,
      promotionalPrice: dto.promotionalPrice ?? null,
      startsAt: new Date(dto.startsAt),
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      quantityLimit: dto.quantityLimit ?? null,
      active: dto.active ?? existing.active,
    } });
    await this.audit.log('EXPIRATION_PROMOTION_UPDATED', 'ExpirationPromotion', id, userId);
    return updated;
  }

  async removeExpiration(id: string, userId?: string) {
    const existing = await this.prisma.expirationPromotion.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Promocion por vencimiento no encontrada.');
    await this.prisma.expirationPromotion.delete({ where: { id } });
    await this.audit.log('EXPIRATION_PROMOTION_DELETED', 'ExpirationPromotion', id, userId);
    return { success: true };
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
