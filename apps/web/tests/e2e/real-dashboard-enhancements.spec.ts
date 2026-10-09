import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { salesDate } from '../../src/lib/sales-report';

const real = process.env.E2E_REAL_DASHBOARD === '1';
test.skip(!real, 'Opt-in check against the configured Supabase demo database.');
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

async function login(page: Page, info: TestInfo, email: string) {
  const password = process.env.DEMO_SEED_PASSWORD;
  if (!password) throw new Error('Configure demo credentials before the opt-in live check.');
  const response = await page.request.post('/api/backend/auth/login', {
    headers: { Origin: info.project.use.baseURL! }, data: { email, password },
  });
  expect(response.ok()).toBe(true);
}

test('real favorites persist in Supabase and restore the original customer state', async ({ page }, info) => {
  test.setTimeout(120000);
  await login(page, info, 'cliente@districo.test');
  const idsResponse = await page.request.get('/api/backend/account/me/favorites/ids');
  expect(idsResponse.ok()).toBe(true);
  const saved = await idsResponse.json() as string[];
  const productsResponse = await page.request.get('/api/backend/products?limit=1');
  expect(productsResponse.ok()).toBe(true);
  const { items: [product] } = await productsResponse.json() as { items: { id: string; name: string; slug: string }[] };
  expect(product).toBeTruthy();
  const originallyFavorite = saved.includes(product.id);
  const path = `/api/backend/account/me/favorites/${encodeURIComponent(product.id)}`;
  const headers = { Origin: info.project.use.baseURL! };
  try {
    await page.goto(`/tienda/producto/${product.slug}`);
    const action = originallyFavorite ? 'Quitar de' : 'Agregar a';
    await page.getByRole('button', { name: `${action} favoritos: ${product.name}`, exact: true }).click();
    await expect(page.getByRole('button', { name: `${originallyFavorite ? 'Agregar a' : 'Quitar de'} favoritos: ${product.name}`, exact: true })).toHaveAttribute('aria-pressed', String(!originallyFavorite));
    await page.reload();
    await expect(page.getByRole('button', { name: `${originallyFavorite ? 'Agregar a' : 'Quitar de'} favoritos: ${product.name}`, exact: true })).toHaveAttribute('aria-pressed', String(!originallyFavorite));
    const response = await page.request.get('/api/backend/account/me/favorites/ids');
    expect((await response.json() as string[]).includes(product.id)).toBe(!originallyFavorite);
    if (!originallyFavorite) {
      await page.goto('/tienda/cuenta/favoritos');
      await page.getByRole('searchbox', { name: 'Buscar en favoritos' }).fill(product.name);
      await expect(page.locator('.product-card h3').filter({ hasText: product.name })).toBeVisible();
    }
    const denied = await page.request.get('/api/backend/admin/sales');
    expect(denied.status()).toBe(403);
    await page.goto('/tienda/admin');
    await expect(page.locator('.admin-sales')).toHaveCount(0);
  } finally {
    const restored = originallyFavorite ? await page.request.post(path, { headers, data: {} }) : await page.request.delete(path, { headers });
    expect(restored.ok()).toBe(true);
    const response = await page.request.get('/api/backend/account/me/favorites/ids');
    expect((await response.json() as string[]).sort()).toEqual([...saved].sort());
  }
});

test('real marketing lists and custom sales reports use paginated APIs and CSV', async ({ page }, info) => {
  test.setTimeout(120000);
  await login(page, info, 'admin@districo.test');
  for (const section of ['promotions', 'recommendations']) {
    const response = await page.request.get(`/api/backend/admin/${section}/page?limit=1&search=`);
    expect(response.ok()).toBe(true);
    const result = await response.json() as { items: unknown[]; meta: { limit: number; total: number } };
    expect(result.items.length).toBeLessThanOrEqual(1);
    expect(result.meta.limit).toBe(1);
  }
  await page.goto('/tienda/admin/promociones');
  await expect(page.getByRole('searchbox', { name: 'Buscar reglas' })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Buscar reglas' }).fill('no existe esta regla qa');
  await expect(page.getByRole('heading', { name: 'No hay reglas que coincidan con los filtros', exact: true })).toBeVisible();
  await page.goto('/tienda/admin');
  const sales = page.locator('.admin-sales');
  await expect(sales.getByRole('heading', { name: 'Ventas', exact: true })).toBeVisible();
  await sales.getByRole('button', { name: 'Personalizado', exact: true }).click();
  await sales.getByLabel('Desde', { exact: true }).fill(salesDate());
  await sales.getByLabel('Hasta', { exact: true }).fill(salesDate());
  await sales.getByRole('button', { name: 'Aplicar fechas', exact: true }).click();
  await sales.getByRole('group', { name: 'Agrupar ventas por' }).getByRole('button', { name: 'Marca', exact: true }).click();
  await expect(sales.locator('.admin-sales-footnote')).toContainText(`${salesDate()} al ${salesDate()}`);
  const response = await page.request.get(`/api/backend/admin/sales/export?period=custom&dateFrom=${salesDate()}&dateTo=${salesDate()}&groupBy=brand`);
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('text/csv');
  expect(response.headers()['cache-control']).toContain('no-store');
  expect(await response.text()).toContain('"Resumen"');
  const downloading = page.waitForEvent('download');
  await sales.getByRole('button', { name: 'Exportar CSV' }).click();
  const download = await downloading;
  expect(await download.failure()).toBeNull();
});
