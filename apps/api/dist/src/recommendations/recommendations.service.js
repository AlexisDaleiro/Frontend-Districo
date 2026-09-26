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
exports.RecommendationsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const audit_service_1 = require("../audit/audit.service");
const prisma_service_1 = require("../prisma/prisma.service");
let RecommendationsService = class RecommendationsService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async create(dto, userId) {
        const rule = await this.prisma.recommendationRule.create({
            data: {
                name: dto.name,
                active: dto.active ?? true,
                priority: dto.priority ?? 0,
                startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
                endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
                triggerType: dto.triggerType,
                triggerId: dto.triggerId,
                minimumQuantity: dto.minimumQuantity,
                minimumCartAmount: dto.minimumCartAmount,
                products: {
                    create: dto.products.map((product) => ({
                        productId: product.productId,
                        variantId: product.variantId,
                        position: product.position ?? 0,
                    })),
                },
            },
            include: { products: true },
        });
        await this.audit.log('RECOMMENDATION_RULE_CREATED', 'RecommendationRule', rule.id, userId, { name: rule.name });
        return rule;
    }
    findMany() {
        return this.prisma.recommendationRule.findMany({
            include: { products: true },
            orderBy: [{ active: 'desc' }, { priority: 'desc' }],
        });
    }
    async recommendationsForUserCart(user) {
        const cart = await this.prisma.cart.findUnique({
            where: { userId: user.sub },
            include: {
                items: {
                    include: {
                        productVariant: {
                            include: {
                                product: { include: { categories: true } },
                                prices: {
                                    where: {
                                        priceList: { active: true },
                                        validFrom: { lte: new Date() },
                                        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
                                    },
                                    take: 1,
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!cart?.items.length)
            return [];
        const total = cart.items.reduce((sum, item) => sum + item.quantity * Number(item.productVariant.prices[0]?.amount ?? 0), 0);
        const productIdsInCart = new Set(cart.items.map((item) => item.productVariant.productId));
        const variantIdsInCart = new Set(cart.items.map((item) => item.productVariantId));
        const now = new Date();
        const rules = await this.prisma.recommendationRule.findMany({
            where: {
                active: true,
                OR: [{ startsAt: null }, { startsAt: { lte: now } }],
                AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
            },
            include: { products: { orderBy: { position: 'asc' } } },
            orderBy: { priority: 'desc' },
        });
        const matchingRules = rules.filter((rule) => {
            if (rule.minimumCartAmount && total < Number(rule.minimumCartAmount))
                return false;
            const quantity = cart.items
                .filter((item) => this.triggerMatches(rule.triggerType, rule.triggerId, item.productVariant.product, item.productVariant.id))
                .reduce((sum, item) => sum + item.quantity, 0);
            return quantity >= (rule.minimumQuantity ?? 1);
        });
        const recommendedIds = new Set();
        const recommendedProducts = [];
        for (const rule of matchingRules) {
            for (const productRef of rule.products) {
                if (productIdsInCart.has(productRef.productId) || (productRef.variantId && variantIdsInCart.has(productRef.variantId)))
                    continue;
                if (recommendedIds.has(`${productRef.productId}:${productRef.variantId ?? ''}`))
                    continue;
                const variantWhere = productRef.variantId
                    ? { id: productRef.variantId, active: true, deletedAt: null }
                    : { active: true, deletedAt: null };
                const product = await this.prisma.product.findFirst({
                    where: {
                        id: productRef.productId,
                        active: true,
                        deletedAt: null,
                    },
                    include: {
                        brand: true,
                        laboratory: true,
                        variants: {
                            where: variantWhere,
                        },
                    },
                });
                if (!product || !product.variants.length)
                    continue;
                if (product.requiresMedicationPermission && !this.canBuyMedication(user))
                    continue;
                if (product.variants.every((variant) => variant.physicalStock - variant.reservedStock <= 0))
                    continue;
                recommendedIds.add(`${productRef.productId}:${productRef.variantId ?? ''}`);
                recommendedProducts.push({ rule: rule.name, product });
            }
        }
        return recommendedProducts;
    }
    triggerMatches(triggerType, triggerId, product, variantId) {
        if (triggerType === client_1.RecommendationTriggerType.PRODUCT)
            return product.id === triggerId || variantId === triggerId;
        if (triggerType === client_1.RecommendationTriggerType.BRAND)
            return product.brandId === triggerId;
        if (triggerType === client_1.RecommendationTriggerType.LABORATORY)
            return product.laboratoryId === triggerId;
        if (triggerType === client_1.RecommendationTriggerType.CATEGORY)
            return product.categories.some((category) => category.categoryId === triggerId);
        return false;
    }
    canBuyMedication(user) {
        return user.role === client_1.Role.ADMIN || user.permissions.includes(client_1.Permission.CAN_BUY_MEDICATIONS);
    }
};
exports.RecommendationsService = RecommendationsService;
exports.RecommendationsService = RecommendationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], RecommendationsService);
//# sourceMappingURL=recommendations.service.js.map