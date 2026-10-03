import { parseArgs } from 'node:util';
import { Prisma, PrismaClient } from '@prisma/client';
import { databaseError, loadBackendEnv } from './script-env';
import { CategoryNestingError, planCategoryNesting } from './category-nesting-plan';
import { normalizedCategoryName } from '../src/catalog/categories/category-groups';
import { slugify } from '../src/common/utils/slugify';

async function main() {
  const { values } = parseArgs({ options: { apply: { type: 'boolean', default: false } } });
  loadBackendEnv();
  const prisma = new PrismaClient();
  try {
    const summary = await prisma.$transaction(async (tx) => {
      const categories = await tx.category.findMany({
        where: { deletedAt: null }, select: { id: true, name: true, parentId: true },
      });
      const sourceNames = new Set(['Alimento para mascotas', 'Perros', 'Gatos', 'Alimento para perro', 'Alimento para gato'].map(normalizedCategoryName));
      const sourceIds = categories.filter((item) => sourceNames.has(normalizedCategoryName(item.name))).map((item) => item.id);
      const links = await tx.productCategory.findMany({
        where: { categoryId: { in: sourceIds } }, select: { productId: true, categoryId: true },
      });
      const plan = planCategoryNesting(categories, links);
      const summary = {
        create: plan.create.map((item) => `${item.parentName ?? 'Raíz'} > ${item.name}`),
        move: plan.move.map((item) => `${item.parentName} > ${item.name}`),
        assignDogFood: plan.assign.filter((item) => item.categoryName === 'Alimento para perro').length,
        assignCatFood: plan.assign.filter((item) => item.categoryName === 'Alimento para gato').length,
        dogProducts: plan.dogCount,
        catProducts: plan.catCount,
      };
      if (!values.apply) return summary;

      const byName = new Map(categories.map((item) => [normalizedCategoryName(item.name), item.id]));
      const categoryId = (name: string) => {
        const id = byName.get(normalizedCategoryName(name));
        if (!id) throw new CategoryNestingError(`Falta la categoría ${name}.`);
        return id;
      };
      const audit: Prisma.AuditLogCreateManyInput[] = [];
      for (const item of plan.create) {
        const slug = slugify(item.name);
        if (await tx.category.findUnique({ where: { slug }, select: { id: true } })) {
          throw new CategoryNestingError(`El identificador ${slug} ya está reservado por otra categoría.`);
        }
        const category = await tx.category.create({ data: {
          name: item.name, slug, active: true,
          parentId: item.parentName ? categoryId(item.parentName) : null,
        } });
        byName.set(normalizedCategoryName(item.name), category.id);
        audit.push({ action: 'CATEGORY_CREATED', entityType: 'Category', entityId: category.id, metadata: { parentName: item.parentName } });
      }
      for (const item of plan.move) {
        const parentId = categoryId(item.parentName);
        const updated = await tx.category.updateMany({
          where: { id: item.id, parentId: item.previousParentId, deletedAt: null },
          data: { parentId },
        });
        if (updated.count !== 1) throw new CategoryNestingError(`La categoría ${item.name} cambió durante la operación.`);
        audit.push({ action: 'CATEGORY_NESTED', entityType: 'Category', entityId: item.id,
          metadata: { fromParentId: item.previousParentId, toParentId: parentId } });
      }
      if (plan.assign.length) {
        const data = plan.assign.map((item) => ({ productId: item.productId, categoryId: categoryId(item.categoryName) }));
        const created = await tx.productCategory.createMany({ data, skipDuplicates: true });
        if (created.count !== data.length) throw new CategoryNestingError('Las asociaciones de alimento cambiaron durante la operación.');
        for (const name of ['Alimento para perro', 'Alimento para gato']) {
          audit.push({ action: 'CATEGORY_PRODUCTS_ASSIGNED', entityType: 'Category', entityId: categoryId(name),
            metadata: { productIds: plan.assign.filter((item) => item.categoryName === name).map((item) => item.productId) } });
        }
      }
      if (audit.length) await tx.auditLog.createMany({ data: audit });
      return summary;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 20000, timeout: 120000 });
    console.log(JSON.stringify(summary, null, 2));
    console.log(values.apply ? 'Jerarquía aplicada.' : 'Vista previa: no se modificó la base. Usar --apply para confirmar.');
  } catch (error) {
    throw new Error(error instanceof CategoryNestingError ? error.message : databaseError(error));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'No se pudo anidar las categorías.');
  process.exitCode = 1;
});
