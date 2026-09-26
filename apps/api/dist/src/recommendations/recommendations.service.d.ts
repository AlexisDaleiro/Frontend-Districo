import { AuditService } from '../audit/audit.service';
import { JwtUser } from '../common/types/jwt-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecommendationRuleDto } from './dto/create-recommendation-rule.dto';
export declare class RecommendationsService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditService);
    create(dto: CreateRecommendationRuleDto, userId?: string): Promise<{
        products: {
            id: string;
            position: number;
            variantId: string | null;
            productId: string;
            ruleId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        active: boolean;
        startsAt: Date | null;
        endsAt: Date | null;
        priority: number;
        triggerType: import(".prisma/client").$Enums.RecommendationTriggerType;
        triggerId: string;
        minimumQuantity: number | null;
        minimumCartAmount: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    findMany(): import(".prisma/client").Prisma.PrismaPromise<({
        products: {
            id: string;
            position: number;
            variantId: string | null;
            productId: string;
            ruleId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        active: boolean;
        startsAt: Date | null;
        endsAt: Date | null;
        priority: number;
        triggerType: import(".prisma/client").$Enums.RecommendationTriggerType;
        triggerId: string;
        minimumQuantity: number | null;
        minimumCartAmount: import("@prisma/client/runtime/library").Decimal | null;
    })[]>;
    recommendationsForUserCart(user: JwtUser): Promise<{
        rule: string;
        product: {
            brand: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                active: boolean;
                slug: string;
                deletedAt: Date | null;
            } | null;
            laboratory: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                active: boolean;
                slug: string;
                deletedAt: Date | null;
            } | null;
            variants: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                active: boolean;
                deletedAt: Date | null;
                productId: string;
                sku: string;
                ean: string | null;
                presentation: string | null;
                weight: import("@prisma/client/runtime/library").Decimal | null;
                unitOfMeasure: import(".prisma/client").$Enums.UnitOfMeasure;
                saleMultiple: number;
                minimumOrderQuantity: number;
                physicalStock: number;
                reservedStock: number;
                isDemoData: boolean;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            active: boolean;
            slug: string;
            deletedAt: Date | null;
            shortDescription: string | null;
            description: string | null;
            productType: import(".prisma/client").$Enums.ProductType;
            brandId: string | null;
            laboratoryId: string | null;
            source: import(".prisma/client").$Enums.ProductSource;
            requiresMedicationPermission: boolean;
            featured: boolean;
            newProduct: boolean;
            tags: string[];
        };
    }[]>;
    private triggerMatches;
    private canBuyMedication;
}
