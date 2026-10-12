const assert = require('node:assert/strict');
const { test } = require('node:test');
const { NestFactory } = require('@nestjs/core');
const { ConfigService } = require('@nestjs/config');
const bcrypt = require('bcryptjs');

test('the compiled Vercel API starts and serves auth without any email configuration', async () => {
  const originalVercel = process.env.VERCEL;
  process.env.VERCEL = '1';
  let app;
  try {
    const { AppModule } = require('../../dist/src/app.module.js');
    const { UsersService } = require('../../dist/src/users/users.service.js');
    const { NotificationsService } = require('../../dist/src/notifications/notifications.service.js');
    const { AuthSessionsService } = require('../../dist/src/auth/auth-sessions.service.js');
    app = await NestFactory.create(AppModule, { logger: false });
    const config = app.get(ConfigService);
    const get = config.get.bind(config);
    config.get = (name, ...args) => /^(EMAIL_|RESEND_)/.test(name) ? undefined : get(name, ...args);
    // No test route may read production users or send a real email.
    app.get(UsersService).findByEmail = async () => null;
    const notifications = app.get(NotificationsService);
    assert.equal(notifications.settings().ready, false);
    app.setGlobalPrefix('api');
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const me = await fetch(`${base}/api/auth/me`);
    assert.equal(me.status, 401);
    const login = await fetch(`${base}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'missing@example.test', password: 'FixturePassword123!' }),
    });
    assert.equal(login.status, 401);
    app.get(UsersService).findByEmail = async () => ({ id: 'runtime-client', email: 'client@example.test',
      active: true, role: 'CLIENT', permissions: [], passwordHash: await bcrypt.hash('FixturePassword123!', 4) });
    app.get(AuthSessionsService).create = async (payload) => {
      assert.equal(payload.sub, 'runtime-client');
      return { accessToken: 'fixture-access', refreshToken: 'fixture-refresh' };
    };
    const validLogin = await fetch(`${base}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'client@example.test', password: 'FixturePassword123!' }),
    });
    assert.equal(validLogin.status, 201);
    assert.deepEqual(await validLogin.json(), { accessToken: 'fixture-access', refreshToken: 'fixture-refresh' });
    for (const [path, body] of [
      ['forgot-password', { email: 'missing@example.test' }],
      ['reset-password', { resetToken: 'r'.repeat(43), password: 'FixturePassword123!' }],
    ]) {
      const response = await fetch(`${base}/api/auth/${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      assert.equal(response.status, 503);
      const error = await response.json();
      assert.match(error.message, /no está configurada/);
      assert.equal(error.code, 'PASSWORD_RECOVERY_UNAVAILABLE');
    }
    assert.equal(notifications.timer, undefined);
    assert.deepEqual(await notifications.dispatch(), { processed: 0 });
    const dispatch = await fetch(`${base}/api/internal/notifications/dispatch`, { method: 'POST' });
    assert.equal(dispatch.status, 401);
  } finally {
    if (app) await app.close();
    if (originalVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = originalVercel;
  }
});
