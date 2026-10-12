import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  PerformanceBatchDto,
  PerformanceQueryDto,
} from "./dto/performance.dto";

@Injectable()
export class PerformanceService {
  private check?: {
    until: number;
    result: Promise<"READY" | "PENDING" | "UNAVAILABLE">;
  };
  constructor(private readonly prisma: PrismaService) {}
  readiness() {
    if (!this.check || this.check.until < Date.now()) {
      const result = this.prisma.$queryRaw<
        { ready: boolean }[]
      >`SELECT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20261012000300_real_performance_metrics' AND finished_at IS NOT NULL AND rolled_back_at IS NULL) AS ready`
        .then((rows) =>
          rows[0]?.ready ? ("READY" as const) : ("PENDING" as const),
        )
        .catch(() => "UNAVAILABLE" as const);
      this.check = { until: Date.now() + 60000, result };
    }
    return this.check.result;
  }
  async record(dto: PerformanceBatchDto) {
    if (
      !dto.consent ||
      dto.samples.some(
        (sample) =>
          (sample.name === "CLS" && sample.value > 10) ||
          (["LCP", "INP", "CLS", "FCP", "TTFB"].includes(sample.name) &&
            (sample.phase === "SOFT" ||
              sample.target !== "PAGE" ||
              sample.cache !== "UNKNOWN" ||
              sample.outcome !== "OK")),
      )
    )
      throw new BadRequestException("La muestra de rendimiento no es válida.");
    const readiness = await this.readiness();
    if (readiness !== "READY") return { accepted: false, reason: readiness };
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`performance:${dto.viewId}`}))::text`;
      const [quota] = await tx.$queryRaw<
        { total: number }[]
      >`SELECT count(*)::integer AS total FROM "PerformanceSample" WHERE "viewId" = ${dto.viewId}`;
      const existing = await tx.$queryRaw<
        { id: string }[]
      >`SELECT "id" FROM "PerformanceSample" WHERE "viewId" = ${dto.viewId} AND "id" IN (${Prisma.join(dto.samples.map((sample) => sample.id))})`;
      if (
        (quota?.total ?? 0) +
          dto.samples.filter(
            (sample) => !existing.some((row) => row.id === sample.id),
          ).length >
        200
      )
        return { accepted: false, reason: "VIEW_LIMIT" };
      const rows = dto.samples.map(
        (sample) =>
          Prisma.sql`(${sample.id},${sample.sequence},${dto.viewId},${sample.name},${sample.value},${sample.page},${sample.target},${sample.phase},${sample.cache},${sample.outcome},${dto.device},${dto.visit},${dto.environment},${dto.release})`,
      );
      await tx.$executeRaw`INSERT INTO "PerformanceSample" ("id","sequence","viewId","name","value","page","target","phase","cache","outcome","device","visit","environment","release") VALUES ${Prisma.join(rows)}
        ON CONFLICT ("id") DO UPDATE SET "value" = EXCLUDED."value", "sequence" = EXCLUDED."sequence", "cache" = EXCLUDED."cache", "outcome" = EXCLUDED."outcome"
        WHERE "PerformanceSample"."sequence" < EXCLUDED."sequence" AND "PerformanceSample"."viewId" = EXCLUDED."viewId" AND "PerformanceSample"."name" = EXCLUDED."name" AND "PerformanceSample"."page" = EXCLUDED."page" AND "PerformanceSample"."target" = EXCLUDED."target" AND "PerformanceSample"."phase" = EXCLUDED."phase"
          AND "PerformanceSample"."device" = EXCLUDED."device" AND "PerformanceSample"."visit" = EXCLUDED."visit" AND "PerformanceSample"."environment" = EXCLUDED."environment" AND "PerformanceSample"."release" = EXCLUDED."release"`;
      return { accepted: true };
    });
  }
  async report(query: PerformanceQueryDto) {
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
    const readiness = await this.readiness();
    if (readiness !== "READY")
      return { readiness, from, to, rows: [], views: 0 };
    const terms = [
      Prisma.sql`"createdAt" >= ${from}`,
      Prisma.sql`"createdAt" < ${to}`,
      Prisma.sql`"environment" = ${query.environment}`,
    ];
    if (query.device) terms.push(Prisma.sql`"device" = ${query.device}`);
    if (query.visit) terms.push(Prisma.sql`"visit" = ${query.visit}`);
    if (query.pageGroup) terms.push(Prisma.sql`"page" = ${query.pageGroup}`);
    if (query.release) terms.push(Prisma.sql`"release" = ${query.release}`);
    const where = Prisma.join(terms, " AND ");
    const [rows, counts] = await this.prisma.$transaction([
      this.prisma.$queryRaw<
        {
          name: string;
          target: string;
          device: string;
          phase: string;
          cache: string;
          samples: number;
          validSamples: number;
          errors: number;
          p50: number | null;
          p75: number | null;
          p95: number | null;
        }[]
      >`
        SELECT "name","target","device","phase","cache",count(*)::integer AS samples,
          count(*) FILTER (WHERE "outcome" = 'OK')::integer AS "validSamples", count(*) FILTER (WHERE "outcome" = 'ERROR')::integer AS errors,
          percentile_cont(0.50) WITHIN GROUP (ORDER BY "value") FILTER (WHERE "outcome" = 'OK')::double precision AS "p50",
          percentile_cont(0.75) WITHIN GROUP (ORDER BY "value") FILTER (WHERE "outcome" = 'OK')::double precision AS "p75",
          percentile_cont(0.95) WITHIN GROUP (ORDER BY "value") FILTER (WHERE "outcome" = 'OK')::double precision AS "p95"
        FROM "PerformanceSample" WHERE ${where} GROUP BY "name","target","device","phase","cache" ORDER BY "name","device","target","phase","cache"`,
      this.prisma.$queryRaw<
        { views: number }[]
      >`SELECT count(DISTINCT "viewId")::integer AS views FROM "PerformanceSample" WHERE ${where}`,
    ]);
    return { readiness, from, to, rows, views: counts[0]?.views ?? 0 };
  }
  async removeExpired() {
    if ((await this.readiness()) !== "READY") return 0;
    return this.prisma
      .$executeRaw`DELETE FROM "PerformanceSample" WHERE "createdAt" < ${new Date(Date.now() - 90 * 86400000)}`;
  }
}
