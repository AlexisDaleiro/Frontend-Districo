import { expect, test } from "@playwright/test";

test("solicitudes antiguas, ficha del cliente y pedidos filtrados", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("/tienda/ingresar");
  await page.getByRole("button", { name: "Administración", exact: true }).click();
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/tienda$/);
  await page.evaluate(() => {
    const key = "districo-demo-v1";
    const state = JSON.parse(localStorage.getItem(key) ?? "{}");
    const user = state.users.find((item: { email: string }) => item.email === "cliente@gmail.com");
    state.applications.push({ id: "legacy-application", businessName: "Comercio sin archivo", legalName: "Comercio SA", rut: "123456789012", email: "legacy@example.test", status: "PENDING", documents: [] });
    state.orders.push({ id: "order-filter-test", orderNumber: "DIS-FILTRO", userId: user.id, customerAccount: user.customerAccount, status: "SUBMITTED", createdAt: "2026-01-12T12:00:00.000Z", total: 100, paidTotal: 40, creditedTotal: 0, refundedTotal: 0, currency: "UYU", items: [] });
    localStorage.setItem(key, JSON.stringify(state));
  });

  await page.goto("/tienda/admin/solicitudes");
  await expect(page.getByText("Sin habilitaciones adjuntas. No se puede aprobar.")).toBeVisible();
  await page.getByLabel("Adjuntar habilitación").setInputFiles({ name: "permiso.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7") });
  await expect(page.locator(".admin-cards")).toContainText("permiso.pdf");
  await page.getByRole("button", { name: "Aprobar", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("permiso.pdf");
  await page.getByLabel("Acceso a medicamentos veterinarios restringidos").selectOption("deny");
  await page.getByRole("button", { name: "Aprobar solicitud" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();

  await page.goto("/tienda/admin/clientes");
  await page.getByRole("row").filter({ hasText: "Pet Shop Demo" }).getByRole("link", { name: "Ver ficha" }).click();
  await expect(page).toHaveURL(/\/tienda\/admin\/clientes\/account-normal$/, { timeout: 30000 });
  await expect(page.getByRole("heading", { name: "Contacto y direcciones" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pedidos recientes" })).toBeVisible();
  await page.getByLabel("Límite de crédito").fill("1500");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("heading", { name: "Historial de crédito" }).locator("..")).toContainText("$ 1.500,00");
  await page.getByRole("link", { name: "Ver todos" }).click();
  await expect(page.getByRole("row").filter({ hasText: "DIS-FILTRO" })).toBeVisible();
  await page.getByLabel("Filtrar estado de pago").selectOption("PARTIAL");
  await page.getByLabel("Desde").fill("2026-01-01");
  await page.getByLabel("Hasta").fill("2026-01-31");
  await page.getByLabel("Filtrar estado de pedidos").selectOption("SUBMITTED");
  await expect(page.getByRole("row").filter({ hasText: "DIS-FILTRO" })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("pedidos.csv");
  await page.getByRole("link", { name: "Gestionar DIS-FILTRO" }).click();
  await expect(page.getByRole("heading", { name: "Pedido DIS-FILTRO" })).toBeVisible();
  await expect(page.getByText("Monto a pagar")).toBeVisible();
  await page.getByLabel("Nuevo estado").selectOption("PROCESSING");
  await page.getByRole("button", { name: "Guardar estado" }).click();
  await expect(page.locator(".admin-record-page")).toContainText("Procesando");
  await page.getByRole("link", { name: "Volver a pedidos" }).click();
  await expect(page.getByText("No hay pedidos en este estado")).toBeVisible();
});
