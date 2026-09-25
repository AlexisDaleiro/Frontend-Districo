import { PromotionMetric, PromotionRewardType, PromotionTargetType, PromotionType } from '@prisma/client';

export interface PromotionLine {
  productId: string;
  variantId: string;
  brandId?: string | null;
  laboratoryId?: string | null;
  categoryIds: string[];
  quantity: number;
  unitPrice: number;
}

export interface PromotionConditionSnapshot {
  targetType: PromotionTargetType;
  targetId?: string | null;
  metric: PromotionMetric;
  minQuantity?: number | null;
  minAmount?: number | null;
}

export interface PromotionRewardSnapshot {
  targetType: PromotionTargetType;
  targetId?: string | null;
  rewardType: PromotionRewardType;
  percentage?: number | null;
  amount?: number | null;
}

export interface PromotionSnapshot {
  id: string;
  name: string;
  type: PromotionType;
  priority: number;
  combinable: boolean;
  conditions: PromotionConditionSnapshot[];
  rewards: PromotionRewardSnapshot[];
}

export interface PromotionDiscount {
  lineIndex: number;
  promotionId: string;
  promotionName: string;
  amount: number;
}

export function targetMatches(line: PromotionLine, targetType: PromotionTargetType, targetId?: string | null) {
  if (!targetId) return true;
  if (targetType === PromotionTargetType.PRODUCT) return line.productId === targetId;
  if (targetType === PromotionTargetType.PRODUCT_VARIANT) return line.variantId === targetId;
  if (targetType === PromotionTargetType.BRAND) return line.brandId === targetId;
  if (targetType === PromotionTargetType.LABORATORY) return line.laboratoryId === targetId;
  if (targetType === PromotionTargetType.CATEGORY) return line.categoryIds.includes(targetId);
  return false;
}

export function promotionApplies(lines: PromotionLine[], promotion: PromotionSnapshot) {
  return promotion.conditions.every((condition) => {
    const matchingLines = lines.filter((line) => targetMatches(line, condition.targetType, condition.targetId));
    const quantity = matchingLines.reduce((sum, line) => sum + line.quantity, 0);
    const amount = matchingLines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    if (condition.metric === PromotionMetric.MIN_AMOUNT) {
      return amount >= Number(condition.minAmount ?? 0);
    }
    return quantity >= Number(condition.minQuantity ?? 0);
  });
}

export function calculatePromotionDiscounts(lines: PromotionLine[], promotions: PromotionSnapshot[]) {
  const discounts: PromotionDiscount[] = [];
  const orderedPromotions = promotions
    .filter((promotion) => promotionApplies(lines, promotion))
    .sort((a, b) => b.priority - a.priority);

  for (const promotion of orderedPromotions) {
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex];
      const rewardDiscounts = promotion.rewards
        .filter((reward) => targetMatches(line, reward.targetType, reward.targetId))
        .map((reward) => {
          const gross = line.unitPrice * line.quantity;
          if (reward.rewardType === PromotionRewardType.PERCENTAGE) return gross * (Number(reward.percentage ?? 0) / 100);
          if (reward.rewardType === PromotionRewardType.FIXED_AMOUNT) return Math.min(gross, Number(reward.amount ?? 0));
          if (reward.rewardType === PromotionRewardType.PROMOTIONAL_PRICE) {
            const promotionalTotal = Number(reward.amount ?? line.unitPrice) * line.quantity;
            return Math.max(0, gross - promotionalTotal);
          }
          return 0;
        });

      const amount = Math.max(0, ...rewardDiscounts);
      if (!amount) continue;

      if (!promotion.combinable) {
        const existingIndex = discounts.findIndex((discount) => discount.lineIndex === lineIndex);
        if (existingIndex >= 0) {
          if (amount > discounts[existingIndex].amount) {
            discounts[existingIndex] = { lineIndex, promotionId: promotion.id, promotionName: promotion.name, amount };
          }
          continue;
        }
      }

      discounts.push({ lineIndex, promotionId: promotion.id, promotionName: promotion.name, amount });
    }
  }

  return discounts;
}
