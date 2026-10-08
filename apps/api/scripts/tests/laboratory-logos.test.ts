import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { planLaboratoryLogos, type LaboratoryLogoAsset, type LaboratoryWithLogo } from '../catalog/laboratory-logo-plan';

const asset: LaboratoryLogoAsset = { name: 'Virbac', slug: 'virbac', pageUrl: 'https://uy.virbac.com/', sourceUrl: 'https://uy.virbac.com/logo.png', url: '/images/laboratories/virbac-0123456789ab.webp', sha256: 'a'.repeat(64) };
const laboratory: LaboratoryWithLogo = { id: 'lab', name: 'Virbac', slug: 'virbac', imageUrl: null, active: true, deletedAt: null };
assert.equal(planLaboratoryLogos([laboratory], [asset]).length, 1);
assert.equal(planLaboratoryLogos([{ ...laboratory, imageUrl: 'https://example.test/custom.webp' }], [asset]).length, 0);
assert.equal(planLaboratoryLogos([{ ...laboratory, active: false }], [asset]).length, 0);
assert.equal(planLaboratoryLogos([{ ...laboratory, deletedAt: new Date() }], [asset]).length, 0);
assert.equal(planLaboratoryLogos([{ ...laboratory, slug: 'laboratorio-ficticio' }], [asset]).length, 0);
assert.throws(() => planLaboratoryLogos([laboratory], [asset, asset]));
assert.throws(() => planLaboratoryLogos([laboratory], [{ ...asset, url: '/images/laboratories/../../secret' }]));
const manifest = JSON.parse(readFileSync(resolve(__dirname, '../catalog/laboratory-logo-assets.generated.json'), 'utf8')) as { assets: LaboratoryLogoAsset[] };
const resources = JSON.parse(readFileSync(resolve(__dirname, '../catalog/laboratory-logo-resources.json'), 'utf8')) as { slug: string }[];
assert.deepEqual(manifest.assets.map((item) => item.slug).sort(), resources.map((item) => item.slug).sort());
planLaboratoryLogos([], manifest.assets);
for (const item of manifest.assets) {
  const file = resolve(__dirname, '../../../web/public' + item.url);
  assert.ok(existsSync(file));
  assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'), item.sha256);
}
console.log('Laboratory logos: identity, preservation, manifest and asset checks passed.');
