import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const base = process.env.MOTION_BASE_URL ?? "http://127.0.0.1:3000";
const output = resolve(".local-support/motion-shots");
await mkdir(output, { recursive: true });

const card = {
  id: "p1",
  slug: "biofresh-para-cachorros-razas-medianas",
  name: "BIOFRESH para cachorros – Razas medianas",
  featured: true,
  requiresMedicationPermission: false,
  brand: { id: "biofresh", name: "BIOFRESH", slug: "biofresh" },
  laboratory: null,
  media: [
    {
      id: "m1",
      type: "IMAGE",
      url: "/images/product-0-0.jpg",
      alt: "BIOFRESH",
    },
  ],
  variants: [{ id: "v1", active: true }],
};
const secondCard = {
  ...card,
  id: "p2",
  slug: "biofresh-para-gatos",
  name: "BIOFRESH para gatos",
  media: [
    {
      id: "m2",
      type: "IMAGE",
      url: "/images/product-0-1.png",
      alt: "BIOFRESH para gatos",
    },
  ],
};
const product = {
  ...card,
  productType: "PET_FOOD",
  shortDescription: "Nutrición para cada etapa.",
  description: "Producto de muestra para la revisión visual.",
  categories: [
    {
      categoryId: "alimentacion",
      category: { id: "alimentacion", name: "Alimentación" },
    },
  ],
  variants: [
    {
      id: "v1",
      name: "Bolsa",
      sku: "DEMO-1",
      active: true,
      availableStock: 12,
      minimumOrderQuantity: 1,
      saleMultiple: 1,
    },
  ],
};
const admin = {
  id: "admin",
  email: "admin@example.test",
  role: "ADMIN",
  permissions: [],
};
const client = {
  id: "client",
  email: "cliente@example.test",
  role: "CLIENT",
  permissions: ["CAN_VIEW_PRICES", "CAN_PLACE_ORDERS"],
  customerAccount: {
    businessName: "Comercio de prueba",
    accountStatus: "APPROVED",
    creditStatus: "OK",
  },
};
const errors = [];

async function mockApi(page, user) {
  let cart = {
    id: "cart",
    items:
      user?.role === "CLIENT"
        ? [
            {
              id: "line-1",
              quantity: 1,
              product: {
                id: card.id,
                slug: card.slug,
                name: card.name,
                requiresMedicationPermission: false,
              },
              variant: product.variants[0],
              unitPrice: 10,
              currency: "UYU",
              subtotal: 10,
            },
          ]
        : [],
    total: user?.role === "CLIENT" ? 10 : 0,
  };
  await page.route("**/api/backend/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.split("/api/backend/")[1] ?? "";
    if (path === "auth/me")
      return route.fulfill({
        status: user ? 200 : 401,
        json: user ?? { message: "Sin sesión" },
      });
    if (path === "auth/refresh")
      return route.fulfill({ status: 401, json: { message: "Sin sesión" } });
    if (path === "categories/catalog")
      return route.fulfill({
        json: [
          { id: "alimentacion", name: "Alimentación", slug: "alimentacion" },
        ],
      });
    if (path === "brands")
      return route.fulfill({
        json: [{ id: "biofresh", name: "BIOFRESH", slug: "biofresh" }],
      });
    if (
      path === "laboratories" ||
      path === "attributes" ||
      path === "orders/me" ||
      path === "cart/recommendations"
    )
      return route.fulfill({ json: [] });
    if (path === "products/cards") {
      const items =
        url.searchParams.get("categoryId") === "otro" ? [] : [card, secondCard];
      return route.fulfill({
        json: { items, meta: { total: items.length, page: 1, limit: 20 } },
      });
    }
    if (path.startsWith("products/")) return route.fulfill({ json: product });
    if (path === "admin/dashboard")
      return route.fulfill({
        json: {
          products: 2,
          pendingApplications: 1,
          pendingReviewOrders: 0,
          activePromotions: 0,
          newContactInquiries: 0,
        },
      });
    if (path === "cart") return route.fulfill({ json: cart });
    if (path === "cart/items/line-1" && route.request().method() === "PATCH") {
      const quantity = route.request().postDataJSON().quantity;
      cart = {
        ...cart,
        items: cart.items.map((item) => ({
          ...item,
          quantity,
          subtotal: quantity * 10,
        })),
        total: quantity * 10,
      };
      return route.fulfill({ json: cart });
    }
    return route.fulfill({
      status: 404,
      json: { message: "Sin datos de prueba" },
    });
  });
}

async function inspect(page, name, widths, reduced) {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(90);
    const state = await page.evaluate(() => ({
      viewport: innerWidth,
      width: document.documentElement.scrollWidth,
      hiddenVisible: [
        ...document.querySelectorAll('[data-motion-state="pending"]'),
      ].filter((element) => {
        const rect = element.getBoundingClientRect();
        return (
          rect.top < innerHeight &&
          rect.bottom > 0 &&
          getComputedStyle(element).opacity === "0"
        );
      }).length,
    }));
    if (state.width > state.viewport + 1)
      errors.push(
        `${name}/${width}/${reduced ? "reduced" : "normal"}: desbordamiento ${state.width}`,
      );
    if (reduced && state.hiddenVisible)
      errors.push(`${name}/${width}: contenido oculto con movimiento reducido`);
    if (
      !reduced &&
      (width === 390 || width === 1440) &&
      ["home", "catalog", "contact", "admin"].includes(name)
    ) {
      for (
        let y = 0;
        y < (await page.evaluate(() => document.body.scrollHeight));
        y += 500
      ) {
        await page.evaluate((top) => scrollTo(0, top), y);
        await page.waitForTimeout(35);
      }
      await page.waitForTimeout(700);
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: resolve(output, `${name}-${width}.png`),
        fullPage: true,
      });
    }
  }
}

const browser = await chromium.launch({
  headless: true,
  ...(process.env.MOTION_BROWSER_CHANNEL
    ? { channel: process.env.MOTION_BROWSER_CHANNEL }
    : {}),
  ...(process.env.MOTION_BROWSER_PATH
    ? { executablePath: process.env.MOTION_BROWSER_PATH }
    : {}),
});
try {
  const publicPage = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  publicPage.on("pageerror", (error) =>
    errors.push(`público: ${error.message}`),
  );
  await mockApi(publicPage, null);
  for (const [name, route] of [
    ["landing", "/"],
    ["public-catalog", "/productos"],
    ["public-product", "/productos/biofresh-para-cachorros-razas-medianas"],
    ["login", "/tienda/ingresar"],
    ["apply", "/tienda/solicitar-cuenta"],
  ]) {
    await publicPage.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
    await publicPage.locator("main").waitFor();
    await inspect(publicPage, name, [360, 390, 768, 1024, 1440], false);
  }
  await publicPage.close();

  const storePage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  storePage.on("pageerror", (error) => errors.push(`tienda: ${error.message}`));
  await mockApi(storePage, client);
  for (const [name, route] of [
    ["home", "/tienda"],
    ["catalog", "/tienda/productos"],
    ["product", "/tienda/producto/biofresh-para-cachorros-razas-medianas"],
    ["brands", "/tienda/marcas"],
    ["company", "/tienda/empresa"],
    ["contact", "/tienda/contacto"],
  ]) {
    await storePage.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
    await storePage.locator("main").waitFor();
    await inspect(storePage, name, [360, 390, 768, 1024, 1440], false);
  }
  await storePage.goto(`${base}/tienda/empresa`);
  await storePage.setViewportSize({ width: 1440, height: 900 });
  await storePage.locator(".company-hero-visual img").waitFor();
  const before = await storePage
    .locator(".company-hero-visual img")
    .evaluate((element) =>
      getComputedStyle(element).getPropertyValue("--motion-parallax"),
    );
  await storePage.evaluate(() => scrollTo(0, 250));
  await storePage.waitForTimeout(150);
  const after = await storePage
    .locator(".company-hero-visual img")
    .evaluate((element) =>
      getComputedStyle(element).getPropertyValue("--motion-parallax"),
    );
  if (before === after)
    errors.push("El parallax de la fotografía de empresa no respondió al desplazamiento.");
  await storePage.setViewportSize({ width: 390, height: 900 });
  await storePage.goto(`${base}/tienda/productos`, { waitUntil: "domcontentloaded" });
  const filterButton = storePage.getByRole("button", { name: "Filtrar" });
  await filterButton.click();
  try {
    await storePage.locator("dialog[open]").waitFor({ timeout: 3000 });
  } catch {
    await filterButton.click();
    await storePage.locator("dialog[open]").waitFor();
  }
  await storePage.keyboard.press("Escape");
  await storePage.locator("dialog[open]").waitFor({ state: "hidden" });
  await storePage.goto(`${base}/tienda`, { waitUntil: "domcontentloaded" });
  const menuButton = storePage.getByRole("button", { name: "Abrir menú" });
  await menuButton.click();
  try {
    await storePage.locator("dialog[open]").waitFor({ timeout: 3000 });
  } catch {
    await menuButton.click();
    await storePage.locator("dialog[open]").waitFor();
  }
  await storePage.keyboard.press("Escape");
  await storePage.locator("dialog[open]").waitFor({ state: "hidden" });
  await storePage.close();

  for (const [role, user, routes] of [
    [
      "admin",
      admin,
      [
        ["admin", "/tienda/admin"],
        ["admin-orders", "/tienda/admin/pedidos"],
      ],
    ],
    [
      "client",
      client,
      [
        ["account", "/tienda/cuenta"],
        ["cart", "/tienda/carrito"],
        ["orders", "/tienda/cuenta/pedidos"],
      ],
    ],
  ]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    page.on("pageerror", (error) => errors.push(`${role}: ${error.message}`));
    await mockApi(page, user);
    for (const [name, route] of routes) {
      await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
      await page.locator(".page-heading").waitFor();
      await inspect(page, name, [360, 390, 768, 1024, 1440], false);
    }
    if (role === "client") {
      await page.goto(`${base}/tienda/carrito`, { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "Aumentar cantidad" }).click();
      await page.waitForFunction(() =>
        document.querySelector('.cart-item strong[data-saved="true"]'),
      );
    } else {
      await page.goto(`${base}/tienda/admin`, { waitUntil: "domcontentloaded" });
      await page.locator('.admin-nav a[href="/tienda/admin/pedidos"]').focus();
      await page.keyboard.press("Enter");
      await page.waitForURL("**/tienda/admin/pedidos");
    }
    await page.close();
  }

  const reducedPage = await browser.newPage({
    viewport: { width: 390, height: 900 },
    reducedMotion: "reduce",
  });
  reducedPage.on("pageerror", (error) =>
    errors.push(`reducido: ${error.message}`),
  );
  await mockApi(reducedPage, null);
  for (const [name, route] of [
    ["landing", "/"],
    ["public-catalog", "/productos"],
    ["public-product", "/productos/biofresh-para-cachorros-razas-medianas"],
    ["login", "/tienda/ingresar"],
    ["apply", "/tienda/solicitar-cuenta"],
  ]) {
    await reducedPage.goto(`${base}${route}`, {
      waitUntil: "domcontentloaded",
    });
    await inspect(reducedPage, name, [360, 390, 768, 1024, 1440], true);
  }
  await reducedPage.close();
  const reducedStorePage = await browser.newPage({ viewport: { width: 390, height: 900 }, reducedMotion: "reduce" });
  await mockApi(reducedStorePage, client);
  for (const [name, route] of [
    ["home", "/tienda"],
    ["catalog", "/tienda/productos"],
    ["product", "/tienda/producto/biofresh-para-cachorros-razas-medianas"],
    ["brands", "/tienda/marcas"],
    ["company", "/tienda/empresa"],
    ["contact", "/tienda/contacto"],
  ]) {
    await reducedStorePage.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
    await inspect(reducedStorePage, name, [360, 390, 768, 1024, 1440], true);
  }
  await reducedStorePage.goto(`${base}/tienda`);
  const transform = await reducedStorePage
    .locator(".hero-visual img")
    .evaluate((element) => getComputedStyle(element).transform);
  if (transform !== "none")
    errors.push(`Movimiento reducido: imagen con transform ${transform}`);
  await reducedStorePage.close();
  for (const [role, user, routes] of [
    [
      "admin",
      admin,
      [
        ["admin", "/tienda/admin"],
        ["admin-orders", "/tienda/admin/pedidos"],
      ],
    ],
    [
      "client",
      client,
      [
        ["account", "/tienda/cuenta"],
        ["cart", "/tienda/carrito"],
        ["orders", "/tienda/cuenta/pedidos"],
      ],
    ],
  ]) {
    const page = await browser.newPage({
      viewport: { width: 390, height: 900 },
      reducedMotion: "reduce",
    });
    page.on("pageerror", (error) =>
      errors.push(`${role} reducido: ${error.message}`),
    );
    await mockApi(page, user);
    for (const [name, route] of routes) {
      await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
      await page.locator(".page-heading").waitFor();
      await inspect(page, name, [360, 390, 768, 1024, 1440], true);
    }
    await page.close();
  }
} finally {
  await browser.close();
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    "Animaciones verificadas en 16 rutas y cinco anchos; parallax, teclado, guardado y movimiento reducido correctos.",
  );
  console.log(`Capturas: ${output}`);
}
