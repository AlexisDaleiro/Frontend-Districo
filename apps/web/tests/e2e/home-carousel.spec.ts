import { expect, test } from "@playwright/test";

test("el carrusel del inicio se recorre con teclado y no desborda", async ({
  page,
}) => {
  for (const width of [360, 390, 600, 767, 768, 900, 901, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");

    const carousel = page.locator(".home-carousel");
    await expect(
      carousel.getByRole("heading", { name: "Biofresh para tu negocio." }),
    ).toBeVisible();
    await expect
      .poll(() =>
        carousel.locator(".hero-visual img").evaluate((image: HTMLImageElement) =>
          image.complete ? image.naturalWidth : 0,
        ),
      )
      .toBeGreaterThan(0);
    await expect(carousel.locator(".hero-visual img")).toHaveCSS(
      "object-fit",
      "contain",
    );
    await expect(carousel.locator(".hero-visual img")).toHaveCSS(
      "transform",
      "none",
    );
    const biofreshHeight = await carousel.evaluate((element) => ({
      banner: element.querySelector(".home-carousel-stage")!.getBoundingClientRect()
        .height,
      image: element.querySelector(".hero-visual img")!.getBoundingClientRect()
        .height,
    }));
    expect(Math.abs(biofreshHeight.banner - biofreshHeight.image)).toBeLessThan(
      2,
    );
    const fixedHeight = await carousel.locator(".home-carousel-stage").evaluate(
      (element) => element.clientHeight,
    );
    if (width <= 900) {
      expect(
        await carousel
          .locator(".hero-visual img")
          .evaluate((image: HTMLImageElement) => image.currentSrc),
      ).toContain("banner-bio-mobile.png");
    }
    expect(
      await carousel.evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1,
      ),
    ).toBe(true);
    const next = carousel.getByRole("button", { name: "Banner siguiente" });
    const stageBox = await carousel.locator(".home-carousel-stage").boundingBox();
    const nextBox = await next.boundingBox();
    expect(stageBox).not.toBeNull();
    expect(nextBox).not.toBeNull();
    if (width <= 900) {
      expect(nextBox!.x).toBeLessThan(stageBox!.x + stageBox!.width / 2);
      expect(nextBox!.y).toBeGreaterThan(stageBox!.y + stageBox!.height);
    } else {
      expect(nextBox!.x).toBeGreaterThan(stageBox!.x + stageBox!.width / 2);
      expect(nextBox!.y + nextBox!.height).toBeLessThan(
        stageBox!.y + stageBox!.height,
      );
    }
    await next.focus();
    await page.keyboard.press("Enter");
    await expect(
      carousel.getByRole("heading", { name: "Gran Plus en DISTRICO." }),
    ).toBeVisible();
    expect(
      await carousel.locator(".home-carousel-stage").evaluate(
        (element) => element.clientHeight,
      ),
    ).toBe(fixedHeight);
    await expect(carousel.locator(".hero-visual img")).toHaveCSS(
      "filter",
      "none",
    );
    await expect(carousel.locator(".hero-visual img")).toHaveCSS(
      "object-fit",
      "contain",
    );
    await expect(carousel.locator(".hero-visual img")).toHaveCSS(
      "transform",
      "none",
    );
    await carousel.getByRole("button", { name: "Mostrar DISTRICO" }).click();
    await expect(
      carousel.getByRole("heading", {
        name: "Marcas que acompañan tu negocio.",
      }),
    ).toBeVisible();
    expect(
      await carousel.locator(".home-carousel-stage").evaluate(
        (element) => element.clientHeight,
      ),
    ).toBe(fixedHeight);
    await expect(carousel.locator(".hero-visual img")).toHaveCSS(
      "filter",
      "none",
    );
    await expect(carousel.locator(".hero-visual img")).toHaveCSS(
      "object-fit",
      "cover",
    );
    await expect(carousel.locator(".hero-visual img")).toHaveCSS(
      "transform",
      "none",
    );
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(
    await page.locator(".home-carousel-slide").evaluate(
      (element) => getComputedStyle(element).animationName,
    ),
  ).toBe("none");
});
