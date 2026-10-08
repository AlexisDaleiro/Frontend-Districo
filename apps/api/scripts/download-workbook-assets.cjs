require('ts-node/register');
const { workbookAssetRequests, validateWorkbookCatalog } = require('./catalog/workbook-catalog');
const { mkdirSync, writeFileSync, readFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');
const { createHash } = require('node:crypto');
const sharp = require('sharp');

async function main() {
  validateWorkbookCatalog();
  const target = resolve(__dirname, '../../web/public/images/workbook-catalog');
  const manifestPath = resolve(__dirname, 'catalog/workbook-assets.generated.json');
  const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { assets: [] };
  const assets = [];
  mkdirSync(target, { recursive: true });
  for (const request of workbookAssetRequests) {
    if (!/^[a-z0-9-]+$/.test(request.key)) throw new Error('Invalid asset key');
    const processorVersion = request.trimBackground ? 3 : request.kind === 'logo' ? 2 : 1;
    const cached = previous.assets.find((asset) => asset.key === request.key && asset.sourceUrl === request.sourceUrl && asset.background === request.background && asset.trimBackground === request.trimBackground && (asset.processorVersion ?? 1) === processorVersion && asset.url);
    if (cached && existsSync(resolve(target, cached.url.split('/').at(-1)))) {
      assets.push(cached);
      continue;
    }
    try {
      const response = await fetch(request.sourceUrl, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.headers.get('content-type')?.startsWith('image/')) throw new Error('Not an image');
      const chunks = [];
      let length = 0;
      for await (const chunk of response.body) {
        length += chunk.length;
        if (length > 20 * 1024 * 1024) throw new Error('Image exceeds 20 MB');
        chunks.push(chunk);
      }
      const input = Buffer.concat(chunks);
      const metadata = await sharp(input, { limitInputPixels: 40000000 }).metadata();
      if (!metadata.width || !metadata.height) throw new Error('No image dimensions');
      const vector = metadata.format === 'svg';
      const minimum = request.kind === 'product' ? 500 : 100;
      if (!vector && Math.max(metadata.width, metadata.height) < minimum) throw new Error(`Resolution too low: ${metadata.width}x${metadata.height}`);
      let pipeline = sharp(input, { density: vector ? 300 : 72, limitInputPixels: 40000000 }).rotate();
      if (request.trimBackground) pipeline = pipeline.trim({ background: request.trimBackground, threshold: 10 });
      else if (request.kind === 'logo' && metadata.hasAlpha) pipeline = pipeline.trim({ background: '#00000000', threshold: 1 });
      pipeline = pipeline.resize({ width: request.kind === 'logo' ? 900 : 1600, height: request.kind === 'logo' ? 500 : 1600, fit: 'inside', withoutEnlargement: true });
      if (request.background) pipeline = pipeline.flatten({ background: request.background });
      const output = await pipeline.webp({ quality: 92, alphaQuality: 100 }).toBuffer();
      const dimensions = await sharp(output).metadata();
      const sha256 = createHash('sha256').update(output).digest('hex');
      const filename = `${request.key}-${sha256.slice(0, 12)}.webp`;
      writeFileSync(resolve(target, filename), output);
      assets.push({ ...request, processorVersion, url: `/images/workbook-catalog/${filename}`, originalWidth: metadata.width, originalHeight: metadata.height, vector, nativeSmallLogo: request.kind === 'logo' && !vector && metadata.width < 180, width: dimensions.width, height: dimensions.height, bytes: output.length, sha256 });
      console.log(`${request.key}: ${metadata.width}x${metadata.height} -> ${dimensions.width}x${dimensions.height}`);
    } catch (error) {
      assets.push({ ...request, error: error.message });
      console.log(`${request.key}: pending (${error.message})`);
    }
  }
  writeFileSync(manifestPath, JSON.stringify({ capturedAt: new Date().toISOString(), assets }, null, 2) + '\n');
  console.log(`Verified: ${assets.filter((a) => a.url).length}; pending: ${assets.filter((a) => a.error).length}`);
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
