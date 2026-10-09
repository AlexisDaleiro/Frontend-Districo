import { expect, test, type Page } from "@playwright/test";
import { storeRoutes } from "../../src/lib/store-routes";

async function login(page: Page) {
  await page.goto(storeRoutes.login);
  await expect(async () => {
    await page.getByRole("button", { name: "Administración", exact: true }).click();
    expect(await page.getByLabel("Correo electrónico").inputValue()).toBe("admin@districo.com");
  }).toPass({ timeout: 15000 });
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/tienda$/);
}

test("editar la línea de una marca actualiza todos sus productos y el filtro compartible", async ({ page }, info) => {
  await login(page);
  const products = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    return state.products.filter((item: { brand?: { name: string } }) => item.brand?.name === "Biofresh").slice(0, 2).map((item: { slug: string; name: string }) => ({ slug: item.slug, name: item.name }));
  }) as { slug: string; name: string }[];
  expect(products).toHaveLength(2);
  await page.goto(storeRoutes.adminSection("marcas"));
  await page.getByRole("button", { name: "Editar Biofresh", exact: true }).click();
  const modal = page.getByRole("dialog");
  await modal.getByLabel("Línea de venta").selectOption("BOTH");
  await modal.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(modal).toBeHidden();
  await expect(page.locator(".admin-directory-row").filter({ hasText: "Biofresh" }).getByText("Ambos", { exact: true })).toBeVisible();
  await expect(page.locator(".admin-directory-row").filter({ hasText: "Biofresh" }).getByText("Inactivo", { exact: true })).toHaveCount(0);
  await page.getByLabel("Línea de marcas").selectOption("BOTH");
  await expect(page).toHaveURL(/brandsLine=BOTH/);
  await expect(page.locator(".admin-directory").first().locator(".admin-directory-row")).toHaveCount(1);
  await expect(page.locator(".admin-directory").nth(1).getByLabel("Línea de venta")).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("marcas-desktop.png"), animations: "disabled" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("marcas-mobile.png"), animations: "disabled" });
  for (const product of products) {
    await page.goto(storeRoutes.product(product.slug));
    await expect(page.getByRole("heading", { level: 1, name: product.name, exact: true })).toBeVisible();
    await expect(page.locator(".detail-specs").getByText("Ambos", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.goto(storeRoutes.adminProduct(products[0].slug));
  await expect(page.getByTitle("Heredada de Biofresh")).toHaveText("Ambos");
  await expect(page.locator("#edicion").getByLabel("Línea de venta")).toHaveCount(0);
  await page.goto(`/productos/${products[0].slug}`);
  await expect(page.getByText("Línea de venta: Ambos", { exact: true })).toBeVisible();
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(storeRoutes.brands);
    await expect(page.getByRole("link", { name: "Ver productos de Biofresh", exact: true }).getByText("Ambos", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`logos-lineas-${width}.png`), animations: "disabled" });
  }
});

test("crear una marca permite ambos; no agrega el campo a laboratorios y respeta sólo lectura", async ({ page }) => {
  await login(page);
  await page.goto(storeRoutes.adminSection("marcas"));
  const brands = page.locator(".admin-directory").first();
  await brands.getByRole("button", { name: "Crear", exact: true }).click();
  const modal = page.getByRole("dialog");
  await modal.getByLabel("Nombre *", { exact: true }).fill("Marca demo ambos");
  await modal.getByLabel("Línea de venta").selectOption("BOTH");
  await modal.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(modal).toBeHidden();
  await expect(brands.locator(".admin-directory-row").filter({ hasText: "Marca demo ambos" }).getByText("Ambos", { exact: true })).toBeVisible();
  await page.locator(".admin-directory").nth(1).getByRole("button", { name: "Crear", exact: true }).click();
  await expect(modal.getByLabel("Línea de venta")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    const user = state.users.find((item: { id: string }) => item.id === state.session);
    user.role = "CUSTOM";
    user.customRoleId = "read-brands";
    state.customRoles = [{ id: "read-brands", name: "Consulta", access: { marcas: { canView: true, canEdit: false } } }];
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  });
  await page.goto(storeRoutes.adminSection("marcas"));
  await expect(page.getByLabel("Línea de marcas")).toBeVisible();
  await expect(page.getByRole("button", { name: "Editar Biofresh", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Crear", exact: true })).toHaveCount(0);
});
