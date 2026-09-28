import { readFile, stat } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { parseSnapshot } from './catalog/districo';
import { importCatalog } from './catalog/import';
import { databaseError, loadBackendEnv } from './script-env';

async function main() {
  const { values } = parseArgs({
    options: {
      input: { type: 'string' },
      apply: { type: 'boolean', default: false },
      help: { type: 'boolean' },
    },
  });
  if (values.help) {
    console.log('npm run catalog:import -- --input imports/catalogo.json [--apply]');
    console.log('El archivo validado identifica su origen: DISTRICO, RAICOR o MAGNIS.');
    console.log('Sin --apply valida el archivo sin conectarse ni escribir en la base.');
    return;
  }
  if (!values.input) throw new Error('Indicar --input con el archivo generado por catalog:scrape.');
  if ((await stat(values.input)).size > 25 * 1024 * 1024) throw new Error('El archivo supera 25 MB.');
  const snapshot = parseSnapshot(JSON.parse(await readFile(values.input, 'utf8')));
  console.log(`Archivo validado: ${snapshot.total} productos de ${snapshot.source}, captura ${snapshot.fetchedAt}.`);
  if (!values.apply) {
    console.log(
      'VISTA PREVIA: no se consulto la base. Se crearan solo identidades nuevas, inactivas y sin variantes, precios ni stock.',
    );
    console.log('Usar --apply despues de revisar el archivo y ejecutar las migraciones.');
    return;
  }
  loadBackendEnv();
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const result = await importCatalog(prisma, snapshot);
    console.log(`Creados: ${result.created}. Ya existentes, sin modificar: ${result.skipped}.`);
  } catch (error) {
    throw new Error(databaseError(error));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'No se pudo importar el catalogo.');
  process.exitCode = 1;
});
