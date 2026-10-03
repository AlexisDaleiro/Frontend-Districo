import { expect, test } from "@playwright/test";

test("la solicitud mayorista acepta un permiso PDF", async ({ page }) => {
  await page.goto("/tienda/solicitar-cuenta");
  for (const [label, value] of [
    ["Nombre del comercio", "Comercio Prueba"],
    ["Razón social", "Comercio Prueba SRL"],
    ["RUT", "12 345678 9012"],
    ["Nombre de contacto", "Persona Prueba"],
    ["Correo electrónico", "permiso@example.test"],
    ["Teléfono", "099123456"],
    ["Dirección", "Calle Prueba 123"],
    ["Departamento", "Montevideo"],
    ["Ciudad", "Montevideo"],
    ["Contraseña", "Demo1234!"],
  ]) await page.getByLabel(label, { exact: false }).fill(value);
  await page.getByLabel("Tipo de comercio").selectOption("Pet shop");
  await page.getByLabel("Permisos o habilitaciones del negocio").setInputFiles({
    name: "habilitacion.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7\npermiso de prueba"),
  });
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(page.getByRole("heading", { name: "Recibimos tu solicitud" })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("districo-demo-v1") ?? "{}"));
  expect(saved.applications?.[0]?.documents?.[0]?.originalName).toBe("habilitacion.pdf");
});
