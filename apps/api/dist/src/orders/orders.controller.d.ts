import { JwtUser } from '../common/types/jwt-user.type';
import { CheckoutDto } from './dto/checkout.dto';
import { OrdersService } from './orders.service';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    create(user: JwtUser, dto: CheckoutDto): Promise<({
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
    findMine(user: JwtUser): import(".prisma/client").Prisma.PrismaPromise<({
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
    findMineOne(user: JwtUser, id: string): Promise<{
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
    }>;
}
