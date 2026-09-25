import { Injectable } from '@nestjs/common';
import { Permission, RecommendationTriggerType, Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { JwtUser } from '../common/types/jwt-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecommendationRuleDto } from './dto/create-recommendation-rule.dto';

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateRecommendationRuleDto, userId?: string) {
    const rule = await this.prisma.recommendationRule.create({
      data: {
        name: dto.name,
        active: dto.active ?? true,
        priority: dto.priority ?? 0,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        triggerType: dto.triggerType,
        triggerId: dto.triggerId,
        minimumQuantity: dto.minimumQuantity,
        minimumCartAmount: dto.minimumCartAmount,
        products: {
          create: dto.products.map((product) => ({
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

  findMany() {
    return this.prisma.recommendationRule.findMany({
      include: { products: true },
      orderBy: [{ active: 'desc' }, { priority: 'desc' }],
    });
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
    const variantIdsInCart = new Set(cart.items.map((item) => item.productVariantId));
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

    const matchingRules = rules.filter((rule) => {
      if (rule.minimumCartAmount && total < Number(rule.minimumCartAmount)) return false;
      const quantity = cart.items
        .filter((item) => this.triggerMatches(rule.triggerType, rule.triggerId, item.productVariant.product, item.productVariant.id))
        .reduce((sum, item) => sum + item.quantity, 0);
      return quantity >= (rule.minimumQuantity ?? 1);
    });

    const recommendedIds = new Set<string>();
    const recommendedProducts = [];
    for (const rule of matchingRules) {
      for (const productRef of rule.products) {
        if (productIdsInCart.has(productRef.productId) || (productRef.variantId && variantIdsInCart.has(productRef.variantId))) continue;
        if (recommendedIds.has(`${productRef.productId}:${productRef.variantId ?? ''}`)) continue;

        const variantWhere = productRef.variantId
          ? { id: productRef.variantId, active: true, deletedAt: null }
          : { active: true, deletedAt: null };

        const product = await this.prisma.product.findFirst({
          where: {
            id: productRef.productId,
            active: true,
            deletedAt: null,
          },
          include: {
            brand: true,
            laboratory: true,
            variants: {
              where: variantWhere,
            },
          },
        });
        if (!product || !product.variants.length) continue;
        if (product.requiresMedicationPermission && !this.canBuyMedication(user)) continue;
        if (product.variants.every((variant) => variant.physicalStock - variant.reservedStock <= 0)) continue;

        recommendedIds.add(`${productRef.productId}:${productRef.variantId ?? ''}`);
        recommendedProducts.push({ rule: rule.name, product });
      }
    }

    return recommendedProducts;
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
