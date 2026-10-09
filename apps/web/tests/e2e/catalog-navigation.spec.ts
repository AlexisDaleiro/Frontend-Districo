import { expect, test, type Page } from "@playwright/test";
import type { Entity } from "../../src/lib/types";

const realCatalog = process.env.E2E_REAL_CATALOG === "1";
test.use({ trace: realCatalog ? "off" : "retain-on-failure" });
const roots = [
  "Perros",
  "Gatos",
  "Ganadería",
  "Pequeños animales",
  "Farmacia",
  "Consumo humano",
];
const categories: Entity[] = [
  { id: "people", name: "Consumo humano" },
  { id: "pharmacy", name: "Farmacia" },
  { id: "small", name: "Pequeños animales" },
  { id: "livestock", name: "Ganadería" },
  { id: "cats", name: "Gatos" },
  { id: "dogs", name: "Perros" },
  { id: "dog-food", name: "Alimento para perro", parentId: "dogs" },
  { id: "dog-harness", name: "Arneses para perro", parentId: "dogs" },
  { id: "cat-food", name: "Alimento para gato", parentId: "cats" },
  { id: "litter", name: "Arenas sanitarias", parentId: "cats" },
  { id: "cattle", name: "Bovinos", parentId: "livestock" },
  { id: "horses", name: "Equinos", parentId: "livestock" },
  { id: "birds", name: "Aves", parentId: "small" },
  { id: "rodents", name: "Conejos y roedores", parentId: "small" },
  { id: "medicines", name: "Medicamentos para ganado", parentId: "pharmacy" },
  { id: "bovine-medicines", name: "Bovinos", parentId: "medicines" },
  { id: "human-snacks", name: "Snacks", parentId: "people" },
  { id: "inactive", name: "Categoría inactiva", active: false },
];

async function seed(page: Page, entities = categories) {
  await page.goto("/tienda/ingresar");
  await expect(async () => {
    await page
      .getByRole("button", { name: "Cliente mayorista", exact: true })
      .click();
    expect(await page.getByLabel("Correo electrónico").inputValue()).toBe(
      "cliente@gmail.com",
    );
  }).toPass({ timeout: 10000 });
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/tienda$/, { timeout: 10000 });
  await expect
    .poll(() => page.evaluate(() => !!localStorage.getItem("districo-demo-v1")))
    .toBe(true);
  await page.evaluate((entities) => {
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    state.categories = entities;
    state.products = [
      {
        ...state.products[0],
        name: "Alimento de prueba para perros",
        categories: [
          {
            categoryId: "dog-food",
            category: entities.find((entity) => entity.id === "dog-food"),
          },
        ],
      },
    ];
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  }, entities);
  await page.goto("/tienda/productos");
  await expect(
    page.getByRole("heading", { name: "Nuestro catálogo", exact: true }),
  ).toBeVisible();
}

async function checkHomeCategories(page: Page, testInfo: { outputPath: (name: string) => string }) {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/tienda");
    const section = page.getByRole("region", { name: "Comprar por especie", exact: true });
    for (const name of roots)
      await expect(section.getByRole("link", { name, exact: true })).toBeVisible();
    await expect(section.getByRole("link", { name: "Arenas sanitarias", exact: true })).toHaveCount(0);
    for (const image of await section.locator("img").all()) {
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0)).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await section.locator("a").evaluateAll((nodes) => nodes.every((node) => {
      const bounds = node.getBoundingClientRect();
      return bounds.left >= 0 && bounds.right <= innerWidth;
    }))).toBe(true);
    await section.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`home-categories-${viewport.width}.png`), animations: "disabled" });
  }
  const dogs = page.getByRole("region", { name: "Comprar por especie", exact: true }).getByRole("link", { name: "Perros", exact: true });
  const target = new URL((await dogs.getAttribute("href"))!, page.url()).href;
  await dogs.click();
  await expect(page).toHaveURL(target);
  await expect(page.locator(".product-card").first()).toBeVisible({ timeout: 30000 });
  await expect(page.locator("main [role=alert]")).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 1000 });
}

test.describe("catalog dropdown", () => {
  test.skip(realCatalog, "Fixtures isolated in the browser demo only.");

  test("home category shortcuts show the current catalog roots and open their products", async ({ page }, testInfo) => {
    await seed(page);
    await checkHomeCategories(page, testInfo);
  });

  test("desktop hover, hierarchy and category navigation", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await seed(page);
    const nav = page.getByRole("navigation", { name: "Navegación principal" });
    const menu = nav.getByRole("region", { name: "Categorías del catálogo" });
    await expect(menu).toBeHidden();
    await nav.getByRole("link", { name: "Catálogo", exact: true }).hover();
    await expect(menu).toBeVisible();
    await expect(menu.locator(".catalog-menu-root")).toHaveText(roots);
    await expect(
      menu.getByRole("link", { name: "Categoría inactiva", exact: true }),
    ).toHaveCount(0);
    await expect(
      menu.getByRole("link", { name: "Alimento para perro", exact: true }),
    ).toHaveAttribute("href", "/tienda/categorias/dog-food");
    await expect(
      menu
        .getByRole("region", { name: "Farmacia", exact: true })
        .getByRole("link", { name: "Bovinos", exact: true }),
    ).toHaveAttribute("href", "/tienda/categorias/bovine-medicines");
    await menu
      .getByRole("link", { name: "Alimento para perro", exact: true })
      .hover();
    await expect(menu).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("catalog-menu-desktop.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 900, height: 900 });
    await expect(menu).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("catalog-menu-tablet.png"),
      fullPage: true,
    });
    await menu
      .getByRole("link", { name: "Alimento para perro", exact: true })
      .click();
    await expect(page).toHaveURL(/\/tienda\/categorias\/dog-food$/);
    await expect(menu).toBeHidden();
    await expect(page.locator("main")).toContainText(
      "Alimento de prueba para perros",
    );
    await nav.getByRole("link", { name: "Catálogo", exact: true }).hover();
    await menu
      .getByRole("link", { name: "Ver todo el catálogo", exact: true })
      .click();
    await expect(page).toHaveURL(/\/tienda\/productos$/);
    expect(errors).toEqual([]);
  });

  test("click, keyboard and dismissal retain the complete catalog link", async ({
    page,
  }) => {
    await seed(page);
    const nav = page.getByRole("navigation", { name: "Navegación principal" });
    const toggle = nav.getByRole("button", {
      name: "Mostrar categorías del catálogo",
    });
    const menu = nav.getByRole("region", { name: "Categorías del catálogo" });
    await toggle.click();
    await expect(menu).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await toggle.click();
    await expect(menu).toBeHidden();
    await toggle.focus();
    await page.keyboard.press("ArrowDown");
    await expect(
      menu.getByRole("link", { name: "Ver todo el catálogo" }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      menu.getByRole("link", { name: "Perros", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(toggle).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(menu).toBeVisible();
    await page
      .getByRole("heading", { name: "Nuestro catálogo", exact: true })
      .click();
    await expect(menu).toBeHidden();
    await nav.getByRole("link", { name: "Catálogo", exact: true }).hover();
    await page
      .getByRole("heading", { name: "Nuestro catálogo", exact: true })
      .hover();
    await expect(menu).toBeHidden();
    await expect(
      nav.getByRole("link", { name: "Catálogo", exact: true }),
    ).toHaveAttribute("href", "/tienda/productos");
  });

  test("mobile accordion and category selection close the navigation", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seed(page);
    await page.getByRole("button", { name: "Abrir menú", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Explorá DISTRICO" });
    const menu = dialog.getByRole("region", {
      name: "Categorías del catálogo",
    });
    const toggle = dialog.getByRole("button", {
      name: "Mostrar categorías del catálogo",
    });
    await toggle.click();
    await expect(menu).toBeVisible();
    await expect(menu.locator(".catalog-menu-root")).toHaveText(roots);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("catalog-menu-mobile.png"),
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(dialog).toBeVisible();
    await toggle.click();
    await menu
      .getByRole("link", { name: "Alimento para perro", exact: true })
      .click();
    await expect(page).toHaveURL(/\/tienda\/categorias\/dog-food$/);
    await expect(dialog).toBeHidden();
    await expect(page.locator("main")).toContainText(
      "Alimento de prueba para perros",
    );
  });

  test("empty categories still allow entering the full catalog", async ({
    page,
  }) => {
    await seed(page, []);
    const nav = page.getByRole("navigation", { name: "Navegación principal" });
    await nav
      .getByRole("button", { name: "Mostrar categorías del catálogo" })
      .click();
    const menu = nav.getByRole("region", { name: "Categorías del catálogo" });
    await expect(menu).toContainText("No hay categorías disponibles.");
    await expect(
      menu.getByRole("link", { name: "Ver todo el catálogo" }),
    ).toHaveAttribute("href", "/tienda/productos");
  });
});

test("current API categories render in desktop and mobile without changing data", async ({
  page,
}, testInfo) => {
  test.skip(
    !realCatalog,
    "Opt-in check against the running real-data localhost.",
  );
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  const password =
    process.env.E2E_CUSTOMER_PASSWORD ?? process.env.DEMO_SEED_PASSWORD;
  if (!password)
    throw new Error(
      "Configure the test customer password before the opt-in live check.",
    );
  const login = await page.request.post("/api/backend/auth/login", {
    headers: { Origin: testInfo.project.use.baseURL! },
    data: {
      email: process.env.E2E_CUSTOMER_EMAIL ?? "cliente@districo.test",
      password,
    },
  });
  expect(login.ok()).toBe(true);
  await checkHomeCategories(page, testInfo);
  await page.goto("/tienda/productos");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  const menu = nav.getByRole("region", { name: "Categorías del catálogo" });
  await nav.getByRole("link", { name: "Catálogo", exact: true }).hover();
  await expect(menu.locator(".catalog-menu-root")).toHaveText(roots, {
    timeout: 30000,
  });
  await expect(
    menu.getByRole("link", { name: "Alimento para perro", exact: true }),
  ).toBeVisible();
  await expect(
    menu.getByRole("link", { name: "Arenas sanitarias", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("catalog-menu-real-desktop.png"),
    fullPage: true,
  });
  await menu
    .getByRole("link", { name: "Alimento para perro", exact: true })
    .click();
  await expect(page).toHaveURL(/\/tienda\/categorias\//);
  await expect(page.locator(".product-card").first()).toBeVisible({
    timeout: 30000,
  });
  await expect(page.locator("main [role=alert]")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Abrir menú", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Explorá DISTRICO" });
  await dialog
    .getByRole("button", { name: "Mostrar categorías del catálogo" })
    .click();
  await expect(dialog.locator(".catalog-menu-root")).toHaveText(roots);
  expect(
    await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await page.screenshot({
      path: testInfo.outputPath("catalog-menu-real-mobile.png"),
      fullPage: false,
  });
  await dialog
    .getByRole("link", { name: "Arenas sanitarias", exact: true })
    .click();
  await expect(page).toHaveURL(/\/tienda\/categorias\//);
  await expect(dialog).toBeHidden();
  await expect(page.locator(".product-card").first()).toBeVisible({
    timeout: 30000,
  });
  expect(errors).toEqual([]);
});
