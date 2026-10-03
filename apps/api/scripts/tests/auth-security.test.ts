import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ServiceUnavailableException } from '@nestjs/common';
import { AuthService } from '../../src/auth/auth.service';

test('password recovery never returns a reset token or accepts previously issued tokens without a delivery channel', async () => {
  let signed = false;
  let verified = false;
  let passwordUpdated = false;
  const jwt = {
    signAsync: async () => { signed = true; return 'unsafe-token'; },
    verifyAsync: async () => { verified = true; return { sub: 'admin-1', purpose: 'password-reset' }; },
  };
  const prisma = { user: { update: async () => { passwordUpdated = true; } } };
  const users = { findByEmail: async () => ({ id: 'admin-1', active: true, email: 'admin@example.test' }) };
  const auth = new AuthService({ get: () => undefined } as never, jwt as never, prisma as never, users as never);

  await assert.rejects(() => auth.forgotPassword({ email: 'admin@example.test' }), ServiceUnavailableException);
  await assert.rejects(() => auth.resetPassword({ resetToken: 'previously-issued-token', password: 'SafePassword123!' }), ServiceUnavailableException);
  assert.equal(signed, false);
  assert.equal(verified, false);
  assert.equal(passwordUpdated, false);
});
