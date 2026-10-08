import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { PrismaClient } from '@prisma/client';
import { BannerStorageService } from '../src/banners/banner-storage.service';
import { assertDemoTarget } from './catalog/demo-data';
import { planLaboratoryLogos, type LaboratoryLogoAsset } from './catalog/laboratory-logo-plan';
import { databaseError, loadBackendEnv } from './script-env';

async function main() {
  const { values } = parseArgs({ options: { apply: { type: 'boolean', default: false }, 'project-ref': { type: 'string' } } });
  loadBackendEnv();
  const projectRef = values['project-ref'] ?? '';
  assertDemoTarget(process.env, projectRef);
  if (new URL(process.env.SUPABASE_URL ?? '').hostname !== `${projectRef}.supabase.co`) throw new Error('Storage must use the same demo project.');
  const { assets } = JSON.parse(readFileSync(resolve(__dirname, 'catalog/laboratory-logo-assets.generated.json'), 'utf8')) as { assets: LaboratoryLogoAsset[] };
  const prisma = new PrismaClient();
  const storage = new BannerStorageService({ get: (name: string) => process.env[name] } as never);
  const uploaded: string[] = [];
  let committed = false;
  try {
    const laboratories = await prisma.laboratory.findMany({ orderBy: { name: 'asc' } });
    const plan = planLaboratoryLogos(laboratories, assets);
    const prepared = plan.map(({ laboratory, asset }) => {
      const bytes = readFileSync(resolve(__dirname, '../../web/public' + asset.url));
      if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw new Error('Logo checksum mismatch.');
      return { laboratory, asset, bytes, path: `laboratories/${laboratory.id}/${randomUUID()}.webp` };
    });
    console.log(JSON.stringify({ mode: values.apply ? 'apply' : 'preview', logos: prepared.map(({ laboratory }) => laboratory.name), preserved: laboratories.length - prepared.length }));
    if (!values.apply || !prepared.length) return;
    for (const { path, bytes } of prepared) {
      uploaded.push(path);
      await storage.upload(path, bytes, 'image/webp');
    }
    // Conditional updates preserve logos uploaded by an administrator during the import.
    await prisma.$transaction(async (tx) => {
      for (const { laboratory, asset, path } of prepared) {
        const result = await tx.laboratory.updateMany({
          where: { id: laboratory.id, slug: laboratory.slug, active: true, deletedAt: null, imageUrl: laboratory.imageUrl },
          data: { imageUrl: storage.url(path) },
        });
        if (result.count !== 1) throw new Error('Laboratory changed during import.');
        await tx.auditLog.create({ data: {
          action: 'LABORATORY_LOGO_IMPORTED', entityType: 'Laboratory', entityId: laboratory.id,
          metadata: { sourceUrl: asset.sourceUrl, pageUrl: asset.pageUrl, sha256: asset.sha256, previousImageUrl: laboratory.imageUrl, imageUrl: storage.url(path) },
        } });
      }
    }, { timeout: 60000 });
    committed = true;
    console.log(`Stored ${prepared.length} laboratory logos in public Storage.`);
  } finally {
    if (!committed) for (const path of uploaded) await storage.remove(path);
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const safe = error instanceof Error && /^(Storage must|Logo checksum|Invalid laboratory|Laboratory changed|Storage de|Crea un bucket|No se pudo subir)/.test(error.message);
  console.error(safe ? (error as Error).message : databaseError(error));
  process.exitCode = 1;
});
