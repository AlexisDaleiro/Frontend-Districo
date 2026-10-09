import { expect, test, type Page } from '@playwright/test';

async function login(page: Page, role = 'Administración') {
  await page.goto('/tienda/ingresar');
  await expect(async () => {
    await page.getByRole('button', { name: role, exact: true }).click();
    expect(await page.getByLabel('Correo electrónico').inputValue()).toBe(role === 'Administración' ? 'admin@districo.com' : 'cliente@gmail.com');
  }).toPass({ timeout: 15000 });
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).toHaveURL(/\/tienda$/, { timeout: 15000 });
}

test('cliente guarda favoritos, vuelve desde su cuenta y los quita', async ({ page }, info) => {
  test.setTimeout(90000);
  await login(page, 'Cliente mayorista');
  await page.goto('/tienda/productos');
  const card = page.locator('.product-card').first();
  const name = await card.locator('h3').innerText();
  const favorite = card.getByRole('button', { name: `Agregar a favoritos: ${name}`, exact: true });
  await favorite.click();
  await expect(card.getByRole('button', { name: `Quitar de favoritos: ${name}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/tienda/cuenta');
  await page.locator('.account-dashboard-actions').getByRole('link', { name: 'Mis favoritos' }).click();
  await expect(page.getByRole('heading', { name: 'Mis favoritos' })).toBeVisible();
  await expect(page.locator('.product-card')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.product-card h3')).toHaveText(name);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath('favorites-mobile.png'), fullPage: true });
  await page.getByRole('searchbox', { name: 'Buscar en favoritos' }).fill('no existe este favorito');
  await expect(page.getByRole('heading', { name: 'No hay favoritos que coincidan con la búsqueda' })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Buscar en favoritos' }).fill('');
  await page.getByRole('button', { name: `Quitar de favoritos: ${name}`, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Todavía no guardaste productos' })).toBeVisible();
});

test('reglas compactas: búsqueda, vigencia, paginación y filtros compartibles', async ({ page }, info) => {
  test.setTimeout(90000);
  await login(page);
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('districo-demo-v1')!);
    const rules = Array.from({ length: 25 }, (_, index) => ({ id: `qa-rule-${index}`, name: `Regla ${String(index).padStart(2, '0')}`, active: true, startsAt: '2020-01-01', endsAt: null as string | null, conditions: [], rewards: [] }));
    rules.push({ ...rules[0], id: 'expired', name: 'Oferta vencida', endsAt: '2020-02-01' });
    rules.push({ ...rules[0], id: 'inactive', name: 'Oferta desactivada', active: false });
    state.promotions = rules;
    state.rules = rules.map((rule) => ({ ...rule, triggerType: 'BRAND', triggerIds: [state.brands[0].id], targetType: 'BRAND', targetIds: [state.brands[0].id] }));
    localStorage.setItem('districo-demo-v1', JSON.stringify(state));
  });
  for (const section of ['promociones', 'recomendaciones']) {
    await page.goto(`/tienda/admin/${section}`);
    await expect(page.locator('.admin-marketing-table tbody tr')).toHaveCount(20);
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await expect(page.locator('.admin-marketing-table tbody tr')).toHaveCount(7);
    await page.getByRole('searchbox', { name: 'Buscar reglas' }).fill('Regla 24');
    await expect(page.locator('.admin-marketing-table tbody tr')).toHaveCount(1);
    await expect(page).not.toHaveURL(/page=2/);
    await page.reload();
    await expect(page.getByRole('searchbox', { name: 'Buscar reglas' })).toHaveValue('Regla 24');
    await expect(page.locator('.admin-marketing-table tbody tr')).toHaveCount(1);
    await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
    await page.getByRole('combobox', { name: 'Filtrar reglas por vigencia' }).selectOption('EXPIRED');
    await expect(page.locator('.admin-marketing-table tbody tr')).toHaveCount(1);
    await expect(page.locator('.admin-marketing-table tbody tr')).toContainText('Oferta vencida');
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: info.outputPath('rules-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath('rules-mobile.png'), fullPage: true });
});

test('ventas: fechas, desgloses, filtro de marca y exportación de todos los clientes', async ({ page }, info) => {
  test.setTimeout(90000);
  await login(page);
  const today = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('districo-demo-v1')!);
    const base = state.users.find((user: { email: string }) => user.email === 'cliente@gmail.com');
    const [first, second] = state.products.slice(0, 2);
    first.brand = { id: 'qa-brand-a', name: 'QA Marca A' }; second.brand = { id: 'qa-brand-b', name: 'QA Marca B' };
    state.brands.push(first.brand, second.brand);
    state.orders = [];
    for (let index = 0; index < 25; index++) {
      const account = { ...base.customerAccount, id: `qa-account-${index}`, businessName: `QA Comercio ${String(index).padStart(2, '0')}` };
      const userId = `qa-client-${index}`;
      state.users.push({ ...base, id: userId, email: `qa-client-${index}@example.test`, customerAccount: account });
      state.orders.push({ id: `qa-order-${index}`, orderNumber: `QA-${index}`, userId, customerAccount: account, status: 'APPROVED', createdAt: new Date().toISOString(), currency: 'UYU', total: 400, items: [
        { variantId: first.variants[0].id, productName: first.name, quantity: 2, subtotal: 100 }, { variantId: second.variants[0].id, productName: second.name, quantity: 3, subtotal: 300 },
      ] });
    }
    localStorage.setItem('districo-demo-v1', JSON.stringify(state));
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Montevideo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  });
  await page.goto('/tienda/admin');
  const sales = page.locator('.admin-sales');
  await sales.getByRole('button', { name: 'Personalizado', exact: true }).click();
  await sales.getByLabel('Desde', { exact: true }).fill(today);
  await sales.getByLabel('Hasta', { exact: true }).fill(today);
  await sales.getByRole('button', { name: 'Aplicar fechas', exact: true }).click();
  await sales.getByRole('group', { name: 'Agrupar ventas por' }).getByRole('button', { name: 'Cliente', exact: true }).click();
  await expect(sales.locator('.admin-sales-table tbody tr')).toHaveCount(20);
  await expect(sales.getByText('25 registros · Página 1 de 2', { exact: true })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await sales.getByRole('button', { name: 'Exportar CSV' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const csv = Buffer.concat(chunks).toString('utf8');
  expect(csv).toContain('QA Comercio 24'); expect(csv).toContain('QA Comercio 00'); expect(csv).toContain('10000');
  await sales.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(sales.locator('.admin-sales-table tbody tr')).toHaveCount(5);
  await sales.getByRole('group', { name: 'Agrupar ventas por' }).getByRole('button', { name: 'Marca', exact: true }).click();
  await expect(sales.locator('.admin-sales-table tbody tr')).toHaveCount(2);
  await sales.getByRole('combobox', { name: 'Filtrar ventas por marca' }).selectOption('qa-brand-a');
  await expect(sales.locator('.admin-sales-table tbody tr')).toHaveCount(1);
  await expect(sales.locator('.admin-sales-table tbody tr')).toContainText('QA Marca A');
  await expect(sales.locator('.admin-sales-table tbody tr')).toContainText('2.500');
  await expect(sales.locator('.admin-sales-metrics')).not.toContainText('Cobrado');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: info.outputPath('sales-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath('sales-mobile.png'), fullPage: true });
});
