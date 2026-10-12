import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { OperationsQueryDto, UsageEventDto } from "./dto/operations.dto";

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}
  async record(dto: UsageEventDto) {
    if (!dto.consent)
      throw new BadRequestException("Se necesita consentimiento.");
    const kinds =
      dto.kind === "NO_RESULTS" ? ["SEARCH", "NO_RESULTS"] : [dto.kind];
    await this.prisma.$transaction(
      kinds.map((kind) =>
        this.prisma.usageEvent.upsert({
          where: { sessionId_kind: { sessionId: dto.sessionId, kind } },
          create: { sessionId: dto.sessionId, kind },
          update: {},
        }),
      ),
    );
    return { recorded: true };
  }
  async report(query: OperationsQueryDto) {
    const from = query.dateFrom
      ? new Date(`${query.dateFrom.slice(0, 10)}T00:00:00-03:00`)
      : new Date(Date.now() - 30 * 86400000);
    const to = query.dateTo
      ? new Date(
          new Date(`${query.dateTo.slice(0, 10)}T00:00:00-03:00`).getTime() +
            86400000,
        )
      : new Date();
    if (
      !Number.isFinite(from.getTime()) ||
      !Number.isFinite(to.getTime()) ||
      from >= to ||
      to.getTime() - from.getTime() > 90 * 86400000
    )
      throw new BadRequestException("Elegí un rango de hasta 90 días.");
    const cutoff = new Date(Math.min(to.getTime(), Date.now() - 3600000));
    const [usage, buyers, support] = await this.prisma.$transaction([
      this.prisma.$queryRaw<
        {
          searches: number;
          noResults: number;
          starts: number;
          abandoned: number;
        }[]
      >`
        SELECT count(*) FILTER (WHERE "kind" = 'SEARCH')::integer AS searches,
          count(*) FILTER (WHERE "kind" = 'NO_RESULTS')::integer AS "noResults",
          count(*) FILTER (WHERE "kind" = 'CHECKOUT_STARTED' AND "createdAt" <= ${cutoff})::integer AS starts,
          count(*) FILTER (WHERE "kind" = 'CHECKOUT_STARTED' AND "createdAt" <= ${cutoff} AND NOT EXISTS
            (SELECT 1 FROM "UsageEvent" completed WHERE completed."sessionId" = e."sessionId" AND completed."kind" = 'CHECKOUT_COMPLETED'))::integer AS abandoned
        FROM "UsageEvent" e WHERE "createdAt" >= ${from} AND "createdAt" < ${to}`,
      this.prisma.$queryRaw<{ buyers: number; repeat: number }[]>`
        SELECT count(*)::integer AS buyers, count(*) FILTER (WHERE purchases >= 2)::integer AS repeat FROM (
          SELECT "customerAccountId", count(*) AS purchases FROM "Order" WHERE "customerAccountId" IS NOT NULL
          AND "createdAt" >= ${from} AND "createdAt" < ${to} AND "status"::text NOT IN ('DRAFT','CANCELLED','REJECTED') GROUP BY "customerAccountId"
        ) customers`,
      this.prisma.$queryRaw<
        { resolved: number; resolutionHours: number | null; overdue: number }[]
      >`
        SELECT count(*) FILTER (WHERE "resolvedAt" IS NOT NULL)::integer AS resolved,
        avg(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt"))/3600) FILTER (WHERE "resolvedAt" IS NOT NULL)::float AS "resolutionHours",
        count(*) FILTER (WHERE "resolvedAt" IS NULL AND "responseDueAt" < CURRENT_TIMESTAMP)::integer AS overdue
        FROM "ContactInquiry" WHERE "createdAt" >= ${from} AND "createdAt" < ${to}`,
    ]);
    return {
      from,
      to,
      usage: usage[0],
      customers: buyers[0],
      support: support[0],
      consentOnly: true,
      abandonmentGraceMinutes: 60,
    };
  }
}
