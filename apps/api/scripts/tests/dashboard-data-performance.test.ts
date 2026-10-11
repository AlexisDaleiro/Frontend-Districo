import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AccountStatus, Permission, Role } from '@prisma/client';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from '../../src/auth/jwt.strategy';
import { AdminService } from '../../src/admin/admin.service';
import { AuthService } from '../../src/auth/auth.service';

test('authentication reads current session and minimal user in one joined query', async () => {
  const user = { id: 'owner', email: 'qa@example.test', active: true, role: Role.CLIENT,
    customRoleId: null, customerAccountId: 'customer', mfaEnabledAt: null,
    customerAccount: { accountStatus: AccountStatus.SUSPENDED }, permissions: [{ permission: Permission.CAN_PLACE_ORDERS }, { permission: Permission.CAN_VIEW_PRICES }] };
  let calls = 0, args: any;
  const prisma = { authSession: { findFirst: async (value: any) => {
    calls++; args = value;
    return { id: 'session', lastSeenAt: new Date(), mfaVerifiedAt: null, user };
  } } };
  const strategy = new JwtStrategy({ get: () => 'fixture-secret' } as never, prisma as never);
  const token = { sub: 'owner', sid: 'session', purpose: 'access', role: Role.ADMIN, permissions: [], email: user.email };
  const validated = await strategy.validate(token);
  assert.equal(calls, 1);
  assert.equal(args.relationLoadStrategy, 'join');
  assert.deepEqual({ ...args.where, expiresAt: undefined }, { id: 'session', userId: 'owner', revokedAt: null, expiresAt: undefined });
  assert.ok(args.where.expiresAt.gt instanceof Date);
  assert.deepEqual(args.select.user.select.customerAccount, { select: { accountStatus: true } });
  for (const field of ['passwordHash', 'mfaSecretEncrypted', 'addresses', 'salesperson']) assert.ok(!(field in args.select.user.select));
  assert.equal(validated.role, Role.CLIENT);
  assert.deepEqual(validated.permissions, [Permission.CAN_VIEW_PRICES]);
  user.active = false;
  await assert.rejects(() => strategy.validate(token), UnauthorizedException);
  const before = calls;
  for (const sub of [undefined, '', [], 1]) await assert.rejects(() => strategy.validate({ ...token, sub } as never), UnauthorizedException);
  assert.equal(calls, before);
});

test('sidebar counters keep their predicates with one database request', async () => {
  let calls = 0, sql = '';
  const expected = { products: 8, pendingApplications: 2, pendingReviewOrders: 4, activePromotions: 3, newContactInquiries: 1 };
  const prisma = { $queryRaw: async (strings: TemplateStringsArray) => { calls++; sql = strings.join(''); return [expected]; } };
  const service = new AdminService(prisma as never, {} as never, {} as never, {} as never);
  assert.deepEqual(await service.dashboard(), expected);
  assert.equal(calls, 1);
  for (const predicate of ['"deletedAt" IS NULL', "'PENDING'", "'PENDING_REVIEW'", '"active" = true', "'NEW'"]) assert.ok(sql.includes(predicate));
});

test('profile and access load together, with a fresh fallback after role reassignment', async () => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const lookedUp: Role[] = [];
  const user = { id: 'owner', active: true, role: Role.CATALOG, customRoleId: null, permissions: [],
    passwordHash: 'private', mfaSecretEncrypted: 'private', mfaLastStep: 0, customerAccount: { internalCreditNote: 'private' } };
  const prisma = { staffRoleAccess: { findMany: async ({ where }: any) => { lookedUp.push(where.role); return [{ feature: 'clientes', canView: where.role === Role.SALES, canEdit: false }]; } } };
  const users = { findById: async () => { await held; return user; } };
  const auth = new AuthService({ get: () => undefined } as never, {} as never, prisma as never, users as never);
  const pending = auth.me({ sub: 'owner', email: 'qa@example.test', role: Role.SALES, customRoleId: null, permissions: [] });
  try {
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.deepEqual(lookedUp, [Role.SALES]);
  } finally { release(); }
  const result = await pending;
  assert.deepEqual(lookedUp, [Role.SALES, Role.CATALOG]);
  assert.equal(result.staffAccess?.clientes.canView, false);
  for (const field of ['passwordHash', 'mfaSecretEncrypted', 'mfaLastStep']) assert.ok(!(field in result));
  assert.ok(!('internalCreditNote' in result.customerAccount!));
});

test('customer histories load together and preserve financial values', async () => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const started: string[] = [];
  const prisma = {
    customerAccount: { findUnique: async () => ({ id: 'customer', creditLimit: null, discountPercentage: 10, discountMode: 'BEST_PRICE' }) },
    order: { findMany: async () => { started.push('orders'); await held; return []; }, count: async () => { started.push('count'); await held; return 0; } },
    auditLog: { findMany: async ({ where }: any) => { started.push(where.action === 'CUSTOMER_DISCOUNT_UPDATED' ? 'discount' : 'credit'); await held; return []; } },
  };
  const service = new AdminService(prisma as never, {} as never, {} as never, {} as never);
  const pending = service.customerDetail('customer', { sub: 'admin', email: 'qa@example.test', role: Role.ADMIN, permissions: [] });
  try {
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.ok(started.includes('discount'), 'discount history must start before the other reads finish');
  } finally { release(); }
  const result = await pending;
  assert.equal(result.debt, 0);
  assert.equal(result.availableCredit, null);
  assert.deepEqual(result.discountChanges, []);
  assert.equal(result.discountPercentage, 10);
});
