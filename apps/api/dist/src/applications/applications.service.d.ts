import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApplicationDto } from './dto/create-application.dto';
export declare class ApplicationsService {
    private readonly prisma;
    private readonly audit;
    private readonly notifications;
    constructor(prisma: PrismaService, audit: AuditService, notifications: NotificationsService);
    create(dto: CreateApplicationDto): Promise<{
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
    }>;
    findMany(): import(".prisma/client").Prisma.PrismaPromise<({
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
    approve(id: string, reviewedById: string, medicationPermission?: boolean): Promise<{
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
    reject(id: string, reviewedById: string, rejectionReason?: string): Promise<{
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
}
