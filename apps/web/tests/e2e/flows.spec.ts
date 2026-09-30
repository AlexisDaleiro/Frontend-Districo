import { test, expect, type Page } from "@playwright/test";
async function login(page: Page, role = "Cliente mayorista") {
  await page.goto("/tienda/ingresar");
  const email = role === "Administración"
    ? "admin@districo.com"
    : role === "Cliente con revisión de pedidos"
      ? "clientepago@gmail.com"
      : role === "Cliente con permiso veterinario"
        ? "clientemed@gmail.com"
        : "cliente@gmail.com";
  await expect(async () => {
    await page.getByRole("button", { name: role, exact: true }).click();
    expect(await page.getByLabel("Correo electrónico").inputValue()).toBe(email);
  }).toPass({ timeout: 10000 });
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(
    role === "Administración" ? /\/tienda\/admin$/ : /\/tienda\/productos$/,
  );
}
test("catálogo público, filtros persistentes y ausencia de precios", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/tienda$/);
  await expect(
    page.getByRole("heading", { name: /Lo que necesitan/ }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Arenas sanitarias", exact: true })
    .click();
  await expect(page).toHaveURL(/\/tienda\/categorias\/arenas$/);
  await expect(page.locator(".product-card")).toHaveCount(2);
  await page.reload();
  await expect(page.locator(".product-card")).toHaveCount(2);
  await expect(page.locator(".product-bottom").first()).toContainText(
    "Ingresá para ver precios",
  );
  await page.getByRole("button", { name: "Arenas sanitarias" }).last().click();
  await expect(page).toHaveURL(/\/tienda\/productos$/);
});
test("cliente envía pedido y consulta detalle", async ({ page }) => {
  await login(page);
  await page.goto("/tienda/producto/biofresh-para-cachorros-razas-medianas");
  await page.getByRole("button", { name: "Guardar en carrito" }).click();
  await expect(
    page.getByRole("link", { name: "Ver mi carrito", exact: true }),
  ).toBeVisible();
  await page.goto("/tienda/carrito");
  await page.getByRole("button", { name: "Continuar al checkout" }).click();
  await expect(page).toHaveURL(/\/tienda\/checkout$/);
  await page.getByRole("button", { name: "Enviar pedido a DISTRICO" }).click();
  await expect(
    page.getByRole("heading", { name: "Pedido recibido" }),
  ).toBeVisible();
  await expect(page.locator("table")).toContainText("BIOFRESH");
  await page.goto("/tienda/cuenta/pedidos");
  await expect(page.locator(".orders-list .card")).toHaveCount(1);
});
test("solicitud aprobada habilita nueva cuenta y administración", async ({
  page,
}) => {
  await page.goto("/tienda/solicitar-cuenta");
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
  await page.goto("/tienda/ingresar");
  await page.getByLabel("Correo electrónico").fill("nuevo@example.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("Demo1234!");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.locator("main [role=alert]")).toContainText("inválidas");
  await expect(page).toHaveURL(/\/tienda\/ingresar$/);
  await login(page, "Administración");
  await page.goto("/tienda/admin/solicitudes");
  await page.getByRole("button", { name: "Aprobar", exact: true }).click();
  await page.getByLabel("Habilitar compra de medicamentos").check();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".admin-cards")).toContainText("Aprobado");
  await expect(page.locator(".admin-cards")).toContainText("123456789012");
  await page.goto("/tienda/cuenta");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.goto("/tienda/ingresar");
  await page.getByLabel("Correo electrónico").fill("nuevo@example.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("Demo1234!");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/tienda\/productos$/);
  // Aprobada con permiso veterinario: puede comprar productos de uso profesional.
  await page.goto("/tienda/producto/alizin-10ml");
  await expect(
    page.getByRole("button", { name: /Guardar en carrito/ }),
  ).toBeVisible();
});
test("pedido con revisión requiere aceptación", async ({ page }) => {
  await login(page, "Cliente con revisión de pedidos");
  await page.goto("/tienda/producto/biofresh-para-cachorros-razas-medianas");
  await page.getByRole("button", { name: "Guardar en carrito" }).click();
  await expect(
    page.getByRole("link", { name: "Ver mi carrito", exact: true }),
  ).toBeVisible();
  await page.goto("/tienda/carrito");
  await page.getByRole("button", { name: "Continuar al checkout" }).click();
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
  await page.goto("/tienda/producto/biofresh-para-cachorros-razas-medianas");
  await page.getByRole("button", { name: "Guardar en carrito" }).click();
  await expect(
    page.getByRole("link", { name: "Ver mi carrito", exact: true }),
  ).toBeVisible();
  await page.goto("/tienda/carrito");
  await page.getByRole("button", { name: "Continuar al checkout" }).click();
  await page.getByLabel("Acepto que este pedido").check();
  await page.getByRole("button", { name: "Enviar pedido a DISTRICO" }).click();
  await expect(page.locator(".status-pill")).toContainText("En revisión");
  await page.goto("/tienda/cuenta");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await login(page, "Administración");
  await expect(page.locator(".stat").nth(2)).toContainText("1");
  await page.goto("/tienda/admin/pedidos");
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
  await page.goto("/tienda/admin/catalogo");
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
  await page.goto("/tienda/admin");
  await expect(
    page.getByRole("heading", { name: "Acceso exclusivo de administración" }),
  ).toBeVisible();
  await page.goto("/tienda/producto/alizin-10ml");
  await expect(
    page.getByText("Tu cuenta no está habilitada para comprar este producto."),
  ).toBeVisible();
  await page.goto("/tienda/cuenta");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.goto("/tienda/productos");
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
test("contacto registra consulta, filtra puntos demo y permite gestionarla", async ({
  page,
}) => {
  await page.goto("/tienda/contacto");
  await expect(
    page.getByRole("heading", { name: "Hablemos de tu comercio" }),
  ).toBeVisible();
  await page.getByLabel("Nombre y apellido").fill("Persona Contacto");
  await page.getByLabel("Comercio", { exact: true }).fill("Comercio Contacto");
  await page.getByLabel("Email", { exact: false }).fill("contacto@example.test");
  await page.getByLabel("Teléfono", { exact: true }).fill("099123456");
  await page.getByLabel("Localidad", { exact: true }).fill("Montevideo");
  await page
    .getByLabel("Consulta", { exact: false })
    .fill("Quiero conocer las líneas disponibles para mi comercio.");
  await page.getByRole("button", { name: "Enviar consulta" }).click();
  await expect(page.locator(".contact-success")).toContainText(
    "Recibimos tu consulta",
  );
  await expect(page.locator(".contact-store-card")).toHaveCount(6);
  await page
    .locator(".contact-filters select")
    .first()
    .selectOption("Biofresh");
  await expect(page.locator(".contact-store-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(page.locator(".contact-store-card")).toHaveCount(6);

  await login(page, "Administración");
  await page.goto("/tienda/admin/consultas");
  await expect(page.locator(".admin-cards")).toContainText("Comercio Contacto");
  await page.getByRole("button", { name: "Gestionar" }).click();
  const inquiryDialog = page.getByRole("dialog");
  await inquiryDialog.locator('select[name="status"]').selectOption("IN_PROGRESS");
  await inquiryDialog
    .locator('textarea[name="internalNote"]')
    .fill("Contactar durante la tarde");
  await inquiryDialog.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.locator(".admin-cards")).toContainText("En seguimiento");
  await expect(page.locator(".admin-cards")).toContainText(
    "Contactar durante la tarde",
  );
});
test("empresa presenta historia, operación y acceso comercial", async ({
  page,
}) => {
  await page.goto("/tienda/empresa");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Una empresa uruguaya con más de 30 años de ruta",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Nadie es más importante que todos nosotros juntos.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Infraestructura para llegar más lejos." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Ninguna empresa puede ser mejor que las personas que trabajan en ella.",
    }),
  ).toBeVisible();
  for (const benefit of ["Gimnasio", "Comedor", "Lavandería"])
    await expect(
      page.getByRole("heading", { name: benefit, exact: true }),
    ).toBeVisible();
  await expect(page.getByRole("link", { name: "Enviar mi CV" })).toHaveAttribute(
    "href",
    /mailto:contacto@districo\.com\.uy/,
  );
  await expect(page.getByText(/productos disponibles en nuestro catálogo activo/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Solicitar cuenta mayorista" }),
  ).toHaveAttribute("href", "/tienda/solicitar-cuenta");
  await expect(
    page.getByRole("link", { name: "Contactar al equipo" }),
  ).toHaveAttribute("href", "/tienda/contacto");
});
test("administración modifica precio y stock y crea recomendación", async ({
  page,
}) => {
  await login(page, "Administración");
  await page.goto("/tienda/admin/catalogo");
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
  await page.goto("/tienda/admin/recomendaciones");
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
      "/tienda",
      "/tienda/productos",
      "/tienda/ingresar",
      "/tienda/contacto",
      "/tienda/empresa",
      "/tienda/solicitar-cuenta",
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
    await page.goto("/tienda");
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
  await page.goto("/tienda/productos");
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
