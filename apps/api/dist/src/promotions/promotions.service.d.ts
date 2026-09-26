import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PromotionLine } from '../common/business/promotion-rules';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpirationPromotionDto } from './dto/create-expiration-promotion.dto';
import { CreatePromotionDto } from './dto/create-promotion.dto';
export declare class PromotionsService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditService);
    findMany(): Prisma.PrismaPromise<({
        conditions: {
            id: string;
            targetType: import(".prisma/client").$Enums.PromotionTargetType;
            targetId: string | null;
            metric: import(".prisma/client").$Enums.PromotionMetric;
            minQuantity: number | null;
            minAmount: Prisma.Decimal | null;
            promotionId: string;
        }[];
        rewards: {
            id: string;
            amount: Prisma.Decimal | null;
            targetType: import(".prisma/client").$Enums.PromotionTargetType;
            targetId: string | null;
            rewardType: import(".prisma/client").$Enums.PromotionRewardType;
            percentage: Prisma.Decimal | null;
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
    create(dto: CreatePromotionDto, createdById?: string): Promise<{
        conditions: {
            id: string;
            targetType: import(".prisma/client").$Enums.PromotionTargetType;
            targetId: string | null;
            metric: import(".prisma/client").$Enums.PromotionMetric;
            minQuantity: number | null;
            minAmount: Prisma.Decimal | null;
            promotionId: string;
        }[];
        rewards: {
            id: string;
            amount: Prisma.Decimal | null;
            targetType: import(".prisma/client").$Enums.PromotionTargetType;
            targetId: string | null;
            rewardType: import(".prisma/client").$Enums.PromotionRewardType;
            percentage: Prisma.Decimal | null;
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
    updateActive(id: string, active: boolean, userId?: string): Promise<{
        conditions: {
            id: string;
            targetType: import(".prisma/client").$Enums.PromotionTargetType;
            targetId: string | null;
            metric: import(".prisma/client").$Enums.PromotionMetric;
            minQuantity: number | null;
            minAmount: Prisma.Decimal | null;
            promotionId: string;
        }[];
        rewards: {
            id: string;
            amount: Prisma.Decimal | null;
            targetType: import(".prisma/client").$Enums.PromotionTargetType;
            targetId: string | null;
            rewardType: import(".prisma/client").$Enums.PromotionRewardType;
            percentage: Prisma.Decimal | null;
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
    createExpirationPromotion(dto: CreateExpirationPromotionDto, userId?: string): Promise<{
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
        discountPercentage: Prisma.Decimal | null;
        promotionalPrice: Prisma.Decimal | null;
        quantityLimit: number | null;
    }>;
    findExpirationPromotions(): Prisma.PrismaPromise<{
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
        discountPercentage: Prisma.Decimal | null;
        promotionalPrice: Prisma.Decimal | null;
        quantityLimit: number | null;
    }[]>;
    calculateDiscounts(lines: PromotionLine[]): Promise<import("../common/business/promotion-rules").PromotionDiscount[]>;
}
