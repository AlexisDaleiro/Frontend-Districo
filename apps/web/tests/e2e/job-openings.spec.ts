import { expect, test, type Page } from "@playwright/test";

async function admin(page: Page) {
  await page.goto("/tienda/ingresar");
  await expect(async () => {
    await page.getByRole("button", { name: "Administración", exact: true }).click();
    expect(await page.getByLabel("Correo electrónico").inputValue()).toBe("admin@districo.com");
  }).toPass({ timeout: 10000 });
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/tienda$/);
  await page.goto("/tienda/admin/ofertas-laborales");
  await expect(page.getByRole("heading", { name: "Ofertas laborales", exact: true })).toBeVisible();
}

test("gestionar ofertas se refleja en la landing, incluido Ctrl+S, filtros y eliminación", async ({ page }, info) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await admin(page);
  await expect(page.locator(".admin-main tbody tr")).toHaveCount(2);
  await page.getByRole("button", { name: "Nueva oferta", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "Nueva oferta laboral" });
  await modal.getByLabel("Puesto", { exact: true }).fill("Asistente comercial de prueba");
  await modal.getByRole("combobox", { name: "Área", exact: true }).selectOption("Ventas");
  await modal.getByRole("combobox", { name: "Sede", exact: true }).selectOption("Montevideo");
  await modal.getByLabel("Fecha de publicación").fill("2020-01-01");
  await modal.getByLabel("Descripción", { exact: true }).fill("Atención a comercios y coordinación de pedidos de prueba.");
  await modal.getByLabel("Requisitos", { exact: true }).fill("Experiencia comercial\nBuen trato con clientes");
  await modal.getByLabel("Beneficios", { exact: true }).fill("Capacitación del equipo");
  await modal.getByLabel("Correo de postulaciones").fill("seleccion@example.test");
  await modal.getByLabel("Activa", { exact: true }).check();
  await page.keyboard.press("Control+s");
  await expect(modal).not.toBeVisible();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(page.locator(".admin-main tbody tr")).toHaveCount(3);
  await page.getByLabel("Buscar ofertas").fill("Asistente");
  await expect(page.getByLabel("Buscar ofertas")).toHaveValue("Asistente");
  await expect(page.locator(".admin-main tbody tr")).toHaveCount(1);
  await expect(page).toHaveURL(/search=Asistente/);
  await page.reload();
  await expect(page.getByLabel("Buscar ofertas")).toHaveValue("Asistente");
  await expect(page.locator(".admin-main tbody tr")).toHaveCount(1);
  await page.goto("/trabajo");
  await expect(page.locator(".jobs-item")).toHaveCount(3);
  const opening = page.locator(".jobs-item").filter({ hasText: "Asistente comercial de prueba" });
  await opening.getByRole("button", { name: "Ver puesto" }).click();
  await expect(opening).toContainText("Buen trato con clientes");
  await expect(opening).toContainText("Capacitación del equipo");
  await expect(opening.getByRole("link", { name: "Postularme" })).toHaveAttribute("href", /^mailto:seleccion@example\.test\?subject=/);
  await page.locator(".jobs-body").scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("empleos-desktop.png"), fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await opening.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("empleos-mobile.png"), fullPage: false });
  await page.goto("/tienda/admin/ofertas-laborales");
  await page.getByRole("button", { name: "Editar Asistente comercial de prueba" }).click();
  const edit = page.getByRole("dialog", { name: "Editar oferta laboral" });
  await expect(edit.getByLabel("Correo de postulaciones")).toHaveValue("seleccion@example.test");
  await edit.getByLabel("Activa", { exact: true }).uncheck();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("editor-mobile.png"), fullPage: false });
  await edit.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(edit).not.toBeVisible();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await page.getByRole("combobox", { name: "Estado", exact: true }).selectOption("inactive");
  await expect(page.locator(".admin-main tbody tr")).toHaveCount(1);
  await page.goto("/trabajo");
  await expect(page.locator(".jobs-item")).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "Asistente comercial de prueba" })).toHaveCount(0);
  await page.goto("/tienda/admin/ofertas-laborales");
  await page.getByRole("button", { name: "Eliminar Asistente comercial de prueba" }).click();
  const deletion = page.getByRole("dialog", { name: "Eliminar oferta laboral" });
  await deletion.getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect(deletion).not.toBeVisible();
  await expect(page.locator(".admin-main tbody tr")).toHaveCount(2);
  expect(errors).toEqual([]);
});

test("ejemplos sin postulaciones, búsqueda pública y estado vacío al retirar todas", async ({ page }) => {
  await page.goto("/trabajo");
  await expect(page.locator(".jobs-item")).toHaveCount(2);
  await expect(page.getByText(/no son búsquedas reales/)).toBeVisible();
  await page.getByRole("combobox", { name: "Sede", exact: true }).selectOption("Maldonado");
  await expect(page.locator(".jobs-item")).toHaveCount(1);
  await page.getByRole("button", { name: "Ver puesto" }).click();
  await expect(page.locator(".jobs-item").getByRole("link", { name: "Postularme" })).toHaveCount(0);
  await page.getByLabel("Puesto o palabra clave").fill("No existe");
  await expect(page.getByText(/No hay puestos con esos filtros/)).toBeVisible();
  await admin(page);
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    state.jobs = [];
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  });
  await page.goto("/trabajo");
  await expect(page.getByRole("heading", { name: "No hay búsquedas abiertas en este momento." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Enviar mi CV" })).toBeVisible();
});

test("ofertas laborales aparece en Roles y sólo puede editarse con permiso", async ({ page }) => {
  await admin(page);
  await page.goto("/tienda/admin/roles");
  await expect(page.locator(".staff-role-access tbody tr").filter({ hasText: "Ofertas laborales" })).toBeVisible();
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    state.users.push({ id: "jobs-reader", email: "jobs@example.test", role: "CUSTOM", customRoleId: "jobs-reader-role", active: true, permissions: [] });
    state.customRoles = [{ id: "jobs-reader-role", name: "Empleos lectura", access: { "ofertas-laborales": { canView: true, canEdit: false } } }];
    state.session = "jobs-reader";
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  });
  await page.goto("/tienda/admin/ofertas-laborales");
  await expect(page.locator(".admin-main tbody tr")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Nueva oferta" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Editar / })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Eliminar / })).toHaveCount(0);
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    state.customRoles[0].access["ofertas-laborales"].canView = false;
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  });
  await page.reload();
  await expect(page.getByRole("button", { name: "Nueva oferta" })).toHaveCount(0);
  await expect(page.locator(".admin-main tbody tr")).toHaveCount(0);
});
