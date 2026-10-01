import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AccountService } from '../../src/users/account.service';
import { PrismaService } from '../../src/prisma/prisma.service';

const activeUser = { active: true, role: Role.CLIENT, customerAccountId: 'account-1' };

test('profile updates business data without accepting email or phone', async () => {
  let saved: Record<string, unknown> | undefined;
  const tx = {
    customerAccount: { update: async ({ data }: { data: Record<string, unknown> }) => {
      saved = data;
      return { id: 'account-1', ...data };
    } },
    auditLog: { create: async () => ({}) },
  };
  const prisma = {
    user: { findUnique: async () => activeUser },
    $transaction: async (action: (client: typeof tx) => Promise<unknown>) => action(tx),
  } as unknown as PrismaService;
  const service = new AccountService(prisma);
  await service.updateProfile('user-1', { businessName: '  Nuevo comercio  ', email: 'bad@example.com', phone: '123' } as never);
  assert.equal(saved?.businessName, 'Nuevo comercio');
  assert.equal('email' in saved!, false);
  assert.equal('phone' in saved!, false);
});

test('new addresses are scoped to the signed-in account and refresh the principal address', async () => {
  let createdFor = '';
  let primary: Record<string, unknown> | undefined;
  const address = { id: 'address-1', label: 'Depósito', address: 'Av. Italia 123', city: 'Montevideo', department: 'Montevideo' };
  const tx = {
    customerAddress: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        createdFor = String(data.customerAccountId);
        return address;
      },
      findFirst: async () => address,
    },
    customerAccount: { update: async ({ data }: { data: Record<string, unknown> }) => {
      primary = data;
      return {};
    } },
    auditLog: { create: async () => ({}) },
  };
  const prisma = {
    user: { findUnique: async () => activeUser },
    $transaction: async (action: (client: typeof tx) => Promise<unknown>) => action(tx),
  } as unknown as PrismaService;
  const service = new AccountService(prisma);
  await service.createAddress('user-1', { label: 'Depósito', address: 'Av. Italia 123', city: 'Montevideo', department: 'Montevideo' });
  assert.equal(createdFor, 'account-1');
  assert.equal(primary?.address, 'Av. Italia 123');
});

test('an address from another account cannot be edited', async () => {
  const tx = { customerAddress: { findFirst: async () => null } };
  const prisma = {
    user: { findUnique: async () => activeUser },
    $transaction: async (action: (client: typeof tx) => Promise<unknown>) => action(tx),
  } as unknown as PrismaService;
  const service = new AccountService(prisma);
  await assert.rejects(() => service.updateAddress('user-1', 'another-address', { label: 'Otro' }), NotFoundException);
});
