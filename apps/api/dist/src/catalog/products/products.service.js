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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const slugify_1 = require("../../common/utils/slugify");
const products_repository_1 = require("./products.repository");
let ProductsService = class ProductsService {
    constructor(productsRepository) {
        this.productsRepository = productsRepository;
    }
    async findMany(filters, user) {
        const result = await this.productsRepository.findMany(filters);
        return { ...result, items: result.items.map((product) => this.toPublicProduct(product, user)) };
    }
    async findBySlug(slug, user) {
        const product = await this.productsRepository.findBySlug(slug);
        if (!product) {
            throw new common_1.NotFoundException('Producto no encontrado.');
        }
        return this.toPublicProduct(product, user);
    }
    create(dto) {
        return this.productsRepository.create({
            name: dto.name,
            slug: dto.slug ?? (0, slugify_1.slugify)(dto.name),
            shortDescription: dto.shortDescription,
            description: dto.description,
            productType: dto.productType ?? client_1.ProductType.OTHER,
            source: dto.source ?? client_1.ProductSource.DISTRICO,
            requiresMedicationPermission: dto.requiresMedicationPermission ?? false,
            active: dto.active ?? true,
            featured: dto.featured ?? false,
            newProduct: dto.newProduct ?? false,
            tags: dto.tags ?? [],
            brand: dto.brandId ? { connect: { id: dto.brandId } } : undefined,
            laboratory: dto.laboratoryId ? { connect: { id: dto.laboratoryId } } : undefined,
            categories: dto.categoryIds?.length
                ? { create: dto.categoryIds.map((categoryId) => ({ category: { connect: { id: categoryId } } })) }
                : undefined,
            attributes: dto.attributeValueIds?.length
                ? { create: dto.attributeValueIds.map((attributeValueId) => ({ attributeValue: { connect: { id: attributeValueId } } })) }
                : undefined,
        });
    }
    async update(id, dto) {
        await this.assertProductExists(id);
        return this.productsRepository.update(id, {
            name: dto.name,
            slug: dto.slug ?? (dto.name ? (0, slugify_1.slugify)(dto.name) : undefined),
            shortDescription: dto.shortDescription,
            description: dto.description,
            productType: dto.productType,
            source: dto.source,
            requiresMedicationPermission: dto.requiresMedicationPermission,
            active: dto.active,
            featured: dto.featured,
            newProduct: dto.newProduct,
            tags: dto.tags,
            brand: dto.brandId ? { connect: { id: dto.brandId } } : undefined,
            laboratory: dto.laboratoryId ? { connect: { id: dto.laboratoryId } } : undefined,
            categories: dto.categoryIds ? { deleteMany: {}, create: dto.categoryIds.map((categoryId) => ({ categoryId })) } : undefined,
            attributes: dto.attributeValueIds ? { deleteMany: {}, create: dto.attributeValueIds.map((attributeValueId) => ({ attributeValueId })) } : undefined,
        });
    }
    async createVariant(productId, dto) {
        await this.assertProductExists(productId);
        return this.productsRepository.createVariant(productId, {
            sku: dto.sku,
            ean: dto.ean,
            name: dto.name,
            presentation: dto.presentation,
            weight: dto.weight,
            unitOfMeasure: dto.unitOfMeasure ?? client_1.UnitOfMeasure.UNIT,
            saleMultiple: dto.saleMultiple ?? 1,
            minimumOrderQuantity: dto.minimumOrderQuantity ?? dto.saleMultiple ?? 1,
            physicalStock: dto.physicalStock ?? 0,
            reservedStock: dto.reservedStock ?? 0,
            active: dto.active ?? true,
            isDemoData: dto.isDemoData ?? false,
        });
    }
    async updateVariant(id, dto) {
        const variant = await this.productsRepository.findVariantById(id);
        if (!variant || variant.deletedAt)
            throw new common_1.NotFoundException('Variante no encontrada.');
        return this.productsRepository.updateVariant(id, dto);
    }
    async createMedia(productId, dto) {
        await this.assertProductExists(productId);
        if (dto.variantId) {
            const variant = await this.productsRepository.findVariantById(dto.variantId);
            if (!variant || variant.productId !== productId || variant.deletedAt) {
                throw new common_1.BadRequestException('La variante no pertenece al producto.');
            }
        }
        return this.productsRepository.createMedia(productId, {
            variant: dto.variantId ? { connect: { id: dto.variantId } } : undefined,
            type: dto.type ?? 'IMAGE',
            url: dto.url,
            alt: dto.alt,
            position: dto.position ?? 0,
            isPrimary: dto.isPrimary ?? false,
        });
    }
    async updateMedia(id, dto) {
        const media = await this.productsRepository.findMediaById(id);
        if (!media)
            throw new common_1.NotFoundException('Imagen o video no encontrado.');
        if (dto.variantId) {
            const variant = await this.productsRepository.findVariantById(dto.variantId);
            if (!variant || variant.productId !== media.productId || variant.deletedAt) {
                throw new common_1.BadRequestException('La variante no pertenece al producto.');
            }
        }
        return this.productsRepository.updateMedia(id, {
            variant: dto.variantId ? { connect: { id: dto.variantId } } : undefined,
            type: dto.type,
            url: dto.url,
            alt: dto.alt,
            position: dto.position,
            isPrimary: dto.isPrimary,
        });
    }
    async deleteMedia(id) {
        const media = await this.productsRepository.findMediaById(id);
        if (!media)
            throw new common_1.NotFoundException('Imagen o video no encontrado.');
        await this.productsRepository.deleteMedia(id);
        return { success: true };
    }
    async assertProductExists(id) {
        const product = await this.productsRepository.findById(id);
        if (!product)
            throw new common_1.NotFoundException('Producto no encontrado.');
    }
    toPublicProduct(product, user) {
        const { source: _source, deletedAt: _deletedAt, ...publicProduct } = product;
        const canViewPrice = this.canViewPrice(product.requiresMedicationPermission, user);
        return {
            ...publicProduct,
            medicationRestricted: product.requiresMedicationPermission && !this.canBuyMedication(user),
            variants: product.variants.map(({ physicalStock, reservedStock, isDemoData: _isDemoData, deletedAt: _variantDeletedAt, prices, ...variant }) => {
                const currentPrice = prices[0];
                const availableStock = physicalStock - reservedStock;
                return {
                    ...variant,
                    availableStock,
                    stockStatus: availableStock > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK',
                    price: canViewPrice && currentPrice
                        ? {
                            amount: Number(currentPrice.amount),
                            currency: currentPrice.currency,
                            priceList: currentPrice.priceList.name,
                        }
                        : undefined,
                };
            }),
        };
    }
    canViewPrice(requiresMedicationPermission, user) {
        if (!user)
            return false;
        if (user.role === client_1.Role.ADMIN)
            return true;
        if (!user.permissions.includes(client_1.Permission.CAN_VIEW_PRICES))
            return false;
        if (requiresMedicationPermission && !this.canBuyMedication(user))
            return false;
        return true;
    }
    canBuyMedication(user) {
        return Boolean(user?.role === client_1.Role.ADMIN || user?.permissions.includes(client_1.Permission.CAN_BUY_MEDICATIONS));
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [products_repository_1.ProductsRepository])
], ProductsService);
//# sourceMappingURL=products.service.js.map