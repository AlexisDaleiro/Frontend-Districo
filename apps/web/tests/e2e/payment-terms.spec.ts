import { expect, test, type Page } from '@playwright/test';

async function login(page: Page, role = 'Cliente mayorista') {
  await page.goto('/tienda/ingresar');
  await expect(async () => {
    await page.getByRole('button', { name: role, exact: true }).click();
    expect(await page.getByLabel('Correo electrónico').inputValue()).toBe(role === 'Administración' ? 'admin@districo.com' : 'cliente@gmail.com');
  }).toPass({ timeout: 15000 });
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).toHaveURL(/\/tienda$/, { timeout: 15000 });
}
async function prepareCheckout(page: Page) {
  await page.goto('/tienda/producto/biofresh-para-cachorros-razas-medianas');
  await page.getByRole('button', { name: 'Guardar en carrito' }).click();
  await expect(page.getByRole('link', { name: 'Ver mi carrito', exact: true })).toBeVisible();
  await page.goto('/tienda/checkout');
  await expect(page.getByRole('button', { name: 'Enviar pedido a DISTRICO' })).toBeEnabled();
}

for (const months of [1, 3, 6]) test(`cliente confirma ${months} cuotas y el admin conserva sus condiciones`, async ({ page }, info) => {
  test.setTimeout(90000);
  await login(page);
  await prepareCheckout(page);
  await page.getByRole('radio', { name: 'En cuotas', exact: true }).check();
  await page.getByRole('combobox', { name: 'Cuotas y plazo' }).selectOption(String(months));
  await expect(page.locator('.payment-preview li')).toHaveCount(months);
  if (months === 6) {
    await page.screenshot({ path: info.outputPath('checkout-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const preview = page.locator('.checkout-payment');
    await preview.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath('checkout-mobile.png'), fullPage: true });
  }
  await page.getByRole('button', { name: 'Enviar pedido a DISTRICO' }).click();
  await expect(page.getByRole('heading', { name: 'Pedido recibido' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Condiciones de pago' }).locator('tbody tr')).toHaveCount(months);
  const orderId = new URL(page.url()).pathname.split('/').at(-1)!;
  await page.goto('/tienda/cuenta');
  await expect(page.getByText('Situación comercial: Pago pendiente', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await login(page, 'Administración');
  await page.goto(`/tienda/admin/pedidos/${orderId}`);
  await expect(page.getByRole('region', { name: 'Condiciones de pago' }).locator('tbody tr')).toHaveCount(months);
  await expect(page.getByRole('region', { name: 'Condiciones de pago' })).toContainText(months === 1 ? '1 cuota mensual' : `${months} cuotas mensuales`);
});

test('contado queda pendiente hasta la entrega y habilita otro pedido sin revisión', async ({ page }) => {
  test.setTimeout(90000);
  await login(page);
  await prepareCheckout(page);
  await expect(page.getByRole('radio', { name: 'Al contado', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Enviar pedido a DISTRICO' }).click();
  await expect(page.getByRole('heading', { name: 'Pedido recibido' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Condiciones de pago' })).toContainText('Al entregar el pedido');
  await prepareCheckout(page);
  await expect(page.getByLabel('Acepto que este pedido')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Enviar pedido a DISTRICO' })).toBeEnabled();
});
