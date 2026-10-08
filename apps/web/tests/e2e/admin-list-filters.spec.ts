import { expect, test, type Page } from "@playwright/test";

async function setup(page: Page) {
  await page.goto("/tienda/ingresar");
  await expect(async () => {
    await page.getByRole("button", { name: "Administración", exact: true }).click();
    expect(await page.getByLabel("Correo electrónico").inputValue()).toBe("admin@districo.com");
  }).toPass({ timeout: 15000 });
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/tienda$/, { timeout: 15000 });
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    const base = state.users.find((user: { customerAccount?: unknown }) => user.customerAccount);
    state.users = state.users.filter((user: { customerAccount?: unknown }) => !user.customerAccount);
    state.customRoles = [{ id: "custom-filter", name: "Operaciones", key: "operaciones", access: {} }];
    for (const [id, role, active, emailVerified] of [["seller-a", "SALES", true, true], ["seller-b", "SALES", false, true], ["invited", "SALES", false, false], ["expired", "SALES", false, false], ["custom-user", "CUSTOM", true, true]]) {
      state.users.push({ id, email: `${id}@example.test`, role, active, emailVerified, permissions: [], ...(role === "CUSTOM" ? { customRoleId: "custom-filter" } : {}) });
      if (role === "SALES") state.salespeople[id as string] = { id: `profile-${id}`, name: id, phone: "099123456" };
    }
    state.staffInvitations = [{ userId: "invited", expiresAt: "2099-01-01", accepted: false, revoked: false }, { userId: "expired", expiresAt: "2000-01-01", accepted: false, revoked: false }];
    for (let i = 0; i < 25; i++) state.users.push({ ...base, id: `customer-${i}`, email: `customer-${i}@example.test`, customerAccount: { ...base.customerAccount, id: `c${i}`, businessName: `Cliente ${i}`, salespersonId: i === 24 ? null : "profile-seller-a", accountStatus: i === 24 ? "APPROVED" : "SUSPENDED" } });
    state.orders = Array.from({ length: 24 }, (_, i) => ({ id: `o${i}`, orderNumber: `FILTER-${i}`, createdAt: "2026-10-01T12:00:00.000Z", currency: "UYU", userId: `customer-${i}`, items: [], customerAccount: { id: `c${i}`, businessName: `Cliente ${i}` }, status: "APPROVED", total: 100 }));
    const product = state.products[0];
    state.brands = [{ id: "filter-brand", name: "Marca filtro" }, { id: "other-brand", name: "Otra marca" }];
    state.categories = [{ id: "parent", name: "Padre" }, { id: "child", name: "Hija", parentId: "parent" }];
    state.products = Array.from({ length: 15 }, (_, i) => ({ ...product, id: `p${i}`, name: `Producto filtro ${i}`, slug: `p${i}`, brand: state.brands[0], categories: [{ categoryId: "child" }], variants: [{ ...product.variants[0], id: `v${i}`, sku: `FILTER-${i}`, price: undefined, physicalStock: 3, reservedStock: 3, availableStock: 0 }] }));
    state.products.push({ ...state.products[0], id: "stock", name: "Con stock y precio", variants: [{ ...product.variants[0], physicalStock: 4, reservedStock: 3, availableStock: 1 }] });
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  });
}

test("clientes: filtros combinados, paginación y búsqueda sin perder foco", async ({ page }, info) => {
  test.setTimeout(90000);
  await setup(page);
  await page.goto("/tienda/admin/clientes");
  await page.getByLabel("Vendedor", { exact: true }).selectOption("profile-seller-a");
  await page.getByLabel("Estado de cuenta", { exact: true }).selectOption("SUSPENDED");
  await page.getByLabel("Deuda", { exact: true }).selectOption("WITH_DEBT");
  await expect(page.locator("tbody tr")).toHaveCount(20);
  await expect(page.getByText("24 registros · Página 1 de 2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(4);
  const search = page.getByRole("textbox", { name: "Buscar clientes" });
  await search.fill("customer-23@example.test");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(search).toBeFocused();
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(search).toHaveValue("");
  await expect(page.getByText("25 registros · Página 1 de 2", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath("customers-filters-mobile.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("productos: marca, subcategorías, sin precio, stock reservado y limpiar", async ({ page }, info) => {
  test.setTimeout(90000);
  await setup(page);
  await page.goto("/tienda/admin/catalogo");
  await page.getByLabel("Marca", { exact: true }).selectOption("filter-brand");
  await page.getByLabel("Categoría", { exact: true }).selectOption("parent");
  await page.getByRole("checkbox", { name: "Sin precio vigente", exact: true }).check();
  await page.getByRole("checkbox", { name: "Sin stock disponible", exact: true }).check();
  await expect(page.getByText("15 registros · Página 1 de 2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await page.getByLabel("Marca", { exact: true }).selectOption("other-brand");
  await expect(page.getByText("No encontramos productos con esos filtros")).toBeVisible();
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(page.getByText("16 registros · Página 1 de 2", { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("product-filters-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath("product-filters-mobile.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("personal y vendedores: roles personalizados, estados e invitaciones vencidas", async ({ page }, info) => {
  test.setTimeout(90000);
  await setup(page);
  await page.goto("/tienda/admin/personal");
  await page.getByRole("combobox", { name: "Filtrar por rol" }).selectOption("custom:custom-filter");
  await page.getByRole("combobox", { name: "Filtrar por estado" }).selectOption("ACTIVE");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody")).toContainText("custom-user@example.test");
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await page.getByRole("combobox", { name: "Filtrar por rol" }).selectOption("SALES");
  await page.getByRole("combobox", { name: "Filtrar por estado" }).selectOption("PENDING");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody")).toContainText("invited@example.test");
  await page.screenshot({ path: info.outputPath("staff-filters-desktop.png"), fullPage: true });
  await page.goto("/tienda/admin/vendedores");
  await page.getByRole("combobox", { name: "Filtrar por estado" }).selectOption("UNVERIFIED");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody")).toContainText("expired@example.test");
  await page.getByRole("combobox", { name: "Filtrar por estado" }).selectOption("INACTIVE");
  await expect(page.locator("tbody")).toContainText("seller-b@example.test");
  await page.getByRole("searchbox", { name: "Buscar vendedores" }).fill("no existe");
  await expect(page.getByText("No hay vendedores con esa búsqueda")).toBeVisible();
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(4);
});

test("volver de una ficha conserva clientes filtrados, página y desplazamiento", async ({ page }) => {
  test.setTimeout(90000);
  await setup(page);
  const list = "/tienda/admin/clientes?salespersonId=profile-seller-a&accountStatus=SUSPENDED&debt=WITH_DEBT&search=customer-&page=2";
  await page.goto(list);
  await expect(page.locator("tbody tr")).toHaveCount(4);
  const link = page.locator("tbody tr").last().getByRole("link", { name: "Ver ficha" });
  await link.scrollIntoViewIfNeeded();
  const y = await page.evaluate(() => window.scrollY);
  expect(y).toBeGreaterThan(100);
  await link.click();
  await expect(page.getByRole("heading", { name: "Cliente 23", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Volver a clientes", exact: true }).click();
  await expect(page).toHaveURL(new RegExp("/clientes\\?.*page=2"));
  await expect(page.getByLabel("Vendedor", { exact: true })).toHaveValue("profile-seller-a");
  await expect(page.getByRole("textbox", { name: "Buscar clientes" })).toHaveValue("customer-");
  await expect(page.locator("tbody tr")).toHaveCount(4);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(y - 25);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(y + 25);
  await page.reload();
  await expect(page.locator("tbody tr")).toHaveCount(4);
  await expect(page.getByLabel("Deuda", { exact: true })).toHaveValue("WITH_DEBT");
});

test("catálogo y vista previa conservan filtros al volver con el navegador y con Volver", async ({ page }) => {
  test.setTimeout(90000);
  await setup(page);
  await page.goto("/tienda/admin/catalogo?brandId=filter-brand&categoryId=parent&withoutPrice=true&withoutStock=true&page=2");
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await page.locator("tbody tr").last().getByRole("link", { name: "Editar producto" }).click();
  await expect(page).toHaveURL(/\/productos\/p\d+\?back=/);
  await page.getByRole("link", { name: "Vista previa", exact: true }).click();
  await expect(page).toHaveURL(/vista-previa\?back=/);
  await page.getByRole("link", { name: "Volver a editar producto", exact: true }).click();
  await page.getByRole("link", { name: "Volver al catálogo", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await expect(page.getByLabel("Marca", { exact: true })).toHaveValue("filter-brand");
  await expect(page.getByRole("checkbox", { name: "Sin precio vigente", exact: true })).toBeChecked();
  await page.locator("tbody tr").first().getByRole("link", { name: "Editar producto" }).click();
  await expect(page).toHaveURL(/\/productos\/p\d+\?back=/);
  await page.goBack();
  await expect(page).toHaveURL(/\/catalogo\?.*page=2/);
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await expect(page).toHaveURL(/page=2/);
});

test("enlaces compartidos y vendedores/pedidos restauran su búsqueda sin ampliar permisos", async ({ page, context }) => {
  test.setTimeout(90000);
  await setup(page);
  await page.goto("/tienda/admin/vendedores?status=INACTIVE&search=seller-b");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.evaluate(() => { Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (value: string) => { sessionStorage.setItem("qa-copied", value); } } }); });
  await page.getByRole("button", { name: "Copiar enlace del listado" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Enlace del listado copiado" })).toBeVisible();
  const copied = await page.evaluate(() => sessionStorage.getItem("qa-copied"));
  expect(copied).toBe(page.url());
  const shared = await context.newPage();
  await shared.goto(copied!);
  await expect(shared.getByRole("searchbox", { name: "Buscar vendedores" })).toHaveValue("seller-b");
  await expect(shared.locator("tbody tr")).toHaveCount(1);
  await shared.close();
  await page.getByRole("link", { name: "Ver ficha", exact: true }).click();
  await page.getByRole("link", { name: "Volver a vendedores", exact: true }).click();
  await expect(page).toHaveURL(/status=INACTIVE&search=seller-b/);
  await page.goto("/tienda/admin/pedidos?status=APPROVED&customerId=c23&dateFrom=2026-10-01&paymentStatus=PENDING");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("link", { name: "Gestionar FILTER-23", exact: true }).click();
  await page.getByRole("link", { name: "Volver a pedidos", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Filtrar estado de pedidos" })).toHaveValue("APPROVED");
  await expect(page.getByRole("combobox", { name: "Filtrar estado de pago" })).toHaveValue("PENDING");
  await expect(page.locator("tbody tr")).toHaveCount(1);
});
