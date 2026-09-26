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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const applications_service_1 = require("../applications/applications.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const review_application_dto_1 = require("../applications/dto/review-application.dto");
const update_order_status_dto_1 = require("../orders/dto/update-order-status.dto");
const orders_service_1 = require("../orders/orders.service");
const create_promotion_dto_1 = require("../promotions/dto/create-promotion.dto");
const promotions_service_1 = require("../promotions/promotions.service");
const create_recommendation_rule_dto_1 = require("../recommendations/dto/create-recommendation-rule.dto");
const recommendations_service_1 = require("../recommendations/recommendations.service");
const admin_service_1 = require("./admin.service");
const update_customer_dto_1 = require("./dto/update-customer.dto");
let AdminController = class AdminController {
    constructor(admin, applications, orders, promotions, recommendations) {
        this.admin = admin;
        this.applications = applications;
        this.orders = orders;
        this.promotions = promotions;
        this.recommendations = recommendations;
    }
    dashboard() {
        return this.admin.dashboard();
    }
    customers() {
        return this.admin.customers();
    }
    updateCustomer(id, dto, user) {
        return this.admin.updateCustomer(id, dto, user.sub);
    }
    applicationsList() {
        return this.admin.applicationsAdmin();
    }
    approveApplication(id, dto, user) {
        return this.applications.approve(id, user.sub, dto.medicationPermission ?? false);
    }
    rejectApplication(id, dto, user) {
        return this.applications.reject(id, user.sub, dto.rejectionReason);
    }
    ordersList() {
        return this.admin.ordersAdmin();
    }
    updateOrderStatus(id, dto, user) {
        return this.orders.updateStatus(id, dto.status, user.sub, dto.reviewReason);
    }
    approveOrder(id, user) {
        return this.orders.updateStatus(id, client_1.OrderStatus.APPROVED, user.sub);
    }
    rejectOrder(id, user) {
        return this.orders.updateStatus(id, client_1.OrderStatus.REJECTED, user.sub);
    }
    auditLogs() {
        return this.admin.auditLogs();
    }
    promotionsList() {
        return this.promotions.findMany();
    }
    createPromotion(dto, user) {
        return this.promotions.create(dto, user.sub);
    }
    recommendationsList() {
        return this.recommendations.findMany();
    }
    createRecommendation(dto, user) {
        return this.recommendations.create(dto, user.sub);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('dashboard'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "dashboard", null);
__decorate([
    (0, common_1.Get)('customers'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "customers", null);
__decorate([
    (0, common_1.Patch)('customers/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_customer_dto_1.UpdateCustomerDto, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateCustomer", null);
__decorate([
    (0, common_1.Get)('applications'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "applicationsList", null);
__decorate([
    (0, common_1.Post)('applications/:id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, review_application_dto_1.ReviewApplicationDto, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "approveApplication", null);
__decorate([
    (0, common_1.Post)('applications/:id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, review_application_dto_1.ReviewApplicationDto, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "rejectApplication", null);
__decorate([
    (0, common_1.Get)('orders'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "ordersList", null);
__decorate([
    (0, common_1.Patch)('orders/:id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_order_status_dto_1.UpdateOrderStatusDto, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateOrderStatus", null);
__decorate([
    (0, common_1.Post)('orders/:id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "approveOrder", null);
__decorate([
    (0, common_1.Post)('orders/:id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "rejectOrder", null);
__decorate([
    (0, common_1.Get)('audit-logs'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "auditLogs", null);
__decorate([
    (0, common_1.Get)('promotions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "promotionsList", null);
__decorate([
    (0, common_1.Post)('promotions'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_promotion_dto_1.CreatePromotionDto, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createPromotion", null);
__decorate([
    (0, common_1.Get)('recommendations'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "recommendationsList", null);
__decorate([
    (0, common_1.Post)('recommendations'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_recommendation_rule_dto_1.CreateRecommendationRuleDto, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createRecommendation", null);
exports.AdminController = AdminController = __decorate([
    (0, swagger_1.ApiTags)('admin'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __metadata("design:paramtypes", [admin_service_1.AdminService,
        applications_service_1.ApplicationsService,
        orders_service_1.OrdersService,
        promotions_service_1.PromotionsService,
        recommendations_service_1.RecommendationsService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map