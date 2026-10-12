import { chromium } from '@playwright/test';
import { PrismaClient } from '../../api/node_modules/@prisma/client/default.js';
import bcrypt from '../../api/node_modules/bcryptjs/index.js';
import { loadEnvFile } from 'node:process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
const __dirname = dirname(fileURLToPath(import.meta.url));

if (process.env.RUN_ROLE_FLOW_AUDIT !== '1') throw new Error('Opt-in read-only audit required.');
loadEnvFile(resolve(__dirname, '../../api/.env'));
const base = process.env.ROLE_AUDIT_URL || 'http://127.0.0.1:3002';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Local preview required.');
const report = { capturedAt: new Date().toISOString(), mode: 'REAL_READ_ONLY', migrations: [], tables: [], accounts: [], api: [], pages: [] };
const db = new PrismaClient();
const routes = [
  ['', 'admin/dashboard'], ['consultas', 'admin/contact-inquiries/page'],
  ['solicitudes', 'admin/applications/page'], ['clientes', 'admin/customers/page'],
  ['vendedores', 'admin/salespeople'], ['pedidos', 'admin/orders/page'],
  ['cartera', 'admin/operations/portfolio'], ['finanzas', 'admin/operations/finance/movements'],
  ['logistica', 'admin/operations/logistics'], ['metricas', 'admin/operations/metrics'],
  ['catalogo', 'products'], ['marcas', 'brands'], ['categorias', 'categories'],
  ['promociones', 'admin/promotions/page'], ['banners', 'admin/banners'],
  ['recomendaciones', 'admin/recommendations/page'], ['ofertas-laborales', 'admin/jobs'],
  ['personal', 'admin/staff/page'], ['roles', 'admin/staff/access'], ['integraciones', 'admin/integrations'],
];
const customerRoutes = [
  ['tienda', '/tienda'], ['productos', '/tienda/productos'], ['marcas', '/tienda/marcas'],
  ['carrito', '/tienda/carrito'], ['checkout', '/tienda/checkout'], ['cuenta', '/tienda/cuenta'],
  ['pedidos', '/tienda/cuenta/pedidos'], ['facturas', '/tienda/cuenta/facturas'],
  ['favoritos', '/tienda/cuenta/favoritos'], ['consultas', '/tienda/cuenta/consultas'],
  ['seguridad', '/tienda/cuenta/seguridad'], ['admin-denied', '/tienda/admin'],
];
const wait = (ms) => new Promise((done) => setTimeout(done, ms));
function safeMessage(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/https?:\/\/\S+/g, '[url]').replace(/[\w.+-]+@[\w.-]+\.[\w-]+/g, '[email]').slice(0, 400);
}
async function api(context, role, path, expected) {
  const start = Date.now();
  const response = await context.request.get(`${base}/api/backend/${path}`, { timeout: 45000 });
  const result = await response.json().catch(() => ({}));
  report.api.push({ role, path: path.split('?')[0], status: response.status(), expected, ms: Date.now() - start,
    ...(response.ok() ? { count: result.meta?.total ?? (Array.isArray(result) ? result.length : undefined) }
      : { message: safeMessage(Array.isArray(result.message) ? result.message.join(' | ') : result.message) }) });
  return result;
}
async function visit(page, role, name, path) {
  const failures = new Set(), scripts = new Set();
  const onResponse = (response) => {
    const url = new URL(response.url());
    if (url.pathname.startsWith('/api/backend/') && response.status() >= 400 && ![401,403].includes(response.status()))
      failures.add(`${response.status()} ${url.pathname.replace(/\/[a-z0-9]{20,}(?=\/|$)/gi, '/[id]')}`);
  };
  const onError = (error) => scripts.add(safeMessage(error.message));
  page.on('response', onResponse); page.on('pageerror', onError);
  const start = Date.now();
  let failure;
  try {
    await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => !!document.querySelector('main, .admin-main'), { timeout: 20000 });
    if (role === 'ADMIN') await page.locator('.admin-shell').waitFor({ timeout: 30000 });
    await wait(2500);
    await page.waitForFunction(() => !document.querySelector('main .loading'), { timeout: 25000 });
  } catch (error) { failure = error.name; }
  const alerts = (await page.locator('.error-box[role="alert"]').allTextContents()).map(safeMessage).filter(Boolean);
  report.pages.push({ role, name, finalPath: new URL(page.url()).pathname.replace(/\/[a-z0-9]{20,}(?=\/|$)/gi, '/[id]'),
    ms: Date.now() - start, adminShell: await page.locator('.admin-shell').count(), alerts,
    apiFailures: [...failures], scriptErrors: [...scripts], ...(failure ? { failure } : {}) });
  page.off('response', onResponse); page.off('pageerror', onError);
  console.log(JSON.stringify(report.pages.at(-1)));
}
async function main() {
  let browser;
  try {
    report.migrations = await db.$queryRawUnsafe('SELECT migration_name, finished_at IS NOT NULL AND rolled_back_at IS NULL AS applied FROM "_prisma_migrations" ORDER BY started_at DESC LIMIT 8');
    report.tables = await db.$queryRawUnsafe('SELECT name, to_regclass(format(\'public.%I\', name)) IS NOT NULL AS present FROM unnest(ARRAY[\'BankMovement\',\'PaymentReconciliation\',\'CollectionFollowup\',\'OrderFulfillment\',\'UsageEvent\',\'PerformanceSample\',\'InquiryEntry\',\'CandidateActivity\']) name');
    const users = await db.user.findMany({ where: { email: { endsWith: '@districo.test' }, active: true },
      select: { email: true, role: true, passwordHash: true, mfaEnabledAt: true } });
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const anonymous = await browser.newContext();
    for (const path of ['auth/me', 'admin/operations/finance/movements', 'admin/operations/logistics', 'admin/operations/portfolio', 'admin/operations/metrics'])
      await api(anonymous, 'ANONYMOUS', path, 401);
    const publicPage = await anonymous.newPage();
    for (const path of ['/', '/trabajo', '/tienda/solicitar-cuenta', '/tienda/recuperar-acceso', '/tienda/admin'])
      await visit(publicPage, 'ANONYMOUS', path, path);
    await anonymous.close();
    for (const user of users) {
      const eligible = !!process.env.DEMO_SEED_PASSWORD && !user.mfaEnabledAt && await bcrypt.compare(process.env.DEMO_SEED_PASSWORD, user.passwordHash);
      report.accounts.push({ role: user.role, usableFixture: eligible });
      if (!eligible) continue;
      const context = await browser.newContext();
      const login = await context.request.post(`${base}/api/backend/auth/login`, { headers: { Origin: base },
        data: { email: user.email, password: process.env.DEMO_SEED_PASSWORD }, timeout: 45000 });
      report.api.push({ role: user.role, path: 'auth/login', status: login.status(), expected: 201 });
      if (!login.ok()) { await context.close(); continue; }
      await api(context, user.role, 'auth/me', 200);
      const page = await context.newPage();
      if (user.role === 'ADMIN') {
        for (const [, endpoint] of routes) await api(context, user.role, endpoint + (endpoint.includes('page') ? '?limit=1' : ''), 200);
        for (const endpoint of ['admin/operations/finance/payments', 'admin/operations/finance/receivables', 'admin/operations/performance', 'admin/operations/recruitment/interviews'])
          await api(context, user.role, endpoint, 200);
        for (const [section] of routes.filter(([section]) => !process.env.ROLE_AUDIT_FOCUS || ['cartera','finanzas','logistica','metricas','pedidos','consultas','ofertas-laborales'].includes(section)))
          await visit(page, user.role, section || 'resumen', `/tienda/admin${section ? `/${section}` : ''}`);
        const inquiries = await context.request.get(`${base}/api/backend/admin/contact-inquiries/page?limit=1`);
        const inquiry = (await inquiries.json()).items?.[0];
        if (inquiry) {
          await page.goto(`${base}/tienda/admin/consultas`);
          await page.getByRole('button', { name: 'Ver detalle', exact: true }).first().click();
          await page.locator('.admin-inquiry-detail .error-box').waitFor({ timeout: 20000 }).catch(() => {});
          report.pages.push({role: user.role, name: 'seguimiento-consulta', alerts: (await page.locator('.admin-inquiry-detail .error-box').allTextContents()).map(safeMessage)});
        }
      } else if (user.role === 'CLIENT') {
        for (const endpoint of ['orders/me/page?limit=1', 'orders/me/invoices?limit=1', 'account/me/favorites/ids', 'account/queries', 'auth/security', 'auth/sessions'])
          await api(context, user.role, endpoint, 200);
        for (const endpoint of ['admin/customers/page', 'admin/operations/finance/movements', 'admin/operations/logistics', 'admin/operations/portfolio', 'admin/operations/metrics', 'admin/staff/access'])
          await api(context, user.role, endpoint, 403);
        for (const [name, path] of customerRoutes.filter(([name]) => !process.env.ROLE_AUDIT_FOCUS || ['consultas','pedidos','admin-denied'].includes(name)))
          await visit(page, user.role, name, path);
      }
      await context.request.post(`${base}/api/backend/auth/logout`, { headers: { Origin: base }, data: {} });
      await context.close();
      await wait(1200);
    }
  } finally {
    await browser?.close(); await db.$disconnect();
    const directory = resolve(__dirname, '../.performance-results'); mkdirSync(directory, { recursive: true });
    const filename = resolve(directory, 'role-flow-audit-real.json');
    writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ report: filename, migrations: report.migrations, tables: report.tables, accounts: report.accounts,
      unexpectedApi: report.api.filter((row) => row.status !== row.expected),
      failedPages: report.pages.filter((row) => row.alerts.length || row.scriptErrors?.length || row.failure) }));
  }
}
main().catch((error) => { console.error(JSON.stringify({ auditError: error.code || error.name })); process.exitCode = 1; });
