import { parseArgs } from 'node:util';
import { PrismaClient } from '@prisma/client';
import { inferPetStage, petCategoryIds, petFoodCategoryIds, petStages } from '../src/catalog/attributes/pet-stage';
import { databaseError, loadBackendEnv } from './script-env';

async function main() {
  const { values } = parseArgs({ args: process.argv.slice(2), options: { apply: { type: 'boolean', default: false }, 'project-ref': { type: 'string' } } });
  loadBackendEnv();
  const target = new URL(process.env.DATABASE_URL!);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) && (!values['project-ref'] || target.username !== `postgres.${values['project-ref']}`)) throw new Error('Indicar --project-ref del proyecto Supabase esperado.');
  const prisma = new PrismaClient();
  try {
    const categories = await prisma.category.findMany({ where: { deletedAt: null }, select: { id: true, name: true, parentId: true } });
    const ids = petCategoryIds(categories);
    const foodIds = petFoodCategoryIds(categories);
    const products = await prisma.product.findMany({
      where: { deletedAt: null, OR: [
        { productType: 'FOOD', categories: { some: { categoryId: { in: [...ids] } } } },
        { productType: 'OTHER', categories: { some: { categoryId: { in: [...foodIds] } } } },
      ] },
      select: { id: true, name: true, updatedAt: true, productType: true, attributes: { include: { attributeValue: { include: { attribute: true } } } } },
    });
    const plan = products.filter((product) => !product.attributes.some((item) => item.attributeValue.attribute.slug === 'etapa')).flatMap((product) => {
      const stage = inferPetStage(product.name);
      return stage ? [{ id: product.id, name: product.name, stage }] : [];
    });
    const typeCorrections = products.filter((product) => product.productType === 'OTHER');
    console.log(JSON.stringify({ apply: values.apply, petFoods: products.length, typeCorrections: typeCorrections.length, assignments: plan.length, unresolved: products.filter((product) => !inferPetStage(product.name) && !product.attributes.some((item) => item.attributeValue.attribute.slug === 'etapa')).length, stages: petStages.map((stage) => ({ ...stage, count: plan.filter((product) => product.stage === stage.slug).length })) }));
    if (!values.apply) return;
    const assigned = await prisma.$transaction(async (tx) => {
      const attribute = await tx.attributeDefinition.upsert({ where: { slug: 'etapa' }, create: { name: 'Etapa', slug: 'etapa', type: 'SELECT' }, update: {} });
      if (!attribute.active || attribute.type !== 'SELECT') throw new Error('El atributo Etapa existente requiere revision manual.');
      const stageValues = await Promise.all(petStages.map((stage) => tx.attributeValue.upsert({ where: { attributeId_slug: { attributeId: attribute.id, slug: stage.slug } }, create: { attributeId: attribute.id, ...stage }, update: {} })));
      if (typeCorrections.length) {
        const corrected = await tx.product.updateManyAndReturn({
          where: { deletedAt: null, productType: 'OTHER', OR: typeCorrections.map(({ id, name, updatedAt }) => ({ id, name, updatedAt })), categories: { some: { categoryId: { in: [...foodIds] } } } },
          data: { productType: 'FOOD' }, select: { id: true },
        });
        await tx.auditLog.createMany({ data: corrected.map((product) => ({ action: 'PRODUCT_PET_FOOD_TYPE_CORRECTED', entityType: 'Product', entityId: product.id, metadata: { previousType: 'OTHER', productType: 'FOOD', source: 'existing-pet-food-category' } })) });
      }
      let count = 0;
      for (const stage of stageValues) {
        const candidates = plan.filter((product) => product.stage === stage.slug);
        if (!candidates.length) continue;
        // Claim only unclassified products; the serializable transaction protects concurrent edits.
        const claimed = await tx.product.updateManyAndReturn({ where: { OR: candidates.map(({ id, name }) => ({ id, name })), deletedAt: null, productType: 'FOOD', attributes: { none: { attributeValue: { attributeId: attribute.id } } } }, data: { updatedAt: new Date() }, select: { id: true } });
        if (!claimed.length) continue;
        await tx.productAttributeValue.createMany({ data: claimed.map((product) => ({ productId: product.id, attributeValueId: stage.id })) });
        await tx.auditLog.createMany({ data: claimed.map((product) => ({ action: 'PRODUCT_PET_STAGE_ASSIGNED', entityType: 'Product', entityId: product.id, metadata: { stage: stage.slug, source: 'explicit-product-name' } })) });
        count += claimed.length;
      }
      return count;
    }, { timeout: 120000, isolationLevel: 'Serializable' });
    console.log(`Assigned ${assigned} stages without overwriting existing attributes or categories.`);
  } finally { await prisma.$disconnect(); }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error && /^(Indicar --project-ref|El atributo Etapa)/.test(error.message) ? error.message : databaseError(error));
  process.exitCode = 1;
});
