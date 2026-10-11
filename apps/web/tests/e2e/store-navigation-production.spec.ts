import { expect, test, type Page } from "@playwright/test";
import type { Product } from "../../src/lib/types";

test.skip(process.env.E2E_PRODUCTION_STORE !== "1", "Opt-in: producción con respuestas controladas, sin compras reales.");

async function fixture(page: Page, delay?: (url: URL) => Promise<void>) {
  const reads: string[] = [], finished: string[] = [], errors: string[] = [], routeReads: string[] = [];
  const user = { id: "store-qa", email: "store@example.test", role: "CLIENT", active: true,
    customerAccount: { accountStatus: "APPROVED" }, permissions: ["CAN_VIEW_PRICES", "CAN_PLACE_ORDERS"] };
  const products: Product[] = Array.from({ length: 24 }, (_, i) => ({
    id: `p${i + 1}`, slug: `store-qa-${i + 1}`, name: `Producto ${String(i + 1).padStart(2, "0")}`,
    productType: i % 2 ? "ACCESSORY" : "FOOD", requiresMedicationPermission: false,
    brand: { id: "biofresh", name: "Biofresh", slug: "biofresh", active: true },
    laboratory: null, categories: [{ categoryId: "dogs", category: { id: "dogs", name: "Perros" } }],
    media: [{ id: `image${i}`, type: "IMAGE", url: `/images/product-0-${i % 3 + 1}.png` }],
    variants: [1, 3].map((size) => ({ id: `v${i}-${size}`, active: true, name: `${size} kg`, sku: `SKU${i}-${size}`,
      availableStock: 10, minimumOrderQuantity: 1, saleMultiple: 1, price: { amount: 100 * size, currency: "UYU" } })),
  }));
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.searchParams.has("_rsc")) routeReads.push(url.pathname);
  });
  await page.route("**/api/backend/**", async (route) => {
    const url = new URL(route.request().url()), path = url.pathname.replace("/api/backend/", "");
    const key = path + url.search;
    reads.push(key);
    if (delay) await delay(url);
    let value: unknown;
    if (path === "auth/me") value = user;
    else if (path === "auth/logout") { user.permissions = []; value = {}; }
    else if (path === "cart") value = { items: [], total: 0 };
    else if (path === "categories/catalog") value = [{ id: "dogs", name: "Perros" }, { id: "cats", name: "Gatos" }];
    else if (path === "brands") value = [products[0].brand];
    else if (path === "products/cards") {
      const type = url.searchParams.get("productType"), search = url.searchParams.get("search");
      const items = products.filter((product) => (!type || product.productType === type) && (!search || product.name.includes(search)));
      const limit = Number(url.searchParams.get("limit") ?? 12), current = Number(url.searchParams.get("page") ?? 1);
      value = { items: items.slice((current - 1) * limit, current * limit), meta: { total: items.length, page: current, limit } };
    } else if (path.startsWith("products/")) value = products.find((product) => product.slug === path.slice(9));
    else value = [];
    await route.fulfill({ json: value });
    finished.push(key);
  });
  return { reads, finished, errors, routeReads };
}

async function measure(page: Page, expected: string, selector = ".product-card h3", root = ".catalog-results") {
  await page.evaluate(({ name, selector, root }) => {
    let start = 0;
    Object.assign(window, { qaStoreMs: null });
    window.addEventListener("click", () => { start = performance.now(); }, { once: true, capture: true });
    const observer = new MutationObserver(() => {
      if (!start || document.querySelector(selector)?.textContent !== name) return;
      Object.assign(window, { qaStoreMs: Math.round(performance.now() - start) }); observer.disconnect();
    });
    observer.observe(document.querySelector(root)!, { childList: true, characterData: true, subtree: true });
  }, { name: expected, selector, root });
}

for (const width of [1440, 390]) test(`paginación preparada muestra productos completos sin espera a ${width}px`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 });
  const state = await fixture(page);
  await page.goto("/tienda/productos?brandId=biofresh");
  await expect(page.locator(".product-card")).toHaveCount(12);
  await expect.poll(() => state.finished.some((key) => key.includes("page=2") && key.includes("includeVariants=true"))).toBe(true);
  await page.getByRole("button", { name: "Siguiente →" }).scrollIntoViewIfNeeded();
  const count = state.reads.filter((key) => key.includes("page=2") && key.includes("includeVariants=true")).length;
  await measure(page, "Producto 13");
  await page.getByRole("button", { name: "Siguiente →" }).click();
  await expect(page.locator(".product-card h3").first()).toHaveText("Producto 13", { timeout: 1000 });
  await expect(page).toHaveURL(/page=2/);
  const ms = await page.evaluate(() => (window as Window & { qaStoreMs?: number | null }).qaStoreMs);
  expect(ms).not.toBeNull(); expect(ms!).toBeLessThan(200);
  console.info(`Productos visibles tras el clic, ${width}px: ${ms} ms (datos preparados, API de prueba)`);
  expect(state.reads.filter((key) => key.includes("page=2") && key.includes("includeVariants=true"))).toHaveLength(count);
  await expect(page.locator(".catalog-results .loading")).toHaveCount(0);
  await expect(page.getByText("Cargando presentaciones…", { exact: true })).toHaveCount(0);
  await expect(page.locator(".product-card").first().getByRole("button", { name: "3 kg", exact: true })).toBeVisible();
  await page.locator(".product-card").first().getByRole("button", { name: "3 kg", exact: true }).click();
  await expect(page.locator(".product-card").first().locator(".product-price strong")).toContainText("300");
  expect(await page.locator(".product-card").first().evaluate((card) => getComputedStyle(card).opacity)).toBe("1");
  await page.goBack(); await expect(page.locator(".product-card h3").first()).toHaveText("Producto 01");
  await page.goForward(); await expect(page.locator(".product-card h3").first()).toHaveText("Producto 13");
  expect(state.errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.locator(".catalog-results").screenshot({ path: info.outputPath(`productos-${width}.png`) });
  await info.attach("click-to-products-ms", { body: JSON.stringify({ width, ms, source: "API interceptada; datos preparados" }), contentType: "application/json" });
});

test("un filtro no preparado conserva la grilla; bloquea compra de datos anteriores y no pide RSC", async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const state = await fixture(page, async (url) => { if (url.searchParams.get("search") === "Producto 24") await held; });
  try {
    await page.goto("/tienda/productos");
    await expect(page.locator(".product-card")).toHaveCount(12);
    const routeReads: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.searchParams.has("_rsc") && url.searchParams.get("search") === "Producto 24") routeReads.push(request.url());
    });
    await page.getByRole("textbox", { name: "Buscar en el catálogo" }).fill("Producto 24");
    await page.locator(".inline-search").getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(page).toHaveURL(/search=Producto\+24/);
    await expect(page.locator(".catalog-results [aria-busy='true'][inert]")).toBeVisible();
    await expect(page.locator(".product-card")).toHaveCount(12);
    await expect(page.locator(".catalog-results .loading")).toHaveCount(0);
    expect(routeReads).toEqual([]);
    release();
    await expect(page.locator(".product-card")).toHaveCount(1);
    await expect(page.locator(".product-card h3")).toHaveText("Producto 24");
    await expect(page.locator(".catalog-results [inert]")).toHaveCount(0);
    expect(state.reads.filter((key) => key.includes("search=Producto+24"))).toHaveLength(1);
    await page.goBack();
    await expect(page.getByRole("textbox", { name: "Buscar en el catálogo" })).toHaveValue("");
    await expect(page.locator(".product-card")).toHaveCount(12);
    await page.goForward();
    await expect(page.getByRole("textbox", { name: "Buscar en el catálogo" })).toHaveValue("Producto 24");
    await expect(page.locator(".product-card")).toHaveCount(1);
    expect(state.errors).toEqual([]);
  } finally { release(); await page.unrouteAll({ behavior: "wait" }); }
});

test("los enlaces visibles preparan catálogo, ficha e imágenes sin lecturas por cada tarjeta", async ({ page }) => {
  const state = await fixture(page);
  await page.goto("/tienda/productos");
  await expect(page.locator(".product-card")).toHaveCount(12);
  const link = page.locator(".product-card").first().getByRole("link", { name: "Ver Producto 01" });
  await link.focus();
  await expect.poll(() => state.finished.filter((key) => key === "products/store-qa-1").length).toBe(1);
  await measure(page, "Producto 01", ".detail-page h1", "#contenido");
  await link.press("Enter");
  await expect(page.locator(".detail-page h1")).toHaveText("Producto 01", { timeout: 1000 });
  await expect(page.locator("#contenido")).toBeFocused();
  await expect(page.locator(".detail-page > .loading")).toHaveCount(0);
  const ms = await page.evaluate(() => (window as Window & { qaStoreMs?: number | null }).qaStoreMs);
  expect(ms).not.toBeNull(); expect(ms!).toBeLessThan(200);
  console.info(`Ficha de producto preparada: ${ms} ms (API de prueba)`);
  expect(state.reads.filter((key) => key === "products/store-qa-1")).toHaveLength(1);
  expect(state.routeReads).not.toContain("/tienda/producto/store-qa-1");
  expect(state.reads.filter((key) => /^products\/store-qa-\d+$/.test(key)).length).toBeLessThan(12);
  const image = page.locator(".detail-gallery img").first();
  await expect(image).toBeVisible();
  expect(await image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
  expect(state.errors).toEqual([]);
});

test("categoría preparada abre su grilla y filtros sin una pantalla intermedia", async ({ page }) => {
  const state = await fixture(page);
  await page.goto("/tienda/productos");
  await expect(page.locator(".product-card")).toHaveCount(12);
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Mostrar categorías del catálogo" }).click();
  const link = nav.getByRole("link", { name: "Perros", exact: true });
  await link.focus();
  await expect.poll(() => state.finished.some((key) => key.includes("categoryId=dogs") && key.includes("includeVariants=true"))).toBe(true);
  await measure(page, "Perros", ".catalog-page h1", "#contenido");
  await link.click();
  await expect(page.locator(".catalog-page h1")).toHaveText("Perros");
  await expect(page.locator(".product-card")).toHaveCount(12);
  await expect(page.locator(".catalog-results .loading")).toHaveCount(0);
  const ms = await page.evaluate(() => (window as Window & { qaStoreMs?: number | null }).qaStoreMs);
  expect(ms).not.toBeNull(); expect(ms!).toBeLessThan(200);
  console.info(`Categoría preparada con productos: ${ms} ms (API de prueba)`);
  expect(state.routeReads).not.toContain("/tienda/categorias/dogs");
  await page.reload();
  await expect(page.locator(".catalog-page h1")).toHaveText("Perros");
  await page.getByRole("button", { name: "Siguiente →" }).click();
  await expect(page).toHaveURL(/\/tienda\/productos\?categoryId=dogs&page=2/);
  await expect(page.locator(".product-card h3").first()).toHaveText("Producto 13");
  await page.goBack();
  await expect(page.locator(".catalog-page h1")).toHaveText("Perros");
  await expect(page.locator(".product-card h3").first()).toHaveText("Producto 01");
  expect(state.errors).toEqual([]);
});
