import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PromotionMetric, PromotionTargetType } from '@prisma/client';
import { CategoryHierarchyService } from '../catalog/categories/category-hierarchy.service';
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
    private readonly hierarchy: CategoryHierarchyService,
  ) {}

  async findMany() {
    const promotions = await this.prisma.promotion.findMany({
      where: { deletedAt: null },
      include: promotionInclude,
      orderBy: [{ active: 'desc' }, { priority: 'desc' }],
    });
    const names = new Map<PromotionTargetType, Map<string, string>>();
    for (const type of Object.values(PromotionTargetType)) {
      const ids = [...new Set(promotions.flatMap((promotion) => [
        ...promotion.conditions.filter((item) => item.targetType === type).flatMap((item) => item.targetIds.length ? item.targetIds : item.targetId ? [item.targetId] : []),
        ...promotion.rewards.filter((item) => item.targetType === type).flatMap((item) => item.targetId ? [item.targetId] : []),
      ]))];
      const entities = ids.length ? await this.entities(type, ids) : [];
      names.set(type, new Map(entities.map((item) => [item.id, item.name])));
    }
    return promotions.map((promotion) => ({ ...promotion,
      triggerTargets: promotion.conditions.flatMap((item) => (item.targetIds.length ? item.targetIds : item.targetId ? [item.targetId] : []).map((id) => ({ id, name: names.get(item.targetType)?.get(id) ?? id }))),
      targetTargets: promotion.rewards.flatMap((item) => item.targetId ? [{ id: item.targetId, name: names.get(item.targetType)?.get(item.targetId) ?? item.targetId }] : []),
    }));
  }

  async create(dto: CreatePromotionDto, createdById?: string) {
    await this.validateSelections(dto);
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
            targetIds: condition.targetIds ?? [],
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
    await this.validateSelections(dto);
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
          targetIds: condition.targetIds ?? [],
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
    const expandedCategories = new Map<string, string[]>();
    for (const id of new Set(promotions.flatMap((promotion) => [
      ...promotion.conditions.filter((item) => item.targetType === PromotionTargetType.CATEGORY).flatMap((item) => item.targetIds.length ? item.targetIds : item.targetId ? [item.targetId] : []),
      ...promotion.rewards.filter((item) => item.targetType === PromotionTargetType.CATEGORY).flatMap((item) => item.targetId ? [item.targetId] : []),
    ]))) expandedCategories.set(id, await this.hierarchy.descendantIds([id]));
    const expand = (type: PromotionTargetType, ids: string[]) => type === PromotionTargetType.CATEGORY
      ? [...new Set(ids.flatMap((id) => expandedCategories.get(id) ?? [id]))] : ids;
    const snapshots: PromotionSnapshot[] = promotions.map((promotion) => ({
      id: promotion.id,
      name: promotion.name,
      type: promotion.type,
      priority: promotion.priority,
      combinable: promotion.combinable,
      conditions: promotion.conditions.map((condition) => ({
        targetType: condition.targetType,
        targetId: condition.targetId,
        targetIds: expand(condition.targetType, condition.targetIds.length ? condition.targetIds : condition.targetId ? [condition.targetId] : []),
        metric: condition.metric,
        minQuantity: condition.minQuantity ?? (condition.targetIds.length ? 1 : 0),
        minAmount: condition.minAmount ? Number(condition.minAmount) : null,
      })),
      rewards: promotion.rewards.map((reward) => ({
        targetType: reward.targetType,
        targetId: reward.targetId,
        targetIds: expand(reward.targetType, reward.targetId ? [reward.targetId] : []),
        rewardType: reward.rewardType,
        percentage: reward.percentage ? Number(reward.percentage) : null,
        amount: reward.amount ? Number(reward.amount) : null,
      })),
    }));

    return calculatePromotionDiscounts(lines, snapshots);
  }

  private entities(type: PromotionTargetType, ids: string[]) {
    const query = { where: { id: { in: ids }, deletedAt: null }, select: { id: true, name: true } };
    switch (type) {
      case PromotionTargetType.PRODUCT: return this.prisma.product.findMany(query);
      case PromotionTargetType.PRODUCT_VARIANT: return this.prisma.productVariant.findMany(query);
      case PromotionTargetType.BRAND: return this.prisma.brand.findMany(query);
      case PromotionTargetType.CATEGORY: return this.prisma.category.findMany(query);
      case PromotionTargetType.LABORATORY: return this.prisma.laboratory.findMany(query);
    }
  }

  private async validateSelections(dto: CreatePromotionDto) {
    if (dto.endsAt && new Date(dto.endsAt) < new Date(dto.startsAt)) throw new BadRequestException('La fecha final debe ser posterior al inicio.');
    for (const condition of dto.conditions) {
      if (condition.targetIds != null && (!condition.targetIds.length || condition.targetIds.length > 100 ||
        new Set(condition.targetIds).size !== condition.targetIds.length || condition.targetIds.some((id) => !id.trim())))
        throw new BadRequestException('Elegí entre uno y cien elementos distintos para activar la promoción.');
      if (condition.targetIds?.length && condition.targetId) throw new BadRequestException('No mezcles una selección múltiple con un destino individual.');
      if (condition.targetIds?.length && condition.metric === PromotionMetric.MIN_AMOUNT && !(Number(condition.minAmount) > 0))
        throw new BadRequestException('Indicá un importe mínimo mayor a cero para activar la promoción.');
    }
    for (const type of Object.values(PromotionTargetType)) {
      const ids = [...new Set([
        ...dto.conditions.filter((item) => item.targetType === type).flatMap((item) => item.targetIds ?? (item.targetId ? [item.targetId] : [])),
        ...dto.rewards.filter((item) => item.targetType === type).flatMap((item) => item.targetId ? [item.targetId] : []),
      ])];
      if (ids.length && (await this.entities(type, ids)).length !== ids.length) throw new BadRequestException('La selección incluye elementos que ya no existen.');
    }
  }
}
