import { expect, test, type Page } from "@playwright/test";
import { demoPetStage } from "../../src/lib/pet-stage";
import { storeRoutes } from "../../src/lib/store-routes";

async function seed(page: Page) {
  await page.goto(storeRoutes.login);
  await expect(async () => {
    await page.getByRole("button", { name: "Administración", exact: true }).click();
    expect(await page.getByLabel("Correo electrónico").inputValue()).toBe("admin@districo.com");
  }).toPass({ timeout: 15000 });
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/tienda$/);
  await page.evaluate((stage) => {
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    state.categories = [
      { id: "dogs", name: "Perros" }, { id: "cats", name: "Gatos" },
      { id: "cat-food", name: "Alimento para gato", parentId: "cats" },
      { id: "dog-food", name: "Alimento para perro", parentId: "dogs" },
      { id: "new", name: "Acuarios" }, { id: "renamed", name: "Animales de granja" },
      { id: "inactive", name: "Oculta", active: false },
    ];
    state.attributes = [stage];
    state.brands = [
      { id: "biofresh", slug: "biofresh", name: "Biofresh renovado", imageUrl: "/images/brands/stack.png", active: true },
      { id: "granplus", slug: "gran-plus", name: "Gran Plus", active: false },
      { id: "three", slug: "three-dogs", name: "Three Dogs", active: true },
    ];
    const original = state.products[0];
    const product = (id: string, name: string, categoryId: string, stageIndex: number) => ({
      ...original, id, slug: id, name, active: true, productType: "FOOD", featured: true,
      requiresMedicationPermission: false, brand: state.brands[0],
      categories: [{ categoryId, category: state.categories.find((item: { id: string }) => item.id === categoryId) }],
      attributes: [{ attributeValue: { ...stage.values[stageIndex], attribute: stage } }],
      variants: Array.from({ length: 5 }, (_, index) => ({ ...original.variants[0], id: `${id}-v${index}`, name: `Presentación ${index + 1}`, active: index < 4 })),
    });
    state.products = [product("kitten-food", "Biofresh gatos Cachorros", "cat-food", 0), product("adult-food", "Biofresh gatos Adultos", "cat-food", 1), product("puppy-food", "Biofresh perros Cachorros", "dog-food", 0)];
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  }, demoPetStage);
  await page.goto(storeRoutes.home);
}

test("Gatitos y Cachorros filtran por especie y etapa; las tarjetas cuentan todas las variantes", async ({ page }) => {
  await seed(page);
  const shortcuts = page.getByRole("region", { name: "Comprar por especie" });
  const kittens = shortcuts.getByRole("link", { name: "Gatitos", exact: true });
  await expect(kittens).toHaveAttribute("href", /categoryId=cats&productType=FOOD&attributeValueIds=demo-etapa-juvenil$/);
  await kittens.click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(page.locator(".product-card")).toContainText("Biofresh gatos Cachorros");
  await expect(page.locator(".product-card")).toContainText("4 presentaciones");
  await page.goto(storeRoutes.home);
  await shortcuts.getByRole("link", { name: "Cachorros", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(page.locator(".product-card")).toContainText("Biofresh perros Cachorros");
});

test("categorías nuevas y renombradas permanecen en portada; logos y marcas siguen al admin", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seed(page);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const shortcuts = page.getByRole("region", { name: "Comprar por especie" });
    await expect(shortcuts.getByRole("link", { name: "Acuarios", exact: true })).toHaveAttribute("href", storeRoutes.category("new"));
    await expect(shortcuts.getByRole("link", { name: "Animales de granja", exact: true })).toHaveAttribute("href", storeRoutes.category("renamed"));
    await expect(shortcuts.getByRole("link", { name: "Oculta", exact: true })).toHaveCount(0);
    const promos = page.getByRole("region", { name: "Marcas insignia" });
    await expect(promos.getByRole("img", { name: "Biofresh renovado", exact: true })).toHaveAttribute("src", /stack/);
    await expect(promos.getByRole("heading", { name: "Biofresh renovado", exact: true })).toBeVisible();
    await expect(promos.locator(".is-granplus")).toHaveCount(0);
    await expect(promos.locator(".is-biofresh")).toHaveAttribute("href", /brandId=biofresh$/);
    for (const image of await promos.locator("img").all()) {
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0)).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`home-${width}.png`), animations: "disabled", fullPage: true });
  }
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    state.brands[0].active = false;
    state.brands = state.brands.filter((brand: { id: string }) => brand.id !== "three");
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  });
  await page.reload();
  await expect(page.getByRole("region", { name: "Marcas insignia" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("el admin cambia o quita la etapa; el catálogo y la ficha reflejan el valor guardado", async ({ page }) => {
  await seed(page);
  await page.goto(storeRoutes.adminProduct("kitten-food"));
  const editor = page.locator("#edicion");
  await expect(editor.getByLabel("Etapa (alimentos para mascotas)")).toHaveValue("demo-etapa-juvenil");
  await editor.getByLabel("Etapa (alimentos para mascotas)").selectOption("demo-etapa-adulto");
  await editor.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(page.getByText("Cambios guardados.", { exact: true })).toBeVisible();
  await page.goto(storeRoutes.product("kitten-food"));
  await expect(page.locator(".detail-specs").getByText("Adulto", { exact: true })).toBeVisible();
  await page.goto(storeRoutes.adminProduct("kitten-food"));
  await editor.getByLabel("Etapa (alimentos para mascotas)").selectOption("");
  await editor.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(page.getByText("Cambios guardados.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(editor.getByLabel("Etapa (alimentos para mascotas)")).toHaveValue("");
  await page.goto(storeRoutes.home);
  await page.getByRole("region", { name: "Comprar por especie" }).getByRole("link", { name: "Gatitos", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(0);
});
