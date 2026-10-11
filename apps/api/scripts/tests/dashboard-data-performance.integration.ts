import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import * as bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';
import { databaseError, loadBackendEnv } from '../script-env';

async function main() {
  if (!process.argv.includes('--test-fixtures')) throw new Error('Usar --test-fixtures: crea y elimina una cuenta QA temporal.');
  const base = new URL(process.env.PERFORMANCE_API_URL ?? 'http://127.0.0.1:3001/api/');
  if (!['127.0.0.1', 'localhost'].includes(base.hostname)) throw new Error('Este ensayo solo admite la API local.');
  loadBackendEnv();
  const prisma = new PrismaClient();
  let id: string | undefined, refresh: string | undefined;
  let token = '';
  const password = randomBytes(24).toString('base64url') + 'Aa1!';
  const email = `qa-performance-${randomBytes(8).toString('hex')}@example.test`;
  async function get(path: string) {
    const start = performance.now();
    const response = await fetch(new URL(path, base), { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
    const data = await response.json();
    return { status: response.status, ms: Math.round(performance.now() - start), data };
  }
  try {
    const created = await prisma.user.create({ data: { email, role: Role.ADMIN, active: true, emailVerified: true, passwordHash: await bcrypt.hash(password, 10) }, select: { id: true } });
    id = created.id;
    const login = await fetch(new URL('auth/login', base), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(30000) });
    const credentials = await login.json();
    assert.equal(login.status, 201);
    assert.equal(typeof credentials.accessToken, 'string');
    token = credentials.accessToken; refresh = credentials.refreshToken;
    const times: number[] = [];
    for (let round = 1; round <= 3; round++) {
      const paths = ['admin/customers/page?page=1&limit=20', 'admin/customers/page/options', 'admin/dashboard', 'admin/integrations'];
      const results = await Promise.all(paths.map(get));
      results.forEach((result, index) => {
        assert.equal(result.status, 200, paths[index]);
        console.log(JSON.stringify({ round, path: paths[index], ms: result.ms }));
      });
      assert.ok(Array.isArray(results[0].data.items));
      assert.equal(typeof results[0].data.meta.total, 'number');
      for (const key of ['products', 'pendingApplications', 'pendingReviewOrders', 'activePromotions', 'newContactInquiries']) assert.equal(typeof results[2].data[key], 'number');
      times.push(results[0].ms);
    }
    console.log(JSON.stringify({ customersMedianMs: [...times].sort((a, b) => a - b)[1] }));
    if (process.argv.includes('--browser')) {
      const web = new URL(process.env.PERFORMANCE_WEB_URL ?? 'http://127.0.0.1:3002');
      if (!['127.0.0.1', 'localhost'].includes(web.hostname)) throw new Error('El navegador de pruebas solo admite el frontend local.');
      const { chromium } = await import('@playwright/test');
      const browser = await chromium.launch({ channel: process.env.E2E_BROWSER_CHANNEL ?? 'msedge', headless: true });
      try {
        const context = await browser.newContext({ baseURL: web.origin });
        await context.addCookies([{ name: 'districo-access', value: token, url: web.origin, httpOnly: true, sameSite: 'Lax' }]);
        const page = await context.newPage();
        let errors = 0;
        let customerReads = 0;
        page.on('pageerror', () => { errors++; });
        page.on('request', (request) => {
          if (new URL(request.url()).pathname === '/api/backend/admin/customers/page') customerReads++;
        });
        page.on('requestfinished', (request) => {
          const url = new URL(request.url());
          if (!url.pathname.startsWith('/api/backend/')) return;
          const timing = request.timing();
          const path = url.pathname.replace(/(\/admin\/customers\/)(?!page(?:\/|$))[^/]+/, '$1:id');
          console.log(JSON.stringify({ transport: 'web-proxy', path, ms: Math.round(timing.responseEnd) }));
        });
        for (let round = 1; round <= 2; round++) {
          const start = performance.now();
          await page.goto('/tienda/admin/clientes', { waitUntil: 'domcontentloaded' });
          await page.locator('.admin-customers-table').waitFor({ state: 'visible', timeout: 45000 });
          console.log(JSON.stringify({ transport: 'browser', operation: 'customers-visible', round, ms: Math.round(performance.now() - start) }));
        }
        const start = performance.now();
        await page.getByRole('link', { name: 'Ver ficha', exact: true }).first().click();
        await page.locator('.admin-record-page h1').waitFor({ state: 'visible', timeout: 45000 });
        console.log(JSON.stringify({ transport: 'browser', operation: 'customer-detail-visible', ms: Math.round(performance.now() - start) }));
        const beforeReturn = customerReads;
        const backStart = performance.now();
        await page.getByRole('link', { name: 'Volver a clientes', exact: true }).click();
        await page.locator('.admin-customers-table').waitFor({ state: 'visible', timeout: 45000 });
        console.log(JSON.stringify({ transport: 'browser', operation: 'customers-return-visible', ms: Math.round(performance.now() - backStart) }));
        assert.equal(customerReads, beforeReturn, 'return should reuse the still-fresh customer list');
        assert.equal(errors, 0);
        await context.close();
      } finally { await browser.close(); }
    }
    await prisma.user.update({ where: { id }, data: { active: false } });
    assert.equal((await get('admin/integrations')).status, 401);
    await prisma.user.update({ where: { id }, data: { active: true, role: Role.CLIENT } });
    assert.equal((await get('admin/integrations')).status, 403);
    await prisma.user.update({ where: { id }, data: { role: Role.ADMIN, mfaEnabledAt: new Date() } });
    assert.equal((await get('admin/integrations')).status, 401);
    await prisma.user.update({ where: { id }, data: { mfaEnabledAt: null } });
    assert.equal((await get('admin/integrations')).status, 200);
    const logout = await fetch(new URL('auth/logout', base), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: refresh }) });
    assert.ok(logout.ok);
    assert.equal((await get('admin/customers/page?page=1&limit=20')).status, 401);
    console.log('Permisos actuales, cuenta inactiva, MFA y revocacion inmediata correctos.');
  } finally {
    if (id) await prisma.user.delete({ where: { id } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof assert.AssertionError ? `Fallo de comprobacion: ${error.message}` : databaseError(error));
  process.exitCode = 1;
});
