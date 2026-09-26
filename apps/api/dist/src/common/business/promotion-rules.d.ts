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
export declare function targetMatches(line: PromotionLine, targetType: PromotionTargetType, targetId?: string | null): boolean;
export declare function promotionApplies(lines: PromotionLine[], promotion: PromotionSnapshot): boolean;
export declare function calculatePromotionDiscounts(lines: PromotionLine[], promotions: PromotionSnapshot[]): PromotionDiscount[];
