import { test, expect, type Page } from "@playwright/test";
import { staffFeatures } from "../../src/lib/staff-access";
async function admin(page: Page) {
  await page.goto("/tienda/ingresar");
  await expect(async () => {
    await page.getByRole("button", { name: "Administración", exact: true }).click();
    expect(await page.getByLabel("Correo electrónico").inputValue()).toBe("admin@districo.com");
  }).toPass({ timeout: 10000 });
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/tienda$/, { timeout: 10000 });
  await page.goto("/tienda/admin");
}
test("roles configura permisos de ver y editar por rol", async ({ page }) => {
  await admin(page);
  await page.goto("/tienda/admin/personal");
  await expect(page.getByRole("heading", { name: "Permisos por rol" })).toHaveCount(0);
  await page.getByRole("link", { name: "Roles" }).click();
  await expect(page).toHaveURL(/\/tienda\/admin\/roles$/);
  await expect(page.getByRole("heading", { name: "Permisos por rol" })).toBeVisible();
  await expect(page.locator(".staff-role-access tbody tr")).toHaveCount(staffFeatures.length);
  for (const [, title] of staffFeatures) {
    await expect(page.getByRole("checkbox", { name: `Ver ${title}`, exact: true })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: `Editar ${title}`, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("checkbox", { name: "Ver Consultas" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Editar Consultas" })).toBeChecked();
  await page.getByRole("checkbox", { name: "Editar Catálogo" }).check();
  await expect(page.getByRole("checkbox", { name: "Ver Catálogo" })).toBeChecked();
  await page.getByRole("button", { name: "Guardar permisos" }).click();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Editar Catálogo" })).toBeChecked();
  await page.getByRole("checkbox", { name: "Ver Pagos y facturas" }).uncheck();
  await expect(page.getByRole("checkbox", { name: "Editar Pedidos" })).not.toBeChecked();
  await page.getByRole("checkbox", { name: "Editar Pedidos" }).check();
  await expect(page.getByRole("checkbox", { name: "Ver Pagos y facturas" })).toBeChecked();
  await page.getByRole("combobox", { name: "Rol a configurar" }).selectOption("ADMIN");
  await expect(page.getByRole("checkbox", { name: "Ver Catálogo" })).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".staff-role-access")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
test("administración permite cerrar sesión con el menú abierto o contraído", async ({ page }) => {
  await admin(page);
  await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/tienda\/ingresar$/);

  await admin(page);
  await page.getByRole("button", { name: "Contraer menú" }).click();
  await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/tienda\/ingresar$/);
});
test("administración conserva búsqueda, roles y aviso de suspensión", async ({ page }) => {
  await admin(page);
  const sidebar = page.locator(".admin-sidebar");
  const expandedWidth = await sidebar.evaluate((element) => element.getBoundingClientRect().width);
  await page.getByRole("button", { name: "Contraer menú" }).click();
  await expect(sidebar).toHaveAttribute("data-collapsed", "true");
  await expect.poll(() => sidebar.evaluate((element) => element.getBoundingClientRect().width))
    .toBeLessThan(expandedWidth - 100);
  await page.goto("/tienda/admin/consultas");
  await page.getByRole("button", { name: "Expandir menú" }).click();
  await expect(sidebar).toHaveAttribute("data-collapsed", "false");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Contraer menú" }).click();
  await expect(page.getByRole("navigation", { name: "Administración" })).not.toBeVisible();
  await page.getByRole("button", { name: "Expandir menú" }).click();
  await expect(page.getByRole("navigation", { name: "Administración" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Consultas comerciales" })).toBeVisible();
  await page.getByRole("textbox", { name: "Buscar consultas" }).fill("sin coincidencias");
  await expect(page.getByText("No hay consultas con estos filtros")).toBeVisible();
  await page.goto("/tienda/admin/solicitudes");
  await expect(page.getByRole("searchbox", { name: "Buscar solicitudes" })).toBeVisible();
  await page.goto("/tienda/admin/clientes");
  await page.getByRole("link", { name: "Ver ficha" }).first().click();
  await expect(page.getByText("Una cuenta suspendida puede ingresar y consultar su historial, pero no enviar pedidos nuevos.")).toBeVisible();
  await page.goto("/tienda/admin/personal");
  await expect(page.getByRole("heading", { name: "Equipo" })).toBeVisible();
  await expect(page.getByText("admin@districo.com").last()).toBeVisible();
});
test("personal, categorías y clientes tienen flujos administrables", async ({ page }) => {
  await admin(page);
  await page.goto("/tienda/admin/clientes");
  await expect(page.locator(".admin-customers-table tbody tr")).toHaveCount(3);
  await page.goto("/tienda/admin/marcas");
  await expect(page.getByRole("heading", { name: "Marcas y laboratorios" })).toBeVisible();
  await page.getByRole("button", { name: "Crear" }).first().click();
  await page.getByRole("textbox", { name: "Nombre *", exact: true }).fill("Marca descartable");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Marca descartable")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Eliminar Marca descartable" }).click();
  await expect(page.getByText("Marca descartable")).not.toBeVisible();
  await page.goto("/tienda/admin/categorias");
  await expect(page.getByRole("heading", { name: "Árbol de categorías" })).toBeVisible();
  await page.getByRole("button", { name: "Nueva categoría" }).click();
  await expect(page.getByRole("combobox", { name: "Categoría superior" })).toBeVisible();
  await page.getByRole("textbox", { name: "Nombre *" }).fill("Subcategoría de prueba");
  await page.getByRole("combobox", { name: "Categoría superior" }).selectOption("alimentacion");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Abrir Alimentación" }).click();
  await expect(page.getByText("Subcategoría de prueba")).toBeVisible();
  const categoryToggle = page.getByRole("checkbox", { name: "Visible en la tienda: Subcategoría de prueba" });
  await categoryToggle.uncheck();
  await expect(categoryToggle).not.toBeChecked();
  await categoryToggle.check();
  await expect(categoryToggle).toBeChecked();
  await page.goto("/tienda/admin/personal");
  await page.getByRole("button", { name: "Invitar persona" }).click();
  await page.getByRole("textbox", { name: "Correo electrónico" }).fill("vendedor@example.test");
  await page.getByRole("button", { name: "Generar enlace" }).click();
  const url = await page.getByRole("textbox", { name: "Enlace de activación" }).inputValue();
  expect(url).toContain("/tienda/activar-personal#token=");
  await page.getByRole("dialog", { name: "Compartir invitación" }).getByRole("button", { name: "Cerrar", exact: true }).last().click();
  await expect(page.getByText("vendedor@example.test").last()).toBeVisible();
  await page.goto(url);
  await expect(page.getByRole("button", { name: "Activar cuenta" })).toBeEnabled();
  await page.getByLabel("Contraseña", { exact: true }).fill("ContraseñaSegura123!");
  await page.getByLabel("Confirmar contraseña").fill("ContraseñaSegura123!");
  await page.getByRole("button", { name: "Activar cuenta" }).click();
  await expect(page.getByText("Tu cuenta quedó activa.", { exact: false })).toBeVisible();
});

test("consultas se recorren en una tabla compacta y conservan el detalle editable", async ({ page }) => {
  await admin(page);
  await page.evaluate(() => {
    const key = "districo-demo-v1";
    const state = JSON.parse(localStorage.getItem(key) ?? "{}");
    const now = new Date().toISOString();
    state.contactInquiries = [{
      id: "inquiry-test",
      name: "Comercio de prueba",
      businessName: "Sucursal Centro",
      email: "consulta@example.test",
      message: "Necesito información sobre entregas semanales.",
      status: "NEW",
      createdAt: now,
      updatedAt: now,
    }, ...(state.contactInquiries ?? [])];
    localStorage.setItem(key, JSON.stringify(state));
  });
  await page.goto("/tienda/admin/consultas");
  const row = page.locator(".admin-inquiries-table tbody tr").filter({ hasText: "Sucursal Centro" }).first();
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Ver detalle" }).click();
  await expect(page.getByText("Necesito información sobre entregas semanales.")).toBeVisible();
  await page.getByRole("button", { name: "Gestionar" }).click();
  await expect(page.getByRole("dialog").getByRole("combobox", { name: "Estado" })).toBeVisible();
});
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
    .getByRole("link", { name: "Editar producto" })
    .click();
  await expect(page).toHaveURL(/\/tienda\/admin\/productos\/aa-producto-prueba$/);
  await page.getByRole("button", { name: "Agregar presentación" }).click();
  await page
    .getByRole("textbox", { name: "SKU *", exact: true })
    .fill("PRUEBA-100");
  await page.getByLabel("Nombre de la presentación").fill("Caja de prueba");
  await page.getByRole("dialog").getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Precio", exact: true }).click();
  await page
    .getByRole("spinbutton", { name: "Precio *", exact: true })
    .fill("900");
  await page.getByRole("dialog").getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Existencias", exact: true }).click();
  await page.getByRole("button", { name: "Actualizar", exact: true }).click();
  await page
    .getByRole("spinbutton", { name: "Stock físico *", exact: true })
    .fill("24");
  await page.getByRole("dialog").getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.locator('#imagenes input[type="file"]').setInputFiles({
    name: "prueba.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/T7sAAAAASUVORK5CYII=", "base64"),
  });
  await expect(page.getByText("Imagen subida.")).toBeVisible();
  await page.getByRole("link", { name: "Volver al catálogo" }).click();
  const row = page.getByRole("row").filter({ hasText: "AA Producto de prueba" });
  await expect(row.getByRole("cell", { name: "24 uds." })).toBeVisible();
  await expect(row.getByRole("link", { name: "Vista previa" })).toHaveCount(0);
  await expect(row.getByRole("link", { name: "Presentaciones e imágenes" })).toHaveCount(0);
  await row.getByRole("link", { name: "Editar producto" }).click();
  await page.getByRole("link", { name: "Vista previa" }).click();
  await expect(page).toHaveURL(/\/tienda\/admin\/productos\/aa-producto-prueba\/vista-previa$/);
  await expect(page.getByText("Stock disponible", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Volver a editar producto" }).click();
  await expect(page).toHaveURL(/\/tienda\/admin\/productos\/aa-producto-prueba$/);
  await expect(page.getByRole("heading", { name: "Editar producto" })).toBeVisible();
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
  const promotionDialog = page.getByRole("dialog", { name: "Crear promoción" });
  await promotionDialog.getByRole("group", { name: "Elegir Productos" }).getByRole("checkbox").first().check();
  await promotionDialog.getByRole("spinbutton", { name: "Porcentaje *" }).fill("10");
  await promotionDialog.getByRole("button", { name: "Guardar promoción" }).click();
  await expect(promotionDialog).not.toBeVisible();
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
    (url) => url.pathname === "/images/product-0-0.jpg" || (url.pathname === "/_next/image" && url.searchParams.get("url") === "/images/product-0-0.jpg"),
    (route) => route.abort(),
  );
  await page.goto("/productos/biofresh-para-cachorros-razas-medianas");
  await expect(page.locator(".site-sheet-zoom img")).toHaveAttribute(
    "src",
    "/images/placeholder.svg",
  );
  await page.goto("/productos?search=producto-que-no-existe");
  await expect(page.getByText("No encontramos productos con esos filtros.")).toBeVisible();
  await page.getByRole("link", { name: "Ver todo el catálogo" }).click();
  await expect(page.locator(".site-product-card")).toHaveCount(12);
});
