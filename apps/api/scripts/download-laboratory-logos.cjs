const { mkdirSync, readFileSync, writeFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');
const { createHash } = require('node:crypto');
const sharp = require('sharp');
const resources = require('./catalog/laboratory-logo-resources.json');
const destination = resolve(__dirname, '../../web/public/images/laboratories');
const manifestPath = resolve(__dirname, 'catalog/laboratory-logo-assets.generated.json');

async function main() {
  const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')).assets : [];
  const assets = [];
  mkdirSync(destination, { recursive: true });
  for (const resource of resources) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(resource.slug) || new URL(resource.sourceUrl).protocol !== 'https:') throw new Error('Invalid logo resource');
    const cached = previous.find((asset) => asset.slug === resource.slug && asset.sourceUrl === resource.sourceUrl && asset.background === resource.background && asset.trim === resource.trim && asset.url);
    if (cached && existsSync(resolve(destination, cached.url.split('/').at(-1)))) {
      assets.push(cached);
      console.log(`${resource.name}: cached`);
      continue;
    }
    const response = await fetch(resource.sourceUrl, { signal: AbortSignal.timeout(30000) });
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`${resource.name}: invalid image response (${response.status})`);
    const parts = [];
    let length = 0;
    for await (const part of response.body) {
      length += part.length;
      if (length > 10_000_000) throw new Error(`${resource.name}: exceeds 10 MB`);
      parts.push(part);
    }
    const original = Buffer.concat(parts);
    const input = await sharp(original, { limitInputPixels: 40_000_000 }).metadata();
    if (!input.width || !input.height || (input.format !== 'svg' && Math.max(input.width, input.height) < 100)) throw new Error(`${resource.name}: inadequate resolution`);
    const density = input.format === 'svg' ? Math.max(72, Math.ceil(Math.min(900 / input.width, 450 / input.height) * 72)) : 72;
    let pipeline = sharp(original, { density, limitInputPixels: 40_000_000 });
    if (resource.trim) pipeline = pipeline.trim({ threshold: 10 });
    pipeline = pipeline.resize({ width: 900, height: 450, fit: 'inside', withoutEnlargement: input.format !== 'svg' });
    if (resource.background) pipeline = pipeline.flatten({ background: resource.background });
    const bytes = await pipeline.webp({ quality: 95, alphaQuality: 100 }).toBuffer();
    const output = await sharp(bytes).metadata();
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const filename = `${resource.slug}-${sha256.slice(0, 12)}.webp`;
    writeFileSync(resolve(destination, filename), bytes);
    assets.push({ ...resource, url: `/images/laboratories/${filename}`, sha256, originalWidth: input.width, originalHeight: input.height, width: output.width, height: output.height, bytes: bytes.length });
    console.log(`${resource.name}: ${output.width}x${output.height}, ${bytes.length} bytes`);
  }
  writeFileSync(manifestPath, JSON.stringify({ verifiedAt: new Date().toISOString(), assets }, null, 2) + '\n');
  console.log(`Verified ${assets.length} laboratory logos.`);
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
