import { performance } from 'node:perf_hooks';
import { PrismaClient, Role } from '@prisma/client';
import { AdminService } from '../src/admin/admin.service';
import { UsersRepository } from '../src/users/users.repository';
import { runtimeDatabaseUrl } from '../src/prisma/database-url';
import { accessSessionSelect } from '../src/auth/jwt.strategy';
import { databaseError, loadBackendEnv } from './script-env';

async function main() {
  loadBackendEnv();
  const url = runtimeDatabaseUrl(process.env.DATABASE_URL, Boolean(process.env.VERCEL))!;
  const prisma = new PrismaClient({ datasources: { db: { url } }, log: [{ emit: 'event', level: 'query' }] });
  let queries = 0, databaseMs = 0;
  prisma.$on('query', (event) => { queries++; databaseMs += event.duration; });
  async function measure(label: string, read: () => Promise<unknown>) {
    const before = queries, beforeMs = databaseMs, start = performance.now();
    const result = await read();
    console.log(JSON.stringify({ operation: label, ms: Math.round(performance.now() - start), queries: queries - before, databaseMs: databaseMs - beforeMs }));
    return result;
  }
  try {
    console.log(JSON.stringify({ mode: 'READ_ONLY', poolLimit: new URL(url).searchParams.get('connection_limit') ?? 'default' }));
    await measure('connect-and-select', () => prisma.$queryRaw`SELECT 1`);
    const account = await prisma.user.findFirst({ where: { role: Role.ADMIN, active: true }, select: { id: true, email: true } });
    if (!account) throw new Error('No hay administrador activo para medir lecturas.');
    const users = new UsersRepository(prisma as never);
    const admin = new AdminService(prisma as never, {} as never, {} as never, {} as never);
    const actor = { sub: account.id, email: account.email, role: Role.ADMIN, permissions: [] };
    const customer = await prisma.customerAccount.findFirst({ select: { id: true } });
    const session = await prisma.authSession.findFirst({ where: { userId: account.id, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } });
    for (let round = 1; round <= 3; round++) {
      await measure(`profile-${round}`, () => users.findById(account.id));
      await measure(`session-${round}`, () => prisma.authSession.findFirst({ where: { userId: account.id, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, lastSeenAt: true, mfaVerifiedAt: true } }));
      if (session) await measure(`access-joined-${round}`, () => prisma.authSession.findFirst({ relationLoadStrategy: 'join',
        where: { id: session.id, userId: account.id, revokedAt: null, expiresAt: { gt: new Date() } }, select: accessSessionSelect }));
      await measure(`customers-${round}`, () => admin.customersPage({ page: 1, limit: 20 }, actor));
      if (customer) await measure(`customer-detail-${round}`, () => admin.customerDetail(customer.id, actor));
    }
    await measure('concurrent-screen-reads', () => Promise.all([
      admin.customersPage({ page: 1, limit: 20 }, actor), admin.customerFilterOptions(actor), admin.dashboard(),
    ]));
  } catch (error) {
    throw new Error(databaseError(error));
  } finally { await prisma.$disconnect(); }
}

main().catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
