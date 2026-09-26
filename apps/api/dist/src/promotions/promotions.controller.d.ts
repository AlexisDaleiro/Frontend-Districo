import { JwtUser } from '../common/types/jwt-user.type';
import { CreateExpirationPromotionDto } from './dto/create-expiration-promotion.dto';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { PromotionsService } from './promotions.service';
export declare class PromotionsController {
    private readonly promotionsService;
    constructor(promotionsService: PromotionsService);
    findMany(): import(".prisma/client").Prisma.PrismaPromise<({
        conditions: {
            id: string;
            targetType: import(".prisma/client").$Enums.PromotionTargetType;
            targetId: string | null;
            metric: import(".prisma/client").$Enums.PromotionMetric;
            minQuantity: number | null;
            minAmount: import("@prisma/client/runtime/library").Decimal | null;
            promotionId: string;
        }[];
        rewards: {
            id: string;
            amount: import("@prisma/client/runtime/library").Decimal | null;
            targetType: import(".prisma/client").$Enums.PromotionTargetType;
            targetId: string | null;
            rewardType: import(".prisma/client").$Enums.PromotionRewardType;
            percentage: import("@prisma/client/runtime/library").Decimal | null;
            promotionId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        active: boolean;
        deletedAt: Date | null;
        type: import(".prisma/client").$Enums.PromotionType;
        description: string | null;
        startsAt: Date;
        endsAt: Date | null;
        priority: number;
        combinable: boolean;
        createdById: string | null;
    })[]>;
    create(dto: CreatePromotionDto, user: JwtUser): Promise<{
        conditions: {
            id: string;
            targetType: import(".prisma/client").$Enums.PromotionTargetType;
            targetId: string | null;
            metric: import(".prisma/client").$Enums.PromotionMetric;
            minQuantity: number | null;
            minAmount: import("@prisma/client/runtime/library").Decimal | null;
            promotionId: string;
        }[];
        rewards: {
            id: string;
            amount: import("@prisma/client/runtime/library").Decimal | null;
            targetType: import(".prisma/client").$Enums.PromotionTargetType;
            targetId: string | null;
            rewardType: import(".prisma/client").$Enums.PromotionRewardType;
            percentage: import("@prisma/client/runtime/library").Decimal | null;
            promotionId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        active: boolean;
        deletedAt: Date | null;
        type: import(".prisma/client").$Enums.PromotionType;
        description: string | null;
        startsAt: Date;
        endsAt: Date | null;
        priority: number;
        combinable: boolean;
        createdById: string | null;
    }>;
    activate(id: string, user: JwtUser): Promise<{
        conditions: {
            id: string;
            targetType: import(".prisma/client").$Enums.PromotionTargetType;
            targetId: string | null;
            metric: import(".prisma/client").$Enums.PromotionMetric;
            minQuantity: number | null;
            minAmount: import("@prisma/client/runtime/library").Decimal | null;
            promotionId: string;
        }[];
        rewards: {
            id: string;
            amount: import("@prisma/client/runtime/library").Decimal | null;
            targetType: import(".prisma/client").$Enums.PromotionTargetType;
            targetId: string | null;
            rewardType: import(".prisma/client").$Enums.PromotionRewardType;
            percentage: import("@prisma/client/runtime/library").Decimal | null;
            promotionId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        active: boolean;
        deletedAt: Date | null;
        type: import(".prisma/client").$Enums.PromotionType;
        description: string | null;
        startsAt: Date;
        endsAt: Date | null;
        priority: number;
        combinable: boolean;
        createdById: string | null;
    }>;
    deactivate(id: string, user: JwtUser): Promise<{
        conditions: {
            id: string;
            targetType: import(".prisma/client").$Enums.PromotionTargetType;
            targetId: string | null;
            metric: import(".prisma/client").$Enums.PromotionMetric;
            minQuantity: number | null;
            minAmount: import("@prisma/client/runtime/library").Decimal | null;
            promotionId: string;
        }[];
        rewards: {
            id: string;
            amount: import("@prisma/client/runtime/library").Decimal | null;
            targetType: import(".prisma/client").$Enums.PromotionTargetType;
            targetId: string | null;
            rewardType: import(".prisma/client").$Enums.PromotionRewardType;
            percentage: import("@prisma/client/runtime/library").Decimal | null;
            promotionId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        active: boolean;
        deletedAt: Date | null;
        type: import(".prisma/client").$Enums.PromotionType;
        description: string | null;
        startsAt: Date;
        endsAt: Date | null;
        priority: number;
        combinable: boolean;
        createdById: string | null;
    }>;
    findExpirationPromotions(): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        active: boolean;
        variantId: string | null;
        productId: string | null;
        startsAt: Date;
        endsAt: Date | null;
        batch: string | null;
        expirationDate: Date;
        discountPercentage: import("@prisma/client/runtime/library").Decimal | null;
        promotionalPrice: import("@prisma/client/runtime/library").Decimal | null;
        quantityLimit: number | null;
    }[]>;
    createExpirationPromotion(dto: CreateExpirationPromotionDto, user: JwtUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        active: boolean;
        variantId: string | null;
        productId: string | null;
        startsAt: Date;
        endsAt: Date | null;
        batch: string | null;
        expirationDate: Date;
        discountPercentage: import("@prisma/client/runtime/library").Decimal | null;
        promotionalPrice: import("@prisma/client/runtime/library").Decimal | null;
        quantityLimit: number | null;
    }>;
}
