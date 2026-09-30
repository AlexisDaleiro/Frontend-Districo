import { expect, test, type Page } from "@playwright/test";

const publicRoutes = [
  "/tienda",
  "/tienda/productos",
  "/tienda/marcas",
  "/tienda/empresa",
  "/tienda/contacto",
];
const revealed =
  ".need, .section-title, .line-card, .brand-word, .product-card, .cta-band, .company-page section, .company-card, .company-value, .company-operation-card, .company-benefit, .contact-branch-card, .contact-store-card, .directory-grid > *, .benefits > div";

async function adminLogin(page: Page) {
  await page.goto("/tienda/ingresar");
  await expect(async () => {
    await page.getByRole("button", { name: "Administración", exact: true }).click();
    expect(await page.getByLabel("Correo electrónico").inputValue()).toBe(
      "admin@districo.com",
    );
  }).toPass({ timeout: 10000 });
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/tienda\/admin$/, { timeout: 10000 });
}

// Recorre la página y anota los bloques que, estando en pantalla, pasan de
// opacos a casi transparentes (parpadeo) y los que quedan invisibles al final.
async function probeReveal(page: Page) {
  await page.waitForTimeout(1200);
  const blinks = new Set<string>();
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 250; y < height; y += 250) {
    const found = await page.evaluate(
      async ({ y, selector }) => {
        scrollTo(0, y);
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        const inView = [...document.querySelectorAll(selector)].filter((e) => {
          const box = e.getBoundingClientRect();
          return box.top < innerHeight && box.bottom > 0;
        });
        const before = new Map(inView.map((e) => [e, +getComputedStyle(e).opacity]));
        const out: string[] = [];
        for (let i = 0; i < 10; i++) {
          await new Promise((r) => requestAnimationFrame(() => r(null)));
          for (const e of inView)
            if (before.get(e)! > 0.95 && +getComputedStyle(e).opacity < 0.4)
              out.push(e.className.toString().slice(0, 30));
        }
        return out;
      },
      { y, selector: revealed },
    );
    found.forEach((item) => blinks.add(item));
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(1200);
  // Invisibles que se podrían ver: se descarta lo recortado por un contenedor
  // con scroll propio (aparece al desplazar ese contenedor).
  const invisible = () =>
    page.evaluate(() => {
      const clipped = (element: Element) => {
        const box = element.getBoundingClientRect();
        for (let p = element.parentElement; p && p !== document.body; p = p.parentElement) {
          const style = getComputedStyle(p);
          if (!/auto|scroll|hidden|clip/.test(style.overflowX + style.overflowY))
            continue;
          const area = p.getBoundingClientRect();
          if (
            box.bottom <= area.top ||
            box.top >= area.bottom ||
            box.right <= area.left ||
            box.left >= area.right
          )
            return true;
        }
        return false;
      };
      return [...document.querySelectorAll("#contenido *")]
        .filter(
          (e) =>
            getComputedStyle(e).opacity === "0" &&
            e.getBoundingClientRect().height > 0 &&
            !e.closest("dialog:not([open])") &&
            !clipped(e),
        )
        .map((e) => e.className.toString().slice(0, 30));
    });
  // Dos muestras separadas: lo que está entrando (por ejemplo, un banner que
  // el carrusel acaba de cambiar) no cuenta como trabado.
  const stuck = async () => {
    const first = await invisible();
    await page.waitForTimeout(1000);
    const second = await invisible();
    return first.filter((item) => second.includes(item));
  };
  const hidden = await stuck();
  // Las listas con scroll propio (puntos de venta) revelan al desplazarlas.
  const scrollers = await page.evaluate(() => {
    let count = 0;
    for (const element of document.querySelectorAll("#contenido *")) {
      const style = getComputedStyle(element);
      if (
        /auto|scroll/.test(style.overflowY) &&
        element.scrollHeight > element.clientHeight + 1
      ) {
        element.scrollIntoView({ block: "center" });
        element.scrollTop = element.scrollHeight;
        count++;
      }
    }
    return count;
  });
  if (scrollers) {
    await page.waitForTimeout(1200);
    hidden.push(...(await stuck()));
  }
  return { blinks: [...blinks], hidden };
}

test("el banner conserva su posición y anima cada cambio de slide", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (this: Element, keyframes, options) {
      if (this.matches(".needs-intro"))
        document.documentElement.setAttribute("data-needs-reveal", "yes");
      if (this.matches(".home-carousel-slide .hero-copy, .home-carousel-slide .hero-visual"))
        document.documentElement.setAttribute("data-banner-child-reveal", "yes");
      return animate.call(this, keyframes, options);
    };
  });
  await page.goto("/tienda", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute(
    "data-needs-reveal",
    "yes",
  );

  const carousel = page.locator(".home-carousel");
  const copy = carousel.locator(".hero-copy");
  expect(
    await page.locator("html").getAttribute("data-banner-child-reveal"),
  ).toBeNull();
  const centerOffset = await copy.evaluate((element) => {
    const stage = element.closest(".home-carousel-stage")!;
    const card = element.getBoundingClientRect();
    const banner = stage.getBoundingClientRect();
    return card.top + card.height / 2 - (banner.top + banner.height / 2);
  });
  expect(Math.abs(centerOffset)).toBeLessThan(25);

  const stage = carousel.locator(".home-carousel-stage");
  await stage.evaluate((element) => {
    element.setAttribute("data-slide-starts", "");
    element.addEventListener("animationstart", (event) => {
      const name = (event as AnimationEvent).animationName;
      if (name.startsWith("motion-slide-"))
        element.setAttribute(
          "data-slide-starts",
          `${element.getAttribute("data-slide-starts")}${name.slice(13)} `,
        );
    });
  });
  await carousel.getByRole("button", { name: "Banner siguiente" }).click();
  await expect(
    carousel.getByRole("heading", { name: "Gran Plus en DISTRICO." }),
  ).toBeVisible();
  await carousel.getByRole("button", { name: "Banner anterior" }).click();
  await expect(
    carousel.getByRole("heading", { name: "Biofresh para tu negocio." }),
  ).toBeVisible();
  await expect(stage).toHaveAttribute("data-slide-starts", "forward back ");
});

test("el carrusel avanza solo, se pausa y no rota con movimiento reducido", async ({
  page,
}) => {
  await page.goto("/tienda");
  const carousel = page.locator(".home-carousel");
  await expect(carousel).toHaveAttribute("data-autoplay", "true");
  const progress = () =>
    page.evaluate(() =>
      document
        .getAnimations()
        .find(
          (animation) =>
            (animation as CSSAnimation).animationName === "motion-progress",
        ),
    );
  const progressState = () =>
    page.evaluate(
      () =>
        document
          .getAnimations()
          .find(
            (animation) =>
              (animation as CSSAnimation).animationName === "motion-progress",
          )?.playState,
    );
  await expect.poll(progressState).toBe("running");
  expect(await progress()).toBeTruthy();

  // Al terminar la barra del punto activo pasa al siguiente banner.
  await page.evaluate(() =>
    document
      .getAnimations()
      .find(
        (animation) =>
          (animation as CSSAnimation).animationName === "motion-progress",
      )
      ?.finish(),
  );
  await expect(
    carousel.getByRole("heading", { name: "Gran Plus en DISTRICO." }),
  ).toBeVisible();

  await carousel.locator(".home-carousel-stage").hover();
  await expect.poll(progressState).toBe("paused");
  await page.mouse.move(0, 0);
  await expect.poll(progressState).toBe("running");

  const toggle = carousel.getByRole("button", { name: "Pausar carrusel" });
  await toggle.click();
  await page.mouse.move(0, 0);
  await expect(
    carousel.getByRole("button", { name: "Reanudar carrusel" }),
  ).toBeVisible();
  await expect.poll(progressState).toBe("paused");
  await expect(carousel.locator(".home-carousel-count")).toHaveAttribute(
    "aria-live",
    "polite",
  );
  await carousel.getByRole("button", { name: "Reanudar carrusel" }).click();
  await page.mouse.move(0, 0);
  await expect.poll(progressState).toBe("running");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/tienda");
  await expect(carousel).toHaveAttribute("data-autoplay", "false");
  await expect(carousel.getByRole("button", { name: "Pausar carrusel" })).toHaveCount(0);
  expect(await progressState()).toBeUndefined();
});

test("las páginas nuevas animan su entrada y respetan movimiento reducido", async ({
  page,
}) => {
  await page.goto("/tienda");
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-view-transitions", "0");
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = ((...args: Parameters<typeof start>) => {
      const count = Number(
        document.documentElement.getAttribute("data-view-transitions"),
      );
      document.documentElement.setAttribute("data-view-transitions", String(count + 1));
      return start(...args);
    }) as typeof document.startViewTransition;
    const animate = Element.prototype.animate;
    document.documentElement.setAttribute("data-page-reveals", "0");
    Element.prototype.animate = function (this: Element, keyframes, options) {
      if (this.matches(".company-page section")) {
        const count = Number(
          document.documentElement.getAttribute("data-page-reveals"),
        );
        document.documentElement.setAttribute("data-page-reveals", String(count + 1));
      }
      return animate.call(this, keyframes, options);
    };
  });
  await page.getByRole("link", { name: "Nuestra empresa" }).first().click();
  await expect(page).toHaveURL(/\/tienda\/empresa$/);
  // La navegación corre dentro de una View Transition (fundido y subida).
  await expect(page.locator("html")).toHaveAttribute(
    "data-view-transitions",
    /^[1-9]\d*$/,
  );
  // Las secciones de más abajo entran al desplazarse.
  await page.evaluate(() => scrollTo(0, 900));
  await expect(page.locator("html")).toHaveAttribute(
    "data-page-reveals",
    /^[1-9]\d*$/,
  );
  await page.evaluate(() => scrollTo(0, 0));
  const companyImage = page.locator(".company-hero-visual img");
  await expect
    .poll(() =>
      companyImage.evaluate((element) =>
        (element as HTMLElement).style.getPropertyValue("--motion-parallax"),
      ),
    )
    .not.toBe("");
  const beforeScroll = await companyImage.evaluate((element) =>
    (element as HTMLElement).style.getPropertyValue("--motion-parallax"),
  );
  await page.evaluate(() => scrollTo(0, 250));
  await expect
    .poll(() =>
      companyImage.evaluate((element) =>
        (element as HTMLElement).style.getPropertyValue("--motion-parallax"),
      ),
    )
    .not.toBe(beforeScroll);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/tienda");
  await expect(page.locator(".home-carousel-slide")).toHaveCSS(
    "animation-name",
    "none",
  );
  expect(
    await page.locator(".needs-intro").evaluate((element) =>
      element.getAnimations().some((animation) => animation.playState === "running"),
    ),
  ).toBe(false);
  await page.goto("/tienda/empresa");
  await page.evaluate(() => scrollTo(0, 250));
  expect(
    await page.locator(".company-hero-visual img").evaluate((element) =>
      (element as HTMLElement).style.getPropertyValue("--motion-parallax"),
    ),
  ).toBe("");
});

for (const width of [390, 1280])
  test(`sin parpadeos ni bloques invisibles a ${width}px`, async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: 800 });
    for (const route of publicRoutes) {
      await page.goto(route);
      const result = await probeReveal(page);
      expect(result, route).toEqual({ blinks: [], hidden: [] });
    }
  });

test("los diálogos animan su salida y devuelven el foco", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tienda");
  const trigger = page.getByRole("button", { name: "Abrir menú" });
  await trigger.click();
  const dialog = page.locator("dialog[open]");
  await expect(dialog).toContainText("Explorá DISTRICO");
  await expect(dialog.locator(".mobile-nav a").first()).toBeVisible();
  await dialog.getByRole("button", { name: "Cerrar" }).click();
  // Durante la salida conserva su contenido y queda fuera del árbol accesible.
  await expect(page.locator("dialog[data-closing]")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await expect(page.locator("dialog[data-closing] .mobile-nav")).toBeAttached();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await page.goto("/tienda/productos");
  await page.getByRole("button", { name: "Filtrar", exact: true }).click();
  await expect(page.locator("dialog.modal-sheet[open]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
});

test("admin desliza el indicador y cambia de sección sin errores", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 800 });
  await adminLogin(page);
  const indicator = page.locator(".admin-nav-indicator");
  await expect(indicator).toHaveAttribute("data-ready", "true");
  const position = () =>
    indicator.evaluate((element) =>
      (element as HTMLElement).style.getPropertyValue("--indicator-y"),
    );
  const first = await position();
  await page.locator(".admin-nav").getByRole("link", { name: "Pedidos" }).click();
  await expect(page).toHaveURL(/\/tienda\/admin\/pedidos$/);
  await expect(page.getByRole("heading", { level: 1, name: "Pedidos" })).toBeVisible();
  await expect.poll(position).not.toBe(first);
  await expect(page.locator(".admin-nav a.active")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await page.locator(".admin-nav").getByRole("link", { name: "Resumen" }).click();
  await expect(page.locator(".stat").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("las páginas públicas cargan sin errores de script", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`${page.url()}: ${error.message}`));
  for (const route of [
    ...publicRoutes,
    "/tienda/producto/biofresh-para-cachorros-razas-medianas",
    "/tienda/ingresar",
    "/tienda/solicitar-cuenta",
    "/tienda/recuperar-acceso",
    "/tienda/carrito",
    "/tienda/no-existe",
  ]) {
    await page.goto(route);
    await page.waitForTimeout(400);
  }
  // Navegación del cliente entre páginas (con View Transitions).
  await page.goto("/tienda");
  for (const name of [
    "Catálogo",
    "Marcas y laboratorios",
    "Nuestra empresa",
    "Contacto",
  ]) {
    await page.locator(".navline").getByRole("link", { name }).click();
    await page.waitForTimeout(600);
  }
  expect(errors).toEqual([]);
});
