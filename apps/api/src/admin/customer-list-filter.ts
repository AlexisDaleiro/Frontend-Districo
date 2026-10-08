import { OrderStatus, Prisma } from '@prisma/client';
import { CustomerListQueryDto } from './dto/admin-list-query.dto';

export function customerListWhere(query: CustomerListQueryDto, sellerUserId?: string): Prisma.CustomerAccountWhereInput {
  const search = query.search?.trim();
  return {
    ...(sellerUserId ? { salesperson: { is: { userId: sellerUserId } } } : {}),
    ...(query.salespersonId ? { salespersonId: query.salespersonId === 'unassigned' ? null : query.salespersonId } : {}),
    ...(query.accountStatus ? { accountStatus: query.accountStatus } : {}),
    ...(search ? { OR: [
      { businessName: { contains: search, mode: 'insensitive' } }, { legalName: { contains: search, mode: 'insensitive' } },
      { rut: { contains: search } }, { phone: { contains: search } }, { users: { some: { email: { contains: search, mode: 'insensitive' } } } },
    ] } : {}),
  };
}
export function customerDebtPredicate(query: CustomerListQueryDto, sellerUserId?: string): Prisma.Sql {
  const terms: Prisma.Sql[] = [Prisma.sql`TRUE`];
  if (sellerUserId) terms.push(Prisma.sql`EXISTS (SELECT 1 FROM "Salesperson" s WHERE s."id" = c."salespersonId" AND s."userId" = ${sellerUserId})`);
  if (query.salespersonId === 'unassigned') terms.push(Prisma.sql`c."salespersonId" IS NULL`);
  else if (query.salespersonId) terms.push(Prisma.sql`c."salespersonId" = ${query.salespersonId}`);
  if (query.accountStatus) terms.push(Prisma.sql`c."accountStatus"::text = ${query.accountStatus}`);
  const search = query.search?.trim();
  if (search) {
    const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    terms.push(Prisma.sql`(c."businessName" ILIKE ${pattern} OR c."legalName" ILIKE ${pattern} OR c."rut" LIKE ${pattern}
      OR c."phone" LIKE ${pattern} OR EXISTS (SELECT 1 FROM "User" u WHERE u."customerAccountId" = c."id" AND u."email" ILIKE ${pattern}))`);
  }
  const open = [OrderStatus.SUBMITTED, OrderStatus.PENDING_REVIEW, OrderStatus.APPROVED, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED];
  const debt = Prisma.sql`EXISTS (SELECT 1 FROM "Order" o WHERE o."customerAccountId" = c."id" AND o."status"::text IN (${Prisma.join(open)})
    AND GREATEST(o."total" - o."creditedTotal" - o."paidTotal" + o."refundedTotal", 0) > 0)`;
  if (query.debt === 'WITH_DEBT') terms.push(debt);
  if (query.debt === 'WITHOUT_DEBT') terms.push(Prisma.sql`NOT ${debt}`);
  return Prisma.join(terms, ' AND ');
}
