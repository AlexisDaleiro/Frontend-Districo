import assert from 'node:assert/strict';
import { test } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AccountStatus, Prisma, Role } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import { CustomerListQueryDto, StaffListQueryDto } from '../../src/admin/dto/admin-list-query.dto';
import { AdminProductFilterDto } from '../../src/catalog/products/dto/admin-product-filter.dto';
import { customerDebtPredicate, customerListWhere } from '../../src/admin/customer-list-filter';
import { pendingInvitation, staffListWhere } from '../../src/admin/staff-list-filter';
import { AdminService } from '../../src/admin/admin.service';
import { SalespeopleService } from '../../src/admin/salespeople.service';
import { ProductsRepository } from '../../src/catalog/products/products.repository';
import { CategoryHierarchyService } from '../../src/catalog/categories/category-hierarchy.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AuditService } from '../../src/audit/audit.service';
import { OrdersService } from '../../src/orders/orders.service';
import { ApplicationsService } from '../../src/applications/applications.service';
import { JwtUser } from '../../src/common/types/jwt-user.type';
import { staffFeatureForPath } from '../../src/common/staff-role-access';

const admin = { sub: 'admin', email: 'admin@example.test', role: Role.ADMIN, permissions: [] } as JwtUser;
const service = (prisma: object) => new AdminService(prisma as PrismaService, {} as AuditService, {} as OrdersService, {} as ApplicationsService);
test('DTOs keep combined filters and reject invalid booleans, roles and statuses', async () => {
  for (const [type, values] of [[CustomerListQueryDto, { salespersonId: 's1', accountStatus: 'SUSPENDED', debt: 'WITH_DEBT' }], [StaffListQueryDto, { role: 'CUSTOM', customRoleId: 'r1', status: 'PENDING' }], [AdminProductFilterDto, { withoutPrice: 'true', withoutStock: 'false', active: 'false' }]] as const) {
    assert.equal((await validate(plainToInstance(type as typeof CustomerListQueryDto, values), { whitelist: true, forbidNonWhitelisted: true })).length, 0);
  }
  assert.ok((await validate(plainToInstance(CustomerListQueryDto, { debt: 'INVALID' }))).length);
  assert.ok((await validate(plainToInstance(StaffListQueryDto, { role: 'CLIENT', status: 'EXPIRED' }))).length);
  assert.ok((await validate(plainToInstance(AdminProductFilterDto, { withoutPrice: 'yes' }))).length);
});
test('customer filters cannot broaden seller ownership and SQL values are bound', () => {
  const query = { page: 2, limit: 20, salespersonId: 'other', accountStatus: AccountStatus.SUSPENDED, debt: 'WITHOUT_DEBT', search: "50%_' OR TRUE --" } as CustomerListQueryDto;
  const where = customerListWhere(query, 'seller-user');
  assert.deepEqual(where.salesperson, { is: { userId: 'seller-user' } });
  assert.equal(where.salespersonId, 'other');
  assert.equal(customerListWhere({ ...query, salespersonId: 'unassigned' }).salespersonId, null);
  const sql = customerDebtPredicate(query, 'seller-user');
  assert.match(sql.sql, /NOT EXISTS/);
  assert.match(sql.sql, /creditedTotal.*paidTotal.*refundedTotal/);
  assert.ok(!sql.sql.includes(query.search!));
  assert.ok(sql.values.includes('other') && sql.values.includes('seller-user') && sql.values.includes('SUSPENDED'));
  assert.ok(sql.values.includes("%50\\%\\_' OR TRUE --%"));
  assert.ok(!sql.values.includes('CANCELLED') && !sql.values.includes('REJECTED'));
});
test('debt pagination and count share the full predicate, with a financial permission guard', async () => {
  const queries: Prisma.Sql[] = [], finds: Prisma.CustomerAccountFindManyArgs[] = [];
  const prisma = { $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => { const query = Prisma.sql(strings, ...values); queries.push(query); return query.sql.includes('count(*)') ? [{ total: 31 }] : [{ id: 'c2' }, { id: 'c1' }]; },
    customerAccount: { findMany: async (args: Prisma.CustomerAccountFindManyArgs) => { finds.push(args); return [{ id: 'c1' }, { id: 'c2' }]; } },
    staffRoleAccess: { findUnique: async () => ({ canView: false }) } };
  const query = { page: 2, limit: 20, debt: 'WITH_DEBT', accountStatus: AccountStatus.SUSPENDED } as CustomerListQueryDto;
  const result = await service(prisma).customersPage(query, admin);
  assert.deepEqual(result.items.map((item) => item.id), ['c2', 'c1']);
  assert.deepEqual(result.meta, { total: 31, page: 2, limit: 20 });
  assert.deepEqual(queries[0].values.slice(0, -2), queries[1].values);
  assert.deepEqual(queries[0].values.slice(-2), [20, 20]);
  assert.deepEqual(finds[0].where?.id, { in: ['c2', 'c1'] });
  await assert.rejects(() => service(prisma).customersPage(query, { ...admin, role: Role.CATALOG }), ForbiddenException);
  assert.equal(queries.length, 2);
});
test('staff invitation states are disjoint and use only valid, unrevoked invitations', () => {
  const now = new Date();
  for (const status of ['ACTIVE', 'INACTIVE', 'PENDING', 'UNVERIFIED'] as const) {
    const where = staffListWhere({ page: 1, limit: 20, role: Role.CUSTOM, customRoleId: 'custom', search: 'reader', status }, now);
    assert.equal(where.role, Role.CUSTOM); assert.equal(where.customRoleId, 'custom');
    assert.equal(where.customerAccountId, null);
    assert.equal(where.active, status === 'ACTIVE');
    if (status === 'PENDING') assert.deepEqual(where.staffInvitations, { some: pendingInvitation(now) });
    if (status === 'UNVERIFIED') assert.deepEqual(where.staffInvitations, { none: pendingInvitation(now) });
  }
  assert.equal(staffFeatureForPath('/api/admin/staff/page/options'), 'personal');
  assert.equal(staffFeatureForPath('/api/admin/customers/page/options'), 'clientes');
});
test('staff and seller pages filter and count before pagination and do not expose tokens', async () => {
  let find: Prisma.UserFindManyArgs | undefined, count: Prisma.UserCountArgs | undefined;
  const prisma = { user: { findMany: async (args: Prisma.UserFindManyArgs) => { find = args; return [{ id: 'seller', role: Role.SALES, active: false, emailVerified: false, staffInvitations: [{ id: 'i1' }], salesperson: null }]; }, count: async (args: Prisma.UserCountArgs) => { count = args; return 25; } } };
  const query = { page: 2, limit: 20, role: Role.SALES, status: 'PENDING', search: 'seller' } as StaffListQueryDto;
  const staff = await service(prisma).staffPage(query);
  assert.equal(staff.items[0].invitationPending, true);
  assert.ok(!('staffInvitations' in staff.items[0]));
  assert.deepEqual(find?.where, count?.where); assert.equal(find?.skip, 20);
  const sellers = await new SalespeopleService(prisma as unknown as PrismaService).list(query);
  assert.equal(sellers.meta.total, 25); assert.equal(find?.where?.role, Role.SALES);
  assert.deepEqual(find?.where, count?.where);
  assert.equal(find?.where?.OR?.length, 3);
});
test('product price and stock filters combine with search, taxonomy and attribute filters', async () => {
  let find: Prisma.ProductFindManyArgs | undefined, count: Prisma.ProductCountArgs | undefined;
  const prisma = { productVariant: { fields: { reservedStock: 'RESERVED_FIELD' } }, product: {
    findMany: async (args: Prisma.ProductFindManyArgs) => { find = args; return []; }, count: async (args: Prisma.ProductCountArgs) => { count = args; return 13; },
  } };
  const repository = new ProductsRepository(prisma as unknown as PrismaService, { descendantIds: async () => ['parent', 'child'] } as unknown as CategoryHierarchyService);
  const query = { page: 2, limit: 12, brandId: 'b1', categoryId: ['parent'], search: 'SKU', attributeValueIds: ['a1'], active: false, withoutPrice: true, withoutStock: true } as AdminProductFilterDto;
  const result = await repository.findMany(query, true);
  assert.equal(result.meta.total, 13); assert.equal(find?.skip, 12);
  assert.deepEqual(find?.where, count?.where);
  assert.deepEqual(find?.where?.categories, { some: { categoryId: { in: ['parent', 'child'] } } });
  assert.equal(find?.where?.active, false); assert.equal(find?.where?.brandId, 'b1');
  const and = find?.where?.AND as Prisma.ProductWhereInput[];
  assert.equal(and.length, 3);
  assert.deepEqual(and[2], { variants: { none: { active: true, deletedAt: null, physicalStock: { gt: 'RESERVED_FIELD' } } } });
  assert.match(JSON.stringify(and[1]), /priceList.*active.*amount.*gt.*validFrom.*validUntil/);
  await repository.findMany(query);
  assert.equal((find?.where?.AND as unknown[]).length, 1);
  assert.equal(find?.where?.active, true);
});
