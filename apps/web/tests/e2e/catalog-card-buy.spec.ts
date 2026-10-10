import { expect, test, type Page } from "@playwright/test";

async function prepare(page: Page, restricted = false) {
  await page.goto("/tienda/ingresar");
  await expect(async () => {
    await page.getByRole("button", { name: "Cliente mayorista", exact: true }).click();
    expect(await page.getByLabel("Correo electrónico").inputValue()).toBe("cliente@gmail.com");
  }).toPass({ timeout: 10000 });
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/tienda$/, { timeout: 10000 });
  const slug = await page.evaluate((medication) => {
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    const product = state.products.find((item: { requiresMedicationPermission: boolean }) => !item.requiresMedicationPermission);
    product.name = "Producto de prueba con variantes";
    product.requiresMedicationPermission = medication;
    const source = product.variants[0];
    product.variants = [
      { ...source, id: "card-3kg", name: "3 kg", presentation: "3 kg", sku: "CARD-3", minimumOrderQuantity: 3, saleMultiple: 2, availableStock: 10, physicalStock: 10, reservedStock: 0, price: { amount: 300, currency: "UYU" } },
      { ...source, id: "card-10kg", name: "10 kg", presentation: "10 kg", sku: "CARD-10", minimumOrderQuantity: 1, saleMultiple: 1, availableStock: 2, physicalStock: 2, reservedStock: 0, price: { amount: 900, currency: "UYU" } },
      { ...source, id: "card-empty", name: "20 kg", presentation: "20 kg", sku: "CARD-20", minimumOrderQuantity: 1, saleMultiple: 1, availableStock: 0, physicalStock: 0, reservedStock: 0 },
      { ...source, id: "card-inactive", name: "Inactiva", active: false },
    ];
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
    return product.slug as string;
  }, restricted);
  await page.goto(`/tienda/productos?search=${encodeURIComponent("Producto de prueba con variantes")}`);
  const card = page.locator(".product-card").filter({ has: page.getByRole("heading", { name: "Producto de prueba con variantes" }) });
  await expect(card.getByRole("button", { name: "3 kg", exact: true })).toBeVisible();
  return { card, slug };
}

for (const width of [1440, 390]) {
  test(`compra desde tarjeta elige variante y respeta cantidad y stock a ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const { card } = await prepare(page);
    await expect(card.getByRole("button", { name: "Inactiva", exact: true })).toHaveCount(0);
    await expect(card.locator(".product-price-head")).toHaveCount(0);
    await card.getByRole("button", { name: "3 kg", exact: true }).click();
    const quantity = card.getByRole("spinbutton", { name: "Cantidad", exact: true });
    const add = card.getByRole("button", { name: "Agregar Producto de prueba con variantes al carrito" });
    await expect(quantity).toHaveValue("4");
    await quantity.fill("5");
    await expect(add).toBeDisabled();
    await quantity.fill("6");
    await add.click();
    await expect(page.getByRole("button", { name: "Carrito, 1 productos" })).toBeVisible();
    await expect(card.locator(".product-card-note")).toContainText("En carrito: 6");
    await quantity.fill("8");
    await add.click();
    await expect(card.locator(".product-card-note")).toContainText("En carrito: 8");
    const saved = () => page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
      return Object.values(state.carts).flat() as { variantId: string; quantity: number }[];
    });
    await expect.poll(saved).toContainEqual(expect.objectContaining({ variantId: "card-3kg", quantity: 8 }));
    await quantity.fill("12");
    await expect(add).toBeDisabled();
    await card.getByRole("button", { name: "10 kg", exact: true }).click();
    await expect(quantity).toHaveValue("1");
    await expect(card.locator(".product-price strong")).toContainText("900");
    await card.screenshot({ path: info.outputPath(`tarjeta-${width}.png`), animations: "disabled" });
    await add.click();
    await expect.poll(saved).toContainEqual(expect.objectContaining({ variantId: "card-10kg", quantity: 1 }));
    await card.getByRole("button", { name: "20 kg", exact: true }).click();
    await expect.poll(() => card.locator('.product-variant-pill[aria-pressed="true"]').evaluate((pill) => {
      const bounds = pill.getBoundingClientRect();
      const rail = pill.parentElement!.getBoundingClientRect();
      return bounds.left >= rail.left - 1 && bounds.right <= rail.right + 1;
    })).toBe(true);
    await expect(card).toContainText("Sin stock para el mínimo de compra");
    await expect(add).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("la compra desde tarjeta respeta el permiso veterinario", async ({ page }) => {
  const { card } = await prepare(page, true);
  await expect(card).toContainText("Tu cuenta no está habilitada para comprar este producto.");
  await expect(card.getByRole("button", { name: /Agregar .* al carrito/ })).toHaveCount(0);
  await expect(card.locator(".product-price strong")).toHaveCount(0);
});
