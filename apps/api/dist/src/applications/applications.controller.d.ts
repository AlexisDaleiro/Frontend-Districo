import { JwtUser } from '../common/types/jwt-user.type';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';
export declare class ApplicationsController {
    private readonly applicationsService;
    constructor(applicationsService: ApplicationsService);
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
    approve(id: string, dto: ReviewApplicationDto, user: JwtUser): Promise<{
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
    reject(id: string, dto: ReviewApplicationDto, user: JwtUser): Promise<{
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
