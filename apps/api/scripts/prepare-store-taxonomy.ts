import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { Prisma, PrismaClient } from '@prisma/client';
import { assertDemoTarget, DEMO_PRICE_LIST, DEMO_TAG } from './catalog/demo-data';
import { classifyProduct, DEMO_INFORMATION_TAG, legacyCategoryLinks, missingProductInformation, taxonomyCategories } from './catalog/store-taxonomy';
import { normalizedCategoryName } from '../src/catalog/categories/category-groups';
import { loadBackendEnv } from './script-env';

async function main() {
  const { values } = parseArgs({ options: { apply: { type: 'boolean', default: false }, 'project-ref': { type: 'string' } } });
  loadBackendEnv();
  assertDemoTarget(process.env, values['project-ref'] ?? '');
  const prisma = new PrismaClient();
  try {
    const summary = await prisma.$transaction(async (tx) => {
      const categories = await tx.category.findMany({ where: { deletedAt: null }, orderBy: { id: 'asc' } });
      const products = await tx.product.findMany({ where: { deletedAt: null }, include: { categories: { include: { category: true } }, variants: { where: { deletedAt: null }, include: { prices: { include: { priceList: true } } } } }, orderBy: { id: 'asc' } });
      const ids = new Map<string, string>();
      const reused = new Set<string>();
      const definitions = taxonomyCategories.map((definition) => {
        const existing = categories.find((category) => category.slug === `store-${definition.key}`) ??
          (definition.reuse ? categories.find((category) => normalizedCategoryName(category.name) === normalizedCategoryName(definition.reuse!)) : undefined) ??
          categories.find((category) => normalizedCategoryName(category.name) === normalizedCategoryName(definition.name) && category.parentId === (definition.parent ? ids.get(definition.parent) : null));
        if (existing) reused.add(existing.id);
        const id = existing?.id ?? `store-category-${definition.key}`;
        ids.set(definition.key, id);
        return { ...definition, id, existing };
      });
      const now = new Date();
      const retiredIds = categories.filter((category) => !reused.has(category.id) && !category.mergedIntoId).map((category) => category.id);
      const legacyLinks = legacyCategoryLinks(products, categories, new Set(retiredIds));
      const rows = products.map((product) => {
        const classification = classifyProduct(product);
        const information = missingProductInformation(product);
        const missingPrices = product.variants.filter((variant) => variant.active && !variant.prices.some((price) => price.priceList.active && price.validFrom <= now && (!price.validUntil || price.validUntil >= now)));
        return { product, classification, information, missingPrices };
      });
      const result = {
        products: products.length,
        classified: rows.filter((row) => !row.classification.pending).length,
        pendingSpecies: rows.filter((row) => row.classification.pending).map(({ product }) => ({ name: product.name, sourceUrl: product.sourceUrl })),
        categoriesCreated: definitions.filter((item) => !item.existing).length,
        categoriesRetired: retiredIds.length,
        legacyLinksAdded: legacyLinks.length,
        descriptionsCompleted: rows.filter((row) => row.information.description !== undefined).length,
        summariesCompleted: rows.filter((row) => row.information.shortDescription !== undefined).length,
        demoPricesCreated: rows.reduce((sum, row) => sum + row.missingPrices.length, 0),
        categoryChanges: definitions.filter((item) => !item.existing || item.existing.name !== item.name || item.existing.parentId !== (item.parent ? ids.get(item.parent) : null)).length,
        productLinksAdded: rows.reduce((sum, { product, classification }) => sum + classification.paths.filter((key) => !product.categories.some((link) => link.categoryId === ids.get(key))).length, 0),
      };
      const directory = resolve(__dirname, '../imports');
      mkdirSync(directory, { recursive: true });
      writeFileSync(resolve(directory, 'store-taxonomy-report.json'), JSON.stringify({ ...result, evidence: rows.map(({ product, classification }) => ({ id: product.id, name: product.name, sourceUrl: product.sourceUrl, sourceFetchedAt: product.sourceFetchedAt, paths: classification.paths, species: classification.species, pending: classification.pending, referenceUrl: 'referenceUrl' in classification ? classification.referenceUrl : undefined })) }, null, 2));
      if (!values.apply || ![result.categoriesRetired, result.categoryChanges, result.productLinksAdded, result.legacyLinksAdded, result.descriptionsCompleted, result.summariesCompleted, result.demoPricesCreated].some(Boolean)) return result;
      const backup = resolve(directory, `store-taxonomy-before-${now.toISOString().replace(/[:.]/g, '-')}.json`);
      writeFileSync(backup, JSON.stringify({ capturedAt: now, categories, products }, null, 2), { flag: 'wx' });
      console.log(`Respaldo: ${backup}`);
      for (const definition of definitions) {
        const parentId = definition.parent ? ids.get(definition.parent)! : null;
        const data = { name: definition.name, parentId, active: definition.existing?.active ?? true };
        if (definition.existing) {
          if (definition.existing.name !== data.name || definition.existing.parentId !== parentId) await tx.category.update({ where: { id: definition.id }, data });
        } else await tx.category.create({ data: { id: definition.id, slug: `store-${definition.key}`, ...data } });
      }
      // Retain legacy associations: saved URLs and category-based commercial rules keep their exact membership.
      if (retiredIds.length) await tx.category.updateMany({ where: { id: { in: retiredIds } }, data: { active: false, deletedAt: now } });
      const links = rows.flatMap(({ product, classification }) => classification.paths.map((key) => ({ productId: product.id, categoryId: ids.get(key)! })));
      await tx.productCategory.createMany({ data: [...links, ...legacyLinks], skipDuplicates: true });
      const priceList = await tx.priceList.findUnique({ where: { name: DEMO_PRICE_LIST.name } });
      if (!priceList?.active) throw new Error('Falta la lista mayorista activa; se revierte la operacion.');
      let priceIndex = 0;
      for (const { product, information, missingPrices } of rows) {
        const tags = new Set(product.tags);
        if (information.description || information.shortDescription) tags.add(DEMO_INFORMATION_TAG);
        if (missingPrices.length) tags.add(DEMO_TAG);
        if (information.description || information.shortDescription || missingPrices.length) {
          await tx.product.update({ where: { id: product.id }, data: { ...information, tags: [...tags] } });
        }
        for (const variant of missingPrices) {
          const amount = 450 + (priceIndex++ % 15) * 175;
          await tx.price.create({ data: { productVariantId: variant.id, priceListId: priceList.id, amount, currency: 'UYU', validFrom: now } });
          await tx.priceHistory.create({ data: { productVariantId: variant.id, newPrice: amount, currency: 'UYU' } });
          await tx.productVariant.update({ where: { id: variant.id }, data: {
            isDemoData: true,
            // Do not refill genuine sold-out variants or overwrite reservations.
            physicalStock: variant.physicalStock === 0 && variant.reservedStock === 0 && variant.id.startsWith('workbook-') ? 30 : undefined,
          } });
        }
      }
      await tx.auditLog.create({ data: { action: 'DEMO_STORE_TAXONOMY_PREPARED', entityType: 'Category', metadata: {
        products: result.products, classified: result.classified, pendingSpecies: result.pendingSpecies.length,
        demoPricesCreated: result.demoPricesCreated, retiredCategoryIds: retiredIds,
        definitions: definitions.map(({ key, id }) => ({ key, id })),
      } } });
      return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 20000, timeout: 120000 });
    console.log(JSON.stringify(summary, null, 2));
    console.log(values.apply ? 'Datos de demo y categorias preparados.' : 'Vista previa: no se modifico la base.');
  } finally { await prisma.$disconnect(); }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/g, '[conexion privada]') : 'No se pudo preparar el catalogo.');
  process.exitCode = 1;
});
