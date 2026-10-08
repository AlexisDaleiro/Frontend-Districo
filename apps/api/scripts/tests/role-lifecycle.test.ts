import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AdminService } from '../../src/admin/admin.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AuditService } from '../../src/audit/audit.service';
import { ApplicationsService } from '../../src/applications/applications.service';
import { OrdersService } from '../../src/orders/orders.service';

function setup() {
  const role = { id: 'role-1', name: 'Deposito', key: 'deposito', retiredAt: null as Date | null, accesses: [{ feature: 'catalogo', canView: true, canEdit: true }] };
  const roles = [role]; const audits: { action: string; metadata: unknown }[] = []; let assigned = 0; let actorRole: Role = Role.ADMIN;
  const tx = {
    $queryRaw: async () => [],
    customStaffRole: {
      findUnique: async ({ where }: { where: { id?: string; key?: string } }) => roles.find((item) => where.id ? item.id === where.id : item.key === where.key) ?? null,
      findUniqueOrThrow: async () => structuredClone(role),
      update: async ({ data }: { data: Partial<typeof role> }) => { Object.assign(role, data); return role; },
      create: async ({ data }: { data: { name: string; key: string; accesses: { create: typeof role.accesses } } }) => {
        const saved = { ...role, id: 'role-2', name: data.name, key: data.key, accesses: structuredClone(data.accesses.create) }; roles.push(saved); return saved;
      },
    },
    user: { count: async () => assigned },
    auditLog: { create: async ({ data }: { data: typeof audits[number] }) => { audits.push(data); } },
  };
  const prisma = { ...tx, user: { findUnique: async () => ({ role: actorRole }) }, staffRoleAccess: { findMany: async () => [{ feature: 'catalogo', canView: false, canEdit: false }] },
    $transaction: async (action: (client: typeof tx) => Promise<unknown>, options: { isolationLevel: string }) => { assert.equal(options.isolationLevel, 'Serializable'); return action(tx); },
  } as unknown as PrismaService;
  const service = new AdminService(prisma, {} as AuditService, {} as OrdersService, {} as ApplicationsService);
  return { role, roles, audits, service, assign: (value: number) => { assigned = value; }, actor: (value: Role) => { actorRole = value; } };
}

test('rename preserves role ID and permissions and audits the old name', async () => {
  const s = setup(); await s.service.manageCustomRole('role-1', 'rename', 'Logistica', 'admin-1');
  assert.equal(s.role.id, 'role-1'); assert.equal(s.role.name, 'Logistica'); assert.equal(s.role.accesses[0].canEdit, true);
  assert.equal(s.audits[0].action, 'STAFF_ROLE_RENAMED'); assert.equal((s.audits[0].metadata as { previousName: string }).previousName, 'Deposito');
});

test('duplicate creates independent permissions and retirement preserves history', async () => {
  const s = setup(); await s.service.manageCustomRole('role-1', 'duplicate', 'Deposito auxiliar', 'admin-1');
  assert.equal(s.roles.length, 2); assert.deepEqual(s.roles[1].accesses, s.role.accesses);
  s.roles[1].accesses[0].canEdit = false; assert.equal(s.role.accesses[0].canEdit, true);
  await s.service.manageCustomRole('role-1', 'retire', undefined, 'admin-1');
  assert.ok(s.role.retiredAt); assert.equal(s.roles.length, 2); assert.equal(s.role.accesses[0].canEdit, true);
  assert.deepEqual(s.audits.map((item) => item.action), ['STAFF_ROLE_DUPLICATED', 'STAFF_ROLE_RETIRED']);
  await assert.rejects(() => s.service.manageCustomRole('role-1', 'rename', 'Otro nombre', 'admin-1'), NotFoundException);
});

test('cannot retire a role assigned to active, inactive or invitation users', async () => {
  const s = setup(); s.assign(1);
  await assert.rejects(() => s.service.manageCustomRole('role-1', 'retire', undefined, 'admin-1'), ConflictException);
  assert.equal(s.role.retiredAt, null); assert.equal(s.audits.length, 0);
});

test('names must be unique and duplication cannot grant privileges above the actor', async () => {
  const s = setup();
  await assert.rejects(() => s.service.manageCustomRole('role-1', 'duplicate', 'Deposito', 'admin-1'), ConflictException);
  s.actor(Role.SALES);
  await assert.rejects(() => s.service.manageCustomRole('role-1', 'duplicate', 'Auxiliar', 'actor-1'), ForbiddenException);
  assert.equal(s.roles.length, 1); assert.equal(s.audits.length, 0);
});

test('built-in or missing role identifiers cannot be renamed or retired', async () => {
  const s = setup(); await assert.rejects(() => s.service.manageCustomRole('SALES', 'retire', undefined, 'admin-1'), NotFoundException);
});
