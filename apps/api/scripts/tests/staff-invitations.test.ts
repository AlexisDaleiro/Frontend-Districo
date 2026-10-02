import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { BadRequestException, ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AdminService } from '../../src/admin/admin.service';
import { AuthService } from '../../src/auth/auth.service';
import { PrismaService } from '../../src/prisma/prisma.service';

function fixture() {
  const users: Record<string, any> = {};
  const invitations: Record<string, any> = {};
  const audits: string[] = [];
  let revokedTokens = 0;
  const tx = {
    user: {
      findUnique: async ({ where }: any) => where.email ? Object.values(users).find((user: any) => user.email === where.email) ?? null : users[where.id] ?? null,
      create: async ({ data }: any) => { const user = { id: 'staff-1', customerAccountId: null, ...data }; users[user.id] = user; return user; },
      update: async ({ where, data }: any) => { Object.assign(users[where.id], data); return users[where.id]; },
      count: async () => Object.values(users).filter((user: any) => user.role === Role.ADMIN && user.active).length,
    },
    staffInvitation: {
      create: async ({ data }: any) => { const invitation = { id: `invite-${Object.keys(invitations).length}`, acceptedAt: null, revokedAt: null, ...data }; invitations[data.tokenHash] = invitation; return invitation; },
      findUnique: async ({ where }: any) => { const invitation = invitations[where.tokenHash]; return invitation ? { ...invitation, user: users[invitation.userId] } : null; },
      updateMany: async ({ where, data }: any) => {
        const rows = Object.values(invitations).filter((item: any) =>
          (where.userId ? item.userId === where.userId : item.id === where.id) && !item.acceptedAt && !item.revokedAt);
        rows.forEach((item: any) => Object.assign(item, data));
        return { count: rows.length };
      },
    },
    refreshToken: { updateMany: async () => { revokedTokens++; return { count: 1 }; } },
    auditLog: { create: async ({ data }: any) => { audits.push(data.action); return data; } },
  };
  const prisma = { ...tx, $transaction: async (action: (client: typeof tx) => Promise<unknown>) => action(tx) } as unknown as PrismaService;
  return { users, invitations, audits, prisma, get revokedTokens() { return revokedTokens; } };
}

test('staff invitation stores only a hash, expires, and replaces the prior link', async () => {
  const f = fixture();
  const admin = new AdminService(f.prisma, {} as never, {} as never, {} as never);
  const first = await admin.inviteStaff('  PERSON@example.test ', Role.SALES, 'admin-1');
  assert.equal(f.users['staff-1'].email, 'person@example.test');
  assert.equal(f.users['staff-1'].active, false);
  assert.equal(f.invitations[createHash('sha256').update(first.token).digest('hex')].userId, 'staff-1');
  assert.equal(JSON.stringify(f.invitations).includes(first.token), false);
  const second = await admin.inviteStaff('person@example.test', Role.FINANCE, 'admin-1');
  assert.notEqual(first.token, second.token);
  assert.ok(f.invitations[createHash('sha256').update(first.token).digest('hex')].revokedAt);
  assert.equal(f.users['staff-1'].role, Role.FINANCE);
  assert.deepEqual(f.audits, ['STAFF_INVITED', 'STAFF_REINVITED']);
  f.invitations[createHash('sha256').update(second.token).digest('hex')].expiresAt = new Date(0);
  const auth = new AuthService({ get: () => undefined } as never, {} as never, f.prisma, {} as never);
  await assert.rejects(() => auth.acceptStaffInvitation({ token: second.token, password: 'long-password-123' }), UnauthorizedException);
});

test('staff invitation cannot be used twice and an existing client cannot be invited', async () => {
  const f = fixture();
  const admin = new AdminService(f.prisma, {} as never, {} as never, {} as never);
  const auth = new AuthService({ get: () => undefined } as never, {} as never, f.prisma, {} as never);
  const invitation = await admin.inviteStaff('person@example.test', Role.CATALOG, 'admin-1');
  await assert.rejects(() => auth.acceptStaffInvitation({ token: 'bad'.repeat(20), password: 'long-password-123' }), UnauthorizedException);
  assert.deepEqual(await auth.acceptStaffInvitation({ token: invitation.token, password: 'long-password-123' }), { success: true });
  assert.equal(f.users['staff-1'].active, true);
  assert.equal(f.users['staff-1'].emailVerified, true);
  assert.notEqual(f.users['staff-1'].passwordHash, 'long-password-123');
  await assert.rejects(() => auth.acceptStaffInvitation({ token: invitation.token, password: 'another-password-123' }), UnauthorizedException);
  f.users['client-1'] = { id: 'client-1', email: 'client@example.test', role: Role.CLIENT, active: false, emailVerified: false, customerAccountId: 'account-1' };
  await assert.rejects(() => admin.inviteStaff('client@example.test', Role.ADMIN, 'admin-1'), ConflictException);
});

test('deactivation revokes sessions; self-deactivation and last-admin removal are denied', async () => {
  const f = fixture();
  const admin = new AdminService(f.prisma, {} as never, {} as never, {} as never);
  const invitation = await admin.inviteStaff('person@example.test', Role.SALES, 'admin-1');
  const auth = new AuthService({ get: () => undefined } as never, {} as never, f.prisma, {} as never);
  await auth.acceptStaffInvitation({ token: invitation.token, password: 'long-password-123' });
  await assert.rejects(() => admin.updateStaffActive('staff-1', false, 'staff-1'), ForbiddenException);
  await admin.updateStaffActive('staff-1', false, 'admin-1');
  assert.equal(f.users['staff-1'].active, false);
  assert.equal(f.revokedTokens, 2);
  await admin.updateStaffActive('staff-1', true, 'admin-1');
  f.users['staff-1'].role = Role.ADMIN;
  await assert.rejects(() => admin.updateStaffActive('staff-1', false, 'other-admin'), BadRequestException);
});
