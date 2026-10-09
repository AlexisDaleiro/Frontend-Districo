import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUser } from '../common/types/jwt-user.type';
import { defaultStaffAccess } from '../common/staff-role-access';
import { SearchListQueryDto } from './dto/admin-list-query.dto';
import { SalesQueryDto } from './dto/sales-query.dto';
import { salesRange } from './sales-report-range';

type Total = { orders: number; amount: number; units: number };
type Group = Total & { id: string | null; name: string; total: number };
type Series = { bucket: string; orders: number; amount: number };

@Injectable()
export class SalesReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async options(query: SearchListQueryDto, user: JwtUser) {
    const search = query.search?.trim();
    const [salespeople, customers, brands] = await Promise.all([
      this.prisma.salesperson.findMany({ where: user.role === Role.SALES ? { userId: user.sub } : undefined, select: { id: true, name: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }] }),
      this.prisma.customerAccount.findMany({ where: {
        ...(user.role === Role.SALES ? { salesperson: { is: { userId: user.sub } } } : {}),
        ...(search ? { OR: [{ businessName: { contains: search, mode: 'insensitive' as const } }, { rut: { contains: search } }, { users: { some: { email: { contains: search, mode: 'insensitive' as const } } } }] } : {}),
      }, select: { id: true, businessName: true, rut: true }, orderBy: [{ businessName: 'asc' }, { id: 'asc' }], take: 40 }),
      this.prisma.brand.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }] }),
    ]);
    return { salespeople, customers: customers.map((item) => ({ id: item.id, name: item.businessName, rut: item.rut })), brands };
  }

  private async canViewPayments(user: JwtUser) {
    if (user.role === Role.ADMIN) return true;
    if (user.role === Role.CUSTOM) return !!user.customRoleId && !!(await this.prisma.customStaffRoleAccess.findUnique({ where: { roleId_feature: { roleId: user.customRoleId, feature: 'facturacion' } } }))?.canView;
    return (await this.prisma.staffRoleAccess.findUnique({ where: { role_feature: { role: user.role, feature: 'facturacion' } } }) ?? defaultStaffAccess(user.role, 'facturacion')).canView;
  }

  async report(query: SalesQueryDto, user: JwtUser, exportAll = false) {
    let range: ReturnType<typeof salesRange>;
    try { range = salesRange(query); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'Fechas inválidas.'); }
    const now = new Date();
    const scope = Prisma.sql`
      o."status"::text IN ('SUBMITTED', 'PENDING_REVIEW', 'APPROVED', 'PROCESSING', 'SHIPPED', 'DELIVERED')
      AND o."currency" = ${query.currency}
      ${user.role === Role.SALES ? Prisma.sql`AND s."userId" = ${user.sub}` : Prisma.empty}
      ${query.salespersonId ? Prisma.sql`AND c."salespersonId" = ${query.salespersonId}` : Prisma.empty}
      ${query.customerId ? Prisma.sql`AND o."customerAccountId" = ${query.customerId}` : Prisma.empty}
    `;
    const groupId = query.groupBy === 'customer' ? Prisma.sql`o."customerAccountId"` : query.groupBy === 'brand' ? Prisma.sql`p."brandId"` : Prisma.sql`s."id"`;
    const groupName = query.groupBy === 'customer' ? Prisma.sql`coalesce(c."businessName", u."email", 'Sin cliente')` : query.groupBy === 'brand' ? Prisma.sql`coalesce(b."name", 'Sin marca')` : Prisma.sql`coalesce(s."name", 'Sin vendedor asignado')`;
    const windowStart = new Date(Math.min(range.previousStart.getTime(), range.todayStart.getTime()));
    const windowEnd = new Date(Math.max(range.end.getTime(), range.tomorrowStart.getTime()));
    // Subtotales históricos netos: una marca no debe sumar el pedido completo.
    const lines = Prisma.sql`WITH lines AS (
      SELECT o."id" AS "orderId", o."createdAt", i."productId", i."productName", i."quantity", i."subtotal" AS amount,
        ${groupId} AS "groupId", ${groupName} AS "groupName"
      FROM "Order" o JOIN "OrderItem" i ON i."orderId" = o."id"
      LEFT JOIN "CustomerAccount" c ON c."id" = o."customerAccountId"
      LEFT JOIN "Salesperson" s ON s."id" = c."salespersonId"
      LEFT JOIN "User" u ON u."id" = o."userId"
      LEFT JOIN "Product" p ON p."id" = i."productId"
      LEFT JOIN "Brand" b ON b."id" = p."brandId"
      WHERE ${scope} AND o."createdAt" >= ${windowStart} AND o."createdAt" < ${windowEnd} AND o."createdAt" <= ${now}
        ${query.brandId ? Prisma.sql`AND p."brandId" = ${query.brandId}` : Prisma.empty}
    )`;
    const current = Prisma.sql`"createdAt" >= ${range.start} AND "createdAt" < ${range.end}`;
    const bucket = query.period === 'today' ? Prisma.sql`to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Montevideo', 'HH24')` : Prisma.sql`to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Montevideo', 'YYYY-MM-DD')`;
    const includePayments = !query.brandId && await this.canViewPayments(user);
    const [totals, series, topProducts, groups, payments] = await Promise.all([
      this.prisma.$queryRaw<(Total & { period: string })[]>`${lines}
        SELECT 'current' AS period, count(DISTINCT "orderId")::integer AS orders, coalesce(sum(amount),0)::double precision AS amount, coalesce(sum(quantity),0)::integer AS units FROM lines WHERE ${current}
        UNION ALL SELECT 'previous', count(DISTINCT "orderId")::integer, coalesce(sum(amount),0)::double precision, coalesce(sum(quantity),0)::integer FROM lines WHERE "createdAt" >= ${range.previousStart} AND "createdAt" < ${range.start}
        UNION ALL SELECT 'today', count(DISTINCT "orderId")::integer, coalesce(sum(amount),0)::double precision, coalesce(sum(quantity),0)::integer FROM lines WHERE "createdAt" >= ${range.todayStart} AND "createdAt" < ${range.tomorrowStart}`,
      this.prisma.$queryRaw<Series[]>`${lines} SELECT ${bucket} AS bucket, count(DISTINCT "orderId")::integer AS orders, coalesce(sum(amount),0)::double precision AS amount FROM lines WHERE ${current} GROUP BY 1 ORDER BY 1`,
      this.prisma.$queryRaw<{ id: string; name: string; units: number; amount: number }[]>`${lines} SELECT "productId" AS id, "productName" AS name, sum(quantity)::integer AS units, sum(amount)::double precision AS amount FROM lines WHERE ${current} GROUP BY 1,2 ORDER BY units DESC, name ASC, id ASC LIMIT 8`,
      this.prisma.$queryRaw<Group[]>`${lines} SELECT "groupId" AS id, "groupName" AS name, count(DISTINCT "orderId")::integer AS orders, sum(quantity)::integer AS units, sum(amount)::double precision AS amount, count(*) OVER()::integer AS total FROM lines WHERE ${current} GROUP BY 1,2 ORDER BY amount DESC, name ASC, id ASC ${exportAll ? Prisma.empty : Prisma.sql`LIMIT ${query.limit} OFFSET ${(query.page - 1) * query.limit}`}`,
      includePayments ? this.prisma.$queryRaw<{ amount: number }[]>`SELECT coalesce(sum(pay."amount"),0)::double precision AS amount FROM "OrderPayment" pay JOIN "Order" o ON o."id" = pay."orderId" LEFT JOIN "CustomerAccount" c ON c."id" = o."customerAccountId" LEFT JOIN "Salesperson" s ON s."id" = c."salespersonId" WHERE ${scope} AND pay."voidedAt" IS NULL AND pay."createdAt" >= ${range.start} AND pay."createdAt" < ${range.end} AND pay."createdAt" <= ${now}` : [],
    ]);
    const metric = (period: string) => totals.find((item) => item.period === period) ?? { orders: 0, amount: 0, units: 0 };
    const previous = metric('previous'), summary = metric('current');
    // Empty pages still need the real group count to let the UI recover.
    const total = groups[0]?.total ?? (query.page > 1 && !exportAll ? (await this.prisma.$queryRaw<{ total: number }[]>`${lines} SELECT count(*)::integer AS total FROM (SELECT "groupId", "groupName" FROM lines WHERE ${current} GROUP BY 1,2) g`)[0]?.total ?? 0 : 0);
    return { period: query.period, timezone: 'America/Montevideo', currency: query.currency, dateFrom: range.dateFrom, dateTo: range.dateTo, startAt: range.start.toISOString(), endAt: range.end.toISOString(), days: range.days,
      today: metric('today'), current: { ...summary, ...(includePayments ? { collected: payments[0]?.amount ?? 0 } : {}) }, previous,
      changePercent: previous.amount > 0 ? Math.round((summary.amount - previous.amount) / previous.amount * 1000) / 10 : null,
      series, topProducts, groupBy: query.groupBy, groups: groups.map(({ total: _total, ...group }) => group), meta: { total, page: query.page, limit: query.limit } };
  }

  async export(query: SalesQueryDto, user: JwtUser) {
    const report = await this.report(query, user, true);
    const cell = (value: unknown) => { const raw = String(value ?? ''); return `"${(/^[\s]*[=+@-]/.test(raw) ? `'${raw}` : raw).replace(/"/g, '""')}"`; };
    const prefix = [report.dateFrom, report.dateTo, report.currency];
    const rows: unknown[][] = [['Desde', 'Hasta', 'Moneda', 'Tipo', 'ID', 'Nombre', 'Pedidos', 'Unidades', 'Importe'],
      [...prefix, 'Resumen', '', 'Período seleccionado', report.current.orders, report.current.units, report.current.amount],
      [...prefix, 'Comparación', '', 'Período anterior', report.previous.orders, report.previous.units, report.previous.amount],
      ...(report.current.collected !== undefined ? [[...prefix, 'Cobros', '', 'Abonos vigentes registrados', '', '', report.current.collected]] : []),
      ...report.series.map((item) => [...prefix, 'Serie', item.bucket, item.bucket, item.orders, '', item.amount]),
      ...report.groups.map((item) => [...prefix, report.groupBy, item.id ?? '', item.name, item.orders, item.units, item.amount])];
    return '\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
  }
}
