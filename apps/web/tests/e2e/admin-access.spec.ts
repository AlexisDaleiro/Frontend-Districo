import { expect, test, type Page } from "@playwright/test";
import { staffFeatures } from "../../src/lib/staff-access";
import { storeRoutes } from "../../src/lib/store-routes";

async function login(page: Page, account: "Cliente mayorista" | "Administración" = "Cliente mayorista") {
  await page.goto(storeRoutes.login);
  const email = account === "Administración" ? "admin@districo.com" : "cliente@gmail.com";
  await expect(async () => {
    await page.getByRole("button", { name: account, exact: true }).click();
    expect(await page.getByLabel("Correo electrónico").inputValue()).toBe(email);
  }).toPass({ timeout: 10000 });
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/tienda$/);
}

async function trackAdminShell(page: Page) {
  await page.addInitScript(() => {
    const state = window as unknown as { adminShellShown: boolean };
    state.adminShellShown = false;
    new MutationObserver(() => {
      if (document.querySelector(".admin-shell, .admin-sidebar")) state.adminShellShown = true;
    }).observe(document, { childList: true, subtree: true });
  });
}

test("customers are redirected from every admin route without mounting the dashboard", async ({ page }, testInfo) => {
  test.setTimeout(90000);
  await login(page);
  await trackAdminShell(page);
  const routes = [
    storeRoutes.admin,
    storeRoutes.adminSection("clientes"),
    storeRoutes.adminSection("roles"),
    storeRoutes.adminCustomer("customer-test"),
    storeRoutes.adminOrder("order-test"),
    storeRoutes.adminSalesperson("salesperson-test"),
    storeRoutes.adminProduct("product-test"),
    storeRoutes.adminProductPreview("product-test"),
  ];
  for (const route of routes) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/tienda\/cuenta$/);
    await expect(page.locator(".account-page").getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator(".admin-shell, .admin-sidebar")).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { adminShellShown: boolean }).adminShellShown)).toBe(false);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(storeRoutes.admin);
  await expect(page).toHaveURL(/\/tienda\/cuenta$/);
  await expect(page.locator(".account-page").getByRole("link", { name: "Mis pedidos", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("customer-admin-blocked.png"), animations: "disabled" });
});

test("signed-out visitors cannot mount the dashboard", async ({ page }) => {
  await trackAdminShell(page);
  await page.goto(storeRoutes.adminSection("pedidos"));
  await expect(page).toHaveURL(/\/tienda\/ingresar$/);
  expect(await page.evaluate(() => (window as unknown as { adminShellShown: boolean }).adminShellShown)).toBe(false);
});

test("staff with no view permissions cannot access the admin shell", async ({ page }) => {
  await login(page);
  await page.evaluate((features) => {
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    const user = state.users.find((item: { id: string }) => item.id === state.session);
    user.role = "SALES";
    state.staffRoleAccess.SALES = Object.fromEntries(features.map((feature) => [feature, { canView: false, canEdit: false }]));
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  }, staffFeatures.map(([feature]) => feature));
  await trackAdminShell(page);
  await page.goto(storeRoutes.admin);
  await expect(page).toHaveURL(/\/tienda\/cuenta$/);
  await expect(page.locator(".account-page").getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Administración", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { adminShellShown: boolean }).adminShellShown)).toBe(false);
});

test("authorized administrators still access the dashboard", async ({ page }) => {
  await login(page, "Administración");
  await page.goto(storeRoutes.admin);
  await expect(page.getByRole("navigation", { name: "Administración", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Resumen", exact: true })).toBeVisible();
});

test("staff with access to one section keep their permitted navigation", async ({ page }) => {
  await login(page);
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    const user = state.users.find((item: { id: string }) => item.id === state.session);
    user.role = "CUSTOM";
    user.customRoleId = "catalog-read-only";
    state.customRoles = [{ id: "catalog-read-only", name: "Lectura del catálogo", access: { catalogo: { canView: true, canEdit: false } } }];
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  });
  await page.goto(storeRoutes.admin);
  await expect(page).toHaveURL(/\/tienda\/admin\/catalogo$/);
  const nav = page.getByRole("navigation", { name: "Administración", exact: true });
  await expect(nav.getByRole("link", { name: "Catálogo", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Clientes", exact: true })).toHaveCount(0);
});
