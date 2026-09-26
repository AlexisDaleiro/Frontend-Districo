import { ApplicationsService } from '../applications/applications.service';
import { JwtUser } from '../common/types/jwt-user.type';
import { ReviewApplicationDto } from '../applications/dto/review-application.dto';
import { UpdateOrderStatusDto } from '../orders/dto/update-order-status.dto';
import { OrdersService } from '../orders/orders.service';
import { CreatePromotionDto } from '../promotions/dto/create-promotion.dto';
import { PromotionsService } from '../promotions/promotions.service';
import { CreateRecommendationRuleDto } from '../recommendations/dto/create-recommendation-rule.dto';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { AdminService } from './admin.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';
export declare class AdminController {
    private readonly admin;
    private readonly applications;
    private readonly orders;
    private readonly promotions;
    private readonly recommendations;
    constructor(admin: AdminService, applications: ApplicationsService, orders: OrdersService, promotions: PromotionsService, recommendations: RecommendationsService);
    dashboard(): Promise<{
        products: number;
        pendingApplications: number;
        pendingReviewOrders: number;
        activePromotions: number;
    }>;
    customers(): import(".prisma/client").Prisma.PrismaPromise<({
        users: {
            id: string;
            email: string;
            active: boolean;
            permissions: {
                id: string;
                createdAt: Date;
                userId: string;
                permission: import(".prisma/client").$Enums.Permission;
            }[];
        }[];
    } & {
        id: string;
        rut: string;
        businessName: string;
        legalName: string;
        phone: string | null;
        address: string | null;
        city: string | null;
        department: string | null;
        creditStatus: import(".prisma/client").$Enums.CreditStatus;
        creditLimit: import("@prisma/client/runtime/library").Decimal | null;
        internalCreditNote: string | null;
        accountStatus: import(".prisma/client").$Enums.AccountStatus;
        medicationPermission: boolean;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    updateCustomer(id: string, dto: UpdateCustomerDto, user: JwtUser): Promise<{
        id: string;
        rut: string;
        businessName: string;
        legalName: string;
        phone: string | null;
        address: string | null;
        city: string | null;
        department: string | null;
        creditStatus: import(".prisma/client").$Enums.CreditStatus;
        creditLimit: import("@prisma/client/runtime/library").Decimal | null;
        internalCreditNote: string | null;
        accountStatus: import(".prisma/client").$Enums.AccountStatus;
        medicationPermission: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    applicationsList(): import(".prisma/client").Prisma.PrismaPromise<({
        documents: {
            id: string;
            customerAccountId: string | null;
            type: string;
            expirationDate: Date | null;
            status: import(".prisma/client").$Enums.CustomerDocumentStatus;
            fileUrl: string;
            originalName: string;
            mimeType: string;
            uploadedAt: Date;
            applicationId: string | null;
        }[];
    } & {
        id: string;
        rut: string;
        businessName: string;
        legalName: string;
        phone: string | null;
        address: string | null;
        city: string | null;
        department: string | null;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        passwordHash: string;
        status: import(".prisma/client").$Enums.CustomerApplicationStatus;
        contactName: string | null;
        businessType: string | null;
        requestedMedicationPermission: boolean;
        reviewedAt: Date | null;
        rejectionReason: string | null;
        reviewedById: string | null;
    })[]>;
    approveApplication(id: string, dto: ReviewApplicationDto, user: JwtUser): Promise<{
        customerAccount: {
            id: string;
            rut: string;
            businessName: string;
            legalName: string;
            phone: string | null;
            address: string | null;
            city: string | null;
            department: string | null;
            creditStatus: import(".prisma/client").$Enums.CreditStatus;
            creditLimit: import("@prisma/client/runtime/library").Decimal | null;
            internalCreditNote: string | null;
            accountStatus: import(".prisma/client").$Enums.AccountStatus;
            medicationPermission: boolean;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        permissions: {
            id: string;
            createdAt: Date;
            userId: string;
            permission: import(".prisma/client").$Enums.Permission;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        customerAccountId: string | null;
        passwordHash: string;
        role: import(".prisma/client").$Enums.Role;
        active: boolean;
        emailVerified: boolean;
    }>;
    rejectApplication(id: string, dto: ReviewApplicationDto, user: JwtUser): Promise<{
        id: string;
        rut: string;
        businessName: string;
        legalName: string;
        phone: string | null;
        address: string | null;
        city: string | null;
        department: string | null;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        passwordHash: string;
        status: import(".prisma/client").$Enums.CustomerApplicationStatus;
        contactName: string | null;
        businessType: string | null;
        requestedMedicationPermission: boolean;
        reviewedAt: Date | null;
        rejectionReason: string | null;
        reviewedById: string | null;
    }>;
    ordersList(): import(".prisma/client").Prisma.PrismaPromise<({
        customerAccount: {
            id: string;
            rut: string;
            businessName: string;
            legalName: string;
            phone: string | null;
            address: string | null;
            city: string | null;
            department: string | null;
            creditStatus: import(".prisma/client").$Enums.CreditStatus;
            creditLimit: import("@prisma/client/runtime/library").Decimal | null;
            internalCreditNote: string | null;
            accountStatus: import(".prisma/client").$Enums.AccountStatus;
            medicationPermission: boolean;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        user: {
            email: string;
        };
        items: {
            id: string;
            createdAt: Date;
            variantId: string;
            productId: string;
            sku: string;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            productName: string;
            variantName: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            discount: import("@prisma/client/runtime/library").Decimal;
            orderId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        customerAccountId: string | null;
        userId: string;
        currency: string;
        orderNumber: string;
        status: import(".prisma/client").$Enums.OrderStatus;
        requiresManualReview: boolean;
        reviewReason: string | null;
        acceptedManualReview: boolean;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        discountTotal: import("@prisma/client/runtime/library").Decimal;
        total: import("@prisma/client/runtime/library").Decimal;
    })[]>;
    updateOrderStatus(id: string, dto: UpdateOrderStatusDto, user: JwtUser): Promise<({
        items: {
            id: string;
            createdAt: Date;
            variantId: string;
            productId: string;
            sku: string;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            productName: string;
            variantName: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            discount: import("@prisma/client/runtime/library").Decimal;
            orderId: string;
        }[];
        reservations: {
            id: string;
            createdAt: Date;
            variantId: string;
            status: import(".prisma/client").$Enums.StockReservationStatus;
            quantity: number;
            expiresAt: Date;
            cartId: string | null;
            orderId: string | null;
            releasedAt: Date | null;
            consumedAt: Date | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        customerAccountId: string | null;
        userId: string;
        currency: string;
        orderNumber: string;
        status: import(".prisma/client").$Enums.OrderStatus;
        requiresManualReview: boolean;
        reviewReason: string | null;
        acceptedManualReview: boolean;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        discountTotal: import("@prisma/client/runtime/library").Decimal;
        total: import("@prisma/client/runtime/library").Decimal;
    }) | null>;
    approveOrder(id: string, user: JwtUser): Promise<({
        items: {
            id: string;
            createdAt: Date;
            variantId: string;
            productId: string;
            sku: string;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            productName: string;
            variantName: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            discount: import("@prisma/client/runtime/library").Decimal;
            orderId: string;
        }[];
        reservations: {
            id: string;
            createdAt: Date;
            variantId: string;
            status: import(".prisma/client").$Enums.StockReservationStatus;
            quantity: number;
            expiresAt: Date;
            cartId: string | null;
            orderId: string | null;
            releasedAt: Date | null;
            consumedAt: Date | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        customerAccountId: string | null;
        userId: string;
        currency: string;
        orderNumber: string;
        status: import(".prisma/client").$Enums.OrderStatus;
        requiresManualReview: boolean;
        reviewReason: string | null;
        acceptedManualReview: boolean;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        discountTotal: import("@prisma/client/runtime/library").Decimal;
        total: import("@prisma/client/runtime/library").Decimal;
    }) | null>;
    rejectOrder(id: string, user: JwtUser): Promise<({
        items: {
            id: string;
            createdAt: Date;
            variantId: string;
            productId: string;
            sku: string;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            productName: string;
            variantName: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            discount: import("@prisma/client/runtime/library").Decimal;
            orderId: string;
        }[];
        reservations: {
            id: string;
            createdAt: Date;
            variantId: string;
            status: import(".prisma/client").$Enums.StockReservationStatus;
            quantity: number;
            expiresAt: Date;
            cartId: string | null;
            orderId: string | null;
            releasedAt: Date | null;
            consumedAt: Date | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        customerAccountId: string | null;
        userId: string;
        currency: string;
        orderNumber: string;
        status: import(".prisma/client").$Enums.OrderStatus;
        requiresManualReview: boolean;
        reviewReason: string | null;
        acceptedManualReview: boolean;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        discountTotal: import("@prisma/client/runtime/library").Decimal;
        total: import("@prisma/client/runtime/library").Decimal;
    }) | null>;
    auditLogs(): import(".prisma/client").Prisma.PrismaPromise<({
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        userId: string | null;
        action: string;
        entityType: string;
        entityId: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
    })[]>;
    promotionsList(): import(".prisma/client").Prisma.PrismaPromise<({
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
    createPromotion(dto: CreatePromotionDto, user: JwtUser): Promise<{
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
    recommendationsList(): import(".prisma/client").Prisma.PrismaPromise<({
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
    createRecommendation(dto: CreateRecommendationRuleDto, user: JwtUser): Promise<{
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
