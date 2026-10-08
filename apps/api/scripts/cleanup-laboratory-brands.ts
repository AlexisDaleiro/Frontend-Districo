import { parseArgs } from 'node:util';
import { Prisma, PrismaClient } from '@prisma/client';
import { assertDemoTarget } from './catalog/demo-data';
import { planLaboratoryBrandCleanup } from './catalog/laboratory-brand-cleanup';
import { databaseError, loadBackendEnv } from './script-env';
import { runtimeDatabaseUrl } from '../src/prisma/database-url';

async function main() {
  const { values } = parseArgs({ options: { apply: { type: 'boolean', default: false }, 'project-ref': { type: 'string' } } });
  loadBackendEnv();
  assertDemoTarget(process.env, values['project-ref'] ?? '');
  const prisma = new PrismaClient({ datasources: { db: { url: runtimeDatabaseUrl(process.env.DATABASE_URL, true)! } } });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const brands = await tx.brand.findMany({
        where: { id: { startsWith: 'provider-brand-' }, active: true, deletedAt: null },
        select: { id: true, name: true, slug: true, imageUrl: true, products: { select: { id: true, laboratoryId: true } } },
      });
      const laboratories = await tx.laboratory.findMany({
        where: { active: true, deletedAt: null }, select: { id: true, name: true, slug: true },
      });
      const brandIds = brands.map((brand) => brand.id);
      const [conditions, rewards, recommendations] = await Promise.all([
        tx.promotionCondition.findMany({ where: { targetType: 'BRAND', targetId: { in: brandIds } }, select: { targetId: true } }),
        tx.promotionReward.findMany({ where: { targetType: 'BRAND', targetId: { in: brandIds } }, select: { targetId: true } }),
        tx.recommendationRule.findMany({ where: { OR: [
          { triggerType: 'BRAND', OR: [{ triggerId: { in: brandIds } }, { triggerIds: { hasSome: brandIds } }] },
          { targetType: 'BRAND', targetIds: { hasSome: brandIds } },
        ] }, select: { triggerType: true, triggerId: true, triggerIds: true, targetType: true, targetIds: true } }),
      ]);
      const plan = planLaboratoryBrandCleanup(brands, laboratories, [
        ...conditions.map((item) => item.targetId).filter((id): id is string => !!id),
        ...rewards.map((item) => item.targetId).filter((id): id is string => !!id),
        ...recommendations.flatMap((item) => [
          ...(item.triggerType === 'BRAND' ? [item.triggerId, ...item.triggerIds] : []),
          ...(item.targetType === 'BRAND' ? item.targetIds : []),
        ]),
      ]);
      if (values.apply) {
        for (const item of plan) {
          const cleared = await tx.product.updateMany({
            where: { id: { in: item.productIds }, brandId: item.brandId, laboratoryId: item.laboratoryId },
            data: { brandId: null },
          });
          if (cleared.count !== item.productIds.length) throw new Error(`Cambió la asociación de ${item.name}; se canceló la limpieza.`);
          const retired = await tx.brand.updateMany({
            where: { id: item.brandId, active: true, deletedAt: null, products: { none: {} } },
            data: { active: false, deletedAt: new Date(), slug: `deleted-${item.brandId}` },
          });
          if (retired.count !== 1) throw new Error(`Cambió la marca ${item.name}; se canceló la limpieza.`);
          await tx.auditLog.create({
            data: { action: 'DUPLICATE_LABORATORY_BRAND_RETIRED', entityType: 'Brand', entityId: item.brandId, metadata: { laboratoryId: item.laboratoryId, productIds: item.productIds } },
          });
        }
      }
      return plan.map(({ brandId, laboratoryId, name, productIds }) => ({ brandId, laboratoryId, name, products: productIds.length }));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 20000, timeout: 120000 });
    console.log(values.apply ? 'Marcas duplicadas retiradas:' : 'Vista previa, sin cambios:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    if (error instanceof Error && /^(Revisar la identidad|La marca |Cambió la )/.test(error.message)) throw error;
    throw new Error(databaseError(error));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'No se pudo limpiar las marcas duplicadas.');
  process.exitCode = 1;
});
