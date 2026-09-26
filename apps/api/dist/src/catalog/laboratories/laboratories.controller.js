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
exports.LaboratoriesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const create_laboratory_dto_1 = require("./dto/create-laboratory.dto");
const update_laboratory_dto_1 = require("./dto/update-laboratory.dto");
const laboratories_service_1 = require("./laboratories.service");
let LaboratoriesController = class LaboratoriesController {
    constructor(laboratoriesService) {
        this.laboratoriesService = laboratoriesService;
    }
    findAll() {
        return this.laboratoriesService.findAll();
    }
    create(dto) {
        return this.laboratoriesService.create(dto);
    }
    update(id, dto) {
        return this.laboratoriesService.update(id, dto);
    }
};
exports.LaboratoriesController = LaboratoriesController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LaboratoriesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_laboratory_dto_1.CreateLaboratoryDto]),
    __metadata("design:returntype", void 0)
], LaboratoriesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_laboratory_dto_1.UpdateLaboratoryDto]),
    __metadata("design:returntype", void 0)
], LaboratoriesController.prototype, "update", null);
exports.LaboratoriesController = LaboratoriesController = __decorate([
    (0, swagger_1.ApiTags)('laboratories'),
    (0, common_1.Controller)('laboratories'),
    __metadata("design:paramtypes", [laboratories_service_1.LaboratoriesService])
], LaboratoriesController);
//# sourceMappingURL=laboratories.controller.js.map