import { Injectable } from '@nestjs/common';
import { Prisma, PromotionTargetType, RecommendationTriggerType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BrandsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.brand.findMany({
      where: { deletedAt: null, active: true },
      orderBy: { name: 'asc' },
    });
  }

  create(data: Prisma.BrandCreateInput) {
    return this.prisma.brand.create({ data });
  }

  update(id: string, data: Prisma.BrandUpdateInput) {
    return this.prisma.brand.update({ where: { id }, data });
  }

  async softDeleteIfUnused(id: string) {
    const result = await this.prisma.brand.updateMany({
      where: { id, deletedAt: null, products: { none: {} } },
      data: { active: false, deletedAt: new Date(), slug: `deleted-${id}` },
    });
    return result.count;
  }

  findById(id: string) {
    return this.prisma.brand.findUnique({ where: { id }, select: { id: true, deletedAt: true } });
  }

  async hasActiveRules(id: string) {
    const [conditions, rewards, recommendations] = await Promise.all([
      this.prisma.promotionCondition.count({ where: { targetType: PromotionTargetType.BRAND, targetId: id, promotion: { active: true, deletedAt: null } } }),
      this.prisma.promotionReward.count({ where: { targetType: PromotionTargetType.BRAND, targetId: id, promotion: { active: true, deletedAt: null } } }),
      this.prisma.recommendationRule.count({ where: { triggerType: RecommendationTriggerType.BRAND, triggerId: id, active: true } }),
    ]);
    return conditions + rewards + recommendations > 0;
  }
}
