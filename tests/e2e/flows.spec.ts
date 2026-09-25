import { test, expect, type Page } from "@playwright/test";
async function login(page: Page, role = "Cliente mayorista") {
  await page.goto("/ingresar");
  await page.getByRole("button", { name: role, exact: true }).click();
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(
    role === "Administración" ? /\/admin$/ : /\/catalogo$/,
  );
}
test("catálogo público, filtros persistentes y ausencia de precios", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Lo que necesitan/ }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Arenas sanitarias", exact: true })
    .click();
  await expect(page).toHaveURL(/categoryId=arenas/);
  await expect(page.locator(".product-card")).toHaveCount(2);
  await page.reload();
  await expect(page.locator(".product-card")).toHaveCount(2);
  await expect(page.locator(".product-bottom").first()).toContainText(
    "Ingresá para ver precios",
  );
});
test("cliente envía pedido y consulta detalle", async ({ page }) => {
  await login(page);
  await page.goto("/producto/biofresh-para-cachorros-razas-medianas");
  await page.getByRole("button", { name: "Guardar en carrito" }).click();
  await expect(
    page.getByRole("link", { name: "Ver mi carrito", exact: true }),
  ).toBeVisible();
  await page.goto("/carrito");
  await page.getByRole("button", { name: "Enviar pedido a DISTRICO" }).click();
  await expect(
    page.getByRole("heading", { name: "Pedido recibido" }),
  ).toBeVisible();
  await expect(page.locator("table")).toContainText("BIOFRESH");
  await page.goto("/cuenta/pedidos");
  await expect(page.locator(".orders-list .card")).toHaveCount(1);
});
test("solicitud aprobada habilita nueva cuenta y administración", async ({
  page,
}) => {
  await page.goto("/solicitar-cuenta");
  for (const [label, value] of [
    ["Nombre del comercio", "Comercio Prueba"],
    ["Razón social", "Comercio Prueba SRL"],
    ["RUT", "123456789012"],
    ["Nombre de contacto", "Persona Prueba"],
    ["Correo electrónico", "nuevo@example.test"],
    ["Teléfono", "099123456"],
    ["Dirección", "Calle Prueba 123"],
    ["Departamento", "Montevideo"],
    ["Ciudad", "Montevideo"],
    ["Contraseña", "Demo1234!"],
  ])
    await page.getByLabel(label, { exact: false }).fill(value);
  await page.getByLabel("Tipo de comercio").selectOption("Pet shop");
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(
    page.getByRole("heading", { name: "Recibimos tu solicitud" }),
  ).toBeVisible();
  await login(page, "Administración");
  await page.goto("/admin/solicitudes");
  await page.getByRole("button", { name: "Aprobar", exact: true }).click();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".admin-cards")).toContainText("Aprobado");
  await page.goto("/cuenta");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.goto("/ingresar");
  await page.getByLabel("Correo electrónico").fill("nuevo@example.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("Demo1234!");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/catalogo$/);
});
test("pedido con revisión requiere aceptación", async ({ page }) => {
  await login(page, "Cliente con revisión de pedidos");
  await page.goto("/producto/biofresh-para-cachorros-razas-medianas");
  await page.getByRole("button", { name: "Guardar en carrito" }).click();
  await expect(
    page.getByRole("link", { name: "Ver mi carrito", exact: true }),
  ).toBeVisible();
  await page.goto("/carrito");
  await expect(
    page.getByRole("button", { name: "Enviar pedido a DISTRICO" }),
  ).toBeDisabled();
  await page.getByLabel("Acepto que este pedido").check();
  await page.getByRole("button", { name: "Enviar pedido a DISTRICO" }).click();
  await expect(page.locator(".status-pill")).toContainText("En revisión");
});
test("permisos y cierre de sesión eliminan precios privados", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Acceso exclusivo de administración" }),
  ).toBeVisible();
  await page.goto("/producto/alizin-10ml");
  await expect(
    page.getByText("Tu cuenta no está habilitada para comprar este producto."),
  ).toBeVisible();
  await page.goto("/cuenta");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.goto("/catalogo");
  await expect(page.locator(".product-bottom").first()).toContainText(
    "Ingresá para ver precios",
  );
});
test("administración modifica precio y stock y crea recomendación", async ({
  page,
}) => {
  await login(page, "Administración");
  await page.goto("/admin/catalogo");
  await page
    .getByRole("button", { name: "Presentaciones e imágenes" })
    .first()
    .click();
  await page.getByRole("button", { name: "Precio", exact: true }).click();
  await page.getByLabel("Precio *", { exact: true }).fill("750");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Existencias", exact: true }).click();
  await page.getByRole("button", { name: "Actualizar", exact: true }).click();
  await page
    .getByRole("spinbutton", { name: "Stock físico *", exact: true })
    .fill("50");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(
    page.getByText("Stock físico: 50", { exact: false }),
  ).toBeVisible();
  await page.goto("/admin/recomendaciones");
  await page.getByRole("button", { name: "Crear recomendación" }).click();
  await page.getByLabel("Nombre de la regla").fill("Recomendación prueba");
  await page.getByLabel("Se activa al comprar").selectOption({ index: 1 });
  await page.getByLabel("Producto recomendado").selectOption({ index: 2 });
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(
    page.getByRole("heading", { name: "Recomendación prueba" }),
  ).toBeVisible();
});
for (const width of [360, 390, 768, 1024, 1440])
  test(`adaptable a ${width}px sin desbordamiento`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/",
      "/catalogo",
      "/ingresar",
      "/contacto",
      "/solicitar-cuenta",
    ]) {
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();
      await page.waitForTimeout(150);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    await page.goto("/");
    await page.screenshot({
      path: `test-results/home-${width}.png`,
      fullPage: true,
    });
  });
test("panel móvil atrapa foco, cierra con Escape y respeta movimiento reducido", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/catalogo");
  const trigger = page.getByRole("button", { name: "Filtrar", exact: true });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() => !!document.activeElement?.closest("dialog")),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
