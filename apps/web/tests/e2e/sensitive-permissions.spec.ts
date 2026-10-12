import { expect, test, type Page } from "@playwright/test";
import { staffFeatures, type StaffFeature } from "../../src/lib/staff-access";
import { storeRoutes } from "../../src/lib/store-routes";
import type { Order, Product } from "../../src/lib/types";

test.skip(process.env.E2E_SENSITIVE_PERMISSIONS !== "1", "Isolated API-mode preview with mocked API; no shared data is changed.");
const allow = { canView: true, canEdit: true }, view = { canView: true, canEdit: false }, deny = { canView: false, canEdit: false };
const stamp = "2026-10-12T12:00:00Z";
const product: Product = {
  id: "qa-product", slug: "qa-product", name: "Producto de prueba", description: "Producto para validar permisos", active: true,
  productType: "FOOD", source: "DISTRICO", requiresMedicationPermission: false, categories: [], attributes: [],
  media: [], variants: [{ id: "qa-variant", sku: "QA-001", name: "1 kg", active: true, physicalStock: 40, reservedStock: 0,
    availableStock: 40, saleMultiple: 1, minimumOrderQuantity: 1, price: { amount: 100, currency: "UYU" } }],
};
const sampleOrder: Order = {
  id: "qa-order", userId: "qa-customer", orderNumber: "QA-001", createdAt: stamp, status: "DELIVERED", currency: "UYU", total: 100, subtotal: 100,
  discountTotal: 0, paidTotal: 40, creditedTotal: 20, refundedTotal: 0, user: { email: "customer@example.test" },
  items: [{ id: "qa-item", variantId: "qa-variant", productName: product.name, variantName: "1 kg", sku: "QA-001", quantity: 1, unitPrice: 100, subtotal: 100 }],
  payments: [{ id: "qa-payment", amount: 40, createdAt: stamp }], invoices: [], refunds: [], returns: [],
  creditNotes: [{ id: "qa-credit", amount: 20, reason: "Devolucion", createdAt: stamp }],
};
function matrix(overrides: Partial<Record<StaffFeature, typeof allow>> = {}) {
  return Object.fromEntries(staffFeatures.map(([feature]) => [feature, overrides[feature] ?? deny]));
}
async function fixture(page: Page, overrides: Partial<Record<StaffFeature, typeof allow>>, admin = false) {
  const writes: { path: string; body: Record<string, unknown> }[] = [], errors: string[] = [];
  let access = matrix(overrides);
  const order = structuredClone(sampleOrder);
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/backend/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api/backend/", "");
    let value: unknown = [];
    if (route.request().method() !== "GET") {
      const body = route.request().postDataJSON();
      writes.push({ path, body });
      if (path === "admin/staff/access/SALES") access = Object.fromEntries(body.entries.map((entry: { feature: string; canView: boolean; canEdit: boolean }) => [entry.feature, { canView: entry.canView, canEdit: entry.canEdit }]));
      if (path.endsWith("/payments")) order.paidTotal = Number(order.paidTotal) + Number(body.amount);
      if (path.endsWith("/void")) { order.payments![0].voidedAt = stamp; order.paidTotal = 0; }
      if (path.endsWith("/refunds")) order.refundedTotal = Number(body.amount);
      value = { success: true };
    } else if (path === "auth/me") value = { id: "qa-user", email: "qa@example.test", role: admin ? "ADMIN" : "CUSTOM", customRoleId: admin ? undefined : "qa-role", active: true, permissions: [], staffAccess: access };
    else if (path === "admin/staff/access") value = [{ role: "SALES", id: null, name: null, access }];
    else if (path === "products/admin/list") value = { items: [product], meta: { total: 1, page: 1, limit: 12 } };
    else if (path === "products/admin/qa-product") value = product;
    else if (path === "inventory/variants/qa-variant/stock") value = { physicalStock: 40, reservedStock: 0, availableStock: 40 };
    else if (path === "admin/orders/qa-order") value = order;
    else if (path === "admin/dashboard") value = {};
    else if (path === "cart") value = { items: [], total: 0, currency: "UYU" };
    else if (path.endsWith("/page")) value = { items: [], meta: { total: 0, page: 1, limit: 20 } };
    await route.fulfill({ json: value });
  });
  return { writes, errors };
}

test("Roles: independent action checkboxes enable only required viewing and persist explicit denials", async ({ page }, info) => {
  const f = await fixture(page, {}, true);
  await page.goto(storeRoutes.adminSection("roles"));
  await expect(page.getByRole("table", { name: "Permisos de acciones sensibles" }).getByRole("checkbox")).toHaveCount(5);
  await page.getByRole("checkbox", { name: "Permitir Ajustar stock", exact: true }).check();
  await expect(page.getByRole("checkbox", { name: "Ver Catálogo", exact: true })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Editar Catálogo", exact: true })).not.toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Permitir Cambiar precios", exact: true })).not.toBeChecked();
  await page.getByRole("checkbox", { name: "Permitir Registrar cobros", exact: true }).check();
  await expect(page.getByRole("checkbox", { name: "Ver Pagos y facturas", exact: true })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Ver Pedidos", exact: true })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Editar Pagos y facturas", exact: true })).not.toBeChecked();
  await page.getByRole("button", { name: "Guardar permisos", exact: true }).click();
  await expect.poll(() => f.writes.length).toBe(1);
  const entries = f.writes[0].body.entries as { feature: string; canView: boolean; canEdit: boolean }[];
  expect(entries).toHaveLength(staffFeatures.length);
  expect(entries.find((entry) => entry.feature === "stock")).toEqual({ feature: "stock", ...allow });
  expect(entries.find((entry) => entry.feature === "reintegros")).toEqual({ feature: "reintegros", ...deny });
  await page.getByRole("checkbox", { name: "Ver Catálogo", exact: true }).uncheck();
  await expect(page.getByRole("checkbox", { name: "Permitir Ajustar stock", exact: true })).not.toBeChecked();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByRole("heading", { name: "Acciones sensibles" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("sensitive-roles-mobile.png"), fullPage: true });
  expect(f.errors).toEqual([]);
});

test("stock only: can manage inventory without general editing or pricing", async ({ page }) => {
  const f = await fixture(page, { catalogo: view, stock: allow });
  await page.goto(storeRoutes.adminSection("catalogo"));
  await expect(page.getByRole("button", { name: "Crear producto" })).toHaveCount(0);
  await page.getByRole("link", { name: "Gestionar producto", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/productos\/qa-product/);
  await expect(page.getByRole("heading", { name: "Editar producto", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Precio", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Agregar presentación", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Existencias", exact: true }).click();
  await page.getByRole("button", { name: "Actualizar", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Stock físico *", exact: true }).fill("50");
  await page.getByRole("dialog").getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect.poll(() => f.writes.length).toBe(1);
  expect(f.writes[0]).toMatchObject({ path: "inventory/variants/qa-variant/stock", body: { physicalStock: 50 } });
  expect(f.errors).toEqual([]);
});

test("prices only: direct and bulk controls appear without activation or stock editing", async ({ page }) => {
  const f = await fixture(page, { catalogo: view, precios: allow });
  await page.goto(storeRoutes.adminSection("catalogo"));
  await expect(page.getByRole("button", { name: "Actualizar precios", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Activar", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Gestionar producto", exact: true }).click();
  await page.getByRole("button", { name: "Precio", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Precio *", exact: true }).fill("120");
  await page.getByRole("dialog").getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect.poll(() => f.writes.length).toBe(1);
  expect(f.writes[0]).toMatchObject({ path: "pricing/variants/qa-variant", body: { amount: 120 } });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Existencias", exact: true }).click();
  await expect(page.getByText("Stock físico: 40", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Actualizar", exact: true })).toHaveCount(0);
  expect(f.errors).toEqual([]);
});

for (const action of ["cobros", "anular-cobros", "reintegros"] as const) test(`${action}: billing viewing alone exposes only this action`, async ({ page }) => {
  const f = await fixture(page, { pedidos: view, facturacion: view, [action]: allow });
  await page.goto(storeRoutes.adminOrder("qa-order"));
  await expect(page.getByRole("heading", { name: "Facturación y pagos" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Guardar pago", exact: true })).toHaveCount(action === "cobros" ? 1 : 0);
  await expect(page.getByRole("button", { name: "Anular", exact: true })).toHaveCount(action === "anular-cobros" ? 1 : 0);
  await expect(page.getByRole("button", { name: "Registrar reintegro", exact: true })).toHaveCount(action === "reintegros" ? 1 : 0);
  await expect(page.getByRole("heading", { name: "Registrar factura", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Registrar crédito", exact: true })).toHaveCount(0);
  if (action === "cobros") await page.getByRole("button", { name: "Guardar pago", exact: true }).click();
  if (action === "anular-cobros") {
    await page.getByRole("button", { name: "Anular", exact: true }).click();
    await page.getByLabel("Motivo de la anulación").fill("Cobro duplicado");
    await page.getByRole("button", { name: "Confirmar anulación", exact: true }).click();
  }
  if (action === "reintegros") {
    const form = page.locator("form").filter({ has: page.getByRole("heading", { name: "Registrar dinero reintegrado" }) });
    await form.getByLabel("Importe", { exact: false }).fill("10");
    await form.getByLabel("Motivo", { exact: true }).fill("Reintegro por devolución");
    await form.getByRole("button", { name: "Registrar reintegro", exact: true }).click();
  }
  await expect.poll(() => f.writes.length).toBe(1);
  const suffix = action === "cobros" ? "/payments" : action === "anular-cobros" ? "/payments/qa-payment/void" : "/refunds";
  expect(f.writes[0].path).toBe(`admin/orders/qa-order${suffix}`);
  expect(f.errors).toEqual([]);
});

test("broad editors with denied actions cannot access any financial action or inventory changes", async ({ page }) => {
  const f = await fixture(page, { catalogo: allow, pedidos: allow, facturacion: allow });
  await page.goto(storeRoutes.adminProduct("qa-product"));
  await expect(page.getByRole("heading", { name: "Editar producto", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Precio", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Existencias", exact: true }).click();
  await expect(page.getByRole("button", { name: "Actualizar", exact: true })).toHaveCount(0);
  await page.goto(storeRoutes.adminOrder("qa-order"));
  await expect(page.getByRole("heading", { name: "Facturación y pagos" })).toBeVisible();
  for (const name of ["Guardar pago", "Anular", "Registrar reintegro"]) await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Devolver Producto de prueba 1 kg" }).check();
  await expect(page.getByLabel("Cantidad a reincorporar QA-001")).toBeDisabled();
  expect(f.writes).toEqual([]);
  expect(f.errors).toEqual([]);
});
