const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomBytes } = require('node:crypto');
const bcrypt = require('bcryptjs');
const { UnauthorizedException } = require('@nestjs/common');
const { Role } = require('@prisma/client');
const { MfaService } = require('../../dist/src/auth/mfa.service.js');
const { decryptMfa } = require('../../dist/src/auth/mfa-crypto.js');

test('the compiled API imports without require(ESM) support', () => {
  assert.ok(process.execArgv.includes('--no-experimental-require-module'));
  assert.equal(typeof require('../../dist/src/app.module.js').AppModule, 'function');
  assert.ok(!Object.keys(require.cache).some((path) => /[\\/]otplib[\\/]dist[\\/]index\.cjs$/.test(path)));
});

test('MFA setup and token verification use native ESM and reject token replay', async () => {
  const key = randomBytes(32);
  const password = 'RuntimeFixturePassword123!';
  const user = {
    id: 'runtime-admin', email: 'runtime-admin@example.test', role: Role.ADMIN,
    active: true, passwordHash: await bcrypt.hash(password, 4),
    mfaEnabledAt: null, mfaSecretEncrypted: null, mfaLastStep: null,
  };
  let pending;
  let writes = 0;
  const prisma = {
    user: {
      findUnique: async () => ({ ...user }),
      updateMany: async ({ where, data }) => {
        if (where.mfaSecretEncrypted !== user.mfaSecretEncrypted ||
            (user.mfaLastStep !== null && user.mfaLastStep >= where.OR[1].mfaLastStep.lt)) return { count: 0 };
        Object.assign(user, data);
        writes++;
        return { count: 1 };
      },
    },
    authSession: { updateMany: async ({ data }) => { pending = data; return { count: 1 }; } },
  };
  const config = { get: (name) => name === 'MFA_ENCRYPTION_KEY' ? key.toString('base64') : undefined };
  const service = new MfaService(config, prisma);
  const setup = await service.setup(user.id, 'runtime-session', password);
  assert.match(setup.manualKey, /^[A-Z2-7]+$/);
  assert.match(setup.qrDataUrl, /^data:image\/png;base64,/);
  assert.equal(decryptMfa(pending.pendingMfaSecret, key, user.id), setup.manualKey);
  user.mfaSecretEncrypted = pending.pendingMfaSecret;
  user.mfaEnabledAt = new Date();
  const { generate } = await import('otplib');
  const token = await generate({ secret: setup.manualKey });
  await assert.rejects(() => service.verifyCode(prisma, user.id, '123'), UnauthorizedException);
  assert.equal(writes, 0);
  await service.verifyCode(prisma, user.id, token);
  assert.equal(writes, 1);
  assert.equal(typeof user.mfaLastStep, 'number');
  await assert.rejects(() => service.verifyCode(prisma, user.id, token), UnauthorizedException);
  assert.equal(writes, 1);
});
