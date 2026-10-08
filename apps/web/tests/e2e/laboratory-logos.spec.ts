import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const real = process.env.E2E_REAL_LABORATORY_LOGOS === "1";
test.use({ trace: real ? "off" : "retain-on-failure" });
const { assets } = JSON.parse(readFileSync(new URL("../../../api/scripts/catalog/laboratory-logo-assets.generated.json", import.meta.url), "utf8")) as {
  assets: { slug: string; name: string; url: string }[];
};

test("laboratory logos load in the store and remain available in administration", async ({ page }, testInfo) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  if (real) {
    const password = process.env.DEMO_SEED_PASSWORD;
    if (!password) throw new Error("The opt-in live check needs demo credentials.");
    const login = await page.request.post("/api/backend/auth/login", {
      headers: { Origin: testInfo.project.use.baseURL! }, data: { email: "admin@districo.test", password },
    });
    expect(login.ok()).toBe(true);
  } else {
    await page.goto("/tienda/ingresar");
    await expect(async () => {
      await page.getByRole("button", { name: "Administración", exact: true }).click();
      expect(await page.getByLabel("Correo electrónico").inputValue()).toBe("admin@districo.com");
    }).toPass({ timeout: 10000 });
    await page.getByRole("button", { name: "Ingresar", exact: true }).click();
    await expect(page).toHaveURL(/\/tienda$/, { timeout: 10000 });
    await page.evaluate((assets) => {
      const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
      state.laboratories = assets.map((asset) => ({ id: `logo-${asset.slug}`, name: asset.name, slug: asset.slug, imageUrl: asset.url, active: true }));
      state.laboratories.push({ id: "ficticio", name: "Laboratorio ficticio", slug: "laboratorio-ficticio", active: true });
      localStorage.setItem("districo-demo-v1", JSON.stringify(state));
    }, assets);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/tienda/marcas");
  await page.getByRole("button", { name: "Laboratorios", exact: true }).click();
  const directory = page.getByRole("region", { name: "Laboratorios", exact: true });
  await expect(directory.locator(".brand-gallery-logo img")).toHaveCount(assets.length);
  for (const asset of assets) {
    const image = directory.getByRole("img", { name: asset.name, exact: true });
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0)).toBe(true);
    await expect(directory.getByRole("link", { name: `Ver productos de ${asset.name}`, exact: true })).toHaveAttribute("href", /laboratoryId=/);
  }
  await expect(directory.getByRole("link", { name: "Ver productos de Laboratorio ficticio", exact: true }).locator("img")).toHaveCount(0);
  await directory.getByRole("heading", { name: "Laboratorios", exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("laboratories-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("laboratories-mobile.png"), fullPage: false });
  await directory.getByRole("link", { name: "Ver productos de Virbac", exact: true }).click();
  await expect(page).toHaveURL(/\/tienda\/productos\?laboratoryId=/);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/tienda/admin/marcas");
  const admin = page.locator(".admin-directory").filter({ has: page.getByRole("heading", { name: "Laboratorios", exact: true }) });
  await expect(admin.locator(".admin-directory-row img")).toHaveCount(assets.length);
  await admin.getByLabel("Logo de laboratorios", { exact: true }).selectOption("without");
  await expect(admin.locator(".admin-directory-row")).toHaveCount(1);
  await expect(admin).toContainText("Laboratorio ficticio");
  await admin.getByLabel("Logo de laboratorios", { exact: true }).selectOption("with");
  await expect(admin.locator(".admin-directory-row")).toHaveCount(assets.length);
  for (const asset of assets) {
    const image = admin.getByRole("img", { name: asset.name, exact: true });
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0)).toBe(true);
  }
  expect(errors).toEqual([]);
});
