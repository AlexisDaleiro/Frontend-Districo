import { expect, test } from '@playwright/test';

test.skip(process.env.E2E_REAL_PAYMENT_TERMS !== '1', 'Opt-in check against Supabase.');
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

test('real checkout offers payment terms and rejects invalid plans without creating orders', async ({ page }, info) => {
  test.setTimeout(120000);
  const password = process.env.DEMO_SEED_PASSWORD;
  if (!password) throw new Error('Configure demo credentials before the live check.');
  const headers = { Origin: info.project.use.baseURL! };
  const login = await page.request.post('/api/backend/auth/login', { headers, data: { email: 'cliente@districo.test', password } });
  expect(login.ok()).toBe(true);
  const ordersBefore = await page.request.get('/api/backend/orders/me');
  expect(ordersBefore.ok()).toBe(true);
  const savedOrderIds = (await ordersBefore.json() as { id: string }[]).map((order) => order.id);
  const initialCart = await page.request.get('/api/backend/cart');
  expect(initialCart.ok()).toBe(true);
  let addedVariantId: string | undefined;
  try {
    if (!(await initialCart.json() as { items: unknown[] }).items.length) {
      const products = await page.request.get('/api/backend/products?limit=20');
      expect(products.ok()).toBe(true);
      const payload = await products.json() as { items: { variants: { id: string; availableStock: number; minimumOrderQuantity: number; saleMultiple: number; price?: { amount: string | number } | null }[] }[] };
      const variant = payload.items.flatMap((product) => product.variants).find((variant) => !!variant.price && Number(variant.price.amount) > 0 && variant.availableStock >= Math.ceil(variant.minimumOrderQuantity / variant.saleMultiple) * variant.saleMultiple);
      expect(variant).toBeTruthy();
      addedVariantId = variant!.id;
      const added = await page.request.post('/api/backend/cart/items', { headers, data: { variantId: variant!.id, quantity: Math.ceil(variant!.minimumOrderQuantity / variant!.saleMultiple) * variant!.saleMultiple } });
      expect(added.ok()).toBe(true);
    }
    await page.goto('/tienda/checkout');
    await expect(page.getByRole('radio', { name: 'Al contado', exact: true })).toBeChecked();
    await page.getByRole('radio', { name: 'En cuotas', exact: true }).check();
    await page.getByRole('combobox', { name: 'Cuotas y plazo' }).selectOption('6');
    await expect(page.locator('.payment-preview li')).toHaveCount(6);
    const invalid = await page.request.post('/api/backend/checkout', { headers, data: { paymentMethod: 'INSTALLMENTS', paymentTermMonths: 2 } });
    expect(invalid.status()).toBe(400);
    const invalidCash = await page.request.post('/api/backend/checkout', { headers, data: { paymentMethod: 'CASH', paymentTermMonths: 3 } });
    expect(invalidCash.status()).toBe(400);
    const after = await page.request.get('/api/backend/orders/me');
    expect(after.ok()).toBe(true);
    expect((await after.json() as { id: string }[]).map((order) => order.id)).toEqual(savedOrderIds);
  } finally {
    if (addedVariantId) {
      const cart = await page.request.get('/api/backend/cart');
      expect(cart.ok()).toBe(true);
      const temporary = (await cart.json() as { items: { id: string; variant: { id: string } }[] }).items.find((item) => item.variant.id === addedVariantId);
      if (temporary) {
        const removed = await page.request.delete(`/api/backend/cart/items/${temporary.id}`, { headers });
        expect(removed.ok()).toBe(true);
      }
    }
  }
});
