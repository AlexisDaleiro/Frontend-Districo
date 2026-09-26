import { JwtUser } from '../common/types/jwt-user.type';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: import("./auth.service").TokenPayload;
    }>;
    refresh(dto: RefreshTokenDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: import("./auth.service").TokenPayload;
    }>;
    logout(dto: RefreshTokenDto): Promise<{
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
    me(user: JwtUser): Promise<{
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
}
