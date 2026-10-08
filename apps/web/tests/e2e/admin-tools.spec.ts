import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/tienda/ingresar");
  await page.getByRole("button", { name: "Administración", exact: true }).click();
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).not.toHaveURL(/ingresar$/);
  await page.goto("/tienda/admin/catalogo");
  await expect(page.getByRole("heading", { name: "Catálogo y existencias" })).toBeVisible();
}

test("checkbox selection spans pages, activation is confirmed and its history persists", async ({ page }, info) => {
  test.setTimeout(120000);
  await login(page);
  const rows = page.locator("tbody tr");
  await rows.nth(0).getByRole("checkbox").check();
  await rows.nth(1).getByRole("checkbox").check();
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await rows.nth(0).getByRole("checkbox").check();
  await expect(page.getByText("3 seleccionados", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Desactivar", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Desactivar productos" });
  await dialog.getByRole("textbox", { name: "Motivo del cambio" }).fill("Retiro temporal de tres productos");
  await dialog.getByRole("button", { name: "Revisar cambios" }).click();
  await expect(dialog.getByText("3 cambios", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("districo-demo-v1")!).bulkHistory?.length ?? 0)).toBe(0);
  await page.screenshot({ path: info.outputPath("bulk-desktop.png") });
  await dialog.getByRole("button", { name: "Confirmar cambios" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText("0 seleccionados", { exact: true })).toBeVisible();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("districo-demo-v1")!));
  expect(state.bulkHistory).toHaveLength(1);
  expect(state.bulkHistory[0].metadata.changed).toBe(3);
  expect(state.products.filter((p: { active: boolean }) => p.active === false)).toHaveLength(3);
  await page.getByRole("button", { name: "Historial de lotes" }).click();
  const history = page.getByRole("dialog", { name: "Historial de acciones por lote" });
  await history.locator("summary").click();
  await expect(history).toContainText("Retiro temporal de tres productos");
  await expect(history.getByRole("columnheader", { name: "ANTES" })).toBeVisible();
});

test("global keyboard search opens a product and Ctrl+S saves the editable form", async ({ page }, info) => {
  test.setTimeout(120000);
  await login(page);
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Buscar en administración" });
  const input = dialog.getByRole("combobox");
  await expect(input).toBeFocused();
  await input.fill("DEMO-0001");
  await expect(dialog.getByRole("option")).toHaveCount(1);
  await page.screenshot({ path: info.outputPath("search-desktop.png") });
  await input.press("Enter");
  await expect(page).toHaveURL(/\/admin\/productos\//);
  const name = page.locator('form[data-admin-save="true"]').getByRole("textbox", { name: /^Nombre/ }).first();
  await name.fill("Producto actualizado con atajo");
  await name.press("Control+s");
  await expect(page.getByRole("status").filter({ hasText: "Cambios guardados" })).toBeVisible();
  const productName = await page.evaluate(() => JSON.parse(localStorage.getItem("districo-demo-v1")!).products[0].name);
  expect(productName).toBe("Producto actualizado con atajo");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press("Control+k");
  await dialog.getByRole("combobox").fill("cliente@gmail.com");
  await expect(dialog.getByRole("option")).toHaveCount(1);
  await page.screenshot({ path: info.outputPath("search-mobile.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await dialog.getByRole("combobox").press("Escape");
  await expect(dialog).not.toBeVisible();
});

test("price adjustments preview the whole selected batch and preserve history", async ({ page }) => {
  test.setTimeout(120000);
  await login(page);
  await page.getByRole("checkbox", { name: "Seleccionar esta página" }).check();
  await page.getByRole("button", { name: "Actualizar precios", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Actualizar precios" });
  await dialog.getByRole("spinbutton", { name: /Porcentaje/ }).fill("10");
  await dialog.getByRole("textbox", { name: "Motivo del cambio" }).fill("Actualizacion de lista mayorista");
  await dialog.getByRole("button", { name: "Revisar cambios" }).click();
  await expect(dialog.getByText("429.00 UYU", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Confirmar cambios" }).click();
  await expect(dialog).not.toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("districo-demo-v1")!).products[0].variants[0].price.amount)).toBe(429);
});

test("bulk reassignment moves customers to one active seller with before/after history", async ({ page }, info) => {
  test.setTimeout(120000);
  await login(page);
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    state.users.push({ id: "seller-bulk", email: "seller.bulk@example.test", role: "SALES", active: true, emailVerified: true, permissions: [] });
    state.salespeople["seller-bulk"] = { id: "profile-bulk", name: "Vendedor por lotes", phone: "099123456" };
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  });
  await page.goto("/tienda/admin/clientes");
  await page.locator("tbody tr").nth(0).getByRole("checkbox").check();
  await page.locator("tbody tr").nth(1).getByRole("checkbox").check();
  await page.getByRole("button", { name: "Reasignar vendedor" }).click();
  const dialog = page.getByRole("dialog", { name: "Reasignar clientes" });
  await dialog.getByRole("radio", { name: /Vendedor por lotes/ }).check();
  await dialog.getByRole("textbox", { name: "Motivo del cambio" }).fill("Nueva distribucion de cartera");
  await dialog.getByRole("button", { name: "Revisar cambios" }).click();
  await expect(dialog.getByText("2 cambios", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath("bulk-mobile.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await dialog.getByRole("button", { name: "Confirmar cambios" }).click();
  await expect(dialog).not.toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("districo-demo-v1")!).users.filter((user: { customerAccount?: { salespersonId?: string } }) => user.customerAccount?.salespersonId === "profile-bulk").length)).toBe(2);
});

test("read-only users see permitted search results but cannot bulk edit or save", async ({ page }) => {
  test.setTimeout(120000);
  await login(page);
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    state.users.push({ id: "catalog-reader", email: "reader@example.test", role: "CATALOG", active: true, permissions: [] });
    state.staffRoleAccess.CATALOG = Object.fromEntries(["resumen", "ventas", "consultas", "solicitudes", "clientes", "pedidos", "facturacion", "catalogo", "marcas", "categorias", "promociones", "banners", "recomendaciones", "personal", "roles", "vendedores"].map((feature) => [feature, { canView: feature === "catalogo", canEdit: false }]));
    state.session = "catalog-reader";
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Catálogo y existencias" })).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Actualizar precios" })).toHaveCount(0);
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Buscar en administración" });
  await dialog.getByRole("combobox").fill("DEMO-0001");
  await expect(dialog.getByRole("option")).toHaveCount(1);
  await dialog.getByRole("combobox").press("Enter");
  await expect(page).toHaveURL(/vista-previa$/);
  await expect(page.locator('form[data-admin-save="true"]')).toHaveCount(0);
  await page.keyboard.press("Control+s");
  await expect(page.getByRole("status").filter({ hasText: "Seleccioná un formulario editable" })).toBeVisible();
});
