import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { Prisma, PrismaClient } from '@prisma/client';
import { normalizeTechnicalSheet, sheetSourceKey, type ProductSheet } from '../src/catalog/products/technical-sheet';
import { databaseError, loadBackendEnv } from './script-env';

async function main() {
  const { values } = parseArgs({ options: { apply: { type: 'boolean', default: false }, 'project-ref': { type: 'string' } } });
  loadBackendEnv();
  const target = new URL(process.env.DATABASE_URL!);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) && (!values['project-ref'] || target.username !== `postgres.${values['project-ref']}`)) throw new Error('Indicar --project-ref del proyecto Supabase esperado.');
  const original = JSON.parse(readFileSync(resolve(__dirname, '../../web/public/data/fichas-tecnicas.json'), 'utf8')) as Record<string, Partial<ProductSheet>>;
  const sheets = new Map(Object.entries(original).map(([url, sheet]) => [sheetSourceKey(url), normalizeTechnicalSheet({ technical: sheet.technical ?? [], benefits: sheet.benefits ?? [] })]));
  const prisma = new PrismaClient();
  try {
    const products = await prisma.product.findMany({ where: { deletedAt: null, sourceUrl: { not: null }, technicalSheet: { equals: Prisma.DbNull }, technicalSheetRevision: 0 }, select: { id: true, sourceUrl: true } });
    const plan = products.flatMap((product) => {
      const sheet = sheets.get(sheetSourceKey(product.sourceUrl!));
      return sheet ? [{ ...product, sheet }] : [];
    });
    console.log(JSON.stringify({ sourceSheets: sheets.size, matchingProducts: plan.length, apply: values.apply }));
    if (!values.apply || !plan.length) return;
    const imported = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const product of plan) {
        // Never overwrite an edited sheet, including an intentionally empty one.
        const result = await tx.product.updateMany({ where: { id: product.id, sourceUrl: product.sourceUrl, deletedAt: null, technicalSheet: { equals: Prisma.DbNull }, technicalSheetRevision: 0 }, data: { technicalSheet: product.sheet as unknown as Prisma.InputJsonObject, technicalSheetRevision: 1 } });
        if (!result.count) continue;
        await tx.auditLog.create({ data: { action: 'PRODUCT_TECHNICAL_SHEET_IMPORTED', entityType: 'Product', entityId: product.id, metadata: { sourceUrl: product.sourceUrl, source: 'fichas-tecnicas.json', revision: 1 } } });
        count++;
      }
      return count;
    }, { timeout: 120000 });
    console.log(`Imported ${imported} existing technical sheets without overwriting edits.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error && error.message.startsWith('Indicar --project-ref') ? error.message : databaseError(error));
  process.exitCode = 1;
});
