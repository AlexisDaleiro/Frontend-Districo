import type { Prisma, PrismaClient } from '@prisma/client';
import { CatalogProduct, CatalogSnapshot, parseSnapshot } from './districo';
import { catalogConfig, CatalogSource } from './sources';
import { districoBrandFor } from './districo-brands';

export function productCreateData(
  item: CatalogProduct,
  fetchedAt: string,
  source: CatalogSource = 'DISTRICO',
): Prisma.ProductCreateInput {
  const { slugPrefix } = catalogConfig(source);
  const brand = districoBrandFor(item.externalId, source);
  return {
    name: item.name,
    slug: `${slugPrefix}-${item.externalId}`,
    shortDescription: item.shortDescription || null,
    description: item.description || null,
    source,
    sourceExternalId: item.externalId,
    sourceUrl: item.sourceUrl,
    sourceFetchedAt: new Date(fetchedAt),
    productType: 'OTHER',
    active: false,
    requiresMedicationPermission: true,
    ...(brand ? { brand: { connectOrCreate: { where: { slug: brand.slug }, create: { name: brand.name, slug: brand.slug } } } } : {}),
    categories: {
      create: item.categories.map((category) => ({
        category: {
          connectOrCreate: {
            where: { slug: `${slugPrefix}-category-${category.externalId}` },
            create: { name: category.name, slug: `${slugPrefix}-category-${category.externalId}` },
          },
        },
      })),
    },
    media: {
      create: [...new Map(item.images.map((image) => [image.url, image])).values()].map((image, index) => ({
        type: 'IMAGE',
        url: image.url,
        alt: image.alt,
        position: index,
        isPrimary: index === 0,
      })),
    },
  };
}

export async function importCatalog(prisma: PrismaClient, value: CatalogSnapshot) {
  const snapshot = parseSnapshot(value);
  const result = { created: 0, skipped: 0 };
  for (const item of snapshot.products) {
    const where = { source_sourceExternalId: { source: snapshot.source, sourceExternalId: item.externalId } };
    try {
      // One transaction per product keeps retries resumable without partial categories/media.
      const created = await prisma.$transaction(async (tx) => {
        if (await tx.product.findUnique({ where, select: { id: true } })) return false;
        await tx.product.create({ data: productCreateData(item, snapshot.fetchedAt, snapshot.source) });
        return true;
      });
      if (created) result.created++;
      else result.skipped++;
    } catch (error) {
      // A simultaneous import may have created the same source identity first.
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002' &&
        (await prisma.product.findUnique({ where, select: { id: true } }))
      )
        result.skipped++;
      else throw error;
    }
  }
  return result;
}
