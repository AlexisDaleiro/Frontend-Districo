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
      name: /Un socio que responde/,
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
      name: /Un socio que responde/,
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

test("el hero narra tres escenas sin barra de controles", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator(".site-hero");
  await expect(hero.locator(".site-hero-story-controls")).toHaveCount(0);
  await expect(hero.locator(".site-hero-story-media img")).toHaveAttribute("src", /casa-matriz-fachada\.webp/);
  await expect(hero.getByRole("heading", { level: 1 })).toHaveText("Marcas que acompañan.", { timeout: 7000 });
  await expect(hero.locator(".site-hero-story-media img")).toHaveAttribute("src", /hero-biofresh-castrados\.png/);
  await expect(hero.getByRole("heading", { level: 1 })).toHaveText("Llegamos a todo Uruguay.", { timeout: 7000 });
});

test("el hero no avanza solo con movimiento reducido", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const hero = page.locator(".site-hero");
  await page.waitForTimeout(5500);
  await expect(hero.getByRole("heading", { level: 1 })).toHaveText("Un socio que responde.");
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
    "Contacto",
  ]);
  await nav.getByRole("link", { name: "Nosotros" }).click();
  await expect(page).toHaveURL(/\/nosotros$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Una empresa uruguaya con 30 años de ruta.",
  );
  await nav.getByRole("link", { name: "Marcas" }).click();
  await expect(page).toHaveURL(/\/marcas$/);
  const brandCards = page.locator(".site-brand-grid .reference-brand-card");
  await expect(brandCards).toHaveCount(16);
  await page.getByRole("button", { name: "Arenas sanitarias" }).click();
  await expect(brandCards).toHaveCount(2);
  await page.getByRole("button", { name: "Todas" }).click();
  await expect(brandCards).toHaveCount(16);
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

for (const width of [320, 360, 390, 768, 1024, 1440]) {
  test(`landing y catálogo sin scroll horizontal a ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const route of ["/", "/productos", "/contacto"]) {
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
  await expect(cards).toHaveCount(16);
  await expect(cards.first().locator(".reference-brand-photo")).toHaveAttribute("src", /granplus\.jpg/);
  await expect(cards.first().locator(".reference-brand-wordmark")).toHaveText("Gran Plus");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("16 marcas");
  await page.getByRole("button", { name: "Farmacia y Laboratorio" }).click();
  await expect(cards).toHaveCount(1);
  await expect(cards.first().locator(".reference-brand-wordmark")).toHaveText("Laboratorios");
  await expect(cards.first()).toHaveAttribute("href", "/productos?categoryId=veterinaria");
  await page.getByRole("button", { name: "Todas" }).click();
  for (const width of [768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const rows = await cards.evaluateAll((nodes) => {
      const tops = nodes.map((node) => Math.round(node.getBoundingClientRect().top));
      return [...new Set(tops)].map((top) => tops.filter((value) => value === top).length);
    });
    expect(rows).toEqual([4, 4, 4, 4]);
  }
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

test("la cinta sigue al hero y farmacia aparece después de snacks", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const lines = page.locator(".reference-line");
  await expect(lines).toHaveCount(7);
  await expect(lines.nth(5).getByRole("heading", { level: 2 })).toHaveText("Snacks para mascotas");
  const pharmacy = lines.nth(6);
  await expect(pharmacy.getByRole("heading", { level: 2 })).toHaveText("Farmacia y Laboratorio");
  await expect(pharmacy.locator(".reference-showcase-item.is-active img")).toHaveAttribute("src", /raicor-animales-de-compania-0\.png/);
  await expect(pharmacy.getByRole("link", { name: "Ver productos" })).toHaveAttribute("href", "/productos?categoryId=veterinaria");

  const strip = page.locator(".site-hero + .site-brand-strip");
  await expect(strip).toHaveCount(1);
  await expect(page.locator(".site-brand-strip + .reference-lines")).toHaveCount(1);
  await expect(strip.locator(".reference-brand-card")).toHaveCount(16);
  const track = strip.locator(".site-brand-strip-track");
  await expect(strip.getByRole("group", { name: "Elegir página de marcas" }).getByRole("button")).toHaveCount(2);
  await strip.getByRole("button", { name: "Marcas siguientes" }).click();
  await expect.poll(() => track.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  await expect(strip.getByRole("button", { name: "Marcas anteriores" })).toBeEnabled();
  await expect(strip.getByRole("button", { name: "Marcas siguientes" })).toBeDisabled();

  await page.setViewportSize({ width: 390, height: 900 });
  const dots = strip.getByRole("group", { name: "Elegir página de marcas" }).getByRole("button");
  await expect(dots).toHaveCount(7);
  await dots.last().click();
  await expect(dots.last()).toHaveAttribute("aria-current", "true");
  await dots.first().click();
  await expect(dots.first()).toHaveAttribute("aria-current", "true");
});

test("contacto: página propia arma el mensaje para WhatsApp sin enviar datos", async ({ page }) => {
  await page.goto("/nosotros");
  await page.locator(".site-nav").getByRole("link", { name: "Contacto" }).click();
  await expect(page).toHaveURL(/\/contacto$/);
  await page.evaluate(() => {
    window.open = ((url?: string | URL) => {
      (window as unknown as { openedUrl: string }).openedUrl = String(url);
      return null;
    }) as typeof window.open;
  });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hablemos de tu comercio.");
  const contact = page.locator(".reference-contact");
  await expect(contact.getByRole("link", { name: /0800 1004/ })).toHaveAttribute("href", "tel:08001004");
  await expect(page.getByRole("heading", { name: "Puntos de venta" })).toBeVisible();
  await expect(page.getByRole("note").filter({ hasText: "Vista de demostración" })).toBeVisible();
  await expect(page.locator(".leaflet-container")).toBeVisible();

  await contact.getByRole("button", { name: /Enviar por WhatsApp/ }).click();
  expect(await page.evaluate(() => (window as unknown as { openedUrl?: string }).openedUrl)).toBeUndefined();

  await contact.getByLabel("Nombre y apellido").fill("Ana Pérez");
  await contact.getByLabel("Comercio").fill("Veterinaria Sur");
  await contact.getByRole("textbox", { name: "Consulta *" }).fill("Quiero abrir una cuenta.");
  await contact.getByRole("button", { name: /Enviar por WhatsApp/ }).click();
  const opened = await page.evaluate(() => (window as unknown as { openedUrl: string }).openedUrl);
  expect(opened).toContain("https://wa.me/59895673109?text=");
  expect(decodeURIComponent(opened)).toContain("Hola, soy Ana Pérez de Veterinaria Sur.\n\nQuiero abrir una cuenta.");
});

test("contacto: puntos de venta en un panel, plegable en móvil", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/contacto");
  const locator = page.locator(".site-locator");
  const list = locator.locator(".contact-store-list");
  const map = locator.locator(".contact-map-wrap");
  await expect(locator.getByRole("button", { name: /^Filtros/ })).toBeHidden();
  await expect(list).toBeVisible();
  const [listBox, mapBox] = [await list.boundingBox(), await map.boundingBox()];
  expect(listBox!.x + listBox!.width).toBeLessThanOrEqual(mapBox!.x + 1);

  await page.setViewportSize({ width: 390, height: 844 });
  const filters = locator.getByRole("button", { name: /^Filtros/ });
  await expect(locator.getByRole("combobox", { name: "Marca" })).toBeHidden();
  await filters.click();
  await expect(filters).toHaveAttribute("aria-expanded", "true");
  await expect(locator.getByRole("combobox", { name: "Marca" })).toBeVisible();
  await expect(list).toBeHidden();
  await locator.getByRole("button", { name: "Mostrar listado" }).click();
  await expect(list).toBeVisible();
  await expect(map).toBeVisible();
});
