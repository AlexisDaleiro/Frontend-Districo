import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../src/prisma/prisma.service';
import { SalespeopleService } from '../../src/admin/salespeople.service';

test('seller profiles belong only to internal SALES users and keep email on the user', async () => {
  let role: Role = Role.CLIENT;
  let profile: { id: string; userId: string; name: string; phone: string } | null = null;
  const actions: string[] = [];
  const tx = {
    user: { findUnique: async () => ({ role, customerAccountId: null, email: 'seller@example.test' }) },
    salesperson: {
      findUnique: async () => profile,
      upsert: async ({ create, update }: { create: { userId: string; name: string; phone: string }; update: { name: string; phone: string } }) => {
        profile = profile ? { ...profile, ...update } : { id: 'profile-1', ...create };
        return profile;
      },
    },
    auditLog: { create: async ({ data }: { data: { action: string } }) => { actions.push(data.action); } },
  };
  const prisma = { $transaction: async (action: (client: typeof tx) => Promise<unknown>) => action(tx) } as unknown as PrismaService;
  const service = new SalespeopleService(prisma);
  await assert.rejects(() => service.save('seller-1', { name: 'Persona', phone: '099123456' }, 'admin-1'), NotFoundException);
  role = Role.SALES;
  await assert.rejects(() => service.save('seller-1', { name: 'Persona', phone: '........' }, 'admin-1'), BadRequestException);
  assert.deepEqual(await service.save('seller-1', { name: ' Persona Uno ', phone: ' 099 123 456 ' }, 'admin-1'),
    { id: 'seller-1', email: 'seller@example.test', profile: { id: 'profile-1', name: 'Persona Uno', phone: '099 123 456' } });
  await service.save('seller-1', { name: 'Persona Uno', phone: '098 123 456' }, 'admin-1');
  assert.deepEqual(actions, ['SALESPERSON_CREATED', 'SALESPERSON_UPDATED']);
});

test('assignment is exclusive, audited, and can be removed only by its current seller', async () => {
  let active = false;
  let profile: { id: string; name: string } | null = null;
  let owner: string | null = 'previous-profile';
  let conflict = false;
  const actions: string[] = [];
  const tx = {
    user: { findUnique: async () => ({ role: Role.SALES, active, emailVerified: true, customerAccountId: null, salesperson: profile }) },
    customerAccount: {
      findUnique: async () => ({ id: 'customer-1', businessName: 'Comercio', salespersonId: owner }),
      updateMany: async ({ where, data }: { where: { salespersonId: string | null }; data: { salespersonId: string | null } }) => {
        if (conflict || owner !== where.salespersonId) return { count: 0 };
        owner = data.salespersonId;
        return { count: 1 };
      },
    },
    auditLog: { create: async ({ data }: { data: { action: string } }) => { actions.push(data.action); } },
  };
  const prisma = { $transaction: async (action: (client: typeof tx) => Promise<unknown>) => action(tx) } as unknown as PrismaService;
  const service = new SalespeopleService(prisma);
  await assert.rejects(() => service.assign('seller-1', 'customer-1', 'admin-1'), BadRequestException);
  active = true;
  await assert.rejects(() => service.assign('seller-1', 'customer-1', 'admin-1'), BadRequestException);
  profile = { id: 'profile-1', name: 'Persona Uno' };
  conflict = true;
  await assert.rejects(() => service.assign('seller-1', 'customer-1', 'admin-1'), ConflictException);
  conflict = false;
  assert.deepEqual(await service.assign('seller-1', 'customer-1', 'admin-1'), { customerId: 'customer-1', salespersonId: 'profile-1' });
  assert.equal(owner, 'profile-1');
  assert.deepEqual(actions, ['CUSTOMER_SALESPERSON_ASSIGNED']);
  await service.unassign('seller-1', 'customer-1', 'admin-1');
  assert.equal(owner, null);
  await assert.rejects(() => service.unassign('seller-1', 'customer-1', 'admin-1'), ConflictException);
  assert.deepEqual(actions, ['CUSTOMER_SALESPERSON_ASSIGNED', 'CUSTOMER_SALESPERSON_REMOVED']);
});

test('migration adds seller ownership without exposing the profile through direct SQL', () => {
  const migration = readFileSync(resolve(__dirname, '../../prisma/migrations/202610030006_salespeople/migration.sql'), 'utf8');
  assert.match(migration, /CREATE TABLE "Salesperson"/);
  assert.match(migration, /CREATE UNIQUE INDEX "Salesperson_userId_key"/);
  assert.match(migration, /ADD COLUMN "salespersonId" TEXT/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
});
