import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../src/app/api/backend/[...path]/route';
import { browserOperationTimeout, operationTimeout } from '../src/lib/operation-timeout';
import { allowedPath, sanitize } from '../src/lib/proxy-policy';
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('Security boundary and operation budgets', () => {
  it('the browser always waits longer than the proxy, including JSON batch operations', () => {
    for (const [path, multipart] of [['admin/bulk/products/prices', false], ['admin/orders/a/returns', false], ['admin/sales/export', false], ['jobs/a/applications', true], ['admin/jobs/a/applications/b/cv', false], ['auth/refresh', false]] as const) {
      expect(browserOperationTimeout(path, multipart)).toBe(operationTimeout(path, multipart) + 5000);
    }
    expect(operationTimeout('admin/bulk/products/prices')).toBe(90000);
    expect(operationTimeout('auth/refresh')).toBe(20000);
  });
  it('allows only declared CV and own-session routes and removes stored secrets', () => {
    for (const [path, method] of [['jobs/one', 'GET'], ['jobs/one/applications', 'POST'], ['admin/jobs/one/applications/two/cv', 'GET'], ['auth/security', 'GET'], ['auth/sessions/others', 'DELETE'], ['auth/mfa/setup', 'POST']]) expect(allowedPath(path, method)).toBe(true);
    expect(allowedPath('jobs/one/applications', 'GET')).toBe(false);
    expect(allowedPath('auth/sessions', 'DELETE')).toBe(false);
    expect(sanitize({ mfaRequired: true, challengeToken: 'private', user: { mfaSecretEncrypted: 'private', pendingMfaSecret: 'private', mfaLastStep: 1, codeHash: 'private', email: 'ok' } })).toEqual({ mfaRequired: true, user: { email: 'ok' } });
  });
  it('keeps the challenge in an HttpOnly cookie and sets access cookies only after MFA', async () => {
    vi.stubEnv('NEXT_PUBLIC_DATA_MODE', 'real'); vi.stubEnv('BACKEND_API_URL', 'http://backend.test/api');
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ mfaRequired: true, challengeToken: 'private-challenge' })).mockResolvedValueOnce(Response.json({ message: 'Sin sesión' }, { status: 401 })).mockResolvedValueOnce(Response.json({ accessToken: 'private-access', refreshToken: 'private-refresh' })); vi.stubGlobal('fetch', fetch);
    const request = (path: string, body: unknown, cookie?: string) => POST(new NextRequest(`http://localhost/api/backend/${path}`, { method: 'POST', headers: { origin: 'http://localhost', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) }), { params: Promise.resolve({ path: path.split('/') }) });
    const challenge = await request('auth/login', { email: 'a@example.test', password: 'fixture-password' });
    expect(await challenge.json()).toEqual({ mfaRequired: true });
    expect(challenge.headers.get('set-cookie')).toContain('HttpOnly');
    expect(challenge.cookies.get('districo-access')?.value).toBe('');
    const pending = await request('auth/refresh', {}, 'districo-mfa-challenge=private-challenge');
    expect(pending.cookies.get('districo-mfa-challenge')).toBeUndefined();
    const verified = await request('auth/mfa/verify', { code: '123456', challengeToken: 'attacker-supplied' }, 'districo-mfa-challenge=private-challenge');
    expect(JSON.parse(fetch.mock.calls[2][1].body).challengeToken).toBe('private-challenge');
    expect(verified.cookies.get('districo-access')?.value).toBe('private-access');
    expect(verified.cookies.get('districo-mfa-challenge')?.value).toBe('');
    expect(await verified.json()).toEqual({});
  });
});
