import { databaseError, loadBackendEnv } from './script-env';

async function main() {
  loadBackendEnv();
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pg_cron');
    await prisma.$queryRaw`SELECT cron.schedule('districo-payment-status', '* * * * *', 'SELECT public.refresh_all_customer_payment_statuses()')`;
    console.log('Revisión automática de pagos configurada cada minuto en Supabase.');
  } catch (error) {
    throw new Error(databaseError(error));
  } finally { await prisma.$disconnect(); }
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'No se pudo configurar el monitor.'); process.exitCode = 1; });
