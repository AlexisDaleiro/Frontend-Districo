import { expect, test, type Page } from "@playwright/test";
import { resolve } from "node:path";

async function admin(page: Page) {
  await page.goto("/tienda/ingresar");
  await expect(async () => {
    await page.getByRole("button", { name: "Administración", exact: true }).click();
    expect(await page.getByLabel("Correo electrónico").inputValue()).toBe("admin@districo.com");
  }).toPass({ timeout: 10000 });
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/tienda$/);
}

async function banner(page: Page, title: string, mobile = false) {
  await page.getByRole("button", { name: "Nuevo banner", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "Nuevo banner" });
  await modal.getByLabel("Título", { exact: true }).fill(title);
  await modal.getByLabel("Descripción de la imagen").fill(title);
  await modal.getByLabel("Imagen de escritorio", { exact: false }).setInputFiles(resolve("public/images/brand-panels/biofresh.jpg"));
  if (mobile) await modal.getByLabel("Imagen para móvil").setInputFiles(resolve("public/images/workbook-catalog/product-balance-biscoitos-carne-0-a63b340fe911.webp"));
  await modal.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(modal).not.toBeVisible();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
}

test("banners independientes por sitio, carrusel institucional y arte móvil", async ({ page }) => {
  await admin(page);
  await page.goto("/tienda/admin/banners");
  await banner(page, "Banner de ecommerce");
  await page.getByLabel("Sitio de los banners").selectOption("INSTITUTIONAL");
  await expect(page.getByText("Banner de ecommerce", { exact: true })).toHaveCount(0);
  await banner(page, "Banner institucional", true);
  await page.reload();
  await expect(page.getByLabel("Sitio de los banners")).toHaveValue("INSTITUTIONAL");
  await page.getByLabel("Sitio de los banners").selectOption("ECOMMERCE");
  await expect(page.getByText("Banner de ecommerce", { exact: true })).toBeVisible();
  await expect(page.getByText("Banner institucional", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.goto("/");
  const hero = page.locator(".home-hero");
  await expect(hero.getByRole("heading", { name: "Banner institucional" })).toBeVisible();
  await expect(hero.getByText("Banner de ecommerce", { exact: true })).toHaveCount(0);
  await expect(hero.getByRole("link", { name: "Conocer marcas" })).toHaveAttribute("href", "/marcas");
  await expect.poll(() => hero.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  const desktop = await hero.locator("img").evaluate((img: HTMLImageElement) => img.currentSrc);
  await page.screenshot({ path: "test-results/institutional-banners-desktop.png", fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => hero.locator("img").evaluate((img: HTMLImageElement) => img.currentSrc)).not.toBe(desktop);
  await expect.poll(() => hero.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: "test-results/institutional-banners-mobile.png", fullPage: false });
  await admin(page);
  await expect(page.locator(".home-carousel").getByRole("group", { name: "1 de 1: Banner de ecommerce" })).toBeVisible();
  await expect(page.locator(".home-carousel").getByText("Banner institucional", { exact: true })).toHaveCount(0);
});

test("marcas y laboratorios filtran independientemente y conservan su enlace", async ({ page }) => {
  await admin(page);
  await page.goto("/tienda/admin/marcas");
  await page.evaluate(() => {
    const key = "districo-demo-v1";
    const state = JSON.parse(localStorage.getItem(key) ?? "{}");
    state.laboratories = [{ id: "lab-test", name: "Laboratorio de prueba", active: true }];
    localStorage.setItem(key, JSON.stringify(state));
  });
  await page.reload();
  await page.getByLabel("Buscar marcas", { exact: true }).fill("Biofresh");
  const brands = page.locator(".admin-directory").first();
  await expect(brands.locator(".admin-directory-row")).toHaveCount(1);
  await page.getByLabel("Buscar laboratorios", { exact: true }).fill("sin coincidencia");
  await expect(page.locator(".admin-directory").last().getByText("No hay resultados para estos filtros")).toBeVisible();
  await page.getByLabel("Orden de marcas").selectOption("desc");
  await page.reload();
  await expect(page.getByLabel("Buscar marcas", { exact: true })).toHaveValue("Biofresh");
  await expect(page.getByLabel("Buscar laboratorios", { exact: true })).toHaveValue("sin coincidencia");
  await expect(page.getByLabel("Orden de marcas")).toHaveValue("desc");
  await page.getByLabel("Estado de marcas").selectOption("inactive");
  await expect(brands.getByText("No hay resultados para estos filtros")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: "test-results/brand-directory-mobile.png", fullPage: true });
});
