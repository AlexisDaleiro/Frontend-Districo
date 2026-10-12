import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { demoJobOpenings } from "../../src/data/job-openings";
import type { Product } from "../../src/lib/types";

test.skip(
  process.env.E2E_OPERATIONS_MOCK !== "1",
  "Requires the isolated real-mode preview; all API responses are mocked.",
);
const meta = { total: 1, page: 1, limit: 20 };
const stamp = "2026-10-12T12:00:00Z";
const catalogRecord = JSON.parse(
  readFileSync(resolve(process.cwd(), "src/data/catalog.json"), "utf8"),
)[0] as { image: string };
const sampleProduct = {
  id: "search-product",
  slug: "search-product",
  name: "Alimento de prueba",
  description: "Alimento para probar el catálogo.",
  shortDescription: "Alimento de prueba",
  active: true,
  productType: "FOOD",
  source: "DISTRICO",
  requiresMedicationPermission: false,
  categories: [],
  attributes: [],
  brand: null,
  laboratory: null,
  media: [
    { id: "image", type: "IMAGE", url: catalogRecord.image, isPrimary: true },
  ],
  variants: [
    {
      id: "variant",
      name: "1 kg",
      sku: "SKU-001",
      active: true,
      availableStock: 40,
      saleMultiple: 1,
      minimumOrderQuantity: 1,
      price: { amount: 390, currency: "UYU" },
    },
  ],
  variantCount: 1,
} satisfies Product & { variantCount: number };

async function workspace(page: Page, role = "ADMIN") {
  const writes: { path: string; body: Record<string, unknown> }[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/backend/**", async (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname.replace("/api/backend/", "");
    if (route.request().method() !== "GET") {
      writes.push({ path, body: route.request().postDataJSON() });
      await route.fulfill({ json: { success: true } });
      return;
    }
    let body: unknown = [];
    if (path === "auth/me")
      body = {
        id: "qa-user",
        email: "qa@example.test",
        role,
        active: true,
        customerAccountId: "qa-customer",
        permissions: ["CAN_VIEW_PRICES", "CAN_PLACE_ORDERS"],
      };
    else if (path === "cart") body = { items: [], total: 0, currency: "UYU" };
    else if (path === "admin/dashboard") body = {};
    else if (path === "orders/me/page")
      body = {
        items: [
          {
            id: "order",
            orderNumber: "PEDIDO-001",
            status: "DELIVERED",
            createdAt: stamp,
            total: 100,
            paidTotal: 40,
            creditedTotal: 0,
            refundedTotal: 0,
            currency: "UYU",
            itemCount: 3,
          },
        ],
        meta: { ...meta, limit: 12 },
      };
    else if (path === "admin/operations/finance/movements")
      body = {
        items: [
          {
            id: "movement",
            reference: "BANCO-001",
            occurredAt: stamp,
            description: "Cobro de prueba",
            amount: 100,
            matched: 0,
            difference: 100,
            currency: "UYU",
            conflict: false,
            reconciliations: [],
          },
        ],
        meta,
      };
    else if (path === "admin/operations/finance/payments")
      body = {
        items: [
          {
            id: "payment",
            amount: 100,
            unmatched: 100,
            order: { orderNumber: "PEDIDO-001", currency: "UYU" },
          },
        ],
        meta,
      };
    else if (path === "admin/operations/finance/receivables")
      body = {
        items: [
          {
            id: "order",
            orderNumber: "PEDIDO-001",
            currency: "UYU",
            balance: 60,
            dueAt: stamp,
            bucket: "1_30",
            customerAccount: { businessName: "Comercio de prueba" },
            followups: [],
          },
        ],
        meta,
      };
    else if (path === "admin/operations/logistics")
      body = {
        items: [
          {
            id: "order",
            orderNumber: "PEDIDO-001",
            status: "SHIPPED",
            deliveryAddress: "Dirección de prueba",
            deliveryCity: "Montevideo",
            items: [
              {
                id: "line",
                sku: "SKU-001",
                productName: "Alimento de prueba",
                variantName: "1 kg",
                quantity: 5,
              },
            ],
            customerAccount: { businessName: "Comercio de prueba" },
            fulfillments: [
              {
                id: "batch",
                createdAt: stamp,
                deliveredAt: null,
                items: [{ orderItemId: "line", quantity: 2 }],
              },
            ],
          },
        ],
        meta,
      };
    else if (path === "admin/operations/portfolio")
      body = {
        items: [
          {
            id: "customer",
            businessName: "Comercio de prueba",
            phone: "099000000",
            lastOrderAt: null,
            delayed: 2,
            creditStatus: "PAYMENT_DELAY",
            replenishment: [{ productName: "Alimento habitual" }],
          },
        ],
        meta,
      };
    else if (path === "admin/operations/metrics")
      body = {
        from: stamp,
        to: stamp,
        usage: { searches: 10, noResults: 2, starts: 8, abandoned: 2 },
        customers: { buyers: 10, repeat: 3 },
        support: { resolved: 4, resolutionHours: 5.5, overdue: 1 },
      };
    else if (path === "admin/jobs")
      body = {
        items: [{ ...demoJobOpenings[0], id: "job", isExample: false }],
        meta,
      };
    else if (path === "admin/operations/recruitment/interviews")
      body = {
        items: [
          {
            id: "interview",
            scheduledAt: "2026-10-20T13:00:00Z",
            body: "Entrevista de ventas",
            candidate: {
              id: "candidate",
              name: "Candidato de prueba",
              status: "INTERVIEW",
              job: { id: "job", title: "Vendedor de prueba" },
            },
          },
        ],
        meta,
      };
    else if (path === "admin/jobs/job")
      body = { ...demoJobOpenings[0], id: "job", isExample: false };
    else if (path === "admin/jobs/job/applications")
      body = {
        items: [
          {
            id: "candidate",
            jobId: "job",
            name: "Candidato de prueba",
            email: "candidate@example.test",
            phone: "099000000",
            status: "NEW",
            cvFilename: "cv.pdf",
            cvSize: 100,
            createdAt: stamp,
          },
        ],
        meta,
      };
    else if (path === "admin/operations/recruitment/candidate")
      body = {
        cvDeletedAt: null,
        cvDeleteAfter: null,
        cvRetentionMonths: 0,
        items: [],
      };
    else if (path === "account/queries")
      body = [
        {
          id: "query",
          message: "Consulta sobre mi pedido de prueba",
          status: "NEW",
          createdAt: stamp,
          entries: [
            {
              id: "reply",
              body: "Respuesta visible de prueba",
              createdAt: stamp,
            },
          ],
        },
      ];
    else if (path === "products/suggestions")
      body = {
        items: [
          {
            id: sampleProduct.id,
            name: sampleProduct.name,
            slug: sampleProduct.slug,
          },
        ],
      };
    else if (path === "products/search-product") body = sampleProduct;
    else if (path === "products/cards")
      body = {
        items: url.searchParams.has("search") ? [] : [sampleProduct],
        meta: { ...meta, total: url.searchParams.has("search") ? 0 : 1 },
      };
    else if (path.includes("/page"))
      body = { items: [], meta: { ...meta, total: 0 } };
    await route.fulfill({ json: body });
  });
  return { writes, errors };
}

test("finance records a partial association and protects unsaved tab navigation", async ({
  page,
}, info) => {
  const { writes, errors } = await workspace(page);
  await page.goto("/tienda/admin/finanzas");
  await page.getByRole("button", { name: "Ver conciliación" }).click();
  await page
    .getByRole("combobox", { name: "Pago", exact: true })
    .selectOption("payment");
  await page.getByLabel("Importe a asociar").fill("40");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar conciliación" }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0].body).toMatchObject({
    movementId: "movement",
    paymentId: "payment",
    amount: 40,
  });
  expect(writes[0].body.requestId).toMatch(/^[a-f0-9-]{36}$/);
  await page.screenshot({ path: info.outputPath("finance-desktop.png") });
  await page.getByRole("tab", { name: "Vencimientos y cobranza" }).click();
  await expect(page.getByRole("cell", { name: "Hasta 30 días" })).toBeVisible();
  expect(errors).toEqual([]);
});
test("warehouse quantities are controlled, proof is required, and mobile does not overflow", async ({
  page,
}, info) => {
  const { writes, errors } = await workspace(page);
  await page.goto("/tienda/admin/logistica");
  await page.getByRole("button", { name: "Preparación y entregas" }).click();
  await expect(
    page.getByLabel("Preparar Alimento de prueba, 1 kg"),
  ).toHaveAttribute("max", "3");
  await page.getByLabel("Recibió", { exact: true }).fill("Recepción de prueba");
  await page.getByLabel("Constancia de entrega").fill("Remito firmado 001");
  await page
    .getByRole("button", { name: "Confirmar entrega", exact: true })
    .click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0].body).toEqual({
    receivedBy: "Recepción de prueba",
    proof: "Remito firmado 001",
  });
  expect(await page.locator(".admin-main").textContent()).not.toMatch(
    /Saldo|Abonado|Deuda/,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath("logistics-mobile.png") });
  expect(errors).toEqual([]);
});
test("customer history has shareable filters and queries expose only customer messages", async ({
  page,
}) => {
  const { writes, errors } = await workspace(page, "CLIENT");
  await page.goto("/tienda/cuenta/pedidos");
  await expect(
    page.getByRole("link", { name: "PEDIDO-001", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Pago", exact: true })
    .selectOption("PARTIAL");
  await expect(page).toHaveURL(/paymentStatus=PARTIAL/);
  await page.getByLabel("Desde", { exact: true }).fill("2026-10-01");
  await expect(page).toHaveURL(/dateFrom=2026-10-01/);
  await page.goto("/tienda/cuenta/consultas");
  await expect(page.getByText("Respuesta visible de prueba")).toBeVisible();
  await page
    .getByLabel("Consulta", { exact: true })
    .fill("Necesito ayuda con el pedido de prueba.");
  await page.getByRole("button", { name: "Enviar consulta" }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes.some((write) => write.path === "usage-events")).toBe(false);
  expect(errors).toEqual([]);
});
test("candidate can record an interview without sending an email", async ({
  page,
}) => {
  const { writes, errors } = await workspace(page);
  await page.goto("/tienda/admin/ofertas-laborales/job");
  await page
    .getByRole("button", { name: "Candidato de prueba", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Actividad", exact: true })
    .selectOption("INTERVIEW");
  await page
    .getByLabel("Detalle", { exact: true })
    .fill("Evaluación de experiencia en ventas");
  await page
    .getByLabel("Fecha de entrevista", { exact: true })
    .fill("2026-10-20T10:00");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Guardar", exact: true })
    .click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0].body).toMatchObject({ kind: "INTERVIEW", sendEmail: false });
  expect(writes[0].body.scheduledAt).toBeTruthy();
  expect(errors).toEqual([]);
});
test("metrics and portfolio are separate working sections", async ({
  page,
}, info) => {
  const { errors } = await workspace(page);
  await page.goto("/tienda/admin/metricas");
  await expect(page.getByRole("cell", { name: "25.0%" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "5.5 horas" })).toBeVisible();
  await page.goto("/tienda/admin/cartera");
  await expect(
    page.getByRole("cell", { name: "Alimento habitual" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Prioridad", exact: true })
    .selectOption("REPLENISH");
  await expect(page).toHaveURL(/filter=REPLENISH/);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath("portfolio-mobile.png") });
  expect(errors).toEqual([]);
});

test("interview agenda opens private candidate follow-up and filters by dates", async ({
  page,
}) => {
  const { errors } = await workspace(page);
  await page.goto("/tienda/admin/ofertas-laborales");
  await page.getByText("Agenda de entrevistas", { exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Entrevista de ventas", exact: true }),
  ).toBeVisible();
  const requested = page.waitForRequest(
    (request) =>
      request.url().includes("recruitment/interviews") &&
      request.url().includes("dateFrom=2026-10-01"),
  );
  await page.getByLabel("Desde", { exact: true }).fill("2026-10-01");
  await requested;
  await page
    .getByRole("button", { name: "Candidato de prueba", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Actividad del candidato" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("catalog autocomplete works with the keyboard and zero results offer filtered alternatives", async ({
  page,
}, info) => {
  const { errors, writes } = await workspace(page, "CLIENT");
  await page.goto("/tienda/productos?productType=FOOD&attributeValueIds=stage");
  const search = page.getByRole("combobox", { name: "Buscar en el catálogo" });
  await search.fill("SKU-001");
  await expect(
    page.getByRole("listbox", { name: "Productos sugeridos" }),
  ).toBeVisible();
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/tienda\/producto\/search-product$/);
  await page.goto(
    "/tienda/productos?productType=FOOD&attributeValueIds=stage&search=nonexistent",
  );
  await expect(
    page.getByRole("heading", { name: "No encontramos productos" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Productos con los filtros seleccionados" })
      .locator(".product-card"),
  ).toHaveCount(1);
  expect(writes).toHaveLength(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("catalog-alternatives-mobile.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
