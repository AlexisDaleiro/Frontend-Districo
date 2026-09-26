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
var _a, _b, _c, _d, _e;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePromotionDto = exports.PromotionRewardDto = exports.PromotionConditionDto = void 0;
const client_1 = require("@prisma/client");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class PromotionConditionDto {
}
exports.PromotionConditionDto = PromotionConditionDto;
__decorate([
    (0, class_validator_1.IsEnum)(client_1.PromotionTargetType),
    __metadata("design:type", typeof (_a = typeof client_1.PromotionTargetType !== "undefined" && client_1.PromotionTargetType) === "function" ? _a : Object)
], PromotionConditionDto.prototype, "targetType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PromotionConditionDto.prototype, "targetId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.PromotionMetric),
    __metadata("design:type", typeof (_b = typeof client_1.PromotionMetric !== "undefined" && client_1.PromotionMetric) === "function" ? _b : Object)
], PromotionConditionDto.prototype, "metric", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], PromotionConditionDto.prototype, "minQuantity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], PromotionConditionDto.prototype, "minAmount", void 0);
class PromotionRewardDto {
}
exports.PromotionRewardDto = PromotionRewardDto;
__decorate([
    (0, class_validator_1.IsEnum)(client_1.PromotionTargetType),
    __metadata("design:type", typeof (_c = typeof client_1.PromotionTargetType !== "undefined" && client_1.PromotionTargetType) === "function" ? _c : Object)
], PromotionRewardDto.prototype, "targetType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PromotionRewardDto.prototype, "targetId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.PromotionRewardType),
    __metadata("design:type", typeof (_d = typeof client_1.PromotionRewardType !== "undefined" && client_1.PromotionRewardType) === "function" ? _d : Object)
], PromotionRewardDto.prototype, "rewardType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], PromotionRewardDto.prototype, "percentage", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], PromotionRewardDto.prototype, "amount", void 0);
class CreatePromotionDto {
}
exports.CreatePromotionDto = CreatePromotionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePromotionDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePromotionDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.PromotionType),
    __metadata("design:type", typeof (_e = typeof client_1.PromotionType !== "undefined" && client_1.PromotionType) === "function" ? _e : Object)
], CreatePromotionDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreatePromotionDto.prototype, "startsAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreatePromotionDto.prototype, "endsAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreatePromotionDto.prototype, "priority", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreatePromotionDto.prototype, "combinable", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => PromotionConditionDto),
    __metadata("design:type", Array)
], CreatePromotionDto.prototype, "conditions", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => PromotionRewardDto),
    __metadata("design:type", Array)
], CreatePromotionDto.prototype, "rewards", void 0);
//# sourceMappingURL=create-promotion.dto.js.map