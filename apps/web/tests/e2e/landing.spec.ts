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
      name: /Alimento, cuidado y bienestar/,
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Alimento para mascotas" })).toBeVisible();
  await expect(page.locator(".site-session-check")).toBeHidden();
  await context.close();
});

test("hero a sangre con header transparente y accesos principales", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("h1")).toHaveCount(1);
  const header = page.locator(".site-header");
  await expect(header).not.toHaveClass(/is-solid/);
  await page.mouse.wheel(0, 600);
  await expect(header).toHaveClass(/is-solid/);
  await page.mouse.wheel(0, -2000);
  await expect(header).not.toHaveClass(/is-solid/);
  const hero = page.locator(".home-hero");
  await hero.getByRole("link", { name: "Conocé nuestras marcas" }).click();
  await expect(page).toHaveURL(/\/marcas$/);
  await page.goto("/");
  await hero.getByRole("link", { name: "Solicitar cuenta" }).click();
  await expect(page).toHaveURL(/\/tienda\/solicitar-cuenta$/);
  await page.goto("/");
  await header.getByRole("link", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/tienda\/ingresar$/);
});

test("el hero rota, se pausa y se maneja con flechas y puntos", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator(".home-hero");
  const current = hero.locator(".home-slide.is-on").getByRole("heading");
  await expect(current).toHaveText(/Alimento, cuidado y bienestar/);
  await expect(current).toHaveText(/Hercosul/, { timeout: 9000 });
  await hero.getByRole("button", { name: "Pausar destacados" }).click();
  await hero.getByRole("button", { name: "Destacado siguiente" }).click();
  await expect(current).toHaveText(/logística propia/);
  await page.waitForTimeout(7500);
  await expect(current).toHaveText(/logística propia/);
  await hero.getByRole("button", { name: "Ver destacado 1" }).click();
  await expect(current).toHaveText(/Alimento, cuidado y bienestar/);
  await expect(hero.locator(".home-slide:not(.is-on)").first()).toHaveAttribute("aria-hidden", "true");
});

test("el hero no avanza solo con movimiento reducido", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.waitForTimeout(7500);
  await expect(page.locator(".home-slide.is-on").getByRole("heading")).toHaveText(/Alimento, cuidado y bienestar/);
});

test("marcas destacadas muestran las presentaciones de la marca elegida", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("#destacadas");
  const tabs = section.getByRole("group", { name: "Marcas destacadas" }).getByRole("button");
  await expect(tabs).toHaveCount(5);
  await expect(tabs.first()).toHaveAttribute("aria-pressed", "true");
  await expect(section.locator(".home-shelf li")).toHaveCount(4);
  await section.getByRole("button", { name: "Pipicat" }).click();
  await expect(section.getByRole("button", { name: "Pipicat" })).toHaveAttribute("aria-pressed", "true");
  await expect(section.locator(".home-shelf li")).toHaveText([/Classic/, /Campestre/, /Floral/]);
  await expect(section.getByRole("link", { name: /Ver productos de Pipicat/ })).toHaveAttribute("href", "/productos?search=Pipicat");
  await page.locator(".home-explore").click();
  await expect(page).toHaveURL(/\/marcas$/);
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
    "Empleos",
    "Contacto",
  ]);
  await nav.getByRole("link", { name: "Nosotros" }).click();
  await expect(page).toHaveURL(/\/nosotros$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Una empresa uruguaya con 30 años de ruta.",
  );
  await nav.getByRole("link", { name: "Marcas" }).click();
  await expect(page).toHaveURL(/\/marcas$/);
  const brandCards = page.locator(".brands-grid .brands-card");
  await expect(brandCards).toHaveCount(28);
  await page.getByRole("button", { name: /^Arenas sanitarias/ }).click();
  await expect(brandCards).toHaveCount(5);
  await page.getByRole("button", { name: /^Todas/ }).click();
  await expect(brandCards).toHaveCount(28);
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
  await expect(page.locator(".site-sheet-note")).toContainText(
    "cuenta aprobada",
  );
  await expect(page.locator(".site-sheet-page")).not.toContainText("$");
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
    for (const route of ["/", "/marcas", "/trabajo", "/productos", "/contacto"]) {
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

test("movimiento reducido deja el hero sin transiciones", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".home-slide.is-on")).toHaveCSS("transition-duration", /^0(\.001)?s$/);
});

test("marcas públicas: filtros por línea, búsqueda y detalle con presentaciones", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/marcas?linea=arenas");
  const cards = page.locator(".brands-card");
  await expect(cards).toHaveCount(5);
  await expect(page.getByRole("button", { name: /^Arenas sanitarias/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /^Todas/ }).click();
  await expect(cards).toHaveCount(28);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nuestras marcas");
  await page.getByRole("searchbox", { name: "Buscar marca" }).fill("procao");
  await expect(cards).toHaveCount(1);
  await cards.first().click();
  const detail = page.locator(".brands-detail");
  await expect(detail.getByRole("heading", { level: 2 })).toHaveText("Procão");
  await expect(detail.locator(".home-shelf li")).toHaveCount(5);
  await expect(detail.getByRole("link", { name: /Ver productos de Procão/ })).toHaveAttribute("href", "/productos?search=Proc%C3%A3o");
  await page.getByRole("searchbox", { name: "Buscar marca" }).fill("");
  await page.getByRole("combobox", { name: "Especie" }).selectOption("otras");
  await expect(cards).toHaveText([/Megazoo/, /Stack/]);
  await detail.getByRole("button", { name: "Cerrar" }).click();
  await expect(detail).toHaveCount(0);
  for (const width of [768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  }
});

test("empleos: acceso desde la navegación y CV por correo", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.locator(".site-nav").getByRole("link", { name: "Empleos" }).click();
  await expect(page).toHaveURL(/\/trabajo$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Trabajá en DISTRICO");
  await expect(page.getByRole("link", { name: "Enviar mi CV" })).toHaveAttribute("href", /^mailto:contacto@districo\.com\.uy/);
  const jobs = page.locator(".jobs-item");
  if ((await jobs.count()) === 0) {
    await expect(page.getByRole("heading", { name: "No hay búsquedas abiertas en este momento." })).toBeVisible();
    return;
  }
  await expect(page.getByText(/puestos de ejemplo/)).toBeVisible();
  const total = await jobs.count();
  await page.getByRole("checkbox", { name: /Ventas/ }).check();
  await expect.poll(() => jobs.count()).toBeLessThan(total);
  await jobs.first().getByRole("button", { name: "Ver puesto" }).click();
  await expect(jobs.first().getByRole("link", { name: "Postularme" })).toHaveAttribute("href", /^mailto:contacto@districo\.com\.uy\?subject=/);
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
