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
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const commerce_rules_1 = require("../common/business/commerce-rules");
const prisma_service_1 = require("../prisma/prisma.service");
let InventoryService = class InventoryService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    availableStock(variant) {
        return variant.physicalStock - variant.reservedStock;
    }
    validateQuantityRules(variant, quantity) {
        const result = (0, commerce_rules_1.validateQuantityRule)({
            quantity,
            minimumOrderQuantity: variant.minimumOrderQuantity,
            saleMultiple: variant.saleMultiple,
            availableStock: Number.MAX_SAFE_INTEGER,
        });
        if (!result.valid) {
            throw new common_1.BadRequestException(result.reason);
        }
    }
    validateAvailableStock(variant, quantity) {
        if (!variant.active || variant.deletedAt) {
            throw new common_1.BadRequestException('La variante no esta disponible para la venta.');
        }
        const availableStock = this.availableStock(variant);
        const result = (0, commerce_rules_1.validateQuantityRule)({
            quantity,
            minimumOrderQuantity: variant.minimumOrderQuantity,
            saleMultiple: variant.saleMultiple,
            availableStock,
        });
        if (!result.valid) {
            throw new common_1.BadRequestException(result.reason);
        }
    }
    async getVariantStock(variantId) {
        const variant = await this.prisma.productVariant.findUnique({
            where: { id: variantId },
            include: { product: true },
        });
        if (!variant || variant.deletedAt) {
            throw new common_1.NotFoundException('Variante no encontrada.');
        }
        return {
            id: variant.id,
            productId: variant.productId,
            productName: variant.product.name,
            sku: variant.sku,
            physicalStock: variant.physicalStock,
            reservedStock: variant.reservedStock,
            availableStock: this.availableStock(variant),
            saleMultiple: variant.saleMultiple,
            minimumOrderQuantity: variant.minimumOrderQuantity,
            active: variant.active,
        };
    }
    async updateStock(variantId, physicalStock, reservedStock) {
        const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
        if (!variant || variant.deletedAt) {
            throw new common_1.NotFoundException('Variante no encontrada.');
        }
        const nextReservedStock = reservedStock ?? variant.reservedStock;
        if (nextReservedStock > physicalStock) {
            throw new common_1.BadRequestException('El stock reservado no puede superar el stock fisico.');
        }
        const updated = await this.prisma.productVariant.update({
            where: { id: variantId },
            data: { physicalStock, reservedStock: nextReservedStock },
        });
        return {
            ...updated,
            availableStock: this.availableStock(updated),
        };
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map