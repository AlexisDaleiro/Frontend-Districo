import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { Prisma } from "@prisma/client";
import { PerformanceService } from "../../src/operations/performance.service";
import {
  PerformanceBatchDto,
  PerformanceQueryDto,
} from "../../src/operations/dto/performance.dto";
import { PrismaService } from "../../src/prisma/prisma.service";
import { staffFeatureForPath } from "../../src/common/staff-role-access";
const sample = {
  sequence: 1,
  id: "46d8d58d-0dbe-4923-a37e-2d3dcba69049",
  name: "LCP" as const,
  value: 1500,
  page: "CATALOG",
  target: "PAGE",
  phase: "DOCUMENT",
  cache: "UNKNOWN",
  outcome: "OK",
};
const batch: PerformanceBatchDto = {
  consent: true,
  viewId: "a878b840-83f9-4c87-a9be-0c80463f28ad",
  device: "MOBILE",
  visit: "FIRST",
  environment: "PRODUCTION",
  release: "a3e3cdf",
  samples: [sample],
};
const normalizeSql = (
  input: Prisma.Sql | TemplateStringsArray,
  ...values: unknown[]
) =>
  "strings" in input ? (input as Prisma.Sql) : Prisma.sql(input, ...values);
const errors = (input: object) =>
  validateSync(plainToInstance(PerformanceBatchDto, input), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
test("performance payloads reject sensitive fields, unknown labels, absent consent and oversized batches", () => {
  assert.equal(errors(batch).length, 0);
  for (const input of [
    { ...batch, consent: false },
    { ...batch, email: "private@example.test" },
    { ...batch, samples: [{ ...sample, page: "/tienda/producto/secret" }] },
    { ...batch, samples: [{ ...sample, value: Infinity }] },
    { ...batch, samples: [{ ...sample, url: "https://private" }] },
    { ...batch, samples: Array(21).fill(sample) },
  ])
    assert.ok(errors(input).length);
  assert.equal(
    staffFeatureForPath("/api/admin/operations/performance"),
    "metricas",
  );
});
test("collection and reports remain safe before migration, without writing missing tables", async () => {
  let writes = 0;
  const service = new PerformanceService({
    $queryRaw: async () => [{ ready: false }],
    $executeRaw: async () => {
      writes++;
    },
  } as unknown as PrismaService);
  assert.deepEqual(await service.record(batch), {
    accepted: false,
    reason: "PENDING",
  });
  assert.equal(
    (await service.report(new PerformanceQueryDto())).readiness,
    "PENDING",
  );
  assert.equal(await service.removeExpired(), 0);
  assert.equal(writes, 0);
});
test("updates a vital instead of double-counting, preserves dimensions and uses a bounded view quota", async () => {
  let written: Prisma.Sql | undefined;
  const tx = {
    $queryRaw: async (
      input: Prisma.Sql | TemplateStringsArray,
      ...values: unknown[]
    ) => {
      const query = normalizeSql(input, ...values);
      return query.strings.join("").includes("count(*)")
        ? [{ total: 1 }]
        : query.strings.join("").includes('"id" IN')
          ? [{ id: sample.id }]
          : [];
    },
    $executeRaw: async (
      input: Prisma.Sql | TemplateStringsArray,
      ...values: unknown[]
    ) => {
      written = normalizeSql(input, ...values);
      return 1;
    },
  };
  const service = new PerformanceService({
    $queryRaw: async () => [{ ready: true }],
    $transaction: async (work: (tx: object) => unknown) => work(tx),
  } as unknown as PrismaService);
  assert.deepEqual(await service.record(batch), { accepted: true });
  assert.match(written!.sql, /ON CONFLICT/);
  assert.match(written!.sql, /"sequence" < EXCLUDED\."sequence"/);
  assert.match(written!.sql, /EXCLUDED\."value"/);
  assert.match(written!.sql, /"viewId" = EXCLUDED/);
  assert.ok(written!.values.includes(1500));
  assert.doesNotMatch(written!.sql, /cookie|email|url|userId/i);
  tx.$queryRaw = async (input, ...values) =>
    normalizeSql(input, ...values)
      .strings.join("")
      .includes("count(*)")
      ? [{ total: 200 }]
      : [];
  written = undefined;
  assert.deepEqual(await service.record(batch), {
    accepted: false,
    reason: "VIEW_LIMIT",
  });
  assert.equal(written, undefined);
});
test("report defaults to production, computes percentiles in SQL, excludes failed requests and keeps devices separate", async () => {
  const captured: Prisma.Sql[] = [];
  const service = new PerformanceService({
    $queryRaw: async (
      input: Prisma.Sql | TemplateStringsArray,
      ...values: unknown[]
    ) => {
      const query = normalizeSql(input, ...values);
      if (query.strings.join("").includes("_prisma_migrations"))
        return [{ ready: true }];
      captured.push(query);
      return [];
    },
    $transaction: async (rows: Promise<unknown>[]) => Promise.all(rows),
  } as unknown as PrismaService);
  await service.report({
    environment: "PRODUCTION",
    device: "MOBILE",
    pageGroup: "CATALOG",
    visit: "FIRST",
    dateFrom: "2026-10-01",
    dateTo: "2026-10-12",
  });
  assert.match(captured[0].sql, /percentile_cont\(0.75\)/);
  assert.match(captured[0].sql, /FILTER \(WHERE "outcome" = 'OK'\)/);
  assert.match(
    captured[0].sql,
    /GROUP BY "name","target","device","phase","cache"/,
  );
  assert.ok(captured[0].values.includes("PRODUCTION"));
  assert.ok(captured[0].values.includes("MOBILE"));
  await assert.rejects(
    service.report({
      environment: "PRODUCTION",
      dateFrom: "2026-01-01",
      dateTo: "2026-10-12",
    }),
    /rango/,
  );
  await assert.rejects(
    service.record({ ...batch, samples: [{ ...sample, phase: "SOFT" }] }),
    /válida/,
  );
});
