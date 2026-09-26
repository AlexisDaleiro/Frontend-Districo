import { Prisma } from '@prisma/client';
import { ApplicationsService } from '../applications/applications.service';
import { AuditService } from '../audit/audit.service';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';
export declare class AdminService {
    private readonly prisma;
    private readonly audit;
    private readonly orders;
    private readonly applications;
    constructor(prisma: PrismaService, audit: AuditService, orders: OrdersService, applications: ApplicationsService);
    dashboard(): Promise<{
        products: number;
        pendingApplications: number;
        pendingReviewOrders: number;
        activePromotions: number;
    }>;
    customers(): Prisma.PrismaPromise<({
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
        creditLimit: Prisma.Decimal | null;
        internalCreditNote: string | null;
        accountStatus: import(".prisma/client").$Enums.AccountStatus;
        medicationPermission: boolean;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    updateCustomer(id: string, dto: UpdateCustomerDto, userId?: string): Promise<{
        id: string;
        rut: string;
        businessName: string;
        legalName: string;
        phone: string | null;
        address: string | null;
        city: string | null;
        department: string | null;
        creditStatus: import(".prisma/client").$Enums.CreditStatus;
        creditLimit: Prisma.Decimal | null;
        internalCreditNote: string | null;
        accountStatus: import(".prisma/client").$Enums.AccountStatus;
        medicationPermission: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    ordersAdmin(): Prisma.PrismaPromise<({
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
            creditLimit: Prisma.Decimal | null;
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
            subtotal: Prisma.Decimal;
            productName: string;
            variantName: string;
            quantity: number;
            unitPrice: Prisma.Decimal;
            discount: Prisma.Decimal;
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
        subtotal: Prisma.Decimal;
        discountTotal: Prisma.Decimal;
        total: Prisma.Decimal;
    })[]>;
    applicationsAdmin(): Prisma.PrismaPromise<({
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
    auditLogs(): Prisma.PrismaPromise<({
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
        metadata: Prisma.JsonValue | null;
    })[]>;
}
