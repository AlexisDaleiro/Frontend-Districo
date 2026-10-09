import { beforeEach, describe, expect, it, vi } from 'vitest';
import { demoRequest as api, resetDemo } from '../src/lib/demo';
import { demoSalesReport } from '../src/lib/demo-sales';
import { rulePage, ruleStatus } from '../src/lib/marketing-list';
import { salesMidnight, salesReportCsv } from '../src/lib/sales-report';
import type { Order, Product, ProductList, Rule, User } from '../src/lib/types';

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
  resetDemo();
});
const login = (email = 'cliente@gmail.com') => api('auth/login', 'POST', { email, password: 'Demo1234!' });

describe('Reglas compactas', () => {
  it('distingue vigente, programada, vencida y desactivada, incluso sin fechas', () => {
    const now = Date.parse('2026-10-08T12:00Z');
    expect(ruleStatus({ active: true }, now)).toBe('ACTIVE');
    expect(ruleStatus({ active: true, startsAt: '2026-10-09' }, now)).toBe('SCHEDULED');
    expect(ruleStatus({ active: false, endsAt: '2026-10-07' }, now)).toBe('EXPIRED');
    expect(ruleStatus({ active: false, endsAt: '2026-10-09' }, now)).toBe('INACTIVE');
    expect(ruleStatus({ active: true, endsAt: '2026-10-08T12:00Z' }, now)).toBe('ACTIVE');
  });
  it('busca por nombre y pagina con un total real y orden estable', () => {
    const rules = Array.from({ length: 25 }, (_, index) => ({ id: `r${index}`, name: `Regla ${String(index).padStart(2, '0')}`, active: true }));
    const found = rulePage(rules, new URLSearchParams('search=REGLA&page=2&limit=20&status=ACTIVE'));
    expect(found.meta).toEqual({ total: 25, page: 2, limit: 20 });
    expect(found.items).toHaveLength(5);
    expect(found.items[0].name).toBe('Regla 20');
  });
  it('los endpoints demo de ambos listados conservan filtros y permisos', async () => {
    await login('admin@districo.com');
    // Seed through the persisted demo state so this test is independent of catalog IDs.
    const state = JSON.parse(localStorage.getItem('districo-demo-v1')!);
    state.rules = Array.from({ length: 22 }, (_, i) => ({ id: `r${i}`, name: `Campaña ${i}`, active: true, triggerType: 'BRAND', triggerIds: [state.brands[0].id], targetType: 'BRAND', targetIds: [state.brands[0].id] }));
    state.promotions = state.rules.map((rule: Rule) => ({ ...rule, startsAt: '2020-01-01', endsAt: '2020-02-01', conditions: [], rewards: [] }));
    localStorage.setItem('districo-demo-v1', JSON.stringify(state));
    const recommendations = await api<{ items: Rule[]; meta: { total: number } }>('admin/recommendations/page?page=2&limit=20&search=CAMPAÑA&status=ACTIVE');
    expect(recommendations.meta.total).toBe(22); expect(recommendations.items).toHaveLength(2);
    const promotions = await api<{ items: Rule[]; meta: { total: number } }>('admin/promotions/page?limit=5&status=EXPIRED');
    expect(promotions.meta.total).toBe(22); expect(promotions.items).toHaveLength(5);
    await login();
    await expect(api('admin/recommendations/page')).rejects.toMatchObject({ status: 403 });
  });
});

describe('Favoritos propios de cada cliente', () => {
  it('persiste, no duplica, se busca y no se comparte con otros usuarios', async () => {
    await login();
    const products = await api<ProductList>('products?limit=2');
    const product = products.items[0];
    await api(`account/me/favorites/${product.id}`, 'POST');
    await api(`account/me/favorites/${product.id}`, 'POST');
    expect(await api('account/me/favorites/ids')).toEqual([product.id]);
    const favorites = await api<ProductList>(`account/me/favorites?search=${encodeURIComponent(product.variants[0].sku)}`);
    expect(favorites.meta.total).toBe(1); expect(favorites.items[0].id).toBe(product.id);
    await login('clientemed@gmail.com');
    expect(await api('account/me/favorites/ids')).toEqual([]);
    await api(`account/me/favorites/${product.id}`, 'DELETE');
    await login();
    expect(await api('account/me/favorites/ids')).toEqual([product.id]);
    await api(`account/me/favorites/${product.id}`, 'DELETE');
    expect((await api<ProductList>('account/me/favorites')).meta.total).toBe(0);
  });
  it('no filtra precios restringidos y no guarda productos inactivos', async () => {
    await login();
    const products = await api<ProductList>('products?limit=100');
    const medication = products.items.find((item) => item.requiresMedicationPermission)!;
    await api(`account/me/favorites/${medication.id}`, 'POST');
    expect((await api<ProductList>('account/me/favorites')).items[0].variants[0].price).toBeUndefined();
    await login('admin@districo.com');
    await expect(api('account/me/favorites/ids')).rejects.toMatchObject({ status: 403 });
    await api(`products/${medication.id}`, 'PATCH', { active: false });
    await login();
    expect(await api('account/me/favorites/ids')).toEqual([]);
    await expect(api(`account/me/favorites/${medication.id}`, 'POST')).rejects.toMatchObject({ status: 404 });
  });
});

describe('Informes de ventas', () => {
  const customers = [
    { id: 'u1', email: 'uno@example.test', role: 'CLIENT', permissions: [], customerAccount: { id: 'c1', businessName: '=Cliente Uno', salesperson: { id: 's1', name: 'Ana', userId: 'seller1' } } },
    { id: 'u2', email: 'dos@example.test', role: 'CLIENT', permissions: [], customerAccount: { id: 'c2', businessName: 'Cliente Dos', salesperson: { id: 's2', name: 'Pablo', userId: 'seller2' } } },
  ] as unknown as User[];
  const products = [{ id: 'p1', name: 'Producto A', brand: { id: 'b1', name: 'Marca A' }, variants: [{ id: 'v1' }] }, { id: 'p2', name: 'Producto B', brand: { id: 'b2', name: 'Marca B' }, variants: [{ id: 'v2' }] }] as Product[];
  const base = { id: 'o1', userId: 'u1', createdAt: '2026-10-01T03:00:00Z', currency: 'UYU', status: 'APPROVED', total: 400, items: [
    { variantId: 'v1', productName: 'Producto A', quantity: 2, subtotal: 100 }, { variantId: 'v2', productName: 'Producto B', quantity: 3, subtotal: 300 },
  ] } as Order;
  const orders = [base, { ...base, id: 'o2', userId: 'u2' }, { ...base, id: 'old', createdAt: '2026-09-30T12:00:00Z' }, { ...base, id: 'end', createdAt: '2026-10-02T03:00:00Z' }, { ...base, id: 'cancelled', status: 'CANCELLED' }, { ...base, id: 'usd', currency: 'USD' }];
  const admin = { id: 'admin', role: 'ADMIN', permissions: [] } as unknown as User;
  const params = 'period=custom&dateFrom=2026-10-01&dateTo=2026-10-01';
  const now = new Date('2026-10-08T12:00Z');

  it('incluye el día completo de Uruguay y compara un período de igual duración', () => {
    expect(salesMidnight('2026-10-01').toISOString()).toBe('2026-10-01T03:00:00.000Z');
    const report = demoSalesReport(orders, customers, products, new URLSearchParams(params), admin, false, now);
    expect(report.current).toMatchObject({ amount: 800, orders: 2, units: 10 });
    expect(report.previous.amount).toBe(400); expect(report.changePercent).toBe(100);
  });
  it('filtra importes de líneas por marca, sin sumar el pedido entero ni atribuirle cobros', () => {
    const report = demoSalesReport(orders, customers, products, new URLSearchParams(`${params}&brandId=b1&groupBy=brand`), admin, false, now);
    expect(report.current).toMatchObject({ amount: 200, orders: 2, units: 4 });
    expect(report.current.collected).toBeUndefined(); expect(report.groups).toHaveLength(1);
  });
  it('limita informes y exportaciones a la cartera del vendedor', () => {
    const seller = { id: 'seller1', role: 'SALES', permissions: [] } as unknown as User;
    const report = demoSalesReport(orders, customers, products, new URLSearchParams(`${params}&groupBy=customer`), seller, true, now);
    expect(report.current.orders).toBe(1); expect(report.current.amount).toBe(400);
    expect(report.groups.map((item) => item.id)).toEqual(['c1']);
    expect(salesReportCsv(report)).toContain('"\'=Cliente Uno"');
    expect(salesReportCsv(report)).not.toContain('Cliente Dos');
  });
  it('exporta todos los grupos, no sólo la página, y separa monedas', () => {
    const query = new URLSearchParams(`${params}&groupBy=brand&limit=1`);
    const page = demoSalesReport(orders, customers, products, query, admin, false, now);
    expect(page.meta.total).toBe(2); expect(page.groups).toHaveLength(1);
    const all = demoSalesReport(orders, customers, products, query, admin, true, now);
    expect(salesReportCsv(all)).toContain('Marca A'); expect(salesReportCsv(all)).toContain('Marca B');
    query.set('currency', 'USD');
    expect(demoSalesReport(orders, customers, products, query, admin, false, now).current.amount).toBe(400);
  });
  it('rechaza rangos inválidos, futuros o de más de un año', () => {
    for (const range of ['dateFrom=2026-02-30&dateTo=2026-03-01', 'dateFrom=2026-10-08&dateTo=2026-10-01', 'dateFrom=2026-10-09&dateTo=2026-10-09', 'dateFrom=2024-01-01&dateTo=2026-10-01'])
      expect(() => demoSalesReport(orders, customers, products, new URLSearchParams(`period=custom&${range}`), admin, false, now)).toThrow();
  });
});
