export declare class CreateExpirationPromotionDto {
    productId?: string;
    variantId?: string;
    batch?: string;
    expirationDate: string;
    discountPercentage?: number;
    promotionalPrice?: number;
    startsAt: string;
    endsAt?: string;
    quantityLimit?: number;
    active?: boolean;
}
