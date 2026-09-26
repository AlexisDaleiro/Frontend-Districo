"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const applications_service_1 = require("../applications/applications.service");
const audit_service_1 = require("../audit/audit.service");
const orders_service_1 = require("../orders/orders.service");
const prisma_service_1 = require("../prisma/prisma.service");
let AdminService = class AdminService {
    constructor(prisma, audit, orders, applications) {
        this.prisma = prisma;
        this.audit = audit;
        this.orders = orders;
        this.applications = applications;
    }
    async dashboard() {
        const [products, pendingApplications, pendingReviewOrders, activePromotions] = await Promise.all([
            this.prisma.product.count({ where: { deletedAt: null } }),
            this.prisma.customerApplication.count({ where: { status: 'PENDING' } }),
            this.prisma.order.count({ where: { status: 'PENDING_REVIEW' } }),
            this.prisma.promotion.count({ where: { active: true, deletedAt: null } }),
        ]);
        return { products, pendingApplications, pendingReviewOrders, activePromotions };
    }
    customers() {
        return this.prisma.customerAccount.findMany({
            orderBy: { createdAt: 'desc' },
            include: { users: { select: { id: true, email: true, permissions: true, active: true } } },
        });
    }
    async updateCustomer(id, dto, userId) {
        const customer = await this.prisma.customerAccount.findUnique({
            where: { id },
            include: { users: { include: { permissions: true } } },
        });
        if (!customer)
            throw new common_1.NotFoundException('Cliente no encontrado.');
        const updated = await this.prisma.customerAccount.update({
            where: { id },
            data: {
                accountStatus: dto.accountStatus,
                medicationPermission: dto.medicationPermission,
                creditStatus: dto.creditStatus,
                creditLimit: dto.creditLimit,
                internalCreditNote: dto.internalCreditNote,
            },
        });
        if (dto.medicationPermission !== undefined) {
            for (const user of customer.users) {
                const hasPermission = user.permissions.some((permission) => permission.permission === client_1.Permission.CAN_BUY_MEDICATIONS);
                if (dto.medicationPermission && !hasPermission) {
                    await this.prisma.userPermission.create({ data: { userId: user.id, permission: client_1.Permission.CAN_BUY_MEDICATIONS } });
                }
                if (!dto.medicationPermission && hasPermission) {
                    await this.prisma.userPermission.deleteMany({ where: { userId: user.id, permission: client_1.Permission.CAN_BUY_MEDICATIONS } });
                }
            }
        }
        await this.audit.log('CUSTOMER_UPDATED', 'CustomerAccount', id, userId, { ...dto });
        return updated;
    }
    ordersAdmin() {
        return this.orders.findAdminOrders();
    }
    applicationsAdmin() {
        return this.applications.findMany();
    }
    auditLogs() {
        return this.audit.findMany(200);
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        orders_service_1.OrdersService,
        applications_service_1.ApplicationsService])
], AdminService);
//# sourceMappingURL=admin.service.js.map