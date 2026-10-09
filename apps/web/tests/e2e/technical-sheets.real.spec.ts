import { expect, test } from "@playwright/test";
import type { Product, ProductList } from "../../src/lib/types";

test.use({ trace: "off", screenshot: "off", video: "off" });
test("Supabase: edición persistente, permisos, conflicto y restauración de contenido original", async ({ page, baseURL }) => {
  test.skip(process.env.RUN_REAL_TECHNICAL_SHEETS !== "1", "Prueba opt-in contra Supabase.");
  test.setTimeout(120000);
  const password = process.env.DEMO_SEED_PASSWORD;
  expect(password).toBeTruthy();
  const headers = { Origin: baseURL! };
  const login = await page.request.post("/api/backend/auth/login", { headers, data: { email: "admin@districo.test", password } });
  expect(login.ok()).toBe(true);
  const products = await page.request.get("/api/backend/products/admin/list?search=BIOFRESH&limit=100");
  expect(products.ok()).toBe(true);
  const product = ((await products.json()) as ProductList).items.find((item) => item.technicalSheet?.technical?.some((block) => block.label === "Composición básica"))!;
  expect(product).toBeTruthy();
  const original = structuredClone(product.technicalSheet!);
  const revision = product.technicalSheetRevision!;
  let changed = false;
  try {
    await page.goto(`/tienda/admin/productos/${product.slug}#ficha-tecnica`, { waitUntil: "domcontentloaded" });
    const editor = page.getByRole("textbox", { name: "Contenido de Composición básica", exact: true });
    await expect(editor).toBeVisible({ timeout: 30000 });
    await editor.fill("Prueba temporal de edición de composición. Contenido original se restaura al finalizar.");
    changed = true;
    await page.getByRole("button", { name: "Guardar ficha técnica", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Ficha técnica guardada." })).toBeVisible();
    const detail = await page.request.get(`/api/backend/products/${product.slug}`);
    const updated = (await detail.json()) as Product;
    expect(updated.technicalSheetRevision).toBe(revision + 1);
    expect(updated.technicalSheet?.technical?.find((block) => block.label === "Composición básica")?.html).toContain("Prueba temporal");
    expect(updated.technicalSheet?.technical?.find((block) => block.label === "Tabla nutricional")).toEqual(original.technical?.find((block) => block.label === "Tabla nutricional"));
    expect(updated.categories).toEqual(product.categories);
    expect(updated.variants).toEqual(product.variants);
    const conflict = await page.request.patch(`/api/backend/products/${product.id}/technical-sheet`, { headers, data: { revision, technical: [], benefits: [] } });
    expect(conflict.status()).toBe(409);
    const invalid = await page.request.patch(`/api/backend/products/${product.id}/technical-sheet`, { headers, data: { revision: revision + 1, technical: [{ label: "Vacía", html: "<p></p>" }], benefits: [] } });
    expect(invalid.status()).toBe(400);
    await page.reload();
    await expect(editor).toContainText("Prueba temporal de edición");
    for (const path of [`/productos/${product.slug}`, `/tienda/producto/${product.slug}`]) {
      await page.goto(path);
      if (path.startsWith("/tienda")) await page.getByRole("button", { name: "Información técnica", exact: true }).click();
      const accordion = page.locator(".tech-acc").filter({ hasText: "Composición básica" });
      await accordion.locator("summary").click();
      await expect(accordion).toContainText("Prueba temporal de edición");
    }
    const logout = await page.request.post("/api/backend/auth/logout", { headers, data: {} });
    expect(logout.ok()).toBe(true);
    const denied = await page.request.patch(`/api/backend/products/${product.id}/technical-sheet`, { headers, data: { revision: revision + 1, technical: [], benefits: [] } });
    expect(denied.status()).toBe(401);
    const clientLogin = await page.request.post("/api/backend/auth/login", { headers, data: { email: "cliente@districo.test", password } });
    expect(clientLogin.ok()).toBe(true);
    const clientDenied = await page.request.patch(`/api/backend/products/${product.id}/technical-sheet`, { headers, data: { revision: revision + 1, technical: [], benefits: [] } });
    expect(clientDenied.status()).toBe(403);
  } finally {
    if (changed) {
      const relogin = await page.request.post("/api/backend/auth/login", { headers, data: { email: "admin@districo.test", password } });
      expect(relogin.ok()).toBe(true);
      const latestResponse = await page.request.get(`/api/backend/products/admin/${product.slug}`);
      const latest = (await latestResponse.json()) as Product;
      const restored = await page.request.patch(`/api/backend/products/${product.id}/technical-sheet`, { headers, data: { technical: original.technical ?? [], benefits: original.benefits ?? [], revision: latest.technicalSheetRevision } });
      expect(restored.ok()).toBe(true);
      expect((await restored.json()).technicalSheet).toEqual(original);
    }
  }
});
