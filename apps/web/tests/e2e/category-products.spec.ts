import { expect, test } from "@playwright/test";

test("categorías muestra, agrega y quita productos sin borrarlos", async ({ page }) => {
  await page.goto("/tienda/ingresar");
  await page.getByRole("button", { name: "Administración", exact: true }).click();
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/tienda$/);
  await page.goto("/tienda/admin/categorias");

  const products = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("districo-demo-v1") ?? "{}") as {
      products: { id: string; name: string; categories: { categoryId: string }[]; variants: { sku: string }[] }[];
    };
    const assigned = state.products.find((product) => product.categories.some((item) => item.categoryId === "alimentacion"))!;
    const candidate = state.products.find((product) => !product.categories.some((item) => item.categoryId === "alimentacion") && product.categories.length)!;
    return { assigned, candidate, originalCategoryId: candidate.categories[0].categoryId };
  });

  await page.getByRole("button", { name: "Editar Alimentación" }).click();
  const dialog = page.getByRole("dialog", { name: "Editar Alimentación" });
  const assignedProducts = dialog.locator(".admin-category-products").first();
  await expect(dialog.getByRole("heading", { name: "Productos asignados" })).toBeVisible();
  await dialog.getByRole("searchbox", { name: "Buscar productos asignados" }).fill(products.assigned.variants[0].sku);
  await expect(assignedProducts.getByText(products.assigned.name, { exact: true })).toBeVisible();

  await dialog.getByRole("searchbox", { name: "Buscar productos para agregar" }).fill(products.candidate.variants[0].sku);
  await dialog.getByRole("button", { name: `Agregar ${products.candidate.name} a la categoría` }).click();
  await dialog.getByRole("searchbox", { name: "Buscar productos asignados" }).fill(products.candidate.variants[0].sku);
  await expect(assignedProducts.getByText(products.candidate.name, { exact: true })).toBeVisible();

  page.once("dialog", (confirmation) => confirmation.accept());
  await dialog.getByRole("button", { name: `Quitar ${products.candidate.name} de la categoría` }).click();
  await expect(assignedProducts.getByText(products.candidate.name, { exact: true })).not.toBeVisible();
  const after = await page.evaluate((productId) => {
    const state = JSON.parse(localStorage.getItem("districo-demo-v1") ?? "{}") as {
      products: { id: string; categories: { categoryId: string }[] }[];
    };
    return state.products.find((product) => product.id === productId)?.categories.map((item) => item.categoryId);
  }, products.candidate.id);
  expect(after).toContain(products.originalCategoryId);
  expect(after).not.toContain("alimentacion");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(dialog.getByRole("searchbox", { name: "Buscar productos para agregar" })).toBeVisible();
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
});
