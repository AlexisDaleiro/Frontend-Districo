import { expect, test, type Page } from "@playwright/test";
import { staffFeatures } from "../../src/lib/staff-access";
import { adminSectionPaths } from "../../src/lib/admin-navigation";

test.skip(process.env.E2E_PRODUCTION_NAVIGATION !== "1", "Opt-in: servidor de producción con API interceptada, sin datos reales.");

async function fixture(page: Page, delayCustomers?: () => Promise<void>) {
  let signedIn = false;
  const reads: string[] = [], errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const user = { id: "qa-navigation", email: "navigation@example.test", role: "ADMIN", active: true, permissions: [] };
  const empty = { items: [], meta: { total: 0, page: 1, limit: 20 } };
  const metric = { orders: 0, amount: 0, units: 0 };
  const sales = { period: "7d", timezone: "America/Montevideo", currency: "UYU", dateFrom: "2026-10-05", dateTo: "2026-10-11", days: 7,
    today: metric, current: metric, previous: metric, changePercent: null, series: [], topProducts: [], groupBy: "salesperson", groups: [], meta: empty.meta };
  await page.route("**/api/backend/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api/backend/", "");
    let value: unknown;
    if (path === "auth/login") { signedIn = true; value = {}; }
    else if (path === "auth/me") {
      if (!signedIn) { await route.fulfill({ status: 401, json: { message: "Sin sesión de prueba" } }); return; }
      value = user;
    } else if (path === "auth/refresh") { await route.fulfill({ status: 401, json: {} }); return; }
    else {
      expect(route.request().method(), path).toBe("GET");
      reads.push(path);
      if (path === "admin/customers/page" && delayCustomers) await delayCustomers();
      if (path === "admin/dashboard") value = {};
      else if (path === "admin/sales") value = sales;
      else if (path === "admin/sales/options") value = { salespeople: [], customers: [], brands: [] };
      else if (path === "admin/staff/access") value = ["ADMIN", "SALES", "CATALOG", "FINANCE"].map((role) => ({ role, id: null, name: null,
        access: Object.fromEntries(staffFeatures.map(([feature]) => [feature, { canView: true, canEdit: true }])) }));
      else if (path === "cart") value = { items: [], total: 0 };
      else if (path === "products" || path === "products/cards" || path === "products/admin/list" || path.endsWith("/page") || path === "admin/jobs" || path === "admin/salespeople" || path === "admin/promotions/page" || path === "admin/recommendations/page") value = empty;
      else value = [];
    }
    await route.fulfill({ json: value });
  });
  await page.goto("/tienda/ingresar");
  await page.getByLabel("Correo electrónico").fill(user.email);
  await page.getByLabel("Contraseña", { exact: true }).fill("Fixture-only-not-a-real-password1!");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/tienda$/, { timeout: 15000 });
  await page.goto("/tienda/admin/pedidos");
  await expect(page.locator(".admin-main h1")).toHaveText("Pedidos");
  await page.locator(".admin-sidebar").evaluate((element) => element.setAttribute("data-qa-persistent", "same-menu"));
  return { reads, errors };
}

test("producción: navegación precargada de todas las secciones sin datos privados estáticos", async ({ page, request }, info) => {
  test.setTimeout(90000);
  const state = await fixture(page);
  const html = await (await request.get("/tienda/admin/clientes")).text();
  expect(html).not.toContain("navigation@example.test");
  const timings: { section: string; ms: number }[] = [];
  for (let pass = 0; pass < 2; pass++) for (const path of adminSectionPaths) {
    if (path === "pedidos" && pass === 0) continue;
    const link = page.locator(`.admin-nav a[href="/tienda/admin${path ? `/${path}` : ""}"]`);
    const title = (await link.getAttribute("aria-label"))!;
    await page.evaluate((expected) => {
      let start = 0;
      document.addEventListener("click", () => { start = performance.now(); }, { once: true, capture: true });
      const observer = new MutationObserver(() => {
        if (!start || document.querySelector(".admin-main h1")?.textContent !== expected) return;
        Object.assign(window, { qaNavigationMs: Math.round(performance.now() - start) }); observer.disconnect();
      });
      Object.assign(window, { qaNavigationMs: null });
      observer.observe(document.querySelector(".admin-main")!, { childList: true, subtree: true });
    }, title);
    await link.click();
    await expect(page.locator(".admin-main h1")).toHaveText(title);
    const ms = await page.evaluate(() => (window as Window & { qaNavigationMs?: number | null }).qaNavigationMs);
    expect(ms).not.toBeNull();
    timings.push({ section: title, ms: ms! });
    await expect(page.locator(".admin-sidebar")).toHaveAttribute("data-qa-persistent", "same-menu");
  }
  console.info("Producción, clic a pantalla (ms):", JSON.stringify(timings));
  await info.attach("production-navigation-timings", { body: JSON.stringify(timings), contentType: "application/json" });
  for (const timing of timings.slice(-adminSectionPaths.length)) expect(timing.ms, timing.section).toBeLessThan(500);
  expect(state.errors).toEqual([]);
  await expect(page.locator(".admin-main .error-box")).toHaveCount(0);
  expect(await page.locator(".admin-nav-indicator").evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
  await expect.poll(() => page.locator(".admin-nav").evaluate((nav) => {
    const active = nav.querySelector("a.active")!.getBoundingClientRect();
    const indicator = nav.querySelector(".admin-nav-indicator")!.getBoundingClientRect();
    return Math.max(Math.abs(active.x - indicator.x), Math.abs(active.y - indicator.y));
  })).toBeLessThan(1);
  await page.screenshot({ path: info.outputPath("admin-navigation-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath("admin-navigation-mobile.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByRole("button", { name: "Buscar en administración", exact: true }).click();
  const dialog = page.locator(".admin-command-dialog");
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  expect(await dialog.evaluate((element) => getComputedStyle(element, "::backdrop").animationName)).toBe("none");
  await page.getByRole("combobox", { name: "Buscar clientes, pedidos o productos" }).press("Escape");
  await expect(dialog).not.toBeVisible({ timeout: 1000 });
});

test("producción: precarga deduplicada y datos lentos no impiden cambiar de sección", async ({ page }) => {
  test.setTimeout(60000);
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const state = await fixture(page, () => held);
  try {
    const link = page.locator(".admin-nav").getByRole("link", { name: "Clientes", exact: true });
    await link.focus();
    await expect.poll(() => state.reads.filter((path) => path === "admin/customers/page").length).toBe(1);
    await link.click();
    await expect(page.locator(".admin-main h1")).toHaveText("Clientes", { timeout: 1000 });
    await expect(page.locator(".admin-main .loading")).toBeVisible();
    expect(state.reads.filter((path) => path === "admin/customers/page")).toHaveLength(1);
    await page.locator(".admin-nav").getByRole("link", { name: "Roles", exact: true }).click();
    await expect(page.locator(".admin-main h1")).toHaveText("Roles", { timeout: 1000 });
    await expect(page.locator(".admin-sidebar")).toHaveAttribute("data-qa-persistent", "same-menu");
    release();
    expect(state.errors).toEqual([]);
  } finally { release(); await page.unrouteAll({ behavior: "wait" }); }
});
