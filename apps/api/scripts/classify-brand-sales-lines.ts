import { parseArgs } from 'node:util';
import { PrismaClient } from '@prisma/client';
import { brandSalesLines, planBrandSalesLines } from './catalog/brand-sales-lines';
import { databaseError, loadBackendEnv } from './script-env';

async function main() {
  const { values } = parseArgs({ options: { apply: { type: 'boolean', default: false }, 'project-ref': { type: 'string' } } });
  loadBackendEnv();
  const target = new URL(process.env.DATABASE_URL!);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) && (!values['project-ref'] || target.username !== `postgres.${values['project-ref']}`)) throw new Error('Indicar --project-ref del proyecto Supabase esperado.');
  const prisma = new PrismaClient();
  try {
    const brands = await prisma.brand.findMany({ where: { deletedAt: null }, select: { id: true, name: true, slug: true, salesLine: true, deletedAt: true } });
    const plan = planBrandSalesLines(brands);
    const known = new Set(brandSalesLines.map((entry) => entry.slug));
    console.log(JSON.stringify({ apply: values.apply, researched: brandSalesLines.length, pending: plan.map(({ brand, classification }) => ({ name: brand.name, line: classification.salesLine, basis: classification.basis })), preserved: brands.filter((brand) => brand.salesLine !== null).length, unmatched: brands.filter((brand) => !known.has(brand.slug)).map((brand) => brand.name) }));
    if (!values.apply || !plan.length) return;
    const count = await prisma.$transaction(async (tx) => {
      let saved = 0;
      for (const { brand, classification } of plan) {
        // Null-only guard preserves concurrent manual assignments and retired brands.
        const changed = await tx.brand.updateMany({ where: { id: brand.id, slug: brand.slug, salesLine: null, deletedAt: null }, data: { salesLine: classification.salesLine } });
        if (!changed.count) continue;
        await tx.auditLog.create({ data: { action: 'BRAND_SALES_LINE_CLASSIFIED', entityType: 'Brand', entityId: brand.id, metadata: { salesLine: classification.salesLine, basis: classification.basis, sources: classification.sources, note: classification.note, researchedAt: '2026-10-09' } } });
        saved++;
      }
      return saved;
    }, { timeout: 120000 });
    console.log(`Clasificadas ${count} marcas sin sobrescribir asignaciones existentes.`);
  } finally { await prisma.$disconnect(); }
}
main().catch((error: unknown) => {
  console.error(error instanceof Error && error.message.startsWith('Indicar --project-ref') ? error.message : databaseError(error));
  process.exitCode = 1;
});
