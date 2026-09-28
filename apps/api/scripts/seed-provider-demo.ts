import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { Prisma, PrismaClient } from '@prisma/client';
import { assertDemoTarget, DEMO_PRICE_LIST, DEMO_TAG } from './catalog/demo-data';
import {
  LAB_VERIFIED_AT,
  MANUFACTURER_REVIEW_TAG,
  planProviderDemo,
  PROVIDER_DEMO_TAG,
} from './catalog/provider-demo';
import { databaseError, loadBackendEnv } from './script-env';

async function prepare(tx: Prisma.TransactionClient, apply: boolean) {
  const products = await tx.product.findMany({
    where: { source: { in: ['RAICOR', 'MAGNIS'] } },
    include: { categories: { include: { category: true } }, variants: { select: { id: true } } },
    orderBy: [{ source: 'asc' }, { sourceExternalId: 'asc' }],
  });
  const plan = planProviderDemo(products);
  const counts: Record<string, number> = {};
  for (const { laboratory } of plan.pending) counts[laboratory.name] = (counts[laboratory.name] ?? 0) + 1;
  const summary = {
    productsPrepared: plan.pending.length,
    raicor: plan.pending.filter(({ product }) => product.source === 'RAICOR').length,
    magnis: plan.pending.filter(({ product }) => product.source === 'MAGNIS').length,
    productsUnchanged: plan.skipped,
    unresolved: plan.unresolved,
    manufacturerPending: plan.pending.filter(({ laboratory }) => laboratory.manufacturerPending).length,
    byLaboratory: counts,
  };
  if (plan.unresolved.length) {
    console.log(JSON.stringify(summary, null, 2));
    throw new Error('Laboratorios sin verificar; no se prepara ningun producto.');
  }
  if (!plan.pending.length) return summary;

  const brands = await tx.brand.findMany();
  const laboratories = await tx.laboratory.findMany();
  const existingPriceList = await tx.priceList.findFirst({
    where: { OR: [{ id: DEMO_PRICE_LIST.id }, { name: DEMO_PRICE_LIST.name }] },
  });
  if (existingPriceList && (existingPriceList.id !== DEMO_PRICE_LIST.id || !existingPriceList.active)) {
    throw new Error('Revisar la lista de precios existente antes de crear datos ficticios.');
  }
  const needed = [...new Map(plan.pending.map(({ laboratory }) => [laboratory.slug, laboratory])).values()];
  const brandIds = new Map<string, string>();
  const laboratoryIds = new Map<string, string>();
  const newBrands: Prisma.BrandCreateManyInput[] = [];
  const newLaboratories: Prisma.LaboratoryCreateManyInput[] = [];
  for (const { name, slug } of needed) {
    const brand = brands.find((entry) => entry.slug === slug);
    const laboratory = laboratories.find((entry) => entry.slug === slug);
    for (const entity of [brand, laboratory]) {
      if (entity && (!entity.active || entity.deletedAt || entity.name !== name)) {
        throw new Error(`Revisar la entidad existente ${slug}; no se sobrescribe ni reactiva.`);
      }
    }
    const brandId = brand?.id ?? `provider-brand-${slug}`;
    const laboratoryId = laboratory?.id ?? `provider-laboratory-${slug}`;
    brandIds.set(slug, brandId);
    laboratoryIds.set(slug, laboratoryId);
    if (!brand) newBrands.push({ id: brandId, name, slug });
    if (!laboratory) newLaboratories.push({ id: laboratoryId, name, slug });
  }
  for (const { product, laboratory } of plan.pending) {
    if (
      (product.brandId && product.brandId !== brandIds.get(laboratory.slug)) ||
      (product.laboratoryId && product.laboratoryId !== laboratoryIds.get(laboratory.slug))
    ) {
      throw new Error(`El producto ${product.id} tiene una asignacion manual; no se sobrescribe.`);
    }
  }
  if (!apply)
    return { ...summary, brandsCreated: newBrands.length, laboratoriesCreated: newLaboratories.length };

  const directory = resolve(__dirname, '../imports');
  mkdirSync(directory, { recursive: true });
  const backupPath = resolve(
    directory,
    `providers-before-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  );
  writeFileSync(
    backupPath,
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        products,
        brands,
        laboratories,
        existingPriceList,
        createdBrands: newBrands,
        createdLaboratories: newLaboratories,
        createdVariants: plan.pending.map(({ profile }) => profile.variantId),
        createdPrices: plan.pending.map(({ profile }) => profile.priceId),
      },
      null,
      2,
    ),
    { flag: 'wx' },
  );
  console.log(`Respaldo local: ${backupPath}`);

  if (newBrands.length) await tx.brand.createMany({ data: newBrands });
  if (newLaboratories.length) await tx.laboratory.createMany({ data: newLaboratories });
  if (!existingPriceList) await tx.priceList.create({ data: DEMO_PRICE_LIST });

  const variants: Prisma.ProductVariantCreateManyInput[] = [];
  const prices: Prisma.PriceCreateManyInput[] = [];
  const groups = new Map<
    string,
    {
      ids: string[];
      beforeBrandId: string | null;
      beforeLaboratoryId: string | null;
      data: Prisma.ProductUpdateManyMutationInput;
    }
  >();
  for (const { product, laboratory, profile } of plan.pending) {
    variants.push({
      id: profile.variantId,
      productId: product.id,
      sku: profile.sku,
      name: 'Presentacion de prueba',
      presentation: 'Unidad ficticia',
      unitOfMeasure: 'UNIT',
      saleMultiple: 1,
      minimumOrderQuantity: 1,
      physicalStock: profile.stock,
      reservedStock: 0,
      active: true,
      isDemoData: true,
    });
    prices.push({
      id: profile.priceId,
      productVariantId: profile.variantId,
      priceListId: DEMO_PRICE_LIST.id,
      amount: profile.price,
      currency: 'UYU',
      validFrom: new Date('2020-01-01T00:00:00Z'),
    });
    const tags = [
      ...new Set([
        ...product.tags,
        DEMO_TAG,
        PROVIDER_DEMO_TAG,
        ...(laboratory.manufacturerPending ? [MANUFACTURER_REVIEW_TAG] : []),
      ]),
    ];
    const data = {
      active: true,
      brandId: brandIds.get(laboratory.slug)!,
      laboratoryId: laboratoryIds.get(laboratory.slug)!,
      tags,
    };
    const key = JSON.stringify([product.brandId, product.laboratoryId, data]);
    const group = groups.get(key) ?? {
      ids: [] as string[],
      beforeBrandId: product.brandId,
      beforeLaboratoryId: product.laboratoryId,
      data,
    };
    group.ids.push(product.id);
    groups.set(key, group);
  }
  // Update only still-empty drafts; never reset an existing variant, price, reservation or permission.
  for (const group of groups.values()) {
    const changed = await tx.product.updateMany({
      where: {
        id: { in: group.ids },
        source: { in: ['RAICOR', 'MAGNIS'] },
        active: false,
        deletedAt: null,
        variants: { none: {} },
        brandId: group.beforeBrandId,
        laboratoryId: group.beforeLaboratoryId,
      },
      data: group.data,
    });
    if (changed.count !== group.ids.length) throw new Error('El catalogo cambio durante la preparacion.');
  }
  await tx.productVariant.createMany({ data: variants });
  await tx.price.createMany({ data: prices });
  await tx.auditLog.create({
    data: {
      action: 'PROVIDER_LOCAL_TEST_DATA_SEEDED',
      entityType: 'Catalog',
      metadata: {
        ...summary,
        tag: PROVIDER_DEMO_TAG,
        verifiedAt: LAB_VERIFIED_AT,
        productionReady: false,
        mappings: needed.map(({ name, slug, evidenceUrl }) => ({ name, slug, evidenceUrl })),
      },
    },
  });
  return { ...summary, brandsCreated: newBrands.length, laboratoriesCreated: newLaboratories.length };
}

async function main() {
  const { values } = parseArgs({
    options: { apply: { type: 'boolean', default: false }, 'project-ref': { type: 'string' } },
  });
  loadBackendEnv();
  assertDemoTarget(process.env, values['project-ref'] ?? '');
  const prisma = new PrismaClient();
  try {
    const result = await prisma.$transaction((tx) => prepare(tx, values.apply), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10000,
      timeout: 120000,
    });
    console.log(values.apply ? 'Datos ficticios de proveedores preparados:' : 'Vista previa, sin cambios:');
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const known =
    error instanceof Error &&
    /^(Laboratorio ambiguo|Laboratorios sin verificar|Revisar la |El producto |El catalogo cambio)/.test(
      error.message,
    );
  console.error(known ? (error as Error).message : databaseError(error));
  process.exitCode = 1;
});
