import { PrismaService } from '../prisma/prisma.service';
export declare class UsersRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findByEmail(email: string): import(".prisma/client").Prisma.Prisma__UserClient<({
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
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    findById(id: string): import(".prisma/client").Prisma.Prisma__UserClient<({
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
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
}
