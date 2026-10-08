import { expect, test } from "@playwright/test";

test("administra vendedores y asigna un único responsable por cliente", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/tienda/ingresar");
  await page.getByRole("button", { name: "Administración", exact: true }).click();
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/tienda$/);
  await page.goto("/tienda/admin/vendedores");

  for (const [name, email, phone] of [
    ["Ana Ventas", "ana.ventas@example.test", "099 123 456"],
    ["Bruno Ventas", "bruno.ventas@example.test", "099 654 321"],
  ]) {
    await page.getByRole("button", { name: "Invitar vendedor" }).click();
    const dialog = page.getByRole("dialog", { name: "Invitar vendedor" });
    await dialog.getByRole("textbox", { name: "Nombre del vendedor" }).fill(name);
    await dialog.getByRole("textbox", { name: "Correo electrónico" }).fill(email);
    await dialog.getByRole("textbox", { name: "Número de contacto" }).fill(phone);
    await dialog.getByRole("button", { name: "Generar enlace" }).click();
    await expect(page.getByRole("dialog", { name: "Compartir invitación" })).toContainText(email);
    await page.getByRole("dialog").getByRole("button", { name: "Cerrar" }).last().click();
  }

  await page.evaluate(() => {
    const key = "districo-demo-v1";
    const state = JSON.parse(localStorage.getItem(key) ?? "{}");
    for (const user of state.users) {
      if (["ana.ventas@example.test", "bruno.ventas@example.test"].includes(user.email)) {
        user.active = true;
        user.emailVerified = true;
      }
    }
    localStorage.setItem(key, JSON.stringify(state));
  });
  await page.reload();
  await expect(page.getByRole("row").filter({ hasText: "Ana Ventas" })).toContainText("099 123 456");

  await page.getByRole("row").filter({ hasText: "Ana Ventas" }).getByRole("link", { name: "Ver ficha" }).click();
  await expect(page.getByRole("heading", { name: "Ana Ventas" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Asignar cliente" }).click();
  await page.getByRole("dialog", { name: "Asignar cliente" }).getByRole("button", { name: /Pet Shop Demo/ }).click();
  await page.getByRole("button", { name: "Asignar cliente", exact: true }).last().click();
  await expect(page.getByRole("row").filter({ hasText: "Pet Shop Demo" })).toBeVisible();

  await page.getByRole("link", { name: "Volver a vendedores" }).click();
  await page.getByRole("row").filter({ hasText: "Bruno Ventas" }).getByRole("link", { name: "Ver ficha" }).click();
  await page.getByRole("button", { name: "Asignar cliente" }).click();
  const picker = page.getByRole("dialog", { name: "Asignar cliente" });
  await picker.getByRole("button", { name: /Pet Shop Demo/ }).click();
  await expect(picker).toContainText("Actual: Ana Ventas");
  await picker.getByRole("button", { name: "Confirmar reasignación" }).click();
  await expect(page.getByRole("row").filter({ hasText: "Pet Shop Demo" })).toBeVisible();

  await page.getByRole("button", { name: "Quitar Pet Shop Demo" }).click();
  await page.getByRole("dialog", { name: "Quitar asignación" }).getByRole("button", { name: "Quitar asignación" }).click();
  await expect(page.getByText("Todavía no tiene clientes asignados.")).toBeVisible();
});
