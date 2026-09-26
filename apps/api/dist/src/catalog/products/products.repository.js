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
exports.ProductsRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const productInclude = () => ({
    brand: true,
    laboratory: true,
    categories: { include: { category: true } },
    variants: {
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
        include: {
            prices: {
                where: {
                    priceList: { active: true },
                    validFrom: { lte: new Date() },
                    OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
                },
                orderBy: { validFrom: 'desc' },
                take: 1,
                include: { priceList: true },
            },
        },
    },
    media: { orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }] },
    attributes: {
        include: {
            attributeValue: { include: { attribute: true } },
        },
    },
});
let ProductsRepository = class ProductsRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findMany(filters) {
        const categoryIds = filters.categoryId ? await this.categoryAndDescendantIds(filters.categoryId) : undefined;
        const where = {
            deletedAt: null,
            active: true,
            brandId: filters.brandId,
            laboratoryId: filters.laboratoryId,
            productType: filters.productType,
            requiresMedicationPermission: filters.medicationRequired,
            featured: filters.featured,
            categories: categoryIds ? { some: { categoryId: { in: categoryIds } } } : undefined,
            AND: filters.attributeValueIds?.map((attributeValueId) => ({
                attributes: { some: { attributeValueId } },
            })),
            OR: filters.search
                ? [
                    { name: { contains: filters.search, mode: 'insensitive' } },
                    { variants: { some: { sku: { contains: filters.search, mode: 'insensitive' } } } },
                    { variants: { some: { ean: { contains: filters.search, mode: 'insensitive' } } } },
                    { brand: { name: { contains: filters.search, mode: 'insensitive' } } },
                    { laboratory: { name: { contains: filters.search, mode: 'insensitive' } } },
                ]
                : undefined,
        };
        const skip = (filters.page - 1) * filters.limit;
        const [items, total] = await this.prisma.$transaction([
            this.prisma.product.findMany({
                where,
                include: productInclude(),
                orderBy: { name: 'asc' },
                skip,
                take: filters.limit,
            }),
            this.prisma.product.count({ where }),
        ]);
        return { items, meta: { total, page: filters.page, limit: filters.limit } };
    }
    findBySlug(slug) {
        return this.prisma.product.findFirst({
            where: { slug, deletedAt: null, active: true },
            include: productInclude(),
        });
    }
    create(data) {
        return this.prisma.product.create({ data, include: productInclude() });
    }
    update(id, data) {
        return this.prisma.product.update({ where: { id }, data, include: productInclude() });
    }
    createVariant(productId, data) {
        return this.prisma.productVariant.create({ data: { ...data, product: { connect: { id: productId } } } });
    }
    updateVariant(id, data) {
        return this.prisma.productVariant.update({ where: { id }, data });
    }
    findById(id) {
        return this.prisma.product.findFirst({ where: { id, deletedAt: null } });
    }
    findVariantById(id) {
        return this.prisma.productVariant.findUnique({ where: { id } });
    }
    createMedia(productId, data) {
        return this.prisma.productMedia.create({ data: { ...data, product: { connect: { id: productId } } } });
    }
    findMediaById(id) {
        return this.prisma.productMedia.findUnique({ where: { id } });
    }
    updateMedia(id, data) {
        return this.prisma.productMedia.update({ where: { id }, data });
    }
    deleteMedia(id) {
        return this.prisma.productMedia.delete({ where: { id } });
    }
    async categoryAndDescendantIds(categoryId) {
        const categories = await this.prisma.category.findMany({
            where: { deletedAt: null, active: true },
            select: { id: true, parentId: true },
        });
        const ids = new Set([categoryId]);
        let previousSize;
        do {
            previousSize = ids.size;
            for (const category of categories) {
                if (category.parentId && ids.has(category.parentId))
                    ids.add(category.id);
            }
        } while (ids.size !== previousSize);
        return [...ids];
    }
};
exports.ProductsRepository = ProductsRepository;
exports.ProductsRepository = ProductsRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductsRepository);
//# sourceMappingURL=products.repository.js.map