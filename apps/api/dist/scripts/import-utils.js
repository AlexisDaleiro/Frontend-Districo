"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importDemoProducts = importDemoProducts;
const client_1 = require("@prisma/client");
const slugify_1 = require("../src/common/utils/slugify");
async function importDemoProducts(source, products) {
    const prisma = new client_1.PrismaClient();
    try {
        for (const item of products) {
            const category = await prisma.category.upsert({
                where: { slug: (0, slugify_1.slugify)(item.categoryName) },
                create: { name: item.categoryName, slug: (0, slugify_1.slugify)(item.categoryName) },
                update: { active: true },
            });
            const brand = item.brandName
                ? await prisma.brand.upsert({
                    where: { slug: (0, slugify_1.slugify)(item.brandName) },
                    create: { name: item.brandName, slug: (0, slugify_1.slugify)(item.brandName) },
                    update: { active: true },
                })
                : null;
            const laboratory = item.laboratoryName
                ? await prisma.laboratory.upsert({
                    where: { slug: (0, slugify_1.slugify)(item.laboratoryName) },
                    create: { name: item.laboratoryName, slug: (0, slugify_1.slugify)(item.laboratoryName) },
                    update: { active: true },
                })
                : null;
            const product = await prisma.product.upsert({
                where: { slug: (0, slugify_1.slugify)(item.name) },
                create: {
                    name: item.name,
                    slug: (0, slugify_1.slugify)(item.name),
                    shortDescription: item.shortDescription,
                    productType: item.productType,
                    source,
                    brandId: brand?.id,
                    laboratoryId: laboratory?.id,
                    requiresMedicationPermission: item.requiresMedicationPermission ?? false,
                },
                update: {
                    shortDescription: item.shortDescription,
                    productType: item.productType,
                    source,
                    brandId: brand?.id,
                    laboratoryId: laboratory?.id,
                    requiresMedicationPermission: item.requiresMedicationPermission ?? false,
                    active: true,
                },
            });
            await prisma.productCategory.upsert({
                where: { productId_categoryId: { productId: product.id, categoryId: category.id } },
                create: { productId: product.id, categoryId: category.id },
                update: {},
            });
            if (item.imageUrl) {
                await prisma.productMedia.upsert({
                    where: { id: `${product.id}-primary-demo-media` },
                    create: {
                        id: `${product.id}-primary-demo-media`,
                        productId: product.id,
                        type: 'IMAGE',
                        url: item.imageUrl,
                        alt: item.name,
                        position: 1,
                        isPrimary: true,
                    },
                    update: {
                        url: item.imageUrl,
                        alt: item.name,
                        isPrimary: true,
                    },
                });
            }
            for (const variant of item.variants) {
                await prisma.productVariant.upsert({
                    where: { sku: variant.sku },
                    create: {
                        productId: product.id,
                        sku: variant.sku,
                        ean: variant.ean,
                        name: variant.name,
                        presentation: variant.presentation,
                        unitOfMeasure: client_1.UnitOfMeasure.UNIT,
                        saleMultiple: variant.saleMultiple,
                        minimumOrderQuantity: variant.minimumOrderQuantity,
                        physicalStock: variant.physicalStock,
                        isDemoData: true,
                    },
                    update: {
                        productId: product.id,
                        name: variant.name,
                        presentation: variant.presentation,
                        saleMultiple: variant.saleMultiple,
                        minimumOrderQuantity: variant.minimumOrderQuantity,
                        physicalStock: variant.physicalStock,
                        active: true,
                        isDemoData: true,
                    },
                });
            }
        }
        console.log(`Importacion ${source} lista: ${products.length} productos demo.`);
    }
    finally {
        await prisma.$disconnect();
    }
}
//# sourceMappingURL=import-utils.js.map