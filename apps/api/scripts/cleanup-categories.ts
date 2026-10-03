import { parseArgs } from 'node:util';
import { Prisma, PrismaClient } from '@prisma/client';
import { databaseError, loadBackendEnv } from './script-env';
import { planCategoryCleanup } from './category-cleanup-plan';
import { normalizedCategoryName } from '../src/catalog/categories/category-groups';

async function main() {
  const { values } = parseArgs({ options: { apply: { type: 'boolean', default: false } } });
  loadBackendEnv();
  const prisma = new PrismaClient();
  try {
    const [categories, brands, labs] = await Promise.all([
      prisma.category.findMany({ where: { deletedAt: null }, select: { id: true, name: true, slug: true, parentId: true } }),
      prisma.brand.findMany({ where: { deletedAt: null }, select: { name: true } }),
      prisma.laboratory.findMany({ where: { deletedAt: null }, select: { name: true } }),
    ]);
    const plan = planCategoryCleanup(categories, [...brands, ...labs].map((item) => item.name));
    const sources = [...plan.retire.map((item) => item.id), ...plan.merge.map((item) => item.fromId)];
    const links = await prisma.productCategory.findMany({ where: { categoryId: { in: sources } }, select: { categoryId: true, productId: true } });
    const children = categories.filter((item) => item.parentId && sources.includes(item.parentId));
    if (children.length) throw new Error('Hay subcategorías bajo categorías a retirar o fusionar. Revisarlas antes de aplicar.');
    const retiring = new Set(plan.retire.map((item) => item.id));
    const products = await prisma.product.findMany({
      where: { categories: { some: { categoryId: { in: [...retiring] } } } },
      select: { id: true, brand: { select: { name: true } }, laboratory: { select: { name: true } }, categories: { select: { categoryId: true } } },
    });
    const categoryById = new Map(categories.map((item) => [item.id, item]));
    for (const product of products) {
      if (!product.categories.some((link) => !retiring.has(link.categoryId))) {
        throw new Error(`El producto ${product.id} quedaría sin categoría.`);
      }
      for (const link of product.categories.filter((entry) => retiring.has(entry.categoryId))) {
        const name = normalizedCategoryName(categoryById.get(link.categoryId)!.name);
        if (name === 'laboratorios' && product.laboratory) continue;
        if (name === 'boheringer ingelheim' && normalizedCategoryName(product.laboratory?.name ?? '') === 'boehringer ingelheim') continue;
        if ([product.brand?.name, product.laboratory?.name].some((value) => value && normalizedCategoryName(value) === name)) continue;
        throw new Error(`La categoría ${link.categoryId} no coincide con la marca o laboratorio del producto ${product.id}.`);
      }
    }
    const summary = {
      retire: plan.retire.map((item) => ({ name: categoryById.get(item.id)?.name, reason: item.reason, products: links.filter((link) => link.categoryId === item.id).length })),
      merge: plan.merge.map((item) => ({ from: categoryById.get(item.fromId)?.name, into: categoryById.get(item.intoId)?.name, products: links.filter((link) => link.categoryId === item.fromId).length })),
    };
    console.log(JSON.stringify(summary, null, 2));
    if (!values.apply) {
      console.log('Vista previa: no se modificó la base. Usar --apply para confirmar esta limpieza.');
      return;
    }
    await prisma.$transaction(async (tx) => {
      const now = new Date();
      for (const item of plan.retire) {
        const productIds = links.filter((link) => link.categoryId === item.id).map((link) => link.productId);
        const deleted = await tx.productCategory.deleteMany({ where: { categoryId: item.id } });
        if (deleted.count !== productIds.length) throw new Error('Cambió la asociación de productos durante la limpieza.');
        await tx.category.update({ where: { id: item.id, deletedAt: null }, data: { active: false, deletedAt: now } });
        await tx.auditLog.create({ data: { action: 'CATEGORY_RETIRED', entityType: 'Category', entityId: item.id, metadata: { reason: item.reason, productIds } } });
      }
      const reassigned = plan.merge.flatMap((item) => links.filter((link) => link.categoryId === item.fromId).map((link) => ({ productId: link.productId, categoryId: item.intoId })));
      if (reassigned.length) await tx.productCategory.createMany({ data: reassigned, skipDuplicates: true });
      for (const item of plan.merge) {
        const productIds = links.filter((link) => link.categoryId === item.fromId).map((link) => link.productId);
        const deleted = await tx.productCategory.deleteMany({ where: { categoryId: item.fromId } });
        if (deleted.count !== productIds.length) throw new Error('Cambió la asociación de productos durante la limpieza.');
        await tx.category.update({ where: { id: item.fromId, deletedAt: null }, data: { active: false, deletedAt: now, mergedIntoId: item.intoId } });
        await tx.auditLog.create({ data: { action: 'CATEGORY_MERGED', entityType: 'Category', entityId: item.fromId, metadata: { intoId: item.intoId, productIds } } });
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 20000, timeout: 120000 });
    console.log(`Limpieza aplicada: ${plan.retire.length} categorías impropias retiradas y ${plan.merge.length} duplicados fusionados.`);
  } catch (error) {
    throw new Error(databaseError(error));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'No se pudo limpiar las categorías.');
  process.exitCode = 1;
});
