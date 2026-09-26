import { JwtUser } from '../common/types/jwt-user.type';
import { CreateRecommendationRuleDto } from './dto/create-recommendation-rule.dto';
import { RecommendationsService } from './recommendations.service';
export declare class RecommendationsController {
    private readonly recommendationsService;
    constructor(recommendationsService: RecommendationsService);
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
    create(dto: CreateRecommendationRuleDto, user: JwtUser): Promise<{
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
}
