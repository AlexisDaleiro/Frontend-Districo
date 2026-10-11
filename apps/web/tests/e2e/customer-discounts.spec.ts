import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/tienda/ingresar");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill("Demo1234!");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/tienda$/, { timeout: 15000 });
}
async function setup(page: Page) {
  await login(page, "admin@districo.com");
  await page.evaluate(() => {
    const key = "districo-demo-v1", state = JSON.parse(localStorage.getItem(key)!);
    state.users.push({ id: "seller-discount", email: "seller.discount@example.test", role: "SALES", active: true, emailVerified: true, permissions: [] });
    state.salespeople["seller-discount"] = { id: "profile-discount", name: "Vendedor de prueba", phone: "099123456" };
    const client = state.users.find((user: { email: string }) => user.email === "cliente@gmail.com");
    client.customerAccount.salespersonId = "profile-discount";
    const product = state.products.find((item: { requiresMedicationPermission: boolean }) => !item.requiresMedicationPermission);
    state.products = [{ ...product, id: "discount-product", slug: "discount-product", name: "Producto de prueba", variants: [{ ...product.variants[0], id: "discount-variant", name: "Presentación de prueba", sku: "DISCOUNT-QA", price: { amount: 100, currency: "UYU" }, physicalStock: 100, reservedStock: 0, availableStock: 100, minimumOrderQuantity: 1, saleMultiple: 1 }] }];
    state.promotions = [{ id: "discount-promo", name: "30% de prueba", active: true, conditions: [{ targetType: "PRODUCT", targetId: "discount-product", minQuantity: 1 }], rewards: [{ targetType: "PRODUCT", targetId: "discount-product", rewardType: "PERCENTAGE", percentage: 30 }] }];
    state.carts[client.id] = [{ id: "discount-cart-item", variantId: "discount-variant", quantity: 1 }];
    state.session = "seller-discount";
    localStorage.setItem(key, JSON.stringify(state));
  });
  await page.goto("/tienda/admin/clientes/account-normal");
  await expect(page.getByRole("heading", { name: "Descuento fijo del cliente" })).toBeVisible();
}

test("vendedor edita descuento propio, guarda con atajo, conserva historial y cliente compra con total descontado", async ({ page }, info) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await setup(page);
  await expect(page.getByRole("heading", { name: "Editar cliente", exact: true })).toHaveCount(0);
  const section = page.getByRole("region", { name: "Descuento fijo del cliente" });
  await section.getByLabel("Descuento (%)").fill("101");
  await section.getByRole("button", { name: "Guardar descuento" }).click();
  await expect(section.getByText("Ingresá un número válido.")).toBeVisible();
  await section.getByLabel("Descuento (%)").fill("10");
  await section.getByLabel("Con promociones").selectOption("STACK");
  await section.getByLabel("Descuento (%)").press("Control+s");
  await expect(section).toContainText("Ahora: 10% · Acumular con promociones.");
  await page.reload();
  await expect(section.getByLabel("Descuento (%)")).toHaveValue("10");
  await expect(section.getByLabel("Con promociones")).toHaveValue("STACK");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath("customer-discount-mobile.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await login(page, "cliente@gmail.com");
  await page.goto("/tienda/carrito");
  await expect(page.locator(".summary")).toContainText("Descuento de tu cuenta (10%)");
  await expect(page.locator(".summary")).toContainText("$ 63,00");
  await page.locator(".summary").scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath("customer-discount-cart-mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "Continuar al checkout" }).click();
  await page.getByLabel("En cuotas", { exact: true }).check();
  await page.getByLabel("Cuotas y plazo", { exact: true }).selectOption("3");
  await expect(page.locator(".payment-preview")).toContainText("$ 21,00");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByRole("button", { name: "Enviar pedido a DISTRICO" }).click();
  await expect(page).toHaveURL(/\/tienda\/cuenta\/pedidos\/.+\?confirmado=1$/, { timeout: 15000 });
  await expect(page.getByText("Total: $ 63,00", { exact: true })).toBeVisible();
  await expect(page.getByText(/Descuento de cuenta: 10%/)).toContainText("Aplicado: $ 7,00");
});

test("otros clientes y permisos revocados no permiten editar descuentos; los cambios pendientes se pueden descartar", async ({ page }) => {
  test.setTimeout(90000);
  await setup(page);
  const section = page.getByRole("region", { name: "Descuento fijo del cliente" });
  await section.getByLabel("Descuento (%)").fill("15");
  page.once("dialog", (dialog) => dialog.dismiss());
  await section.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(section.getByLabel("Descuento (%)")).toHaveValue("15");
  page.once("dialog", (dialog) => dialog.accept());
  await section.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(section.getByLabel("Descuento (%)")).toHaveValue("0");
  await page.goto("/tienda/admin/clientes/account-vet");
  await expect(page.getByText("No tenés permiso para esta acción.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Guardar descuento" })).toHaveCount(0);
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    state.staffRoleAccess.SALES = { ...state.staffRoleAccess.SALES, "descuentos-clientes": { canView: true, canEdit: false } };
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  });
  await page.goto("/tienda/admin/clientes/account-normal");
  await expect(section).toContainText("0% · Sólo el más conveniente por producto");
  await expect(section.getByRole("button", { name: "Guardar descuento" })).toHaveCount(0);
});
