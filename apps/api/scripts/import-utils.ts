import { PrismaClient, ProductSource, ProductType, UnitOfMeasure } from '@prisma/client';
import { slugify } from '../src/common/utils/slugify';

export interface DemoImportVariant {
  sku: string;
  ean?: string;
  name: string;
  presentation?: string;
  saleMultiple: number;
  minimumOrderQuantity: number;
  physicalStock: number;
}

export interface DemoImportProduct {
  name: string;
  shortDescription: string;
  productType: ProductType;
  categoryName: string;
  brandName?: string;
  laboratoryName?: string;
  requiresMedicationPermission?: boolean;
  variants: DemoImportVariant[];
  imageUrl?: string;
}

export async function importDemoProducts(source: ProductSource, products: DemoImportProduct[]) {
  const prisma = new PrismaClient();
  try {
    for (const item of products) {
      const category = await prisma.category.upsert({
        where: { slug: slugify(item.categoryName) },
        create: { name: item.categoryName, slug: slugify(item.categoryName) },
        update: { active: true },
      });

      const brand = item.brandName
        ? await prisma.brand.upsert({
            where: { slug: slugify(item.brandName) },
            create: { name: item.brandName, slug: slugify(item.brandName) },
            update: { active: true },
          })
        : null;

      const laboratory = item.laboratoryName
        ? await prisma.laboratory.upsert({
            where: { slug: slugify(item.laboratoryName) },
            create: { name: item.laboratoryName, slug: slugify(item.laboratoryName) },
            update: { active: true },
          })
        : null;

      const product = await prisma.product.upsert({
        where: { slug: slugify(item.name) },
        create: {
          name: item.name,
          slug: slugify(item.name),
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
            unitOfMeasure: UnitOfMeasure.UNIT,
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
  } finally {
    await prisma.$disconnect();
  }
}
