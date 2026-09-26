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
exports.PromotionsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const create_expiration_promotion_dto_1 = require("./dto/create-expiration-promotion.dto");
const create_promotion_dto_1 = require("./dto/create-promotion.dto");
const promotions_service_1 = require("./promotions.service");
let PromotionsController = class PromotionsController {
    constructor(promotionsService) {
        this.promotionsService = promotionsService;
    }
    findMany() {
        return this.promotionsService.findMany();
    }
    create(dto, user) {
        return this.promotionsService.create(dto, user.sub);
    }
    activate(id, user) {
        return this.promotionsService.updateActive(id, true, user.sub);
    }
    deactivate(id, user) {
        return this.promotionsService.updateActive(id, false, user.sub);
    }
    findExpirationPromotions() {
        return this.promotionsService.findExpirationPromotions();
    }
    createExpirationPromotion(dto, user) {
        return this.promotionsService.createExpirationPromotion(dto, user.sub);
    }
};
exports.PromotionsController = PromotionsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PromotionsController.prototype, "findMany", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_promotion_dto_1.CreatePromotionDto, Object]),
    __metadata("design:returntype", void 0)
], PromotionsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id/activate'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PromotionsController.prototype, "activate", null);
__decorate([
    (0, common_1.Patch)(':id/deactivate'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PromotionsController.prototype, "deactivate", null);
__decorate([
    (0, common_1.Get)('expiration'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PromotionsController.prototype, "findExpirationPromotions", null);
__decorate([
    (0, common_1.Post)('expiration'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_expiration_promotion_dto_1.CreateExpirationPromotionDto, Object]),
    __metadata("design:returntype", void 0)
], PromotionsController.prototype, "createExpirationPromotion", null);
exports.PromotionsController = PromotionsController = __decorate([
    (0, swagger_1.ApiTags)('promotions'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('promotions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __metadata("design:paramtypes", [promotions_service_1.PromotionsService])
], PromotionsController);
//# sourceMappingURL=promotions.controller.js.map