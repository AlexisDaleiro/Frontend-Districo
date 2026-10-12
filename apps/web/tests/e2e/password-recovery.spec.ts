import { expect, test, type Page } from '@playwright/test';

test.skip(process.env.E2E_RECOVERY !== '1', 'Opt-in: entorno real con API interceptada, sin correos ni cambios de cuentas.');

async function fixture(page: Page, responseStatus = 200) {
  const calls: { path: string; body: Record<string, string> }[] = [];
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/backend/**', async (route) => {
    const request = route.request(), path = new URL(request.url()).pathname.replace('/api/backend/', '');
    if (path === 'auth/forgot-password' || path === 'auth/reset-password') {
      calls.push({ path, body: request.postDataJSON() });
      return route.fulfill({ status: responseStatus, json: responseStatus === 200 ?
        path === 'auth/forgot-password' ? { received: true } : { success: true } :
        { message: 'El enlace es inválido, ya fue usado o venció. Solicitá uno nuevo.' } });
    }
    if (path === 'auth/me' || path === 'auth/refresh') return route.fulfill({ status: 401, json: { message: 'Sin sesión' } });
    return route.fulfill({ json: [] });
  });
  return { calls, errors };
}

test('solicita recuperación sin confirmar si existe la cuenta', async ({ page }) => {
  const state = await fixture(page);
  await page.goto('/tienda/recuperar-acceso');
  await page.getByLabel('Correo electrónico', { exact: true }).fill('missing@example.test');
  await page.getByRole('button', { name: 'Enviar enlace', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Si el correo corresponde' })).toBeVisible();
  expect(state.calls).toEqual([{ path: 'auth/forgot-password', body: { email: 'missing@example.test' } }]);
  expect(state.errors).toEqual([]);
});

test('sin correos configurados muestra indisponibilidad, nunca confirma envío y permite volver al acceso', async ({ page }) => {
  const state = await fixture(page);
  await page.route('**/api/backend/auth/forgot-password', (route) => route.fulfill({ status: 503,
    json: { message: 'La recuperación por correo no está configurada. Contactá a DISTRICO.' } }));
  await page.goto('/tienda/recuperar-acceso');
  await page.getByLabel('Correo electrónico', { exact: true }).fill('missing@example.test');
  await page.getByRole('button', { name: 'Enviar enlace', exact: true }).click();
  await expect(page.getByText('La recuperación por correo no está configurada. Contactá a DISTRICO.', { exact: true })).toBeVisible();
  await expect(page.getByText(/Si el correo corresponde/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Enviar enlace', exact: true })).toBeEnabled();
  await page.getByRole('link', { name: 'Volver al acceso', exact: true }).click();
  await expect(page).toHaveURL(/\/tienda\/ingresar$/);
  expect(state.errors).toEqual([]);
});

for (const width of [1440, 390]) test(`restablece con token privado y valida confirmación a ${width}px`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 });
  const state = await fixture(page), token = 'r'.repeat(43), urls: string[] = [];
  page.on('request', (request) => urls.push(request.url()));
  await page.goto(`/tienda/recuperar-acceso#token=${token}`);
  await expect(page.getByLabel('Nueva contraseña', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath(`recuperacion-${width}.png`), fullPage: true });
  expect(new URL(page.url()).hash).toBe('');
  await page.getByLabel('Nueva contraseña', { exact: true }).fill('NewPassword123!');
  await page.getByLabel('Confirmar contraseña', { exact: true }).fill('Mismatch123!');
  await page.getByRole('button', { name: 'Guardar contraseña', exact: true }).click();
  await expect(page.getByText('Las contraseñas no coinciden.', { exact: true })).toBeVisible();
  expect(state.calls).toHaveLength(0);
  await page.getByLabel('Confirmar contraseña', { exact: true }).fill('NewPassword123!');
  await page.getByRole('button', { name: 'Guardar contraseña', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Tu contraseña fue actualizada' })).toBeVisible();
  expect(state.calls).toEqual([{ path: 'auth/reset-password', body: { resetToken: token, password: 'NewPassword123!' } }]);
  expect(urls.some((url) => url.includes(token))).toBe(false);
  expect(await page.evaluate((value) => JSON.stringify({ ...localStorage, ...sessionStorage }).includes(value), token)).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(state.errors).toEqual([]);
});

test('enlace vencido conserva el error y permite solicitar uno nuevo sin recargar', async ({ page }) => {
  const state = await fixture(page, 400);
  await page.goto(`/tienda/recuperar-acceso#token=${'s'.repeat(43)}`);
  await page.getByLabel('Nueva contraseña', { exact: true }).fill('NewPassword123!');
  await page.getByLabel('Confirmar contraseña', { exact: true }).fill('NewPassword123!');
  await page.getByRole('button', { name: 'Guardar contraseña', exact: true }).click();
  await expect(page.getByText(/El enlace es inválido, ya fue usado o venció/)).toBeVisible();
  await page.getByRole('button', { name: 'Solicitar otro enlace' }).click();
  await expect(page.getByLabel('Correo electrónico', { exact: true })).toBeVisible();
  expect(state.calls).toHaveLength(1);
});

test('rechaza fragmentos malformados sin llamar al backend', async ({ page }) => {
  const state = await fixture(page);
  await page.goto('/tienda/recuperar-acceso#token=bad');
  await expect(page.getByRole('alert').filter({ hasText: 'El enlace no es válido' })).toBeVisible();
  expect(new URL(page.url()).hash).toBe('');
  expect(state.calls).toHaveLength(0);
  await page.getByRole('button', { name: 'Solicitar otro enlace' }).click();
  await expect(page.getByLabel('Correo electrónico', { exact: true })).toBeVisible();
});
