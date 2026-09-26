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
exports.ApplicationsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const audit_service_1 = require("../audit/audit.service");
const notifications_service_1 = require("../notifications/notifications.service");
const prisma_service_1 = require("../prisma/prisma.service");
const ALLOWED_DOCUMENT_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']);
let ApplicationsService = class ApplicationsService {
    constructor(prisma, audit, notifications) {
        this.prisma = prisma;
        this.audit = audit;
        this.notifications = notifications;
    }
    async create(dto) {
        const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
        if (existingUser) {
            throw new common_1.BadRequestException('Ya existe un usuario con ese email.');
        }
        for (const document of dto.documents ?? []) {
            if (!ALLOWED_DOCUMENT_MIME_TYPES.has(document.mimeType)) {
                throw new common_1.BadRequestException('Formato de documento no permitido.');
            }
        }
        const application = await this.prisma.customerApplication.create({
            data: {
                businessName: dto.businessName,
                legalName: dto.legalName,
                rut: dto.rut,
                contactName: dto.contactName,
                phone: dto.phone,
                email: dto.email.toLowerCase(),
                passwordHash: await bcrypt.hash(dto.password, 10),
                address: dto.address,
                department: dto.department,
                city: dto.city,
                businessType: dto.businessType,
                requestedMedicationPermission: dto.requestedMedicationPermission ?? false,
                documents: dto.documents?.length
                    ? {
                        create: dto.documents.map((document) => ({
                            type: document.type,
                            fileUrl: document.fileUrl,
                            originalName: document.originalName,
                            mimeType: document.mimeType,
                        })),
                    }
                    : undefined,
            },
            include: { documents: true },
        });
        await this.notifications.notify('registration.received', application.email, { applicationId: application.id });
        return application;
    }
    findMany() {
        return this.prisma.customerApplication.findMany({
            orderBy: { createdAt: 'desc' },
            include: { documents: true },
        });
    }
    async approve(id, reviewedById, medicationPermission = false) {
        const application = await this.prisma.customerApplication.findUnique({ where: { id }, include: { documents: true } });
        if (!application) {
            throw new common_1.NotFoundException('Solicitud no encontrada.');
        }
        if (application.status !== client_1.CustomerApplicationStatus.PENDING) {
            throw new common_1.BadRequestException('La solicitud ya fue revisada.');
        }
        const permissions = [client_1.Permission.CAN_VIEW_PRICES, client_1.Permission.CAN_PLACE_ORDERS];
        if (medicationPermission)
            permissions.push(client_1.Permission.CAN_BUY_MEDICATIONS);
        const result = await this.prisma.$transaction(async (tx) => {
            const account = await tx.customerAccount.create({
                data: {
                    businessName: application.businessName,
                    legalName: application.legalName,
                    rut: application.rut,
                    phone: application.phone,
                    address: application.address,
                    city: application.city,
                    department: application.department,
                    accountStatus: 'APPROVED',
                    medicationPermission,
                },
            });
            const user = await tx.user.create({
                data: {
                    customerAccountId: account.id,
                    email: application.email,
                    passwordHash: application.passwordHash,
                    role: client_1.Role.CLIENT,
                    active: true,
                    emailVerified: true,
                    permissions: { create: permissions.map((permission) => ({ permission })) },
                },
                include: { permissions: true, customerAccount: true },
            });
            await tx.customerDocument.updateMany({
                where: { applicationId: application.id },
                data: { customerAccountId: account.id },
            });
            await tx.customerApplication.update({
                where: { id },
                data: {
                    status: client_1.CustomerApplicationStatus.APPROVED,
                    reviewedById,
                    reviewedAt: new Date(),
                },
            });
            return user;
        });
        await this.audit.log('CLIENT_APPROVED', 'CustomerApplication', id, reviewedById, { medicationPermission });
        await this.notifications.notify('account.approved', application.email, { applicationId: id, medicationPermission });
        return result;
    }
    async reject(id, reviewedById, rejectionReason) {
        const application = await this.prisma.customerApplication.findUnique({ where: { id } });
        if (!application) {
            throw new common_1.NotFoundException('Solicitud no encontrada.');
        }
        const updated = await this.prisma.customerApplication.update({
            where: { id },
            data: {
                status: client_1.CustomerApplicationStatus.REJECTED,
                reviewedById,
                reviewedAt: new Date(),
                rejectionReason,
            },
        });
        await this.audit.log('CLIENT_REJECTED', 'CustomerApplication', id, reviewedById, { rejectionReason });
        await this.notifications.notify('account.rejected', application.email, { applicationId: id, rejectionReason });
        return updated;
    }
};
exports.ApplicationsService = ApplicationsService;
exports.ApplicationsService = ApplicationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        notifications_service_1.NotificationsService])
], ApplicationsService);
//# sourceMappingURL=applications.service.js.map