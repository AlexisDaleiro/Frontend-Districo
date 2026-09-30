import { expect, test } from "@playwright/test";

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
    element.setAttribute("data-slide-starts", "0");
    element.addEventListener("animationstart", (event) => {
      if ((event as AnimationEvent).animationName === "home-carousel-enter") {
        const count = Number(element.getAttribute("data-slide-starts"));
        element.setAttribute("data-slide-starts", String(count + 1));
      }
    });
  });
  await carousel.getByRole("button", { name: "Banner siguiente" }).click();
  await expect(
    carousel.getByRole("heading", { name: "Gran Plus en DISTRICO." }),
  ).toBeVisible();
  await expect(stage).toHaveAttribute("data-slide-starts", "1");
});

test("las páginas nuevas animan su entrada y respetan movimiento reducido", async ({
  page,
}) => {
  await page.goto("/tienda");
  await page.evaluate(() => {
    const animate = Element.prototype.animate;
    document.documentElement.setAttribute("data-page-reveals", "0");
    Element.prototype.animate = function (this: Element, keyframes, options) {
      if (this.matches(".company-page section, .company-page .page-heading")) {
        const count = Number(
          document.documentElement.getAttribute("data-page-reveals"),
        );
        document.documentElement.setAttribute("data-page-reveals", String(count + 1));
      }
      return animate.call(this, keyframes, options);
    };
  });
  await page.getByRole("link", { name: "Nuestra empresa" }).first().click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-page-reveals",
    /^[1-9]\d*$/,
  );
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
