import { expect, test, type Page } from "@playwright/test";
import { storeRoutes } from "../../src/lib/store-routes";

async function login(page: Page, admin: boolean) {
  await page.goto(storeRoutes.login);
  await expect(async () => {
    await page.getByRole("button", { name: admin ? "Administración" : "Cliente mayorista", exact: true }).click();
    expect(await page.getByLabel("Correo electrónico").inputValue()).toBe(admin ? "admin@districo.com" : "cliente@gmail.com");
  }).toPass({ timeout: 15000 });
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/tienda$/);
}

async function products(page: Page) {
  return page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    return state.products.filter((product: { active: boolean; requiresMedicationPermission: boolean }) => product.active && !product.requiresMedicationPermission)
      .slice(0, 2).map((product: { slug: string; name: string }) => ({ slug: product.slug, name: product.name }));
  }) as Promise<{ slug: string; name: string }[]>;
}

test("administrador abre la edición del producto exacto desde su ficha, también en móvil", async ({ page }, info) => {
  await login(page, true);
  const items = await products(page);
  expect(items).toHaveLength(2);
  for (const [index, product] of items.entries()) {
    if (index === 1) await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(storeRoutes.product(product.slug));
    await expect(page.getByRole("heading", { level: 1, name: product.name, exact: true })).toBeVisible();
    const edit = page.getByRole("link", { name: "Editar producto", exact: true });
    await expect(edit).toBeVisible();
    await expect(edit).toHaveAttribute("title", "Editar producto");
    await expect(edit).toHaveAttribute("href", storeRoutes.adminProduct(product.slug));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(index === 0 ? "atajo-desktop.png" : "atajo-mobile.png"), animations: "disabled" });
    await edit.click();
    await expect(page).toHaveURL(storeRoutes.adminProduct(product.slug));
    await expect(page.locator(".admin-main").getByRole("heading", { level: 1, name: product.name, exact: true })).toBeVisible();
    await expect(page.locator("#edicion form")).toBeVisible();
  }
});

for (const account of ["visitante", "cliente"] as const) {
  test(`${account} no ve el atajo de edición`, async ({ page }) => {
    if (account === "visitante") {
      await page.goto(storeRoutes.product("producto-prueba"));
      await expect(page).toHaveURL(/\/tienda\/ingresar$/);
      await expect(page.getByRole("link", { name: "Editar producto", exact: true })).toHaveCount(0);
      return;
    }
    await login(page, false);
    await page.goto(storeRoutes.products);
    const title = page.locator(".product-card h3").first();
    await expect(title).toBeVisible();
    const product = { name: (await title.textContent())! };
    await title.click();
    await expect(page.getByRole("heading", { level: 1, name: product.name, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Editar producto", exact: true })).toHaveCount(0);
    if (account === "cliente") await expect(page.getByRole("button", { name: `Agregar a favoritos: ${product.name}`, exact: true })).toBeVisible();
  });
}

test("el atajo respeta los permisos de ver y editar catálogo de los roles personalizados", async ({ page }) => {
  await login(page, false);
  const [product] = await products(page);
  for (const access of [{ canView: true, canEdit: false }, { canView: false, canEdit: true }, { canView: true, canEdit: true }]) {
    await page.evaluate((catalogo) => {
      const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
      const user = state.users.find((item: { id: string }) => item.id === state.session);
      user.role = "CUSTOM";
      user.customRoleId = "shortcut-test-role";
      state.customRoles = [{ id: "shortcut-test-role", name: "Catálogo de prueba", access: { catalogo } }];
      localStorage.setItem("districo-demo-v1", JSON.stringify(state));
    }, access);
    await page.goto(storeRoutes.product(product.slug));
    await expect(page.getByRole("heading", { level: 1, name: product.name, exact: true })).toBeVisible();
    const edit = page.getByRole("link", { name: "Editar producto", exact: true });
    if (access.canView && access.canEdit) {
      await expect(edit).toBeVisible();
      await edit.click();
      await expect(page.locator("#edicion form")).toBeVisible();
    } else await expect(edit).toHaveCount(0);
  }
});
