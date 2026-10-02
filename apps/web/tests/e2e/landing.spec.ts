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
  await expect(page.getByRole("heading", { name: "Novedades." })).toBeVisible();
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

test("anclas del header y menú móvil con Escape y foco", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page
    .locator(".site-nav")
    .getByRole("link", { name: "Nosotros" })
    .click();
  await expect(page).toHaveURL(/#nosotros$/);
  await expect(page.locator("#nosotros")).toBeInViewport();
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
  await expect(page).toHaveURL(/\/tienda\/productos$/);
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

test("movimiento reducido deja marcas estáticas y sin bucles", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".site-brand-track")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(page.locator(".site-hero-orbit")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(
    page.locator(".site-brand-track [aria-hidden='true']").first(),
  ).toBeHidden();
});
