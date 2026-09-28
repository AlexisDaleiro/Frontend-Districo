import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { scrapeCatalog } from './catalog/districo';
import { parseCatalogSource } from './catalog/sources';

async function main() {
  const { values } = parseArgs({
    options: {
      source: { type: 'string', default: 'DISTRICO' },
      output: { type: 'string' },
      'page-size': { type: 'string', default: '50' },
      'max-pages': { type: 'string', default: '100' },
      'allow-unavailable-robots': { type: 'boolean', default: false },
      help: { type: 'boolean' },
    },
  });
  if (values.help) {
    console.log('npm run catalog:scrape -- --source DISTRICO|RAICOR|MAGNIS --output imports/catalogo.json');
    console.log('Opcionales: --page-size 50 --max-pages 100. Sin --source conserva DISTRICO.');
    console.log('--allow-unavailable-robots permite consultas publicas ante 403/404/410 SOLO en robots.txt (RFC 9309).');
    console.log('Descarga publica, sin base de datos. No reemplaza archivos existentes.');
    return;
  }
  const source = parseCatalogSource(values.source);
  const snapshot = await scrapeCatalog(source, {
    pageSize: Number(values['page-size']),
    maxPages: Number(values['max-pages']),
    allowUnavailableRobots: values['allow-unavailable-robots'],
    onWarning: (message) => console.warn(message),
    onPage: (page, count) => console.log(`${source}, pagina ${page}: ${count} productos.`),
  });
  const output = resolve(values.output ?? `imports/${source.toLowerCase()}-${Date.now()}.json`);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(snapshot, null, 2) + '\n', { flag: 'wx' });
  console.log(`${snapshot.total} productos guardados en ${output}. No se modifico la base de datos.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'No se pudo descargar el catalogo.');
  process.exitCode = 1;
});
