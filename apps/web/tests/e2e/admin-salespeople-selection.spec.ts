import { expect, test, type Page } from "@playwright/test";

async function setup(page: Page) {
  await page.goto("/tienda/ingresar");
  await page.getByRole("button", { name: "Administración", exact: true }).click();
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/tienda$/);
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    for (let i = 0; i < 24; i++) {
      const id = `bulk-seller-${i}`, number = String(i).padStart(2, "0");
      state.users.push({ id, email: `seller-${number}@example.test`, role: "SALES", active: i < 22, emailVerified: i !== 23, permissions: [] });
      state.salespeople[id] = { id: `profile-${id}`, name: `Vendedor ${number}`, phone: "099 123 456" };
    }
    state.users.find((user: { customerAccount?: unknown }) => user.customerAccount).customerAccount.salespersonId = "profile-bulk-seller-0";
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  });
  await page.goto("/tienda/admin/vendedores");
  await expect(page.locator("tbody tr")).toHaveCount(20);
}

test("selecciona entre páginas y filtros, copia correos y mantiene estable la tabla", async ({ page, context }, info) => {
  test.setTimeout(120000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await setup(page);
  const top = await page.locator("table").evaluate((table) => table.getBoundingClientRect().top);
  await page.getByRole("checkbox", { name: "Seleccionar Vendedor 01", exact: true }).check();
  expect(await page.locator("table").evaluate((table) => table.getBoundingClientRect().top)).toBe(top);
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await page.getByRole("checkbox", { name: "Seleccionar Vendedor 22", exact: true }).check();
  await expect(page.getByText("2 seleccionados", { exact: true })).toBeVisible();
  await page.getByRole("searchbox", { name: "Buscar vendedores" }).fill("seller-01");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.getByRole("checkbox", { name: "Seleccionar Vendedor 01", exact: true })).toBeChecked();
  await expect(page.getByText("2 seleccionados", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Copiar correos", exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("seller-01@example.test; seller-22@example.test");
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await page.getByRole("button", { name: "Limpiar selección" }).click();
  await expect(page.getByText("0 seleccionados", { exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: "Seleccionar esta página", exact: true }).check();
  await expect(page.getByText("20 seleccionados", { exact: true })).toBeVisible();
  await expect(page.locator(".toast.visible")).toHaveCount(0, { timeout: 8000 });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const bounds = await page.locator(".admin-salespeople-list").boundingBox();
  await page.screenshot({ path: info.outputPath("seleccion-desktop.png"), clip: { ...bounds!, height: Math.min(bounds!.height, 440) } });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole("checkbox", { name: "Seleccionar Vendedor 01", exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Limpiar selección" }).click();
  await page.getByRole("checkbox", { name: "Seleccionar Vendedor 01", exact: true }).check();
  await page.getByRole("searchbox", { name: "Buscar vendedores" }).fill("seller-01");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.locator(".admin-salespeople-list").screenshot({ path: info.outputPath("seleccion-mobile.png") });
});

test("revisa los cambios, permite cancelar y respeta clientes e invitaciones", async ({ page }) => {
  test.setTimeout(120000);
  await setup(page);
  await page.getByRole("checkbox", { name: "Seleccionar Vendedor 00", exact: true }).check();
  await page.getByRole("checkbox", { name: "Seleccionar Vendedor 01", exact: true }).check();
  await page.getByRole("button", { name: "Desactivar", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Desactivar vendedores", exact: true });
  await expect(dialog).toContainText("Reasigná sus clientes antes de desactivarlo.");
  await expect(dialog).toContainText("Se cambiarán 1 de 2 cuentas.");
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: "Vendedor 01" })).toContainText("Activo");
  await page.getByRole("button", { name: "Desactivar", exact: true }).click();
  await dialog.getByRole("button", { name: "Confirmar desactivación", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Vendedor 01" })).toContainText("Desactivado");
  await expect(page.getByRole("row").filter({ hasText: "Vendedor 00" })).toContainText("Activo");
  await expect(page.getByText("1 seleccionado", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Limpiar selección" }).click();
  await page.getByRole("combobox", { name: "Filtrar por estado" }).selectOption("INACTIVE");
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.getByRole("checkbox", { name: "Seleccionar esta página", exact: true }).check();
  await page.getByRole("button", { name: "Activar", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Activar vendedores", exact: true });
  await expect(dialog).toContainText("Se cambiarán 2 de 2 cuentas.");
  await dialog.getByRole("button", { name: "Confirmar activación", exact: true }).click();
  await expect(page.getByText("0 seleccionados", { exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Filtrar por estado" }).selectOption("UNVERIFIED");
  await page.getByRole("checkbox", { name: "Seleccionar Vendedor 23", exact: true }).check();
  await page.getByRole("button", { name: "Activar", exact: true }).click();
  await expect(dialog).toContainText("Debe aceptar su invitación antes de activarse.");
  await expect(dialog.getByRole("button", { name: "Confirmar activación", exact: true })).toBeDisabled();
});
