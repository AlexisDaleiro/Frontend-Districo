import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Permission, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
export interface TokenPayload {
    sub: string;
    email: string;
    role: Role;
    permissions: Permission[];
    customerAccountId?: string | null;
}
export declare class AuthService {
    private readonly config;
    private readonly jwtService;
    private readonly prisma;
    private readonly usersService;
    constructor(config: ConfigService, jwtService: JwtService, prisma: PrismaService, usersService: UsersService);
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: TokenPayload;
    }>;
    refresh(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: TokenPayload;
    }>;
    logout(refreshToken: string): Promise<{
        success: boolean;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        success: boolean;
        resetToken?: undefined;
    } | {
        success: boolean;
        resetToken: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        success: boolean;
    }>;
    me(userId: string): Promise<{
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
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        customerAccountId: string | null;
        role: import(".prisma/client").$Enums.Role;
        active: boolean;
        emailVerified: boolean;
    }>;
    private issueTokenPair;
    private findMatchingRefreshToken;
}
