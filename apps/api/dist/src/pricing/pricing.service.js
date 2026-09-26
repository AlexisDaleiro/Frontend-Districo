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
exports.PricingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const DEFAULT_PRICE_LIST_NAME = 'Lista Mayorista Districo';
let PricingService = class PricingService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async defaultPriceList() {
        return this.prisma.priceList.upsert({
            where: { name: DEFAULT_PRICE_LIST_NAME },
            create: { name: DEFAULT_PRICE_LIST_NAME, active: true },
            update: { active: true },
        });
    }
    async currentVariantPrice(productVariantId, priceListId) {
        const list = priceListId ? await this.findPriceList(priceListId) : await this.defaultPriceList();
        return this.prisma.price.findFirst({
            where: {
                productVariantId,
                priceListId: list.id,
                validFrom: { lte: new Date() },
                OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
            },
            orderBy: { validFrom: 'desc' },
            include: { priceList: true },
        });
    }
    async setVariantPrice(productVariantId, amount, currency = 'UYU', changedById, priceListId) {
        const variant = await this.prisma.productVariant.findFirst({
            where: { id: productVariantId, deletedAt: null },
        });
        if (!variant) {
            throw new common_1.NotFoundException('Variante no encontrada.');
        }
        const list = priceListId ? await this.findPriceList(priceListId) : await this.defaultPriceList();
        const now = new Date();
        return this.prisma.$transaction(async (tx) => {
            const current = await tx.price.findFirst({
                where: {
                    productVariantId,
                    priceListId: list.id,
                    validFrom: { lte: now },
                    OR: [{ validUntil: null }, { validUntil: { gte: now } }],
                },
                orderBy: { validFrom: 'desc' },
            });
            if (current) {
                await tx.price.update({
                    where: { id: current.id },
                    data: { validUntil: now },
                });
            }
            const price = await tx.price.create({
                data: {
                    productVariantId,
                    priceListId: list.id,
                    amount,
                    currency,
                    validFrom: now,
                },
                include: { priceList: true },
            });
            await tx.priceHistory.create({
                data: {
                    productVariantId,
                    previousPrice: current?.amount,
                    newPrice: amount,
                    currency,
                    changedById,
                },
            });
            return price;
        });
    }
    async findPriceList(id) {
        const priceList = await this.prisma.priceList.findUnique({ where: { id } });
        if (!priceList || !priceList.active) {
            throw new common_1.NotFoundException('Lista de precios no encontrada.');
        }
        return priceList;
    }
};
exports.PricingService = PricingService;
exports.PricingService = PricingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PricingService);
//# sourceMappingURL=pricing.service.js.map