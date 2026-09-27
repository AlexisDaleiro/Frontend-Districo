import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { scrapeDistrico } from './catalog/districo';

async function main() {
  const { values } = parseArgs({
    options: {
      output: { type: 'string' },
      'page-size': { type: 'string', default: '50' },
      'max-pages': { type: 'string', default: '100' },
      help: { type: 'boolean' },
    },
  });
  if (values.help) {
    console.log('npm run catalog:scrape -- --output imports/districo.json [--page-size 50] [--max-pages 100]');
    console.log('Descarga publica, sin base de datos. No reemplaza archivos existentes.');
    return;
  }
  const snapshot = await scrapeDistrico({
    pageSize: Number(values['page-size']),
    maxPages: Number(values['max-pages']),
    onPage: (page, count) => console.log(`Pagina ${page}: ${count} productos.`),
  });
  const output = resolve(values.output ?? `imports/districo-${Date.now()}.json`);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(snapshot, null, 2) + '\n', { flag: 'wx' });
  console.log(`${snapshot.total} productos guardados en ${output}. No se modifico la base de datos.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'No se pudo descargar el catalogo.');
  process.exitCode = 1;
});
