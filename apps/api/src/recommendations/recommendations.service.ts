import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Permission, Prisma, RecommendationTriggerType, Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { JwtUser } from '../common/types/jwt-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecommendationRuleDto } from './dto/create-recommendation-rule.dto';
import { CategoryHierarchyService } from '../catalog/categories/category-hierarchy.service';
import { recommendationScope } from './recommendation-scope';
import { RuleListQueryDto } from '../admin/dto/rule-list-query.dto';
import { marketingRuleWhere } from '../common/business/marketing-list';

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly hierarchy: CategoryHierarchyService,
  ) {}

  async create(dto: CreateRecommendationRuleDto, userId?: string) {
    const selection = recommendationScope(dto);
    await this.validateSelection(selection);
    const rule = await this.prisma.recommendationRule.create({
      data: {
        name: dto.name,
        active: dto.active ?? true,
        priority: dto.priority ?? 0,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        triggerType: selection.triggerType,
        triggerId: selection.triggerId,
        triggerIds: selection.triggerIds,
        targetType: selection.targetType,
        targetIds: selection.targetIds,
        minimumQuantity: dto.minimumQuantity,
        minimumCartAmount: dto.minimumCartAmount,
        products: {
          create: selection.products.map((product) => ({
            productId: product.productId,
            variantId: product.variantId,
            position: product.position ?? 0,
          })),
        },
      },
      include: { products: true },
    });
    await this.audit.log('RECOMMENDATION_RULE_CREATED', 'RecommendationRule', rule.id, userId, { name: rule.name });
    return rule;
  }

  async findPage(query: RuleListQueryDto) {
    const now = new Date();
    const [items, total] = await Promise.all([
      this.findMany(query, now),
      this.prisma.recommendationRule.count({ where: marketingRuleWhere(query, now, true) }),
    ]);
    return { items, meta: { total, page: query.page, limit: query.limit } };
  }

  async findMany(query?: RuleListQueryDto, now = new Date()) {
    const rules = await this.prisma.recommendationRule.findMany({
      where: query ? marketingRuleWhere(query, now, true) : undefined,
      include: { products: true },
      orderBy: [{ active: 'desc' }, { priority: 'desc' }, { name: 'asc' }, { id: 'asc' }],
      ...(query ? { skip: (query.page - 1) * query.limit, take: query.limit } : {}),
    });
    const idsFor = (type: RecommendationTriggerType) => [...new Set(rules.flatMap((rule) => [
      ...(rule.triggerType === type ? rule.triggerIds.length ? rule.triggerIds : [rule.triggerId] : []),
      ...(rule.targetType === type ? rule.targetIds.length ? rule.targetIds : rule.products.map((item) => item.productId) : []),
    ]))];
    const names = new Map<RecommendationTriggerType, Map<string, string>>();
    for (const type of Object.values(RecommendationTriggerType)) {
      const ids = idsFor(type);
      const entities = ids.length ? await this.entities(type, ids) : [];
      names.set(type, new Map(entities.map((item) => [item.id, item.name])));
      if (type === RecommendationTriggerType.PRODUCT) {
        const missing = ids.filter((id) => !names.get(type)!.has(id));
        if (missing.length) {
          const variants = await this.prisma.productVariant.findMany({ where: { id: { in: missing }, deletedAt: null }, select: { id: true, name: true, product: { select: { name: true } } } });
          for (const variant of variants) names.get(type)!.set(variant.id, `${variant.product.name} / ${variant.name}`);
        }
      }
    }
    return rules.map((rule) => ({ ...rule,
      triggerTargets: (rule.triggerIds.length ? rule.triggerIds : [rule.triggerId]).map((id) => ({ id, name: names.get(rule.triggerType)?.get(id) ?? id })),
      targetTargets: (rule.targetIds.length ? rule.targetIds : rule.products.map((item) => item.productId)).map((id) => ({ id, name: names.get(rule.targetType)?.get(id) ?? id })),
    }));
  }

  async update(id: string, dto: CreateRecommendationRuleDto, userId?: string) {
    const existing = await this.prisma.recommendationRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Recomendacion no encontrada.');
    const selection = recommendationScope(dto);
    await this.validateSelection(selection);
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.recommendationRuleProduct.deleteMany({ where: { ruleId: id } });
      return tx.recommendationRule.update({ where: { id }, data: {
        name: dto.name,
        active: dto.active ?? existing.active,
        priority: dto.priority ?? 0,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        triggerType: selection.triggerType,
        triggerId: selection.triggerId,
        triggerIds: selection.triggerIds,
        targetType: selection.targetType,
        targetIds: selection.targetIds,
        minimumQuantity: dto.minimumQuantity ?? null,
        minimumCartAmount: dto.minimumCartAmount ?? null,
        products: { create: selection.products.map((product) => ({
          productId: product.productId, variantId: product.variantId, position: product.position ?? 0,
        })) },
      }, include: { products: true } });
    });
    await this.audit.log('RECOMMENDATION_RULE_UPDATED', 'RecommendationRule', id, userId, { name: updated.name });
    return updated;
  }

  async setActive(id: string, active: boolean, userId?: string) {
    const existing = await this.prisma.recommendationRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Recomendacion no encontrada.');
    const updated = await this.prisma.recommendationRule.update({ where: { id }, data: { active } });
    await this.audit.log('RECOMMENDATION_RULE_UPDATED', 'RecommendationRule', id, userId, { active });
    return updated;
  }

  async remove(id: string, userId?: string) {
    const existing = await this.prisma.recommendationRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Recomendacion no encontrada.');
    await this.prisma.recommendationRule.delete({ where: { id } });
    await this.audit.log('RECOMMENDATION_RULE_DELETED', 'RecommendationRule', id, userId, { name: existing.name });
    return { success: true };
  }

  async recommendationsForUserCart(user: JwtUser) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId: user.sub },
      include: {
        items: {
          include: {
            productVariant: {
              include: {
                product: { include: { categories: true } },
                prices: {
                  where: {
                    priceList: { active: true },
                    validFrom: { lte: new Date() },
                    OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
                  },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });
    if (!cart?.items.length) return [];

    const total = cart.items.reduce((sum, item) => sum + item.quantity * Number(item.productVariant.prices[0]?.amount ?? 0), 0);
    const productIdsInCart = new Set(cart.items.map((item) => item.productVariant.productId));
    const now = new Date();

    const rules = await this.prisma.recommendationRule.findMany({
      where: {
        active: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      include: { products: { orderBy: { position: 'asc' } } },
      orderBy: { priority: 'desc' },
    });

    const matchingRules = [];
    for (const rule of rules) {
      if (rule.minimumCartAmount && total < Number(rule.minimumCartAmount)) continue;
      const ids = rule.triggerIds.length ? rule.triggerIds : [rule.triggerId];
      const triggerIds = rule.triggerType === RecommendationTriggerType.CATEGORY ? await this.hierarchy.descendantIds(ids) : ids;
      const quantity = cart.items
        .filter((item) => triggerIds.some((id) => this.triggerMatches(rule.triggerType, id, item.productVariant.product, item.productVariant.id)))
        .reduce((sum, item) => sum + item.quantity, 0);
      if (quantity >= (rule.minimumQuantity ?? 1)) matchingRules.push(rule);
    }

    const recommendedIds = new Set<string>();
    const recommendedProducts: { rule: string; product: Prisma.ProductGetPayload<{ include: { brand: true; laboratory: true; variants: true } }> }[] = [];
    for (const rule of matchingRules) {
      const ids = rule.targetIds.length ? rule.targetIds : rule.products.map((item) => item.productId);
      const targetIds = rule.targetType === RecommendationTriggerType.CATEGORY ? await this.hierarchy.descendantIds(ids) : ids;
      const target: Prisma.ProductWhereInput = rule.targetType === RecommendationTriggerType.BRAND ? { brandId: { in: targetIds }, brand: { active: true, deletedAt: null } }
        : rule.targetType === RecommendationTriggerType.CATEGORY ? { categories: { some: { categoryId: { in: targetIds } } } }
        : rule.targetType === RecommendationTriggerType.LABORATORY ? { laboratoryId: { in: targetIds }, laboratory: { active: true, deletedAt: null } }
        : { id: { in: targetIds } };
      const availableVariant = { active: true, deletedAt: null, physicalStock: { gt: this.prisma.productVariant.fields.reservedStock } };
      const products = await this.prisma.product.findMany({
          relationLoadStrategy: 'join',
          where: {
            ...target,
            AND: [{ id: { notIn: [...productIdsInCart, ...recommendedIds] } }],
            active: true,
            deletedAt: null,
            ...(!this.canBuyMedication(user) ? { requiresMedicationPermission: false } : {}),
            variants: { some: availableVariant },
          },
          include: {
            brand: true,
            laboratory: true,
            variants: { where: availableVariant },
          },
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
          take: rule.targetType === RecommendationTriggerType.PRODUCT ? 100 : 12 - recommendedProducts.length,
        });
      if (rule.targetType === RecommendationTriggerType.PRODUCT) products.sort((a, b) => targetIds.indexOf(a.id) - targetIds.indexOf(b.id));
      for (const product of products) {
        if (rule.targetType === RecommendationTriggerType.PRODUCT) {
          const references = rule.products.filter((item) => item.productId === product.id);
          if (references.length && references.every((item) => item.variantId)) product.variants = product.variants.filter((variant) => references.some((item) => item.variantId === variant.id));
        }
        if (!product.variants.length) continue;
        if (product.requiresMedicationPermission && !this.canBuyMedication(user)) continue;
        if (product.variants.every((variant) => variant.physicalStock - variant.reservedStock <= 0)) continue;
        recommendedIds.add(product.id);
        recommendedProducts.push({ rule: rule.name, product });
        if (recommendedProducts.length >= 12) return recommendedProducts;
      }
    }

    return recommendedProducts;
  }

  private entities(type: RecommendationTriggerType, ids: string[]) {
    const query = { where: { id: { in: ids }, deletedAt: null }, select: { id: true, name: true } };
    if (type === RecommendationTriggerType.BRAND) return this.prisma.brand.findMany(query);
    if (type === RecommendationTriggerType.CATEGORY) return this.prisma.category.findMany(query);
    if (type === RecommendationTriggerType.LABORATORY) return this.prisma.laboratory.findMany(query);
    return this.prisma.product.findMany(query);
  }

  private async validateSelection(selection: ReturnType<typeof recommendationScope>) {
    for (const [type, ids] of [[selection.triggerType, selection.triggerIds], [selection.targetType, selection.targetIds]] as const) {
      const entities = await this.entities(type, ids);
      // Legacy PRODUCT triggers can reference a specific presentation.
      const missing = ids.filter((id) => !entities.some((item) => item.id === id));
      if (missing.length && type === RecommendationTriggerType.PRODUCT && ids === selection.triggerIds) {
        const variants = await this.prisma.productVariant.findMany({ where: { id: { in: missing }, deletedAt: null, product: { deletedAt: null } }, select: { id: true } });
        if (variants.length === missing.length) continue;
      }
      if (missing.length) throw new BadRequestException('Un elemento seleccionado no existe o fue eliminado.');
    }
    const variants = selection.products.filter((item) => item.variantId);
    if (variants.length) {
      const found = await this.prisma.productVariant.findMany({ where: { id: { in: variants.map((item) => item.variantId!) }, deletedAt: null }, select: { id: true, productId: true } });
      if (variants.some((item) => !found.some((variant) => variant.id === item.variantId && variant.productId === item.productId))) throw new BadRequestException('Una presentación no pertenece al producto recomendado.');
    }
  }

  private triggerMatches(triggerType: RecommendationTriggerType, triggerId: string, product: { id: string; brandId: string | null; laboratoryId: string | null; categories: { categoryId: string }[] }, variantId: string) {
    if (triggerType === RecommendationTriggerType.PRODUCT) return product.id === triggerId || variantId === triggerId;
    if (triggerType === RecommendationTriggerType.BRAND) return product.brandId === triggerId;
    if (triggerType === RecommendationTriggerType.LABORATORY) return product.laboratoryId === triggerId;
    if (triggerType === RecommendationTriggerType.CATEGORY) return product.categories.some((category) => category.categoryId === triggerId);
    return false;
  }

  private canBuyMedication(user: JwtUser) {
    return user.role === Role.ADMIN || user.permissions.includes(Permission.CAN_BUY_MEDICATIONS);
  }
}
