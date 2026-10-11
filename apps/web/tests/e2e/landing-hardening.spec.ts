import { expect, test } from "@playwright/test";

for (const width of [320, 390]) {
  test(`portada mayorista compacta y accesible a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Distribución mayorista/);
    expect(await page.locator('.home-hero').evaluate(el => el.getBoundingClientRect().height)).toBe(680);
    expect(await page.locator('#destacadas').evaluate(el => el.getBoundingClientRect().height)).toBeLessThan(1200);
    const links = page.locator('.home-join-actions p a, #destacadas .home-text-link, .site-footer .footer-grid a, .site-footer .footer-bottom > .text-link');
    expect(await links.evaluateAll(items => items.every(el => el.getBoundingClientRect().height >= 44))).toBe(true);
    await expect(page.locator('.home-tabs-hint')).toBeVisible();
    const last = page.locator('.home-tabs button').last();
    await last.click();
    await expect(last).toHaveAttribute('aria-pressed', 'true');
    expect(await page.locator('.home-tabs').evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
    await expect(page.locator('.home-jobs + .home-join')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('los banners administrados conservan el H1 y limitan subtítulos largos', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tienda/ingresar');
  await expect(async () => {
    await page.getByRole('button', {name:'Cliente mayorista', exact:true}).click();
    expect(await page.getByLabel('Correo electrónico').inputValue()).toBe('cliente@gmail.com');
  }).toPass();
  await page.getByRole('button', {name:'Ingresar', exact:true}).click();
  await expect(page).toHaveURL(/\/tienda$/);
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('districo-demo-v1')!);
    state.session = null;
    state.banners = [{ id:'qa-long-banner', placement:'INSTITUTIONAL', active:true, position:0,
      title:'Marcas para tu comercio', subtitle:'Presentaciones y marcas disponibles para comercios de todo el país. '.repeat(12),
      imageUrl:'/images/brand-panels/biofresh.jpg', mobileImageUrl:null, alt:'Perro descansando', href:'/marcas', actionLabel:'Ver marcas' }];
    localStorage.setItem('districo-demo-v1', JSON.stringify(state));
  });
  await page.goto('/');
  await expect(page.locator('.home-slide--managed h2')).toHaveText('Marcas para tu comercio');
  await expect(page.getByRole('heading', {level:1})).toHaveText(/Distribución mayorista/);
  const lead = page.locator('.home-slide--managed .home-slide-copy p');
  await expect(lead).toHaveCSS('-webkit-line-clamp', '3');
  expect(await lead.evaluate(el => el.getBoundingClientRect().height <= parseFloat(getComputedStyle(el).lineHeight) * 3 + 1)).toBe(true);
});
