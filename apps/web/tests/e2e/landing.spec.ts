import { expect, test } from "@playwright/test";

test("el contenido institucional sigue visible sin JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Marcas que acompañan. Un socio que responde/,
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Alimento para mascotas" })).toBeVisible();
  await expect(page.locator(".site-session-check")).toBeHidden();
  await context.close();
});

test("hero institucional y tres accesos principales", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Marcas que acompañan. Un socio que responde/,
    }),
  ).toBeVisible();
  await expect(page.locator("h1")).toHaveCount(1);
  await page
    .locator(".site-hero")
    .getByRole("link", { name: "Explorar productos" })
    .click();
  await expect(page).toHaveURL(/\/productos$/);
  await expect(
    page.getByRole("heading", { level: 1, name: /Marcas y productos/ }),
  ).toBeVisible();
  await page.goto("/");
  await page
    .locator(".site-hero")
    .getByRole("link", { name: "Solicitar cuenta" })
    .click();
  await expect(page).toHaveURL(/\/tienda\/solicitar-cuenta$/);
  await page.goto("/");
  await page
    .locator(".site-header")
    .getByRole("link", { name: "Ingresar" })
    .click();
  await expect(page).toHaveURL(/\/tienda\/ingresar$/);
});

test("navbar institucional y menú móvil con Escape y foco", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const nav = page.locator(".site-nav");
  await expect(nav.getByRole("link")).toHaveText([
    "Productos",
    "Marcas",
    "Garantía",
    "Nosotros",
  ]);
  await nav.getByRole("link", { name: "Nosotros" }).click();
  await expect(page).toHaveURL(/\/nosotros$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Una empresa uruguaya con 30 años de ruta.",
  );
  await nav.getByRole("link", { name: "Marcas" }).click();
  await expect(page).toHaveURL(/\/marcas$/);
  const brandCards = page.locator(".site-brand-grid .reference-brand-card");
  await expect(brandCards).toHaveCount(15);
  await page.getByRole("button", { name: "Arenas sanitarias" }).click();
  await expect(brandCards).toHaveCount(2);
  await page.getByRole("button", { name: "Todas" }).click();
  await expect(brandCards).toHaveCount(15);
  await nav.getByRole("link", { name: "Garantía" }).click();
  await expect(page).toHaveURL(/\/garantia$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Si tu mascota no lo acepta, lo cambiamos.",
  );
  await expect(
    page.locator(".site-nav").getByRole("link", { name: "Garantía" }),
  ).toHaveAttribute("aria-current", "page");
  await page.setViewportSize({ width: 390, height: 844 });
  const trigger = page.getByRole("button", { name: "Abrir menú" });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() => !!document.activeElement?.closest("dialog")),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("catálogo público muestra datos de la API sin precios", async ({
  page,
}) => {
  await page.goto("/productos");
  await expect(page.locator("a.site-product-image").first()).toBeVisible();
  await expect(page.locator(".site-catalog-result")).toContainText(
    "Sin precios para visitantes",
  );
  await expect(page.locator(".site-product-card").first()).not.toContainText(
    "$",
  );
  await page.locator("a.site-product-image").first().click();
  await expect(page).toHaveURL(/\/productos\/[^/]+$/, { timeout: 15000 });
  await expect(page.locator(".site-detail-access")).toContainText(
    "cuenta aprobada",
  );
  await expect(page.locator(".site-detail-page")).not.toContainText("$");
});

test("la tienda requiere sesión y la cuenta activa entra allí desde la raíz", async ({
  page,
}) => {
  await page.goto("/tienda/productos");
  await expect(page).toHaveURL(/\/tienda\/ingresar$/);
  await page
    .getByRole("button", { name: "Cliente mayorista", exact: true })
    .click();
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/tienda$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/tienda$/);
});

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`landing y catálogo sin scroll horizontal a ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const route of ["/", "/productos"]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
        route,
      ).toBe(0);
      if (width < 768)
        await expect(page.locator(".site-header .site-apply")).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}

test("movimiento reducido deja el hero sin bucles", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".site-hero-orbit")).toHaveCSS(
    "animation-name",
    "none",
  );
});

test("marcas públicas: tarjetas y acceso al catálogo", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/marcas");
  const cards = page.locator(".reference-brand-card");
  await expect(cards.first()).toBeVisible();
  await expect(cards).toHaveCount(15);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("15 marcas");
  await cards.first().click();
  await expect(page).toHaveURL(/\/productos\?search=Gran%20Plus/);
});

test("nosotros: línea de tiempo de hitos interactiva", async ({ page }) => {
  await page.goto("/nosotros");
  const tabs = page.getByRole("tablist", { name: "Años de la historia de DISTRICO" });
  const panel = page.getByRole("tabpanel");
  await expect(tabs.getByRole("tab")).toHaveCount(13);
  await expect(tabs.getByRole("tab", { name: "1960" })).toHaveAttribute("aria-selected", "true");
  await expect(panel).toContainText("Agropecuaria Colón");
  await expect(page.getByRole("button", { name: "Hito anterior" })).toBeDisabled();
  await page.getByRole("button", { name: "Hito siguiente" }).click();
  await expect(panel).toContainText("Segunda generación");
  await tabs.getByRole("tab", { name: "2013" }).click();
  await expect(panel).toContainText("Se inaugura la Casa Matriz");
  await page.keyboard.press("ArrowRight");
  await expect(tabs.getByRole("tab", { name: "2016" })).toBeFocused();
  await page.keyboard.press("End");
  await expect(panel).toContainText("Ampliación del depósito");
  await expect(page.getByRole("button", { name: "Hito siguiente" })).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/nosotros");
  await tabs.getByRole("tab", { name: "1960" }).focus();
  await page.keyboard.press("End");
  await expect(tabs.getByRole("tab", { name: "2022" })).toBeInViewport({ ratio: 1 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
});

test("líneas: productos rotan de a uno con miniaturas y enlace a la marca", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const line = page.locator(".reference-line").first();
  await line.scrollIntoViewIfNeeded();
  await expect(line.locator(".reference-showcase-item")).toHaveCount(5);
  const active = line.locator(".reference-showcase-item.is-active img");
  await expect(active).toHaveAttribute("alt", /BIOFRESH/);
  const dots = line.getByRole("group", { name: "Elegir producto" }).getByRole("button");
  await dots.nth(1).click();
  await expect(active).toHaveAttribute("alt", /BENY/);
  await expect(dots.nth(1)).toHaveAttribute("aria-current", "true");
  const brand = line.getByRole("link", { name: "Distribuimos Beny" });
  await expect(brand).toHaveAttribute("href", "/productos?search=Beny");
  await brand.click();
  await expect(page).toHaveURL(/\/productos\?search=Beny$/);
});
