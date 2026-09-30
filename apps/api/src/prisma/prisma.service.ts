import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { runtimeDatabaseUrl } from './database-url';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
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
