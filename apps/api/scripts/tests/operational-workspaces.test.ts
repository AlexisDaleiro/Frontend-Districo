import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { Prisma, Role } from "@prisma/client";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { PrismaService } from "../../src/prisma/prisma.service";
import { FinanceService } from "../../src/operations/finance.service";
import { LogisticsService } from "../../src/operations/logistics.service";
import { MetricsService } from "../../src/operations/metrics.service";
import { SupportService } from "../../src/operations/support.service";
import { RecruitmentService } from "../../src/operations/recruitment.service";
import { OperationsReadyGuard } from "../../src/operations/operations-ready.guard";
import { parseMovements } from "../../src/operations/movement-import";
import {
  agingBucket,
  overdueInstallments,
  remaining,
  validateQuantities,
} from "../../src/operations/operation-rules";
import { UsageEventDto } from "../../src/operations/dto/operations.dto";
import {
  productSearchWhere,
  searchTerms,
} from "../../src/catalog/products/product-search";
import {
  defaultStaffAccess,
  staffFeatureForPath,
} from "../../src/common/staff-role-access";
import { NotificationsService } from "../../src/notifications/notifications.service";
import { CvStorageService } from "../../src/jobs/cv-storage.service";
import { OrdersService } from "../../src/orders/orders.service";
import { InventoryService } from "../../src/inventory/inventory.service";
import { PromotionsService } from "../../src/promotions/promotions.service";
import { AuditService } from "../../src/audit/audit.service";

const admin = {
  sub: "staff",
  role: Role.ADMIN,
  email: "staff@example.test",
  permissions: [],
};
const D = (value: number) => new Prisma.Decimal(value);
const requestId = "a365df00-47c9-49b6-a45e-65f08e897a38";
const fake = (tx: object) =>
  ({
    ...tx,
    $transaction: async (work: unknown) =>
      typeof work === "function"
        ? work(tx)
        : Promise.all(work as Promise<unknown>[]),
  }) as unknown as PrismaService;

test("money, refunds and credit use integer cents", () => {
  assert.equal(remaining("100.10", "30.05", "10.00", "5.00"), 65.05);
  assert.equal(remaining(20, 30), 0);
});
test("aging distinguishes current and all late buckets", () => {
  const now = new Date("2026-10-12T12:00:00Z");
  for (const [days, bucket] of [
    [-1, "CURRENT"],
    [1, "1_30"],
    [31, "31_60"],
    [61, "61_90"],
    [91, "90_PLUS"],
  ] as const)
    assert.equal(
      agingBucket(new Date(now.getTime() - days * 86400000), now),
      bucket,
    );
});
test("aging uses the first unpaid installment, not final balance maturity", () => {
  const order = {
    total: D(300),
    paidTotal: D(110),
    creditedTotal: D(0),
    refundedTotal: D(0),
    paymentDueAt: null,
    paymentSchedule: [
      { amountCents: 10000, dueAt: "2026-09-01" },
      { amountCents: 10000, dueAt: "2026-10-01" },
      { amountCents: 10000, dueAt: "2026-11-01" },
    ],
  };
  assert.equal(
    overdueInstallments(order)?.toISOString().slice(0, 10),
    "2026-10-01",
  );
  assert.equal(overdueInstallments({ ...order, paidTotal: D(300) }), null);
});
test("quantities reject duplicate lines, overpicking, unknown products and empty batches", () => {
  for (const lines of [
    [],
    [{ orderItemId: "a", quantity: 4 }],
    [{ orderItemId: "b", quantity: 1 }],
    [
      { orderItemId: "a", quantity: 1 },
      { orderItemId: "a", quantity: 1 },
    ],
  ])
    assert.throws(() => validateQuantities(lines, new Map([["a", 3]])));
  assert.doesNotThrow(() =>
    validateQuantities(
      [{ orderItemId: "a", quantity: 3 }],
      new Map([["a", 3]]),
    ),
  );
});
test("CSV parser accepts BOM and quoted commas, flags duplicate and invalid rows", () => {
  const parsed = parseMovements(
    '\ufeffreference,occurredAt,amount,currency,description\nr1,2026-10-12,100.50,UYU,"Cobro, sucursal"\nr1,2026-10-12,50,UYU,Duplicado\nr3,not-a-date,20,UYU,Fecha',
  );
  assert.equal(parsed.movements[0].description, "Cobro, sucursal");
  assert.equal(parsed.movements.length, 1);
  assert.equal(parsed.errors.length, 2);
  assert.throws(() => parseMovements("invalid"));
  assert.throws(() => parseMovements("x".repeat(250001)));
});
test("search expands synonyms without turning species or stages into synonyms", () => {
  assert.ok(searchTerms("comida para perro")[0].includes("alimento"));
  assert.deepEqual(searchTerms("gatito cachorro"), [["gatito"], ["cachorro"]]);
  const query = JSON.stringify(productSearchWhere("SKU-001"));
  assert.match(query, /sku/);
  assert.match(query, /ean/);
  assert.match(query, /deletedAt/);
});
test("new route permissions are independent of order and billing permissions", () => {
  assert.equal(
    staffFeatureForPath("/admin/operations/finance/reconciliations"),
    "finanzas",
  );
  assert.equal(staffFeatureForPath("/admin/operations/logistics"), "logistica");
  assert.equal(defaultStaffAccess(Role.SALES, "finanzas").canView, false);
  assert.equal(defaultStaffAccess(Role.FINANCE, "finanzas").canEdit, true);
  assert.equal(defaultStaffAccess(Role.CATALOG, "logistica").canView, false);
});
test("unmigrated modules return an activation error rather than querying missing tables", async () => {
  const guard = new OperationsReadyGuard({
    operationalSchemaReady: async () => false,
  } as unknown as PrismaService);
  await assert.rejects(guard.canActivate(), /migración/);
});
test("reconciliation validates the payment remainder and writes no match on overpayment", async () => {
  let created = false;
  const tx = {
    $queryRaw: async () => [],
    paymentReconciliation: {
      findUnique: async () => null,
      create: async () => {
        created = true;
      },
    },
    bankMovement: {
      findUnique: async () => ({
        amount: D(100),
        currency: "UYU",
        reconciliations: [],
      }),
    },
    orderPayment: {
      findUnique: async () => ({
        amount: D(100),
        voidedAt: null,
        order: { currency: "UYU" },
        reconciliations: [{ amount: D(70) }],
      }),
    },
  };
  await assert.rejects(
    new FinanceService(fake(tx)).reconcile(
      { requestId, movementId: "m", paymentId: "p", amount: 31 },
      admin,
    ),
    /saldo/,
  );
  assert.equal(created, false);
});
test("reconciliation retries return their original match; changed values conflict", async () => {
  const tx = {
    $queryRaw: async () => [],
    paymentReconciliation: {
      findUnique: async () => ({
        id: requestId,
        movementId: "m",
        paymentId: "p",
        amount: D(20),
      }),
    },
  };
  const service = new FinanceService(fake(tx));
  assert.equal(
    (
      await service.reconcile(
        { requestId, movementId: "m", paymentId: "p", amount: 20 },
        admin,
      )
    ).id,
    requestId,
  );
  await assert.rejects(
    service.reconcile(
      { requestId, movementId: "m", paymentId: "p", amount: 21 },
      admin,
    ),
    /otros valores/,
  );
});
test("voiding locks movement then payment and retains the original record", async () => {
  const locks: string[] = [];
  let audited = 0;
  const tx = {
    $queryRaw: async (sql: TemplateStringsArray) => {
      locks.push(sql.join("?"));
    },
    paymentReconciliation: {
      findUnique: async () => ({ movementId: "m", paymentId: "p" }),
      updateMany: async () => ({ count: 1 }),
    },
    auditLog: {
      create: async () => {
        audited++;
      },
    },
  };
  await new FinanceService(fake(tx)).voidMatch(
    "match",
    "Corrección de referencia",
    admin,
  );
  assert.match(locks[0], /BankMovement/);
  assert.match(locks[1], /OrderPayment/);
  assert.equal(audited, 1);
});
test("logistics selects no financial amounts and paginates picking lists", async () => {
  let select: unknown;
  const tx = {
    order: {
      findMany: async (query: {
        select: unknown;
        skip: number;
        take: number;
      }) => {
        select = query.select;
        assert.equal(query.skip, 20);
        return [];
      },
      count: async () => 0,
    },
  };
  await new LogisticsService(fake(tx)).list({ page: 2, limit: 20 });
  assert.doesNotMatch(JSON.stringify(select), /paidTotal|total|payment|credit/);
});
test("partial delivery preserves outstanding quantities; final delivery closes the order", async () => {
  for (const quantity of [2, 5]) {
    let changedStatus: string | undefined;
    const batch = {
      id: "batch",
      orderId: "order",
      deliveredAt: null,
      items: [{ orderItemId: "line", quantity }],
    };
    const order = {
      id: "order",
      status: "SHIPPED",
      items: [{ id: "line", quantity: 5 }],
      fulfillments: [batch],
    };
    const tx = {
      $queryRaw: async () => [],
      orderFulfillment: {
        findUnique: async () => batch,
        update: async () => ({ ...batch, deliveredAt: new Date() }),
      },
      order: {
        findUniqueOrThrow: async () => order,
        update: async ({ data }: { data: { status: string } }) => {
          changedStatus = data.status;
        },
      },
      auditLog: { create: async () => ({}) },
    };
    await new LogisticsService(fake(tx)).deliver(
      "batch",
      { receivedBy: "Recepción", proof: "Constancia 001" },
      admin,
    );
    assert.equal(changedStatus, quantity === 5 ? "DELIVERED" : undefined);
  }
});
test("customer threads explicitly exclude internal notes and other accounts", async () => {
  let query: unknown;
  const service = new SupportService(
    fake({
      contactInquiry: {
        findMany: async (args: unknown) => {
          query = args;
          return [];
        },
      },
    }),
    {} as NotificationsService,
  );
  await service.myThreads({
    ...admin,
    role: Role.CLIENT,
    customerAccountId: "own",
  });
  assert.match(JSON.stringify(query), /"customerId":"own"/);
  assert.match(JSON.stringify(query), /"visibility":"CUSTOMER"/);
  assert.doesNotMatch(
    JSON.stringify(query),
    /internalNote|email|phone|recordedBy/,
  );
});
test("internal support notes cannot be emailed and seller cannot see unassigned accounts", async () => {
  const prisma = fake({
    contactInquiry: {
      findUnique: async () => ({ id: "q", customerId: "other" }),
    },
    customerAccount: { findFirst: async () => null },
  });
  const service = new SupportService(prisma, {} as NotificationsService);
  await assert.rejects(
    service.addEntry(
      "q",
      {
        requestId,
        visibility: "INTERNAL",
        sendEmail: true,
        body: "Nota privada",
      },
      admin,
    ),
    /interna/,
  );
  await assert.rejects(
    service.detail("q", { ...admin, role: Role.SALES }),
    /cartera/,
  );
});
test("interviews require dates; unconfigured email never sends or drops a note silently", async () => {
  const service = new RecruitmentService(
    fake({ jobApplication: { findUnique: async () => ({ id: "candidate" }) } }),
    {} as CvStorageService,
    { settings: () => ({ ready: false }) } as unknown as NotificationsService,
  );
  await assert.rejects(
    service.add(
      "candidate",
      { requestId, kind: "INTERVIEW", body: "Entrevista" },
      admin,
    ),
    /fecha/,
  );
  await assert.rejects(
    service.add(
      "candidate",
      { requestId, kind: "EMAIL", body: "Invitación", sendEmail: true },
      admin,
    ),
    /configurado/,
  );
});
test("CV retention default is database-side so legacy submissions omit the new column", () => {
  const model = Prisma.dmmf.datamodel.models.find(
    (model) => model.name === "JobApplication",
  );
  const field = model?.fields.find(
    (field) => field.name === "cvRetentionMonths",
  );
  assert.deepEqual(field?.default, { name: "dbgenerated", args: ["0"] });
});

test("CV retention locks before checking deletion and cannot restore a deleted file", async () => {
  const calls: string[] = [];
  const service = new RecruitmentService(
    fake({
      $queryRaw: async () => {
        calls.push("lock");
        return [];
      },
      jobApplication: {
        findUnique: async () => {
          calls.push("read");
          return { cvDeletedAt: new Date() };
        },
        update: async () => {
          calls.push("update");
        },
      },
    }),
    {} as CvStorageService,
    {} as NotificationsService,
  );
  await assert.rejects(service.retention("candidate", 6, admin), /eliminado/);
  assert.deepEqual(calls, ["lock", "read"]);
});

test("interview agenda filters dates and candidates, paginates and excludes CV/contact payloads", async () => {
  let captured: Record<string, unknown> | undefined;
  const service = new RecruitmentService(
    fake({
      candidateActivity: {
        findMany: async (query: Record<string, unknown>) => {
          captured = query;
          return [];
        },
        count: async () => 41,
      },
    }),
    {} as CvStorageService,
    {} as NotificationsService,
  );
  const result = await service.interviews({
    page: 2,
    limit: 20,
    search: "Ana",
    dateFrom: "2026-10-12",
    dateTo: "2026-10-20",
  });
  assert.equal(result.meta.total, 41);
  assert.equal(captured?.skip, 20);
  assert.equal(captured?.take, 20);
  const where = captured?.where as Prisma.CandidateActivityWhereInput;
  assert.equal(where.kind, "INTERVIEW");
  assert.match(JSON.stringify(where), /Ana/);
  assert.match(JSON.stringify(where), /2026-10-12T03:00:00/);
  assert.doesNotMatch(JSON.stringify(captured?.select), /email|phone|cvPath/);
  await assert.rejects(
    service.interviews({
      page: 1,
      limit: 20,
      dateFrom: "2026-10-20",
      dateTo: "2026-10-12",
    }),
    /rango/,
  );
});

test("CV cleanup cannot mark files removed when Storage deletion fails", async () => {
  let changed = false;
  const tx = {
    $queryRaw: async () => [],
    jobApplication: {
      findMany: async () => [{ id: "c" }],
      findUniqueOrThrow: async () => ({
        cvDeletedAt: null,
        cvDeleteAfter: new Date(0),
        cvPath: "private.pdf",
      }),
      update: async () => {
        changed = true;
      },
    },
  };
  const service = new RecruitmentService(
    fake(tx),
    {
      removeConfirmed: async () => {
        throw new Error("storage unavailable");
      },
    } as unknown as CvStorageService,
    {} as NotificationsService,
  );
  await assert.rejects(service.cleanup(admin), /storage unavailable/);
  assert.equal(changed, false);
  await assert.rejects(
    service.cleanup({ ...admin, role: Role.SALES }),
    /administración/,
  );
});
test("usage DTO rejects text, identity and missing consent; zero results always has a search", async () => {
  assert.ok(
    validateSync(
      plainToInstance(UsageEventDto, {
        sessionId: requestId,
        kind: "SEARCH",
        consent: true,
        email: "private@example.test",
      }),
      { whitelist: true, forbidNonWhitelisted: true },
    ).length,
  );
  const kinds: string[] = [];
  const service = new MetricsService(
    fake({
      usageEvent: {
        upsert: async ({ create }: { create: { kind: string } }) => {
          kinds.push(create.kind);
        },
      },
    }),
  );
  await assert.rejects(
    service.record({ sessionId: requestId, kind: "SEARCH", consent: false }),
    /consentimiento/,
  );
  await service.record({
    sessionId: requestId,
    kind: "NO_RESULTS",
    consent: true,
  });
  assert.deepEqual(kinds, ["SEARCH", "NO_RESULTS"]);
});
test("customer history binds identity, shares the count predicate and selects summaries only", async () => {
  const queries: Prisma.Sql[] = [];
  let selection: Prisma.OrderFindManyArgs | undefined;
  const tx = {
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const query = Prisma.sql(strings, ...values);
      queries.push(query);
      return query.sql.includes("count(*)")
        ? [{ total: 21 }]
        : [{ id: "order" }];
    },
    order: {
      findMany: async (args: Prisma.OrderFindManyArgs) => {
        selection = args;
        return [{ id: "order", _count: { items: 3 } }];
      },
    },
  };
  const service = new OrdersService(
    fake(tx),
    {} as InventoryService,
    {} as PromotionsService,
    {} as AuditService,
    {} as NotificationsService,
  );
  const result = await service.findMyOrdersPage(
    { ...admin, role: Role.CLIENT },
    {
      page: 2,
      limit: 12,
      paymentStatus: "PARTIAL",
      dateFrom: "2026-10-01",
      search: "%SKU_",
    },
  );
  assert.equal(result.meta.total, 21);
  assert.equal(result.items[0].itemCount, 3);
  assert.equal(selection?.where?.userId, admin.sub);
  assert.equal(selection?.include, undefined);
  assert.equal(selection?.select?.items, undefined);
  assert.equal(selection?.select?.payments, undefined);
  assert.ok(queries.every((query) => query.values.includes(admin.sub)));
  assert.ok(queries.every((query) => query.values.includes("%\\%SKU\\_%")));
  for (const dateFrom of ["2026-02-30", "2026-99-99", "invalid"])
    await assert.rejects(
      service.findMyOrdersPage(admin, { page: 1, limit: 12, dateFrom }),
      /fechas/,
    );
});
test("successful reconciliation audits once, rejects mixed currency and voided payments", async () => {
  let audited = 0;
  const payment = {
    amount: D(100),
    voidedAt: null as Date | null,
    order: { currency: "UYU" },
    reconciliations: [],
  };
  const tx = {
    $queryRaw: async () => [],
    paymentReconciliation: {
      findUnique: async () => null,
      create: async ({ data }: { data: object }) => data,
    },
    bankMovement: {
      findUnique: async () => ({
        amount: D(100),
        currency: "UYU",
        reconciliations: [],
      }),
    },
    orderPayment: { findUnique: async () => payment },
    auditLog: {
      create: async () => {
        audited++;
      },
    },
  };
  const service = new FinanceService(fake(tx));
  await service.reconcile(
    { requestId, movementId: "m", paymentId: "p", amount: 20 },
    admin,
  );
  assert.equal(audited, 1);
  payment.order.currency = "USD";
  await assert.rejects(
    service.reconcile(
      { requestId, movementId: "m", paymentId: "p", amount: 20 },
      admin,
    ),
    /monedas/,
  );
  payment.voidedAt = new Date();
  await assert.rejects(
    service.reconcile(
      { requestId, movementId: "m", paymentId: "p", amount: 20 },
      admin,
    ),
    /disponible/,
  );
});
test("preparing a partial batch does not change inventory again and rejects overpicking", async () => {
  let created = 0;
  const tx = {
    $queryRaw: async () => [],
    orderFulfillment: {
      findUnique: async () => null,
      create: async () => {
        created++;
        return { id: requestId };
      },
    },
    order: {
      findUnique: async () => ({
        status: "APPROVED",
        items: [{ id: "line", quantity: 5 }],
        fulfillments: [{ items: [{ orderItemId: "line", quantity: 2 }] }],
      }),
      update: async () => ({}),
    },
    auditLog: { create: async () => ({}) },
  };
  const service = new LogisticsService(fake(tx));
  await assert.rejects(
    service.prepare(
      "order",
      { requestId, items: [{ orderItemId: "line", quantity: 4 }] },
      admin,
    ),
    /cantidades/,
  );
  assert.equal(created, 0);
  await service.prepare(
    "order",
    { requestId, items: [{ orderItemId: "line", quantity: 3 }] },
    admin,
  );
  assert.equal(created, 1);
});
