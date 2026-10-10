import { PrismaClient } from '@prisma/client';
import { parseArgs } from 'node:util';
import { jobExamples } from '../src/jobs/job-examples';
import { databaseError, loadBackendEnv } from './script-env';

async function main() {
  const { values } = parseArgs({ options: { apply: { type: 'boolean', default: false }, 'project-ref': { type: 'string' } } });
  loadBackendEnv();
  const url = new URL(process.env.DATABASE_URL!);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && (!values['project-ref'] || url.username !== `postgres.${values['project-ref']}`)) throw new Error('Indicar --project-ref del proyecto Supabase esperado.');
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.jobOpening.findMany({ where: { id: { in: jobExamples.map((job) => job.id) } }, select: { id: true } });
    const missing = jobExamples.filter((job) => !existing.some((item) => item.id === job.id));
    console.log(JSON.stringify({ apply: values.apply, examplesToCreate: missing.length, existingPreserved: existing.length }));
    if (!values.apply) return;
    await prisma.$transaction(async (tx) => {
      for (const job of missing) {
        const created = await tx.jobOpening.createMany({ data: { ...job, published: new Date(job.published + 'T00:00:00Z') }, skipDuplicates: true });
        if (created.count) await tx.auditLog.create({ data: { action: 'JOB_EXAMPLE_SEEDED', entityType: 'JobOpening', entityId: job.id, metadata: { isExample: true, source: 'seed-job-examples' } } });
      }
    });
    console.log('Ofertas de ejemplo creadas sin sobrescribir registros existentes.');
  } finally { await prisma.$disconnect(); }
}
main().catch((error: unknown) => { console.error(error instanceof Error && error.message.startsWith('Indicar --project-ref') ? error.message : databaseError(error)); process.exitCode = 1; });
