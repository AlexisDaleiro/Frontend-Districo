import { expect, test, type Page } from '@playwright/test';
import { staffFeatures, canSeeAdminSection } from '../../src/lib/staff-access';
import type { User } from '../../src/lib/types';

test.skip(process.env.E2E_ROLE_AUDIT !== '1', 'Opt-in isolated demo audit; no shared records are changed.');

async function login(page: Page, name = 'Administración') {
  await page.goto('/tienda/ingresar');
  await page.getByRole('button', { name, exact: true }).click();
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).toHaveURL(/\/tienda$/);
}

const scopes = [
  { name: 'ventas', role: 'SALES', section: 'clientes', features: undefined },
  { name: 'catalogo', role: 'CATALOG', section: 'catalogo', features: undefined },
  { name: 'finanzas', role: 'FINANCE', section: 'finanzas', features: undefined },
  { name: 'deposito', role: 'CUSTOM', section: 'logistica', features: ['logistica'] },
  { name: 'atencion', role: 'CUSTOM', section: 'consultas', features: ['consultas'] },
  { name: 'rrhh', role: 'CUSTOM', section: 'ofertas-laborales', features: ['ofertas-laborales'] },
  { name: 'lector', role: 'CUSTOM', section: 'catalogo', features: ['catalogo'] },
] as const;

for (const scope of scopes) test(`role boundaries: ${scope.name}`, async ({ page }, info) => {
  test.setTimeout(90000);
  await login(page);
  await page.evaluate(({ role, features }) => {
    const state = JSON.parse(localStorage.getItem('districo-demo-v1')!);
    state.users.push({ id: 'qa-role-audit', email: 'qa-role@example.test', role, active: true, emailVerified: true,
      permissions: [], ...(features ? { customRoleId: 'qa-audit-scope' } : {}) });
    if (features) state.customRoles.push({ id: 'qa-audit-scope', name: 'Auditoria aislada', access:
      Object.fromEntries(features.map((feature: string) => [feature, { canView: true, canEdit: false }])) });
    state.session = 'qa-role-audit';
    localStorage.setItem('districo-demo-v1', JSON.stringify(state));
  }, { role: scope.role, features: scope.features });
  await page.goto(`/tienda/admin/${scope.section}`);
  const nav = page.getByRole('navigation', { name: 'Administración', exact: true });
  await expect(nav).toBeVisible();
  const links = await nav.locator('a').evaluateAll((nodes) => nodes.map((node) => (node as HTMLAnchorElement).pathname));
  const user = { id: 'qa-role-audit', email: 'qa-role@example.test', role: scope.role, active: true, permissions: [],
    ...(scope.features ? { staffAccess: Object.fromEntries(scope.features.map((feature) => [feature, { canView: true, canEdit: false }])) } : {}) } as User;
  for (const link of links) expect(canSeeAdminSection(user, link.split('/admin')[1].replace(/^\//, ''))).toBe(true);
  await expect(nav.getByRole('link', { name: 'Roles', exact: true })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Personal', exact: true })).toHaveCount(0);
  if (scope.role === 'SALES') {
    await expect(nav.getByRole('link', { name: 'Clientes asignados', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Pedidos asignados', exact: true })).toBeVisible();
    await expect(page.locator('.admin-main tbody tr')).toHaveCount(0);
  }
  const errors = await page.locator('.error-box').allTextContents();
  await info.attach('scope-results', { body: JSON.stringify({ scope: scope.name, permittedNavigation: links, errors }), contentType: 'application/json' });
  await page.goto('/tienda/admin/personal');
  await expect(page.getByRole('heading', { name: 'No tenés acceso a esta sección' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Invitar persona' })).toHaveCount(0);
});

test('customer purchase, current paginated history and repeat-order flow', async ({ page }) => {
  test.setTimeout(90000);
  await login(page, 'Cliente mayorista');
  await page.goto('/tienda/producto/biofresh-para-cachorros-razas-medianas');
  await page.getByRole('button', { name: 'Guardar en carrito' }).click();
  await expect(page.getByRole('link', { name: 'Ver mi carrito', exact: true })).toBeVisible();
  await page.goto('/tienda/carrito');
  await page.getByRole('button', { name: 'Continuar al checkout' }).click();
  await page.getByRole('button', { name: 'Enviar pedido a DISTRICO' }).click();
  await expect(page.getByRole('heading', { name: 'Pedido recibido' })).toBeVisible();
  await page.goto('/tienda/cuenta/pedidos');
  const history = page.getByRole('region', { name: 'Historial de pedidos' });
  await expect(history.locator('tbody tr')).toHaveCount(1);
  await history.locator('tbody tr a').first().click();
  await page.getByRole('button', { name: 'Repetir pedido' }).click();
  await expect(page).toHaveURL(/\/tienda\/carrito$/);
  await expect(page.locator('.cart-item input[type="number"]')).toHaveValue('1');
  await page.goto('/tienda/cuenta/pedidos');
  await page.getByRole('button', { name: 'Repetir pedido' }).click();
  await expect(page).toHaveURL(/\/tienda\/carrito$/);
  await expect(page.locator('.cart-item input[type="number"]')).toHaveValue('2');
});

test('diagnostic: history search follows browser back', async ({ page }, info) => {
  test.setTimeout(90000);
  await login(page, 'Cliente mayorista');
  await page.goto('/tienda/cuenta/pedidos');
  const input = page.getByRole('searchbox', { name: 'Número de pedido' });
  await input.fill('AUDIT-SEARCH');
  await page.getByRole('button', { name: 'Buscar pedidos', exact: true }).click();
  await expect(page).toHaveURL(/search=AUDIT-SEARCH/);
  await page.goBack();
  await expect(page).toHaveURL(/\/tienda\/cuenta\/pedidos$/);
  const searchAfterBack = await input.inputValue();
  await info.attach('diagnostics', { body: JSON.stringify({ expectedSearchAfterBack: '', searchAfterBack }), contentType: 'application/json' });
});

test('diagnostic: Roles exposes read-only toggles', async ({ page }, info) => {
  await login(page);
  await page.goto('/tienda/admin/roles');
  await page.getByRole('combobox', { name: 'Rol a configurar' }).selectOption('FINANCE');
  const editableReadonlyFeatures = [];
  for (const title of ['Métricas', 'Prioridades de cartera']) if (await page.getByRole('checkbox', { name: `Editar ${title}`, exact: true }).isEnabled()) editableReadonlyFeatures.push(title);
  await info.attach('diagnostics', { body: JSON.stringify({ editableReadonlyFeatures,
    featuresChecked: staffFeatures.length }), contentType: 'application/json' });
});

test('diagnostic: seller-only manager cannot select a customer to assign', async ({ page }, info) => {
  await login(page);
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('districo-demo-v1')!);
    state.users.push(
      { id: 'qa-seller-manager', email: 'manager@example.test', role: 'CUSTOM', customRoleId: 'qa-seller-only', active: true, emailVerified: true, permissions: [] },
      { id: 'qa-seller', email: 'seller@example.test', role: 'SALES', active: true, emailVerified: true, permissions: [] },
    );
    state.customRoles.push({ id: 'qa-seller-only', name: 'Gestion de vendedores', key: 'gestion-vendedores', access: { vendedores: { canView: true, canEdit: true } } });
    state.salespeople['qa-seller'] = { id: 'qa-seller-profile', name: 'Vendedor de prueba', phone: '099123456' };
    state.session = 'qa-seller-manager';
    localStorage.setItem('districo-demo-v1', JSON.stringify(state));
  });
  await page.goto('/tienda/admin/vendedores/qa-seller');
  await page.getByRole('button', { name: 'Asignar cliente', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Asignar cliente' });
  await expect(modal.getByRole('alert')).toBeVisible();
  await info.attach('diagnostics', { body: JSON.stringify({ assignmentOffered: true, error: await modal.getByRole('alert').textContent() }), contentType: 'application/json' });
});
