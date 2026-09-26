"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcryptjs"));
const prisma_service_1 = require("../prisma/prisma.service");
const users_service_1 = require("../users/users.service");
let AuthService = class AuthService {
    constructor(config, jwtService, prisma, usersService) {
        this.config = config;
        this.jwtService = jwtService;
        this.prisma = prisma;
        this.usersService = usersService;
    }
    async login(dto) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user || !user.active) {
            throw new common_1.UnauthorizedException('Credenciales invalidas.');
        }
        const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
        if (!passwordMatches) {
            throw new common_1.UnauthorizedException('Credenciales invalidas.');
        }
        return this.issueTokenPair({
            sub: user.id,
            email: user.email,
            role: user.role,
            permissions: user.permissions.map((permission) => permission.permission),
            customerAccountId: user.customerAccountId,
        });
    }
    async refresh(refreshToken) {
        let payload;
        try {
            payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: this.config.get('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret',
            });
        }
        catch {
            throw new common_1.UnauthorizedException('Refresh token invalido.');
        }
        const tokens = await this.prisma.refreshToken.findMany({
            where: {
                userId: payload.sub,
                revokedAt: null,
                expiresAt: { gt: new Date() },
            },
        });
        const stored = await this.findMatchingRefreshToken(tokens, refreshToken);
        if (!stored) {
            throw new common_1.ForbiddenException('Refresh token revocado o vencido.');
        }
        await this.prisma.refreshToken.update({
            where: { id: stored.id },
            data: { revokedAt: new Date() },
        });
        const user = await this.usersService.findById(payload.sub);
        if (!user || !user.active) {
            throw new common_1.UnauthorizedException('Usuario inactivo.');
        }
        return this.issueTokenPair({
            sub: user.id,
            email: user.email,
            role: user.role,
            permissions: user.permissions.map((permission) => permission.permission),
            customerAccountId: user.customerAccountId,
        });
    }
    async logout(refreshToken) {
        const tokens = await this.prisma.refreshToken.findMany({ where: { revokedAt: null } });
        const stored = await this.findMatchingRefreshToken(tokens, refreshToken);
        if (stored) {
            await this.prisma.refreshToken.update({
                where: { id: stored.id },
                data: { revokedAt: new Date() },
            });
        }
        return { success: true };
    }
    async forgotPassword(dto) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user || !user.active) {
            return { success: true };
        }
        const resetToken = await this.jwtService.signAsync({ sub: user.id, email: user.email, purpose: 'password-reset' }, {
            secret: this.config.get('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret',
            expiresIn: '30m',
        });
        return { success: true, resetToken };
    }
    async resetPassword(dto) {
        let payload;
        try {
            payload = await this.jwtService.verifyAsync(dto.resetToken, {
                secret: this.config.get('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret',
            });
        }
        catch {
            throw new common_1.UnauthorizedException('Token invalido o vencido.');
        }
        if (payload.purpose !== 'password-reset') {
            throw new common_1.UnauthorizedException('Token invalido.');
        }
        await this.prisma.user.update({
            where: { id: payload.sub },
            data: { passwordHash: await bcrypt.hash(dto.password, Number(this.config.get('BCRYPT_SALT_ROUNDS') ?? 10)) },
        });
        await this.prisma.refreshToken.updateMany({
            where: { userId: payload.sub, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        return { success: true };
    }
    async me(userId) {
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new common_1.UnauthorizedException();
        }
        const { passwordHash: _passwordHash, ...safeUser } = user;
        return safeUser;
    }
    async issueTokenPair(payload) {
        const accessToken = await this.jwtService.signAsync(payload, {
            secret: this.config.get('JWT_ACCESS_SECRET') ?? 'dev-access-secret',
            expiresIn: (this.config.get('JWT_ACCESS_EXPIRES_IN') ?? '15m'),
        });
        const refreshToken = await this.jwtService.signAsync(payload, {
            secret: this.config.get('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret',
            expiresIn: (this.config.get('JWT_REFRESH_EXPIRES_IN') ?? '7d'),
        });
        const tokenHash = await bcrypt.hash(refreshToken, Number(this.config.get('BCRYPT_SALT_ROUNDS') ?? 10));
        await this.prisma.refreshToken.create({
            data: {
                userId: payload.sub,
                tokenHash,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });
        return { accessToken, refreshToken, user: payload };
    }
    async findMatchingRefreshToken(tokens, refreshToken) {
        for (const token of tokens) {
            if (await bcrypt.compare(refreshToken, token.tokenHash)) {
                return token;
            }
        }
        return null;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        jwt_1.JwtService,
        prisma_service_1.PrismaService,
        users_service_1.UsersService])
], AuthService);
//# sourceMappingURL=auth.service.js.map