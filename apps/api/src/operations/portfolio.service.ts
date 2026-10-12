import { Injectable } from "@nestjs/common";
import { Prisma, Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { JwtUser } from "../common/types/jwt-user.type";
import { OperationsQueryDto } from "./dto/operations.dto";

@Injectable()
export class PortfolioService {
  constructor(private readonly prisma: PrismaService) {}
  async list(user: JwtUser, query: OperationsQueryDto) {
    const terms: Prisma.Sql[] = [];
    if (user.role === Role.SALES)
      terms.push(
        Prisma.sql`EXISTS (SELECT 1 FROM "Salesperson" s WHERE s."id" = c."salespersonId" AND s."userId" = ${user.sub})`,
      );
    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`;
      terms.push(
        Prisma.sql`(c."businessName" ILIKE ${term} OR c."rut" ILIKE ${term})`,
      );
    }
    if (query.filter === "INACTIVE")
      terms.push(
        Prisma.sql`stats."lastOrderAt" IS NULL OR stats."lastOrderAt" < CURRENT_TIMESTAMP - INTERVAL '30 days'`,
      );
    if (query.filter === "DELAYED") terms.push(Prisma.sql`stats.delayed > 0`);
    if (query.filter === "OVERDUE")
      terms.push(Prisma.sql`c."creditStatus"::text = 'PAYMENT_DELAY'`);
    if (query.filter === "REPLENISH")
      terms.push(
        Prisma.sql`EXISTS (SELECT 1 FROM "Order" o JOIN "OrderItem" i ON i."orderId" = o."id" JOIN "Product" p ON p."id" = i."productId" WHERE o."customerAccountId" = c."id" AND o."status"::text = 'DELIVERED' AND p."productType"::text = 'FOOD' AND p."active" = true AND p."deletedAt" IS NULL AND o."createdAt" > CURRENT_TIMESTAMP - INTERVAL '90 days' GROUP BY i."productId" HAVING count(DISTINCT o."id") >= 2 AND max(o."createdAt") BETWEEN CURRENT_TIMESTAMP - INTERVAL '45 days' AND CURRENT_TIMESTAMP - INTERVAL '21 days')`,
      );
    const predicate = terms.length
      ? Prisma.join(
          terms.map((term) => Prisma.sql`(${term})`),
          " AND ",
        )
      : Prisma.sql`true`;
    const base = Prisma.sql`FROM "CustomerAccount" c LEFT JOIN LATERAL (
      SELECT max(o."createdAt") FILTER (WHERE o."status"::text NOT IN ('CANCELLED','REJECTED','DRAFT')) AS "lastOrderAt",
        count(*) FILTER (WHERE o."status"::text IN ('SUBMITTED','PENDING_REVIEW','APPROVED','PROCESSING','SHIPPED') AND o."createdAt" < CURRENT_TIMESTAMP - INTERVAL '7 days')::integer AS delayed
      FROM "Order" o WHERE o."customerAccountId" = c."id"
    ) stats ON true WHERE ${predicate}`;
    const [items, count] = await this.prisma.$transaction([
      this.prisma.$queryRaw<
        {
          id: string;
          businessName: string;
          phone: string | null;
          lastOrderAt: Date | null;
          delayed: number;
          creditStatus: string;
        }[]
      >`SELECT c."id", c."businessName", c."phone", c."creditStatus", stats."lastOrderAt", stats.delayed ${base} ORDER BY (c."creditStatus"::text = 'PAYMENT_DELAY') DESC, stats.delayed DESC, stats."lastOrderAt" ASC NULLS FIRST, c."id" LIMIT ${query.limit} OFFSET ${(query.page - 1) * query.limit}`,
      this.prisma.$queryRaw<
        { total: number }[]
      >`SELECT count(*)::integer AS total ${base}`,
    ]);
    const recommendations = await this.prisma.$queryRaw<
      {
        customerId: string;
        productName: string;
        lastBought: Date;
        quantity: number;
      }[]
    >`
      SELECT o."customerAccountId" AS "customerId", p."name" AS "productName", max(o."createdAt") AS "lastBought", sum(i."quantity")::integer AS quantity
      FROM "Order" o JOIN "OrderItem" i ON i."orderId" = o."id" JOIN "Product" p ON p."id" = i."productId"
      WHERE o."customerAccountId" IN (${Prisma.join(items.map((row) => row.id).length ? items.map((row) => row.id) : [""])})
        AND o."status"::text = 'DELIVERED' AND p."productType"::text = 'FOOD'
        AND p."active" = true AND p."deletedAt" IS NULL
        AND o."createdAt" > CURRENT_TIMESTAMP - INTERVAL '90 days'
      GROUP BY o."customerAccountId", i."productId", p."name" HAVING count(DISTINCT o."id") >= 2 AND max(o."createdAt") BETWEEN CURRENT_TIMESTAMP - INTERVAL '45 days' AND CURRENT_TIMESTAMP - INTERVAL '21 days'
      ORDER BY max(o."createdAt") ASC LIMIT ${query.limit * 5}`;
    return {
      items: items.map((row) => ({
        ...row,
        replenishment: recommendations
          .filter((product) => product.customerId === row.id)
          .slice(0, 3),
      })),
      meta: {
        total: count[0]?.total ?? 0,
        page: query.page,
        limit: query.limit,
      },
      thresholds: {
        inactivityDays: 30,
        delayedDays: 7,
        replenishmentEstimated: true,
      },
    };
  }
}
