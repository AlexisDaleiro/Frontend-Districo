import { expect, test } from "@playwright/test";
import type { ProductCardList } from "../../src/lib/types";

test.skip(process.env.E2E_LIVE_STORE_READS !== "1", "Opt-in: sólo catálogo público de la API real, sin cuentas ni pedidos nuevos.");
test.use({ trace: "off" });

test("Biofresh real: paginación precargada e imágenes listas sin nuevas consultas al hacer clic", async ({ page }, info) => {
  test.setTimeout(90000);
  const errors: string[] = [], reads: string[] = [];
  let next: ProductCardList | undefined;
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", async (response) => {
    const url = new URL(response.url());
    if (url.pathname === "/api/backend/products/cards" && url.searchParams.get("brandId") === "districo-brand-biofresh" &&
      url.searchParams.get("page") === "2" && url.searchParams.get("limit") === "12" && response.ok()) next = await response.json();
  });
  // Simulate only the access gate: catalog data, variants and images are real public reads.
  await page.route("**/api/backend/**", async (route) => {
    expect(route.request().method()).toBe("GET");
    const url = new URL(route.request().url()), path = url.pathname.replace("/api/backend/", "");
    if (path === "auth/me") {
      await route.fulfill({ json: { id: "public-catalog-renderer", email: "public-renderer@example.test", role: "CLIENT", active: true, permissions: [] } });
    } else if (path === "account/me/favorites/ids") await route.fulfill({ json: [] });
    else if (["categories/catalog", "brands", "laboratories", "attributes"].includes(path) || path.startsWith("products/")) {
      reads.push(path + url.search); await route.continue();
    } else throw new Error(`Lectura no prevista: ${path}`);
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/tienda/productos?brandId=districo-brand-biofresh");
  await expect(page.locator(".product-card")).toHaveCount(12);
  await expect.poll(() => next?.items.length).toBeGreaterThan(0);
  expect(next!.items.every((product) => product.variants.every((variant) => variant.price === undefined &&
    typeof variant.availableStock === "number" && typeof variant.saleMultiple === "number"))).toBe(true);
  const expected = next!.items[0].name;
  const nextReads = () => reads.filter((path) => path.includes("page=2") && path.includes("includeVariants=true")).length;
  const count = nextReads();
  const nextImage = next!.items[0].media[0]?.url;
  if (nextImage) await expect.poll(() => page.evaluate((src) =>
    performance.getEntriesByName(new URL(src, location.origin).href).some((entry) => entry.entryType === "resource"), nextImage)).toBe(true);
  await page.getByRole("button", { name: "Siguiente →" }).scrollIntoViewIfNeeded();
  await page.evaluate((name) => {
    let start = 0;
    Object.assign(window, { qaLiveStoreMs: null });
    document.addEventListener("click", () => { start = performance.now(); }, { once: true, capture: true });
    const observer = new MutationObserver(() => {
      if (!start || document.querySelector(".product-card h3")?.textContent !== name) return;
      Object.assign(window, { qaLiveStoreMs: Math.round(performance.now() - start) }); observer.disconnect();
    });
    observer.observe(document.querySelector(".catalog-results")!, { childList: true, subtree: true });
  }, expected);
  await page.getByRole("button", { name: "Siguiente →" }).click();
  await expect(page.locator(".product-card h3").first()).toHaveText(expected, { timeout: 1000 });
  const ms = await page.evaluate(() => (window as Window & { qaLiveStoreMs?: number | null }).qaLiveStoreMs);
  expect(ms).not.toBeNull(); expect(ms!).toBeLessThan(200);
  expect(nextReads()).toBe(count);
  await expect(page.locator(".catalog-results .loading")).toHaveCount(0);
  await expect(page.getByText("Cargando presentaciones…", { exact: true })).toHaveCount(0);
  expect(await page.locator(".product-card img").first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await page.goBack(); await expect(page.locator(".product-card")).toHaveCount(12);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.locator(".catalog-results").screenshot({ path: info.outputPath("biofresh-real-mobile.png") });
  expect(errors).toEqual([]);
  console.info(`Biofresh real, clic a productos precargados: ${ms} ms; no incluye primera carga de red ni autenticación real.`);
});
