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
  const destination = role === "Administración" ? /\/tienda\/admin$/ : /\/tienda\/productos$/;
  try {
    await expect(page).toHaveURL(destination, { timeout: 5000 });
  } catch {
    await page.getByRole("link", { name: "Ir a mi cuenta" }).click();
    await expect(page).toHaveURL(
      role === "Administración" ? destination : /\/tienda\/cuenta$/,
    );
  }
}
test("catálogo público, filtros persistentes y ausencia de precios", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: /Marcas que acompañan. Un socio que responde/ })).toBeVisible();
  // Líneas salió de la landing: se entra al catálogo desde el header y se filtra ahí.
  await page.locator(".site-nav").getByRole("link", { name: "Productos" }).click();
  await expect(page).toHaveURL(/productos$/);
  await page.getByLabel("Categoría").selectOption({ label: "Arenas sanitarias" });
  await expect(page).toHaveURL(/\/productos\?categoryId=/);
  await expect(page.locator(".site-product-card")).toHaveCount(2);
  await page.reload();
  await expect(page.locator(".site-product-card")).toHaveCount(2);
  await expect(page.locator(".site-catalog-result")).toContainText("Sin precios para visitantes");
  await page.getByRole("link", { name: "Limpiar filtros" }).click();
  await expect(page).toHaveURL(/\/productos$/);
});
test("cliente envía pedido y consulta detalle", async ({ page }) => {
  test.setTimeout(90000);
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
  await page.getByRole("link", { name: "Ver detalle" }).click();
  await page.getByRole("button", { name: "Repetir pedido" }).click();
  await expect(page).toHaveURL(/\/tienda\/carrito$/);
  await expect(page.locator('.cart-item input[type="number"]')).toHaveValue("1");
  await page.goto("/tienda/cuenta/pedidos");
  await page.getByRole("button", { name: "Repetir pedido" }).click();
  await expect(page).toHaveURL(/\/tienda\/carrito$/);
  await expect(page.locator('.cart-item input[type="number"]')).toHaveValue("2");
  await page.goto("/tienda/cuenta/pedidos");
  await expect(page.locator(".orders-list .card")).toHaveCount(1);
});
test("el panel del carrito permite revisar y editar sin salir de la página", async ({ page }) => {
  await login(page);
  await page.goto("/tienda/producto/biofresh-para-cachorros-razas-medianas");
  await page.getByRole("button", { name: "Guardar en carrito" }).click();
  await expect(page.getByRole("button", { name: "Carrito, 1 productos" })).toBeVisible();
  await page.getByRole("button", { name: "Carrito, 1 productos" }).click();
  const panel = page.getByRole("dialog", { name: "Tu carrito" });
  await expect(panel).toContainText("BIOFRESH");
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(page).toHaveURL(/biofresh-para-cachorros-razas-medianas$/);
  await page.getByRole("button", { name: "Carrito, 1 productos" }).click();
  await panel.getByRole("button", { name: /^Quitar / }).click();
  await expect(panel.getByRole("heading", { name: "Tu carrito está esperando" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Carrito, 0 productos" })).toBeAttached();
  await panel.getByRole("link", { name: "Explorar catálogo" }).click();
  await expect(page).toHaveURL(/[/]tienda[/]productos$/);
  await expect(panel).toBeHidden();
});
test("el checkout espera el guardado de una cantidad modificada", async ({ page }) => {
  await login(page);
  await page.goto("/tienda/producto/biofresh-para-cachorros-razas-medianas");
  await page.getByRole("button", { name: "Guardar en carrito" }).click();
  await expect(page.getByRole("link", { name: "Ver mi carrito", exact: true })).toBeVisible();
  await page.goto("/tienda/carrito");
  const checkout = page.getByRole("button", { name: "Continuar al checkout" });
  await page.getByRole("button", { name: "Aumentar cantidad" }).click();
  await expect(checkout).toBeDisabled();
  await expect(page.locator('.cart-item strong[data-saved="true"]')).toBeVisible();
  await expect(checkout).toBeEnabled();
  await checkout.click();
  await expect(page).toHaveURL(/\/tienda\/checkout$/);
  await expect(page.locator('.cart-item input[type="number"]')).toHaveValue("2");
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
  // La lista muestra pendientes por defecto: la aprobada se ve en «Aprobadas».
  await page.getByLabel("Filtrar solicitudes").selectOption("APPROVED");
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
  test.setTimeout(90000);
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
  await expect(row.locator("td").nth(1)).toHaveText("clientepago@gmail.com");
  const orderNumber = await row.locator("td").first().locator("button").innerText();
  const search = page.getByRole("searchbox", { name: "Buscar pedidos" });
  for (const term of [orderNumber, "Comercio Demo", "clientepago@gmail.com"]) {
    await search.fill(term);
    await expect(row).toHaveCount(1);
  }
  await search.fill("pedido-inexistente");
  await expect(page.getByText("No hay pedidos que coincidan con la búsqueda")).toBeVisible();
  await search.clear();
  await row.getByRole("button", { name: /Gestionar/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("clientepago@gmail.com");
  await expect(dialog).toContainText("Aceptada por el cliente");
  await expect(dialog).toContainText("Pago pendiente");
  const total = await row.locator("td").nth(3).innerText();
  await expect(dialog).toContainText(total);
  await expect(dialog).toContainText("Estado de pago");
  await expect(dialog).toContainText("Monto pagado");
  await expect(dialog).toContainText("Monto a pagar");
  await expect(
    dialog.getByLabel("Nuevo estado").locator("option"),
  ).toHaveText(["Pendiente (en revisión)", "Pendiente (aprobado)", "Rechazado", "Cancelado"]);
  await dialog.getByLabel("Nuevo estado").selectOption("APPROVED");
  await dialog.getByLabel("Nueva observación").fill("Pago verificado");
  await dialog.getByRole("button", { name: "Guardar estado" }).click();
  await expect(dialog).toContainText("Pago verificado");
  await page.keyboard.press("Escape");
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
    .getByRole("link", { name: "Editar producto" })
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
  await expect(page).toHaveURL(/\/tienda\/ingresar$/);
  await page.goto("/productos");
  await expect(page.locator(".site-catalog-result")).toContainText("Sin precios para visitantes");
});

test("cliente edita su cuenta y administra varias direcciones", async ({ page }) => {
  test.setTimeout(90000);
  await login(page);
  await page.goto("/tienda/cuenta");
  await expect(page.locator(".account-readonly-fields strong").first()).toHaveText("cliente@gmail.com");
  await expect(page.getByText("Sin registrar", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Correo electrónico")).toHaveCount(0);
  await expect(page.getByLabel("Teléfono")).toHaveCount(0);

  await page.getByLabel("Nombre comercial").fill("Pet Shop Centro");
  await page.getByRole("button", { name: "Guardar datos" }).click();
  await expect(page.getByRole("heading", { name: "Pet Shop Centro" })).toBeVisible();

  await page.getByRole("button", { name: "Agregar dirección" }).click();
  await page.getByLabel("Nombre de la dirección").fill("Local");
  await page.getByLabel("Dirección", { exact: true }).fill("Av. Italia 123");
  await page.getByLabel("Ciudad").fill("Montevideo");
  await page.getByLabel("Departamento").fill("Montevideo");
  await page.getByRole("button", { name: "Guardar dirección" }).click();
  await expect(page.locator(".account-address-row")).toHaveCount(1);

  await page.getByRole("button", { name: "Agregar dirección" }).click();
  await page.getByLabel("Nombre de la dirección").fill("Depósito");
  await page.getByLabel("Dirección", { exact: true }).fill("Ruta 8 km 20");
  await page.getByRole("button", { name: "Guardar dirección" }).click();
  await expect(page.locator(".account-address-row")).toHaveCount(2);

  await page.getByRole("button", { name: "Editar dirección Depósito" }).click();
  await page.getByLabel("Dirección", { exact: true }).fill("Ruta 8 km 21");
  await page.getByRole("button", { name: "Guardar dirección" }).click();
  await expect(page.locator(".account-address-row").nth(1)).toContainText("Ruta 8 km 21");

  await page.getByRole("button", { name: "Eliminar dirección Local" }).click();
  await page.getByRole("button", { name: "Confirmar eliminación" }).click();
  await expect(page.locator(".account-address-row")).toHaveCount(1);
  await expect(page.locator(".account-address-row")).toContainText("Depósito");
});

test("administración puede registrar y quitar el teléfono de un cliente", async ({ page }) => {
  test.setTimeout(90000);
  await login(page, "Administración");
  await page.goto("/tienda/admin/clientes");
  // Clientes se muestra como tabla: una fila por comercio.
  const customer = page.locator(".admin-customers-table tbody tr").filter({ hasText: "Pet Shop Demo" });
  await customer.getByRole("button", { name: "Editar" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Teléfono").fill("099 123 456");
  await dialog.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(customer).toContainText("099 123 456");
  await customer.getByRole("button", { name: "Editar" }).click();
  await dialog.getByLabel("Teléfono").fill("");
  await dialog.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(customer).toContainText("Sin teléfono");
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
  await page.goto("/tienda/productos");
  await expect(page).toHaveURL(/\/tienda\/ingresar$/);
  await page.goto("/productos");
  await expect(page.locator(".site-catalog-result")).toContainText("Sin precios para visitantes");
});
test("contacto registra consulta, filtra puntos demo y permite gestionarla", async ({
  page,
}) => {
  await login(page);
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

  await page.goto("/tienda/cuenta");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
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
  await login(page);
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
    .getByRole("link", { name: "Editar producto" })
    .first()
    .click();
  await page.getByRole("button", { name: "Precio", exact: true }).click();
  await page.getByLabel("Precio *", { exact: true }).fill("750");
  await page.getByRole("dialog").getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Existencias", exact: true }).click();
  await page.getByRole("button", { name: "Actualizar", exact: true }).click();
  await page
    .getByRole("spinbutton", { name: "Stock físico *", exact: true })
    .fill("50");
  await page.getByRole("dialog").getByRole("button", { name: "Guardar cambios" }).click();
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
    await login(page);
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
  await login(page);
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
