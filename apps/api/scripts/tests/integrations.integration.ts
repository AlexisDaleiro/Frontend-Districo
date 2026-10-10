import assert from 'node:assert/strict';
import { integrationConnections } from '../../src/admin/integration-status';
import { loadBackendEnv } from '../script-env';

async function main() {
  loadBackendEnv();
  const password = process.env.DEMO_SEED_PASSWORD;
  if (!password) throw new Error('Falta la clave de las cuentas locales de prueba.');
  const origin = 'http://127.0.0.1:3001/api';
  async function send(path: string, method = 'GET', body?: unknown, token?: string) {
    const response = await fetch(`${origin}/${path}`, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000),
    });
    return { status: response.status, data: await response.json() };
  }
  assert.equal((await send('admin/integrations')).status, 401);
  for (const [email, expected] of [['admin@districo.test', 200], ['cliente@districo.test', 403]] as const) {
    const login = await send('auth/login', 'POST', { email, password });
    assert.equal(login.status, 201);
    const { accessToken, refreshToken } = login.data;
    try {
      const result = await send('admin/integrations', 'GET', undefined, accessToken);
      assert.equal(result.status, expected);
      if (expected === 200) {
        assert.deepEqual(result.data, integrationConnections());
        const roles = await send('admin/staff/access', 'GET', undefined, accessToken);
        assert.equal(roles.status, 200);
        assert.deepEqual(roles.data.find((role: { role: string }) => role.role === 'ADMIN').access.integraciones, { canView: true, canEdit: false });
      }
      assert.equal((await send('admin/integrations', 'POST', {}, accessToken)).status, 404);
    } finally {
      assert.equal((await send('auth/logout', 'POST', { refreshToken }, accessToken)).status, 201);
    }
  }
  console.log('Integraciones API: consulta administrativa, permisos, bloqueo de cliente y ausencia de escrituras correctos.');
}
main().catch(() => { console.error('Falló la verificación de Integraciones en la API local.'); process.exitCode = 1; });
