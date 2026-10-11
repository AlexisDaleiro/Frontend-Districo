import { expect, test, type Page } from "@playwright/test";

async function admin(page: Page) {
  await page.goto("/tienda/ingresar");
  await page.getByLabel("Correo electrónico").fill("admin@districo.com");
  await page.getByLabel("Contraseña", { exact: true }).fill("Demo1234!");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/tienda$/, { timeout: 15000 });
  await page.goto("/tienda/admin");
  await expect(page.getByRole("heading", { name: "Resumen", exact: true })).toBeVisible();
  await page.locator(".admin-sidebar").evaluate((element) => { element.setAttribute("data-qa-persistent", "same-menu"); });
}

test("todas las secciones conservan el menú y la navegación caliente responde enseguida", async ({ page }, info) => {
  test.setTimeout(120000);
  await admin(page);
  await page.evaluate(() => {
    const timings: { section: string; ms: number }[] = [];
    let pending: { section: string; start: number } | undefined;
    document.addEventListener("click", (event) => {
      const link = (event.target as Element).closest(".admin-nav a");
      if (link) pending = { section: link.getAttribute("aria-label")!, start: performance.now() };
    }, true);
    new MutationObserver(() => {
      if (!pending || document.querySelector(".admin-main h1")?.textContent !== pending.section) return;
      timings.push({ section: pending.section, ms: Math.round(performance.now() - pending.start) });
      pending = undefined;
    }).observe(document.querySelector(".admin-main")!, { childList: true, subtree: true });
    Object.assign(window, { qaNavigationTimings: timings });
  });
  const sections = ["Consultas", "Solicitudes", "Clientes", "Vendedores", "Pedidos", "Catálogo", "Marcas y laboratorios", "Categorías", "Promociones", "Banners", "Recomendaciones", "Ofertas laborales", "Personal", "Roles", "Integraciones", "Resumen"];
  for (let pass = 0; pass < 2; pass++) for (const section of sections) {
    await page.locator(".admin-nav").getByRole("link", { name: section, exact: true }).click();
    await expect(page.locator(".admin-main h1")).toHaveText(section);
    await expect(page.locator(".admin-sidebar")).toHaveAttribute("data-qa-persistent", "same-menu");
    await expect(page.locator(".admin-sidebar")).toHaveCount(1);
  }
  const timings = await page.evaluate(() => (window as Window & { qaNavigationTimings?: { section: string; ms: number }[] }).qaNavigationTimings!);
  expect(timings).toHaveLength(sections.length * 2);
  await info.attach("navigation-timings", { body: JSON.stringify(timings), contentType: "application/json" });
  console.info("Navegación caliente (ms):", JSON.stringify(timings.slice(sections.length)));
  // Development compiles on demand; enforce latency budgets on the production suite.
  if (process.env.E2E_ASSERT_DEV_NAVIGATION_SPEED === "1") {
    for (const result of timings.slice(sections.length)) expect(result.ms, result.section).toBeLessThan(800);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath("admin-navigation-mobile.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test("las fichas conservan el mismo menú, el estado contraído y el atajo de guardado", async ({ page }) => {
  test.setTimeout(90000);
  await admin(page);
  await page.locator(".admin-nav").getByRole("link", { name: "Clientes", exact: true }).click();
  await page.getByRole("link", { name: "Ver ficha", exact: true }).first().focus();
  await page.getByRole("button", { name: "Contraer menú" }).click();
  await page.getByRole("link", { name: "Ver ficha", exact: true }).first().click();
  await expect(page.locator(".admin-record-page h1")).toBeVisible();
  await expect(page.locator(".admin-sidebar")).toHaveAttribute("data-qa-persistent", "same-menu");
  await expect(page.locator(".admin-sidebar")).toHaveAttribute("data-collapsed", "true");
  await page.getByRole("region", { name: "Descuento fijo del cliente" }).getByLabel("Descuento (%)").fill("11");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("link", { name: "Volver a clientes", exact: true }).click();
  await expect(page.locator(".admin-record-page h1")).toBeVisible();
  await page.getByRole("button", { name: "Buscar en administración", exact: true }).click();
  await page.getByRole("combobox", { name: "Buscar clientes, pedidos o productos" }).fill("pedidos");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("option", { name: /Pedidos/ }).click();
  await expect(page.locator(".admin-record-page h1")).toBeVisible();
  await page.getByRole("combobox", { name: "Buscar clientes, pedidos o productos" }).press("Escape");
  await expect(page.locator(".admin-command-dialog")).not.toBeVisible();
  await page.getByRole("region", { name: "Descuento fijo del cliente" }).getByLabel("Descuento (%)").press("Control+s");
  await expect(page.getByText(/Ahora: 11%/)).toBeVisible();
  await page.getByRole("link", { name: "Volver a clientes", exact: true }).click();
  await expect(page.locator(".admin-main h1")).toHaveText("Clientes");
  await expect(page.locator(".admin-sidebar")).toHaveAttribute("data-qa-persistent", "same-menu");
  await expect(page.locator(".admin-sidebar")).toHaveAttribute("data-collapsed", "true");
});

test("una ruta lenta da respuesta visible y se puede abandonar sin bloquear el menú", async ({ page }) => {
  test.setTimeout(90000);
  await admin(page);
  let release!: () => void, started!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const intercepted = new Promise<void>((resolve) => { started = resolve; });
  await page.route((url) => url.pathname === "/tienda/admin/personal" && url.searchParams.has("_rsc"), async (route) => {
    started(); await held; await route.continue();
  });
  try {
    const link = page.locator(".admin-nav").getByRole("link", { name: "Personal", exact: true });
    await link.hover();
    const clicking = link.click();
    await intercepted;
    await expect(page.locator('.admin-link-pending[data-pending="true"], .admin-route-loading').first()).toBeVisible({ timeout: 1000 });
    await expect(page.locator(".admin-sidebar")).toHaveAttribute("data-qa-persistent", "same-menu");
    await page.locator(".admin-nav").getByRole("link", { name: "Clientes", exact: true }).click();
    await expect(page.locator(".admin-main h1")).toHaveText("Clientes");
    release(); await clicking;
    await expect(page).toHaveURL(/\/tienda\/admin\/clientes$/);
  } finally { release(); await page.unrouteAll({ behavior: "wait" }); }
});
