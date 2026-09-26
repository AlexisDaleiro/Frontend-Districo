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
exports.PromotionsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const audit_service_1 = require("../audit/audit.service");
const promotion_rules_1 = require("../common/business/promotion-rules");
const prisma_service_1 = require("../prisma/prisma.service");
const promotionInclude = {
    conditions: true,
    rewards: true,
};
let PromotionsService = class PromotionsService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    findMany() {
        return this.prisma.promotion.findMany({
            where: { deletedAt: null },
            include: promotionInclude,
            orderBy: [{ active: 'desc' }, { priority: 'desc' }],
        });
    }
    async create(dto, createdById) {
        const promotion = await this.prisma.promotion.create({
            data: {
                name: dto.name,
                description: dto.description,
                type: dto.type,
                startsAt: new Date(dto.startsAt),
                endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
                priority: dto.priority ?? 0,
                combinable: dto.combinable ?? false,
                createdById,
                conditions: {
                    create: dto.conditions.map((condition) => ({
                        targetType: condition.targetType,
                        targetId: condition.targetId,
                        metric: condition.metric ?? client_1.PromotionMetric.MIN_QUANTITY,
                        minQuantity: condition.minQuantity,
                        minAmount: condition.minAmount,
                    })),
                },
                rewards: {
                    create: dto.rewards.map((reward) => ({
                        targetType: reward.targetType,
                        targetId: reward.targetId,
                        rewardType: reward.rewardType,
                        percentage: reward.percentage,
                        amount: reward.amount,
                    })),
                },
            },
            include: promotionInclude,
        });
        await this.audit.log('PROMOTION_CREATED', 'Promotion', promotion.id, createdById, { name: promotion.name });
        return promotion;
    }
    async updateActive(id, active, userId) {
        const promotion = await this.prisma.promotion.findUnique({ where: { id } });
        if (!promotion)
            throw new common_1.NotFoundException('Promocion no encontrada.');
        const updated = await this.prisma.promotion.update({ where: { id }, data: { active }, include: promotionInclude });
        await this.audit.log('PROMOTION_UPDATED', 'Promotion', id, userId, { active });
        return updated;
    }
    createExpirationPromotion(dto, userId) {
        return this.prisma.expirationPromotion.create({
            data: {
                productId: dto.productId,
                variantId: dto.variantId,
                batch: dto.batch,
                expirationDate: new Date(dto.expirationDate),
                discountPercentage: dto.discountPercentage,
                promotionalPrice: dto.promotionalPrice,
                startsAt: new Date(dto.startsAt),
                endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
                quantityLimit: dto.quantityLimit,
                active: dto.active ?? true,
            },
        }).then(async (promotion) => {
            await this.audit.log('EXPIRATION_PROMOTION_CREATED', 'ExpirationPromotion', promotion.id, userId, { productId: dto.productId, variantId: dto.variantId });
            return promotion;
        });
    }
    findExpirationPromotions() {
        return this.prisma.expirationPromotion.findMany({
            orderBy: [{ active: 'desc' }, { expirationDate: 'asc' }],
        });
    }
    async calculateDiscounts(lines) {
        const now = new Date();
        const promotions = await this.prisma.promotion.findMany({
            where: {
                active: true,
                deletedAt: null,
                startsAt: { lte: now },
                OR: [{ endsAt: null }, { endsAt: { gte: now } }],
            },
            include: promotionInclude,
            orderBy: { priority: 'desc' },
        });
        const snapshots = promotions.map((promotion) => ({
            id: promotion.id,
            name: promotion.name,
            type: promotion.type,
            priority: promotion.priority,
            combinable: promotion.combinable,
            conditions: promotion.conditions.map((condition) => ({
                targetType: condition.targetType,
                targetId: condition.targetId,
                metric: condition.metric,
                minQuantity: condition.minQuantity,
                minAmount: condition.minAmount ? Number(condition.minAmount) : null,
            })),
            rewards: promotion.rewards.map((reward) => ({
                targetType: reward.targetType,
                targetId: reward.targetId,
                rewardType: reward.rewardType,
                percentage: reward.percentage ? Number(reward.percentage) : null,
                amount: reward.amount ? Number(reward.amount) : null,
            })),
        }));
        return (0, promotion_rules_1.calculatePromotionDiscounts)(lines, snapshots);
    }
};
exports.PromotionsService = PromotionsService;
exports.PromotionsService = PromotionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], PromotionsService);
//# sourceMappingURL=promotions.service.js.map