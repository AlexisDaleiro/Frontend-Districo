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
    ["RUT", "12 345678 9012"],
    ["Nombre de contacto", "Persona Prueba"],
    ["Correo electrónico", "Nuevo@Example.test"],
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
  await expect(page.locator("main")).toContainText("nuevo@example.test");
  // Pendiente: todavía no puede ingresar ni comprar.
  await page.goto("/ingresar");
  await page.getByLabel("Correo electrónico").fill("nuevo@example.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("Demo1234!");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.locator("main [role=alert]")).toContainText("inválidas");
  await expect(page).toHaveURL(/\/ingresar$/);
  await login(page, "Administración");
  await page.goto("/admin/solicitudes");
  await page.getByRole("button", { name: "Aprobar", exact: true }).click();
  await page.getByLabel("Habilitar compra de medicamentos").check();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".admin-cards")).toContainText("Aprobado");
  await expect(page.locator(".admin-cards")).toContainText("123456789012");
  await page.goto("/cuenta");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.goto("/ingresar");
  await page.getByLabel("Correo electrónico").fill("nuevo@example.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("Demo1234!");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/catalogo$/);
  // Aprobada con permiso veterinario: puede comprar productos de uso profesional.
  await page.goto("/producto/alizin-10ml");
  await expect(
    page.getByRole("button", { name: /Guardar en carrito/ }),
  ).toBeVisible();
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
test("administración gestiona un pedido en revisión y ajusta reservas", async ({
  page,
}) => {
  await login(page, "Cliente con revisión de pedidos");
  await page.goto("/producto/biofresh-para-cachorros-razas-medianas");
  await page.getByRole("button", { name: "Guardar en carrito" }).click();
  await expect(
    page.getByRole("link", { name: "Ver mi carrito", exact: true }),
  ).toBeVisible();
  await page.goto("/carrito");
  await page.getByLabel("Acepto que este pedido").check();
  await page.getByRole("button", { name: "Enviar pedido a DISTRICO" }).click();
  await expect(page.locator(".status-pill")).toContainText("En revisión");
  await page.goto("/cuenta");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await login(page, "Administración");
  await expect(page.locator(".stat").nth(2)).toContainText("1");
  await page.goto("/admin/pedidos");
  await page
    .getByLabel("Filtrar estado de pedidos")
    .selectOption("PENDING_REVIEW");
  const row = page.locator("tbody tr");
  await expect(row).toHaveCount(1);
  await row.locator(".text-link").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Aceptada por el cliente");
  await expect(dialog).toContainText("Pago pendiente");
  const total = await row.locator("td").nth(3).innerText();
  await expect(dialog).toContainText(total);
  await dialog.getByRole("button", { name: "Cambiar estado" }).click();
  await expect(dialog).toContainText("Aprobado: descuenta del stock físico");
  await expect(
    dialog.getByLabel("Nuevo estado *").locator("option"),
  ).toHaveText(["Seleccionar", "Aprobado", "Rechazado", "Cancelado"]);
  await dialog.getByLabel("Nuevo estado *").selectOption("APPROVED");
  await dialog.getByLabel("Observación").fill("Pago verificado");
  await dialog.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText(/: Aprobado\.$/)).toBeVisible();
  await expect(page.getByText("No hay pedidos en este estado")).toBeVisible();
  await page.getByLabel("Filtrar estado de pedidos").selectOption("APPROVED");
  await expect(row.locator(".status-pill")).toHaveText("Aprobado");
  await expect(row.locator("td").nth(3)).toHaveText(total);
  await row.locator(".text-link").click();
  await expect(dialog).toContainText("Pago verificado");
  await page.keyboard.press("Escape");
  await page.goto("/admin/catalogo");
  await page
    .getByLabel("Buscar producto para administrar")
    .fill("BIOFRESH para cachorros");
  await page.getByLabel("Buscar producto para administrar").press("Enter");
  await page
    .getByRole("button", { name: "Presentaciones e imágenes" })
    .first()
    .click();
  await page.getByRole("button", { name: "Existencias", exact: true }).click();
  await expect(
    page.getByText("Stock físico: 39 · Reservado: 0 · Disponible: 39"),
  ).toBeVisible();
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
test("permisos: la identidad cambia sin recargar al ingresar y al salir", async ({
  page,
}) => {
  await login(page);
  const account = page.locator(".account-link");
  await expect(account).toContainText("Mi cuenta");
  await expect(page.locator(".product-bottom strong").first()).toBeVisible();
  await account.click();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(account).toContainText("Ingresar");
  await page.getByRole("link", { name: "Catálogo" }).first().click();
  await expect(page.locator(".product-bottom").first()).toContainText(
    "Ingresá para ver precios",
  );
  await expect(page.locator(".cart-count")).toHaveText("0");
});
test("administración modifica precio y stock y crea recomendación", async ({
  page,
}) => {
  // Un pedido previo deja unidades reservadas y un importe histórico.
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
  await page.goto("/cuenta/pedidos");
  const previous = await page.locator(".orders-list .card").innerText();
  await page.goto("/cuenta");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await login(page, "Administración");
  await page.goto("/admin/catalogo");
  await page
    .getByLabel("Buscar producto para administrar")
    .fill("cachorros – razas medianas");
  await page.getByLabel("Buscar producto para administrar").press("Enter");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Presentaciones e imágenes" }).click();
  await page.getByRole("button", { name: "Precio", exact: true }).click();
  const price = page.getByLabel("Precio en pesos (UYU) *");
  await price.fill("750.555");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Usá hasta 2 decimales.")).toBeVisible();
  await price.fill("750");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText(/precio vigente \$\s750,00\.$/)).toBeVisible();
  await page.getByRole("button", { name: "Existencias", exact: true }).click();
  await expect(page.getByText(/Reservado: [1-9]/)).toBeVisible();
  const reserved = Number(
    (await page.getByText(/Reservado: \d+/).innerText()).match(
      /Reservado: (\d+)/,
    )![1],
  );
  await page.getByRole("button", { name: "Actualizar", exact: true }).click();
  const physical = page.getByLabel("Stock físico *");
  await physical.fill(String(reserved - 1));
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText(`El mínimo es ${reserved}.`)).toBeVisible();
  await physical.fill("50");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(
    page.getByText(
      `Stock físico: 50 · Reservado: ${reserved} · Disponible: ${50 - reserved}`,
    ),
  ).toBeVisible();
  // El cliente ve el precio nuevo; su pedido anterior conserva el importe.
  await page.goto("/cuenta");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await login(page);
  await page.goto("/producto/biofresh-para-cachorros-razas-medianas");
  await expect(page.getByText("$ 750,00").first()).toBeVisible();
  await page.getByRole("button", { name: "Guardar en carrito" }).click();
  await page.goto("/carrito");
  await expect(page.locator("main")).toContainText("$ 750,00");
  await page.goto("/cuenta/pedidos");
  const card = page.locator(".orders-list .card");
  await expect(card).toHaveCount(1);
  // Mismo importe que antes del cambio de precio.
  await expect(card).toContainText(previous.match(/\$\s[\d.]+,\d{2}/)![0]);
  await expect(card).not.toContainText("750,00");
  await page.goto("/cuenta");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await login(page, "Administración");
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
