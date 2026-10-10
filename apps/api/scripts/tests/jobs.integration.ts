import assert from 'node:assert/strict';
import { jobExamples } from '../../src/jobs/job-examples';
import { loadBackendEnv } from '../script-env';

async function main() {
  loadBackendEnv();
  const password = process.env.DEMO_SEED_PASSWORD;
  if (!password) throw new Error('Falta la contraseña de las cuentas locales de prueba.');
  const origin = 'http://127.0.0.1:3001/api';
  let token: string | undefined, refreshToken: string | undefined, createdId: string | undefined;
  async function send(path: string, method = 'GET', body?: unknown, bearer = token) {
    const response = await fetch(`${origin}/${path}`, { method, headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000) });
    const data = await response.json();
    return { status: response.status, data };
  }
  try {
    assert.equal((await send('admin/jobs')).status, 401);
    const login = await send('auth/login', 'POST', { email: 'admin@districo.test', password });
    assert.equal(login.status, 201, 'El admin local de prueba debe poder ingresar.');
    token = login.data.accessToken; refreshToken = login.data.refreshToken;
    assert.ok(token && refreshToken);
    const { id: _id, ...example } = jobExamples[0];
    const draft = { ...example, title: `QA temporal ofertas ${Date.now()}`, published: '2020-01-01', active: false };
    const created = await send('admin/jobs', 'POST', draft);
    assert.equal(created.status, 201); createdId = created.data.id;
    assert.ok(createdId);
    assert.equal((await send('jobs')).data.some((job: { id: string }) => job.id === createdId), false);
    assert.equal((await send(`admin/jobs/${createdId}`, 'PATCH', { ...draft, active: true })).status, 200);
    assert.equal((await send('jobs')).data.some((job: { id: string }) => job.id === createdId), true);
    assert.equal((await send(`admin/jobs?search=${encodeURIComponent(draft.title)}&limit=1`)).data.meta.total, 1);
    assert.equal((await send('admin/jobs', 'POST', { ...draft, requirements: [] })).status, 400);
    const client = await send('auth/login', 'POST', { email: 'cliente@districo.test', password }, '');
    assert.equal(client.status, 201);
    try {
      assert.equal((await send('admin/jobs', 'GET', undefined, client.data.accessToken)).status, 403);
      assert.equal((await send('admin/jobs', 'POST', draft, client.data.accessToken)).status, 403);
      assert.equal((await send(`admin/jobs/${createdId}`, 'PATCH', draft, client.data.accessToken)).status, 403);
      assert.equal((await send(`admin/jobs/${createdId}`, 'DELETE', undefined, client.data.accessToken)).status, 403);
    } finally { await send('auth/logout', 'POST', { refreshToken: client.data.refreshToken }, client.data.accessToken); }
    assert.equal((await send(`admin/jobs/${createdId}`, 'PATCH', { ...draft, active: false })).status, 200);
    assert.equal((await send('jobs')).data.some((job: { id: string }) => job.id === createdId), false);
    assert.equal((await send(`admin/jobs/${createdId}`, 'DELETE')).status, 200);
    assert.equal((await send(`admin/jobs/${createdId}`, 'PATCH', draft)).status, 404);
    createdId = undefined;
    console.log('API real: creación, edición, publicación, filtros, desactivación, eliminación, validación y rechazo de cliente correctos.');
  } finally {
    if (createdId) assert.equal((await send(`admin/jobs/${createdId}`, 'DELETE')).status, 200, 'Retirar la oferta QA temporal.');
    if (refreshToken) await send('auth/logout', 'POST', { refreshToken });
  }
}
main().catch(() => { console.error('Falló la prueba de ofertas en la API local. Revisar servidor, migración y cuentas de prueba.'); process.exitCode = 1; });
