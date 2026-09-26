import { PromotionMetric, PromotionRewardType, PromotionTargetType, PromotionType } from '@prisma/client';
export declare class PromotionConditionDto {
    targetType: PromotionTargetType;
    targetId?: string;
    metric?: PromotionMetric;
    minQuantity?: number;
    minAmount?: number;
}
export declare class PromotionRewardDto {
    targetType: PromotionTargetType;
    targetId?: string;
    rewardType: PromotionRewardType;
    percentage?: number;
    amount?: number;
}
export declare class CreatePromotionDto {
    name: string;
    description?: string;
    type: PromotionType;
    startsAt: string;
    endsAt?: string;
    priority?: number;
    combinable?: boolean;
    conditions: PromotionConditionDto[];
    rewards: PromotionRewardDto[];
}
