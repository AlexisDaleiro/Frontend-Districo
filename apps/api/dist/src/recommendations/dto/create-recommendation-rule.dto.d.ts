import { RecommendationTriggerType } from '@prisma/client';
export declare class RecommendationProductDto {
    productId: string;
    variantId?: string;
    position?: number;
}
export declare class CreateRecommendationRuleDto {
    name: string;
    active?: boolean;
    priority?: number;
    startsAt?: string;
    endsAt?: string;
    triggerType: RecommendationTriggerType;
    triggerId: string;
    minimumQuantity?: number;
    minimumCartAmount?: number;
    products: RecommendationProductDto[];
}
