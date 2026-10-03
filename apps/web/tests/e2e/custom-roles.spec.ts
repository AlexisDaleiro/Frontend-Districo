import { expect, test } from "@playwright/test";

test("crea un rol, configura permisos y lo asigna por invitación", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/tienda/ingresar");
  await page.getByRole("button", { name: "Administración", exact: true }).click();
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/tienda$/);
  await page.goto("/tienda/admin/roles");

  await page.getByRole("button", { name: "Crear rol" }).click();
  await page.getByRole("dialog", { name: "Crear rol" }).getByRole("textbox", { name: "Nombre del rol" }).fill("Depósito");
  await page.getByRole("dialog", { name: "Crear rol" }).getByRole("button", { name: "Crear rol" }).click();
  await expect(page.getByRole("combobox", { name: "Rol a configurar" })).toHaveValue(/custom:/);
  await expect(page.getByRole("checkbox", { name: "Ver Catálogo" })).not.toBeChecked();
  await page.getByRole("checkbox", { name: "Ver Catálogo" }).check();
  await page.getByRole("button", { name: "Guardar permisos" }).click();
  await page.reload();
  await page.getByRole("combobox", { name: "Rol a configurar" }).selectOption({ label: "Depósito" });
  await expect(page.getByRole("checkbox", { name: "Ver Catálogo" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Ver Pedidos" })).not.toBeChecked();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.goto("/tienda/admin/personal");
  await page.getByRole("button", { name: "Invitar persona" }).click();
  await page.getByRole("textbox", { name: "Correo electrónico" }).fill("deposito@example.test");
  await page.getByRole("dialog", { name: "Invitar personal" }).getByRole("combobox", { name: "Rol" }).selectOption({ label: "Depósito" });
  await page.getByRole("button", { name: "Generar enlace" }).click();
  const invitationUrl = await page.getByRole("textbox", { name: "Enlace de activación" }).inputValue();
  await page.goto(invitationUrl);
  await page.getByLabel("Contraseña", { exact: true }).fill("ContraseñaSegura123!");
  await page.getByLabel("Confirmar contraseña").fill("ContraseñaSegura123!");
  await page.getByRole("button", { name: "Activar cuenta" }).click();
  await expect(page.getByText("Tu cuenta quedó activa.", { exact: false })).toBeVisible();

  await page.goto("/tienda/admin");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/tienda\/ingresar$/);
  await page.getByLabel("Correo electrónico").fill("deposito@example.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("ContraseñaSegura123!");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await page.goto("/tienda/admin/catalogo");
  await expect(page.getByRole("heading", { name: "Catálogo", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Crear producto" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Roles" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Pedidos" })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
