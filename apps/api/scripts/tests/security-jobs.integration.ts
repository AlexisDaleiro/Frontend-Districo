import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';
import { PDFDocument } from 'pdf-lib';
import { ConfigService } from '@nestjs/config';
import { CvStorageService } from '../../src/jobs/cv-storage.service';
import { loadBackendEnv } from '../script-env';
import { jobExamples } from '../../src/jobs/job-examples';
import { chromium } from '@playwright/test';

async function main() {
  const { generate } = await import('otplib');
  loadBackendEnv();
  const db = new PrismaClient(), suffix = randomUUID(), password = randomBytes(24).toString('base64url');
  const email = `qa-security-${suffix}@example.test`;
  let jobId: string | undefined, adminId: string | undefined, clientId: string | undefined;
  let stage = 'crear cuentas temporales';
  const origin = 'http://127.0.0.1:3001/api';
  async function send(path: string, method = 'GET', body?: unknown, bearer?: string) {
    const multipart = body instanceof FormData;
    const response = await fetch(`${origin}/${path}`, { method, headers: { ...(multipart ? {} : { 'Content-Type': 'application/json' }), ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) }, body: body === undefined ? undefined : multipart ? body : JSON.stringify(body), signal: AbortSignal.timeout(95000) });
    const data = response.headers.get('content-type')?.includes('application/pdf') ? Buffer.from(await response.arrayBuffer()) : await response.json();
    return { response, data };
  }
  async function login(loginEmail = email) {
    const result = await send('auth/login', 'POST', { email: loginEmail, password });
    assert.equal(result.response.status, 201, 'El inicio de sesión debe responder correctamente.');
    return result.data;
  }
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    adminId = (await db.user.create({ data: { email, passwordHash, role: Role.ADMIN, active: true, emailVerified: true } })).id;
    const clientEmail = `qa-client-${suffix}@example.test`;
    clientId = (await db.user.create({ data: { email: clientEmail, passwordHash, role: Role.CLIENT, active: true, emailVerified: true } })).id;
    stage = 'sesiones únicas y renovación atómica';
    const first = await login(), second = await login();
    assert.ok(first.refreshToken !== second.refreshToken, 'Dos accesos deben generar sesiones distintas.');
    assert.equal((await send('auth/me', 'GET', undefined, first.accessToken)).response.status, 200);
    const catalog = await send('products/cards?limit=3', 'GET', undefined, first.accessToken);
    assert.equal(catalog.response.status, 200);
    for (const product of catalog.data.items) for (const variant of product.variants) if (variant.price?.amount != null) assert.ok(['string', 'number'].includes(typeof variant.price.amount), 'Los importes comerciales conservan su formato JSON.');
    const rotations = await Promise.all([send('auth/refresh', 'POST', { refreshToken: first.refreshToken }), send('auth/refresh', 'POST', { refreshToken: first.refreshToken })]);
    assert.deepEqual(rotations.map((r) => r.response.status).sort(), [201, 401], 'Un refresh sólo puede consumirse una vez.');
    const current = rotations.find((r) => r.response.status === 201)!.data;
    assert.equal((await send('auth/sessions/others', 'DELETE', undefined, current.accessToken)).response.status, 200);
    assert.equal((await send('auth/me', 'GET', undefined, second.accessToken)).response.status, 401, 'Revocar invalida el access token de inmediato.');
    assert.equal((await send('auth/refresh', 'POST', { refreshToken: second.refreshToken })).response.status, 401);

    stage = 'postulaciones privadas y PDF';
    const { id: _exampleId, ...example } = jobExamples[0];
    const opening = await send('admin/jobs', 'POST', { ...example, title: `QA candidatos ${suffix}`, active: true, isExample: false, published: '2020-01-01' }, current.accessToken);
    assert.equal(opening.response.status, 201); jobId = opening.data.id;
    const pdf = await PDFDocument.create(); pdf.addPage().drawText('CV ficticio de prueba automatizada'); const bytes = await pdf.save();
    function application() {
      const data = new FormData();
      for (const [key, value] of Object.entries({ name: 'Candidato QA', email: `candidato-${suffix}@example.test`, phone: '099123456', message: 'Prueba temporal sin datos personales reales.', consent: 'true', submissionId: suffix })) data.set(key, value);
      data.set('cv', new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }), 'cv-prueba.pdf'); return data;
    }
    assert.equal((await send(`jobs/${jobId}/applications`, 'POST', application())).response.status, 201);
    assert.equal((await send(`jobs/${jobId}/applications`, 'POST', application())).response.status, 201);
    assert.equal(await db.jobApplication.count({ where: { jobId } }), 1, 'Reenviar no duplica la postulación.');
    const list = await send(`admin/jobs/${jobId}/applications?search=Candidato&limit=1`, 'GET', undefined, current.accessToken);
    assert.equal(list.response.status, 200); assert.equal(list.data.meta.total, 1);
    const candidate = list.data.items[0]; assert.ok(!candidate.cvPath && !candidate.submissionId);
    assert.equal((await send(`admin/jobs/${jobId}/applications`, 'GET')).response.status, 401);
    const client = await login(clientEmail);
    const adminSessions = await send('auth/sessions', 'GET', undefined, current.accessToken);
    assert.equal((await send(`auth/sessions/${adminSessions.data[0].id}`, 'DELETE', undefined, client.accessToken)).response.status, 404, 'Un cliente no puede revocar una sesión ajena.');
    assert.equal((await send('auth/me', 'GET', undefined, current.accessToken)).response.status, 200);
    assert.equal((await send(`admin/jobs/${jobId}/applications`, 'GET', undefined, client.accessToken)).response.status, 403);
    assert.equal((await send(`admin/jobs/${jobId}/applications/${candidate.id}/cv`, 'GET', undefined, client.accessToken)).response.status, 403);
    const file = await send(`admin/jobs/${jobId}/applications/${candidate.id}/cv`, 'GET', undefined, current.accessToken);
    assert.equal(file.response.status, 200); assert.ok(file.data.equals(Buffer.from(bytes)));
    assert.equal(file.response.headers.get('cache-control'), 'no-store, private');
    assert.equal((await send(`admin/jobs/${jobId}/applications/${candidate.id}`, 'PATCH', { status: 'INTERVIEW' }, current.accessToken)).response.status, 200);
    assert.equal((await send(`admin/jobs/${jobId}/applications/${candidate.id}/cv`, 'GET', undefined, current.accessToken)).response.status, 200);
    assert.equal((await send(`admin/jobs/${jobId}/applications/${randomUUID()}/cv`, 'GET', undefined, current.accessToken)).response.status, 404);
    assert.equal((await send(`admin/jobs/${jobId}`, 'DELETE', undefined, current.accessToken)).response.status, 200);
    assert.equal((await send(`jobs/${jobId}`, 'GET')).response.status, 404, 'Las ofertas retiradas no son públicas.');
    assert.equal((await send(`jobs/${jobId}/applications`, 'POST', application())).response.status, 404);
    const retired = await send(`admin/jobs?status=retired&search=${encodeURIComponent(suffix)}`, 'GET', undefined, current.accessToken);
    assert.equal(retired.data.items[0].id, jobId); assert.equal(retired.data.items[0].retired, true);
    assert.equal((await send(`admin/jobs/${jobId}`, 'GET', undefined, current.accessToken)).response.status, 200);
    assert.equal((await send(`admin/jobs/${jobId}/applications`, 'GET', undefined, current.accessToken)).data.meta.total, 1, 'Los candidatos siguen accesibles al retirar la oferta.');
    assert.equal((await send(`admin/jobs/${jobId}/applications/${candidate.id}/cv`, 'GET', undefined, current.accessToken)).response.status, 200);

    stage = 'doble factor y recuperación';
    assert.equal((await send('auth/mfa/setup', 'POST', { password }, client.accessToken)).response.status, 403);
    const setup = await send('auth/mfa/setup', 'POST', { password }, current.accessToken);
    assert.equal(setup.response.status, 201); assert.ok(setup.data.qrDataUrl.startsWith('data:image/png;base64,'));
    const otp = await generate({ secret: setup.data.manualKey });
    const enabled = await send('auth/mfa/enable', 'POST', { code: otp }, current.accessToken);
    assert.equal(enabled.response.status, 201); assert.equal(enabled.data.recoveryCodes.length, 8);
    const recovery = enabled.data.recoveryCodes;
    const me = await send('auth/me', 'GET', undefined, current.accessToken);
    assert.equal(me.response.status, 200); assert.ok(!('mfaSecretEncrypted' in me.data) && !('mfaLastStep' in me.data));
    const challenge = await login();
    assert.ok(challenge.mfaRequired && challenge.challengeToken && !challenge.accessToken && !challenge.refreshToken);
    assert.equal((await send('auth/me', 'GET', undefined, challenge.challengeToken)).response.status, 401);
    assert.equal((await send('auth/mfa/verify', 'POST', { challengeToken: challenge.challengeToken, code: 'foobar' })).response.status, 401);
    const verified = await send('auth/mfa/verify', 'POST', { challengeToken: challenge.challengeToken, code: recovery[0] });
    assert.equal(verified.response.status, 201);
    assert.equal((await send('auth/mfa/verify', 'POST', { challengeToken: challenge.challengeToken, code: recovery[1] })).response.status, 401, 'El desafío no puede reutilizarse.');
    assert.equal((await send('auth/security', 'GET', undefined, verified.data.accessToken)).data.recoveryCodesRemaining, 7);
    const disabled = await send('auth/mfa/disable', 'POST', { password, code: recovery[1] }, verified.data.accessToken);
    assert.equal(disabled.response.status, 201);
    assert.equal((await send('auth/me', 'GET', undefined, current.accessToken)).response.status, 401, 'El cambio de MFA cierra las otras sesiones.');
    assert.equal((await send('auth/logout', 'POST', { refreshToken: verified.data.refreshToken })).response.status, 201);
    assert.equal((await send('auth/me', 'GET', undefined, verified.data.accessToken)).response.status, 401, 'Logout también revoca el acceso.');
    if (process.argv.includes('--browser')) {
      stage = 'doble factor en navegador real';
      const browser = await chromium.launch({ channel: 'msedge' });
      try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await context.newPage();
        await page.goto('http://127.0.0.1:3002/tienda/ingresar');
        async function enter() {
          await page.getByLabel('Correo electrónico', { exact: true }).fill(email);
          await page.getByLabel('Contraseña', { exact: true }).fill(password);
          const response = page.waitForResponse((r) => r.url().endsWith('/api/backend/auth/login'));
          await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
          const result = await response;
          if (result.status() === 429) { await new Promise((resolve) => setTimeout(resolve, 61000)); return enter(); }
          assert.equal(result.status(), 201);
        }
        await enter(); await page.waitForURL('**/tienda');
        await page.goto('http://127.0.0.1:3002/tienda/cuenta/seguridad');
        await page.getByLabel('Contraseña actual').fill(password);
        await page.getByRole('button', { name: 'Configurar autenticador' }).click();
        const manual = await page.locator('.security-key').innerText();
        await page.getByLabel('Código de autenticación o recuperación').fill(await generate({ secret: manual }));
        await page.getByRole('button', { name: 'Activar doble factor' }).click();
        await page.getByRole('heading', { name: 'Códigos de recuperación', exact: true }).waitFor();
        const codes = await page.locator('.recovery-codes code').allTextContents(); assert.equal(codes.length, 8);
        await page.getByRole('checkbox', { name: 'Ya guardé mis códigos' }).check();
        await page.getByRole('button', { name: 'Ocultar códigos' }).click();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        // No screenshots/traces of QR, recovery codes, passwords or cookies.
        await context.request.post('http://127.0.0.1:3002/api/backend/auth/logout', { headers: { Origin: 'http://127.0.0.1:3002' }, data: {} });
        await page.goto('http://127.0.0.1:3002/tienda/ingresar'); await enter();
        const otherTab = await context.newPage();
        const pendingRefresh = otherTab.waitForResponse((response) => response.url().endsWith('/api/backend/auth/refresh'));
        await otherTab.goto('http://127.0.0.1:3002/tienda/ingresar'); await pendingRefresh;
        assert.ok((await context.cookies()).some((cookie) => cookie.name === 'districo-mfa-challenge'), 'Una pestaña sin sesión no debe borrar el desafío MFA pendiente.');
        await otherTab.close();
        await page.getByLabel('Código de autenticación o recuperación').fill(codes[0]);
        await page.getByRole('button', { name: 'Verificar acceso' }).click(); await page.waitForURL('**/tienda');
        assert.ok((await context.cookies()).some((cookie) => cookie.name === 'districo-access' && cookie.httpOnly));
        assert.ok(!(await context.cookies()).some((cookie) => cookie.name === 'districo-mfa-challenge'));
        await page.goto('http://127.0.0.1:3002/tienda/cuenta/seguridad');
        await page.getByRole('button', { name: 'Cerrar esta sesión' }).waitFor();
        page.once('dialog', (dialog) => dialog.accept());
        await page.getByRole('button', { name: 'Cerrar esta sesión' }).click();
        await page.getByText('Este dispositivo', { exact: true }).waitFor({ state: 'hidden' });
        assert.equal((await context.request.get('http://127.0.0.1:3002/api/backend/auth/me')).status(), 401);
      } finally { await browser.close(); }
    }
    console.log('API real: CV privado, candidatos, permisos, idempotencia, sesiones, refresh concurrente, MFA, recuperación y logout correctos.');
  } catch (error) {
    if (error instanceof assert.AssertionError) console.error({ stage, actual: typeof error.actual === 'number' ? error.actual : 'omitido', expected: typeof error.expected === 'number' ? error.expected : 'omitido' });
    throw new Error(`Falló la comprobación: ${stage}. No se registraron credenciales ni secretos.`);
  }
  finally {
    const storage = new CvStorageService(new ConfigService(process.env));
    if (jobId) {
      const files = await db.jobApplication.findMany({ where: { jobId }, select: { cvPath: true } });
      for (const file of files) await storage.remove(file.cvPath);
      await db.jobApplication.deleteMany({ where: { jobId } }); await db.jobOpening.delete({ where: { id: jobId } });
    }
    for (const id of [adminId, clientId].filter((value): value is string => !!value)) {
      await db.auditLog.updateMany({ where: { userId: id }, data: { userId: null } });
      await db.user.delete({ where: { id } });
    }
    await db.$disconnect();
  }
}
main().catch((error) => { console.error(error instanceof Error ? error.message : 'Falló la prueba de seguridad.'); process.exitCode = 1; });
