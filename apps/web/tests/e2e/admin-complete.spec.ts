import { test, expect, type Page } from "@playwright/test";
async function admin(page: Page) {
  await page.goto("/tienda/ingresar");
  await expect(async () => {
    await page.getByRole("button", { name: "Administración", exact: true }).click();
    expect(await page.getByLabel("Correo electrónico").inputValue()).toBe("admin@districo.com");
  }).toPass({ timeout: 10000 });
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/tienda\/admin$/, { timeout: 10000 });
}
test("administración crea producto, presentación, precio, stock y medio", async ({
  page,
}) => {
  await admin(page);
  await page.goto("/tienda/admin/catalogo");
  await page.getByRole("button", { name: "Crear producto" }).click();
  await page
    .getByRole("textbox", { name: "Nombre *", exact: true })
    .fill("AA Producto de prueba");
  await page.getByLabel("Identificador en la URL").fill("aa-producto-prueba");
  await page.getByLabel("Categoría principal").selectOption("alimentacion");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("row")
    .filter({ hasText: "AA Producto de prueba" })
    .getByRole("button", { name: "Presentaciones e imágenes" })
    .click();
  await page.getByRole("button", { name: "Agregar presentación" }).click();
  await page
    .getByRole("textbox", { name: "SKU *", exact: true })
    .fill("PRUEBA-100");
  await page.getByLabel("Nombre de la presentación").fill("Caja de prueba");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Precio", exact: true }).click();
  await page
    .getByRole("spinbutton", { name: "Precio *", exact: true })
    .fill("900");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Existencias", exact: true }).click();
  await page.getByRole("button", { name: "Actualizar", exact: true }).click();
  await page
    .getByRole("spinbutton", { name: "Stock físico *", exact: true })
    .fill("24");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Agregar imagen por URL" }).click();
  await page
    .getByLabel("URL de la imagen")
    .fill(new URL("/images/placeholder.svg", page.url()).href);
  await page.getByLabel("Texto alternativo").fill("Imagen de prueba");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/tienda/producto/aa-producto-prueba");
  await expect(
    page.getByRole("heading", { name: "AA Producto de prueba" }),
  ).toBeVisible();
  await expect(page.getByText("SKU PRUEBA-100")).toBeVisible();
  await page.getByRole("button", { name: "Guardar en carrito" }).click();
  await expect(
    page.getByRole("link", { name: "Ver mi carrito", exact: true }),
  ).toBeVisible();
});
test("crea promociones simples y por vencimiento", async ({ page }) => {
  await admin(page);
  await page.goto("/tienda/admin/promociones");
  await page
    .getByRole("button", { name: "Crear promoción", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Nombre *", exact: true })
    .fill("Descuento de prueba");
  await page
    .getByLabel("Compra que activa el beneficio")
    .selectOption({ index: 1 });
  await page
    .getByLabel("Productos que reciben el beneficio")
    .selectOption({ index: 1 });
  await page.getByLabel("Valor del beneficio").fill("10");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(
    page.getByRole("heading", { name: "Descuento de prueba" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Crear por vencimiento" }).click();
  await page
    .getByRole("combobox", { name: "Presentación *", exact: true })
    .selectOption({ index: 1 });
  await page.getByLabel("Vencimiento del lote").fill("2027-12-01");
  await page.getByLabel("Descuento (%)").fill("15");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("15% de descuento")).toBeVisible();
});
test("imagen no disponible tiene sustituto y búsqueda vacía tiene salida", async ({
  page,
}) => {
  await page.route(
    (url) => url.pathname === "/images/product-0-0.jpg",
    (route) => route.abort(),
  );
  await page.goto("/tienda/producto/biofresh-para-cachorros-razas-medianas");
  await expect(page.locator(".detail-image img")).toHaveAttribute(
    "src",
    "/images/placeholder.svg",
  );
  await page.goto("/tienda/productos?search=producto-que-no-existe");
  await expect(
    page.getByRole("heading", { name: "No encontramos productos" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Ver todo el catálogo" }).click();
  await expect(page.locator(".product-card")).toHaveCount(12);
});
