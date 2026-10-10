import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { JobOpening, Role } from '@prisma/client';
import { defaultStaffAccess, staffFeatureForPath } from '../../src/common/staff-role-access';
import { JobListQueryDto, SaveJobDto } from '../../src/jobs/dto/save-job.dto';
import { jobExamples } from '../../src/jobs/job-examples';
import { jobListWhere, jobPublicWhere, JobsService, presentJob } from '../../src/jobs/jobs.service';
import { PrismaService } from '../../src/prisma/prisma.service';

const example = jobExamples[0];
const job: JobOpening = { ...example, published: new Date(example.published + 'T00:00:00Z'), createdAt: new Date(), updatedAt: new Date(), deletedAt: null };

test('job table is private to the backend and the protection migration is additive and atomic', () => {
  const sql = readFileSync(resolve(__dirname, '../../prisma/migrations/20261010001000_job_openings_rls/migration.sql'), 'utf8');
  assert.match(sql, /^BEGIN;/);
  assert.match(sql.trim(), /COMMIT;$/);
  assert.ok(sql.includes('ALTER TABLE "JobOpening" ENABLE ROW LEVEL SECURITY;'));
  for (const role of ['PUBLIC', 'anon', 'authenticated']) {
    assert.ok(sql.includes(`REVOKE ALL PRIVILEGES ON TABLE "JobOpening" FROM ${role};`));
  }
  assert.ok(!sql.includes('DROP TABLE') && !sql.includes('CREATE POLICY'));
});

test('public jobs exclude inactive/deleted/future jobs and use the local date', () => {
  assert.deepEqual(jobPublicWhere(new Date('2026-10-10T01:00:00Z')), { active: true, deletedAt: null, published: { lte: new Date('2026-10-09T00:00:00Z') } });
  const view = presentJob(job);
  assert.equal(view.published, '2026-10-09');
  assert.equal('deletedAt' in view, false);
});

test('admin filters exclude removed records and search title/area/location', () => {
  const where = jobListWhere(Object.assign(new JobListQueryDto(), { search: 'Ventas', status: 'inactive' }));
  assert.equal(where.active, false);
  assert.equal(where.deletedAt, null);
  assert.equal(where.OR?.length, 3);
});

test('job permissions are independent, deny other default roles, and map every write route', () => {
  for (const path of ['/api/admin/jobs', '/api/admin/jobs/example?ignored=true']) assert.equal(staffFeatureForPath(path), 'ofertas-laborales');
  assert.deepEqual(defaultStaffAccess(Role.ADMIN, 'ofertas-laborales'), { canView: true, canEdit: true });
  for (const role of [Role.CLIENT, Role.SALES, Role.CATALOG, Role.FINANCE, Role.CUSTOM]) assert.deepEqual(defaultStaffAccess(role, 'ofertas-laborales'), { canView: false, canEdit: false });
});

test('DTO validates required content, real dates, typed flags and safe email addresses', async () => {
  const { id: _id, ...draft } = example;
  assert.equal((await validate(plainToInstance(SaveJobDto, draft))).length, 0);
  for (const patch of [{ title: ' ' }, { requirements: [] }, { requirements: [' '] }, { benefits: [null] }, { published: '2026-02-30' }, { published: '2026-10-09T23:00:00Z' }, { active: 'true' }, { contactEmail: 'javascript:alert(1)' }, { area: null }]) {
    assert.ok((await validate(plainToInstance(SaveJobDto, { ...draft, ...patch }))).length > 0, JSON.stringify(patch));
  }
  assert.equal((await validate(plainToInstance(JobListQueryDto, { page: '2', limit: '10' }))).length, 0);
  for (const patch of [{ page: '0' }, { limit: '101' }, { status: 'unknown' }]) assert.ok((await validate(plainToInstance(JobListQueryDto, patch))).length > 0);
});

test('pagination/count apply the same predicate before fetching results', async () => {
  const calls: { find?: unknown; count?: unknown } = {};
  const prisma = {
    jobOpening: { findMany: async (args: unknown) => { calls.find = args; return [job]; }, count: async (args: unknown) => { calls.count = args; return 8; } },
    $transaction: (requests: Promise<unknown>[]) => Promise.all(requests),
  };
  const result = await new JobsService(prisma as unknown as PrismaService).adminList(Object.assign(new JobListQueryDto(), { page: 2, limit: 3, status: 'inactive' }));
  assert.deepEqual(result.meta, { page: 2, limit: 3, total: 8 });
  assert.equal((calls.find as { skip: number }).skip, 3);
  assert.equal((calls.find as { take: number }).take, 3);
  assert.deepEqual((calls.find as { where: unknown }).where, (calls.count as { where: unknown }).where);
});

test('create/edit/delete preserve history and never update removed jobs', async () => {
  let stored: JobOpening | null = null;
  const audit: { action: string; userId: string; metadata: { previous: unknown } }[] = [];
  const tx = {
    jobOpening: {
      findFirst: async () => stored && !stored.deletedAt ? stored : null,
      create: async ({ data }: { data: Partial<JobOpening> }) => (stored = { ...job, ...data }),
      update: async ({ data }: { data: Partial<JobOpening> }) => (stored = { ...stored!, ...data }),
    },
    auditLog: { create: async ({ data }: { data: typeof audit[number] }) => { audit.push(data); } },
  };
  const prisma = { $transaction: (work: (client: typeof tx) => Promise<unknown>) => work(tx) };
  const service = new JobsService(prisma as unknown as PrismaService);
  const { id: _id, ...dto } = example;
  const created = await service.save(dto, 'admin');
  assert.equal(created.title, example.title);
  await service.save({ ...dto, title: 'Nueva oferta', active: false }, 'admin', created.id);
  assert.equal(audit[1].metadata.previous && (audit[1].metadata.previous as { title: string }).title, example.title);
  await service.remove(created.id, 'admin');
  assert.deepEqual(audit.map((entry) => entry.action), ['JOB_OPENING_CREATED', 'JOB_OPENING_UPDATED', 'JOB_OPENING_DELETED']);
  assert.ok(audit.every((entry) => entry.userId === 'admin'));
  await assert.rejects(service.save(dto, 'admin', created.id), /no encontrada/);
  await assert.rejects(service.remove(created.id, 'admin'), /no encontrada/);
});
