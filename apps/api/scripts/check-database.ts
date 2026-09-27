import { databaseError, loadBackendEnv } from './script-env';

async function main() {
  loadBackendEnv();
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const [tables] = await prisma.$queryRaw<{ product_table: string | null }[]>`
      SELECT to_regclass(format('%I.%I', current_schema(), 'Product'))::text AS product_table
    `;
    console.log('Conexion PostgreSQL correcta (consulta de solo lectura).');
    console.log(
      tables.product_table
        ? 'La tabla Product existe.'
        : 'La tabla Product todavia no existe. Ejecutar db:deploy en una base vacia.',
    );
  } catch (error) {
    throw new Error(databaseError(error));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'No se pudo verificar la conexion.');
  process.exitCode = 1;
});
