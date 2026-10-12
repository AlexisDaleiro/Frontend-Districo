import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { runtimeDatabaseUrl } from './database-url';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private operationsCheck?: { expires: number; result: Promise<boolean> };

  operationalSchemaReady() {
    if (!this.operationsCheck || this.operationsCheck.expires < Date.now()) {
      const result = this.$queryRaw<{ ready: boolean }[]>`SELECT EXISTS (
        SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20261012000200_operational_workspaces'
        AND finished_at IS NOT NULL AND rolled_back_at IS NULL
      ) AS ready`.then((rows) => rows[0]?.ready === true);
      this.operationsCheck = { expires: Date.now() + 60000, result };
      void result.catch(() => { this.operationsCheck = undefined; });
    }
    return this.operationsCheck.result;
  }
  constructor() {
    const url = runtimeDatabaseUrl(process.env.DATABASE_URL, Boolean(process.env.VERCEL));
    super(url ? { datasources: { db: { url } } } : {});
  }

  async onModuleInit() {
    // Prisma connects on the first query in a Vercel function. Anonymous
    // requests that do not query the database must not consume a pool slot.
    if (!process.env.VERCEL) await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
