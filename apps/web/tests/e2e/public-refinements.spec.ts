import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });

test("panel lateral mantiene la grilla y el scroll al cambiar de marca", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/marcas");
  const biofresh = page.locator(".brands-card").filter({ hasText: /^Biofresh/ });
  await biofresh.scrollIntoViewIfNeeded();
  const before = await biofresh.boundingBox();
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await biofresh.click();
  await expect(page.locator("#brands-detail-title")).toBeFocused();
  expect(await biofresh.boundingBox()).toEqual(before);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  const mutts = page.locator(".brands-card").filter({ hasText: /^Mutts/ });
  await mutts.click();
  await expect(page.locator("#brands-detail-title")).toHaveText("Mutts");
  expect(await biofresh.boundingBox()).toEqual(before);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await expect(mutts).toBeFocused();
  expect(await biofresh.boundingBox()).toEqual(before);
  await biofresh.click();
  await expect(page.locator(".brands-detail .home-shelf li")).toHaveCount(4);
  await expect(page.locator(".brands-detail .home-text-link")).toHaveAttribute("href", "/productos?search=Biofresh");
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width < 1024) {
      const firstRow = await page.locator(".brands-card").nth(1).boundingBox();
      const profile = await page.locator(".brands-detail").boundingBox();
      const nextRow = await page.locator(".brands-card").nth(2).boundingBox();
      expect(profile!.y).toBeGreaterThanOrEqual(firstRow!.y + firstRow!.height);
      expect(nextRow!.y).toBeGreaterThanOrEqual(profile!.y + profile!.height);
    }
  }
});

test("panel muestra productos asociados aunque la marca no tenga imágenes fijas", async ({ page }) => {
  await page.goto("/tienda/ingresar");
  await page.getByRole("button", { name: "Cliente mayorista", exact: true }).click();
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/tienda$/);
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    const template = state.products[0];
    const mutts = { id: "panel-mutts-test", name: "Mútts", slug: "mutts", active: true };
    const apolo = { id: "panel-apolo-test", name: "Apolo", slug: "apolo", active: true };
    state.brands.push(mutts, apolo);
    for (const [brand, count] of [[mutts, 6], [apolo, 2]] as const) {
      for (let i = 0; i < count; i++) state.products.push({
        ...template, id: `${brand.id}-${i}`, slug: `${brand.slug}-panel-${i}`,
        name: `${brand.name} producto de prueba ${i}`, brand, active: true, media: i === 0 ? [] : template.media,
      });
    }
    state.products.push({ ...template, id: "mutts-inactive-test", name: "0 Mutts inactivo", brand: mutts, active: false });
    state.products.push({ ...template, id: "mutts-wrong-brand", name: "0 Mutts de otra marca", brand: template.brand });
    state.session = null;
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  });
  await page.goto("/marcas");
  await page.reload();
  await page.locator(".brands-card").filter({ hasText: /^Mutts/ }).click();
  const products = page.locator(".brands-detail .home-shelf li");
  await expect(products).toHaveCount(4);
  await expect(products).toHaveText(["Mútts producto de prueba 0", "Mútts producto de prueba 1", "Mútts producto de prueba 2", "Mútts producto de prueba 3"]);
  await expect(products.first().getByRole("link")).toHaveAttribute("href", "/productos/mutts-panel-0");
  await expect(products.first().locator("img")).toHaveAttribute("src", "/images/placeholder.svg");
  await page.locator(".brands-card").filter({ hasText: /^Apolo/ }).click();
  await expect(products).toHaveCount(2);
  await expect(products).toHaveText(["Apolo producto de prueba 0", "Apolo producto de prueba 1"]);
  await page.locator(".brands-card").filter({ hasText: /^Primocão/ }).click();
  await expect(products).toHaveCount(0);
  await expect(page.locator(".brands-detail")).toContainText("No hay productos publicados de esta marca.");
  await page.locator(".brands-card").filter({ hasText: /^Biofresh/ }).click();
  await expect(products).toHaveCount(4);
  await expect(products).not.toContainText(["Mútts", "Apolo"]);
});

test("marcas conserva filtros y acompaña el perfil con el foco", async ({ page }) => {
  await page.goto("/marcas");
  await expect(page.locator("#brand-line-filters")).toBeHidden();
  await expect(page.locator(".brands-result")).toHaveText("28 marcas");
  const biofresh = page.locator(".brands-card").filter({ hasText: /^Biofresh/ });
  await biofresh.click();
  await expect(page.locator("#brands-detail-title")).toBeFocused();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await expect(biofresh).toBeFocused();
  await biofresh.click();
  await page.getByRole("searchbox", { name: "Buscar marca" }).fill("stack");
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await expect(page.getByRole("searchbox", { name: "Buscar marca" })).toBeFocused();
  await page.getByRole("button", { name: /^Líneas de producto/ }).click();
  await expect(page.locator("#brand-line-filters")).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByRole("button", { name: /^Líneas de producto/ })).toBeHidden();
  await expect(page.locator("#brand-line-filters")).toBeVisible();
});

test("empleos muestra resultados antes de desplegar filtros móviles", async ({ page }) => {
  await page.goto("/trabajo");
  await expect(page.locator(".jobs-item")).toHaveCount(2);
  await expect(page.locator("#job-filter-panel")).toBeHidden();
  const firstTop = await page.locator(".jobs-item").first().evaluate(el => el.getBoundingClientRect().top);
  expect(firstTop).toBeLessThan(1000);
  await page.getByRole("button", { name: /^Filtros de área y jornada/ }).click();
  await page.getByLabel(/Marketing/).check();
  await expect(page.locator("#jobs-result")).toHaveText("Sin resultados");
  await page.getByRole("button", { name: "Limpiar filtros", exact: true }).click();
  await expect(page.locator(".jobs-item")).toHaveCount(2);
  await page.getByRole("button", { name: /^Filtros de área y jornada/ }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator("#job-filter-panel")).toBeVisible();
});

test("alta anticipa documentación y mantiene campos y formatos", async ({ page }) => {
  await page.goto("/tienda/solicitar-cuenta");
  await expect(page.getByRole("heading", { name: "Antes de empezar" })).toBeVisible();
  await expect(page.locator(".application-preparation")).toContainText("al menos un permiso");
  for (const name of ["Comercio", "Contacto", "Acceso y documentación"]) await expect(page.getByRole("group", { name, exact: true })).toBeVisible();
  await expect(page.getByLabel("RUT", { exact: false })).toHaveAttribute("inputmode", "numeric");
  await expect(page.getByLabel("Correo electrónico", { exact: false })).toHaveAttribute("autocomplete", "email");
  await expect(page.locator("#password-hint")).toHaveText("Usá al menos 8 caracteres.");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("garantía aclara envase abierto y Nosotros conserva textos completos", async ({ page }) => {
  await page.goto("/garantia");
  await expect(page.locator(".site-warranty-steps ol")).toContainText("Puede estar abierto");
  await page.getByText("Alcance y condiciones completas", { exact: true }).click();
  await expect(page.locator(".site-warranty-terms")).toContainText("puede estar abierto");
  await expect(page.locator("main")).not.toContainText("cerrado de fábrica");
  await page.goto("/nosotros");
  await page.getByText("Leer la misión completa", { exact: true }).click();
  await expect(page.locator(".site-about-purpose details p")).toContainText("crecimiento individual y profesional");
  for (const details of await page.locator(".site-about-value-groups details").all()) await details.locator("summary").click();
  await expect(page.locator(".site-about-value-groups dd:visible")).toHaveCount(9);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("contacto amplía superficies táctiles de enlaces y mapa", async ({ page }) => {
  await page.goto("/contacto");
  await expect(page.locator(".leaflet-control-zoom-in")).toBeVisible();
  const controls = page.locator(".reference-contact-direct a, .contact-filter-actions button, .leaflet-control-zoom a");
  expect(await controls.evaluateAll(items => items.every(el => el.getBoundingClientRect().height >= 44))).toBe(true);
  expect(await page.locator(".leaflet-control-zoom a").evaluateAll(items => items.every(el => el.getBoundingClientRect().width >= 44))).toBe(true);
});
