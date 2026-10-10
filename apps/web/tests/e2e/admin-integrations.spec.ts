import { expect, test, type Page } from "@playwright/test";
import { storeRoutes } from "../../src/lib/store-routes";

async function admin(page: Page) {
  await page.goto(storeRoutes.login);
  await expect(async () => {
    await page.getByRole("button", { name: "Administración", exact: true }).click();
    expect(await page.getByLabel("Correo electrónico").inputValue()).toBe("admin@districo.com");
  }).toPass({ timeout: 10000 });
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/tienda$/);
}

test("integraciones muestra tres conexiones inactivas en escritorio y celular", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await admin(page);
  await page.goto(storeRoutes.admin);
  await page.getByRole("navigation", { name: "Administración", exact: true }).getByRole("link", { name: "Integraciones", exact: true }).click();
  await expect(page).toHaveURL(/\/tienda\/admin\/integraciones$/);
  await expect(page.getByRole("heading", { name: "Integraciones", exact: true })).toBeVisible();
  const table = page.getByRole("table", { name: "Estado de las integraciones" });
  for (const name of ["WhatsApp", "Mailing", "Mercarea"]) await expect(table.getByRole("cell", { name, exact: true })).toBeVisible();
  await expect(table.getByText("Inactivo", { exact: true })).toHaveCount(3);
  await expect(table.locator("button, input, select")).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("integraciones-desktop.png"), animations: "disabled" });
  await page.setViewportSize({ width: 390, height: 844 });
  await table.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(table.getByRole("cell", { name: "Mercarea", exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("integraciones-mobile.png"), animations: "disabled" });
  expect(errors).toEqual([]);
});

test("roles permite sólo ver Integraciones y respeta retirar ese permiso", async ({ page }) => {
  await admin(page);
  await page.goto(storeRoutes.adminSection("roles"));
  await expect(page.getByRole("checkbox", { name: "Ver Integraciones", exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Editar Integraciones", exact: true })).toBeDisabled();
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    state.users.push({ id: "integration-reader", email: "integrations@example.test", role: "CUSTOM", customRoleId: "integration-reader-role", active: true, permissions: [] });
    state.customRoles = [{ id: "integration-reader-role", name: "Lectura de integraciones", access: { integraciones: { canView: true, canEdit: false } } }];
    state.session = "integration-reader";
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  });
  await page.goto(storeRoutes.admin);
  await expect(page).toHaveURL(/\/tienda\/admin\/integraciones$/);
  await expect(page.locator(".admin-main tbody tr")).toHaveCount(3);
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    state.customRoles[0].access.integraciones.canView = false;
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  });
  await page.reload();
  await expect(page).toHaveURL(/\/tienda\/cuenta$/);
  await expect(page.locator(".admin-shell")).toHaveCount(0);
});
