import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomBytes } from 'node:crypto';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PDFDocument, PDFName, PDFString } from 'pdf-lib';
import { Prisma, Role } from '@prisma/client';
import { decryptMfa, encryptMfa, securityHash } from '../../src/auth/mfa-crypto';
import { validateCv, presentCandidate } from '../../src/jobs/job-applications.service';
import { redactSecurityFields } from '../../src/common/interceptors/sensitive-fields.interceptor';
import { JwtStrategy } from '../../src/auth/jwt.strategy';

test('MFA encryption binds the secret to its owner and detects tampering', () => {
  const key = randomBytes(32), encoded = encryptMfa('fixture-secret', key, 'owner');
  assert.equal(decryptMfa(encoded, key, 'owner'), 'fixture-secret');
  assert.ok(!encoded.includes('fixture-secret'));
  assert.throws(() => decryptMfa(encoded, key, 'other-user'));
  assert.throws(() => decryptMfa(encoded, randomBytes(32), 'owner'));
  assert.notEqual(securityHash('first-code'), securityHash('second-code'));
});
test('PDF CV validation rejects fake MIME, oversized, empty and scripted files', async () => {
  const pdf = await PDFDocument.create(); pdf.addPage();
  const bytes = Buffer.from(await pdf.save());
  const file = { buffer: bytes, mimetype: 'application/pdf', originalname: 'cv.pdf', size: bytes.length };
  assert.equal((await validateCv(file)).originalname, 'cv.pdf');
  assert.equal((await validateCv({ ...file, originalname: 'curriculum.bat' })).originalname, 'curriculum.pdf');
  for (const invalid of [undefined, { ...file, mimetype: 'image/png' }, { ...file, size: 6 * 1024 * 1024 }, { ...file, buffer: Buffer.from('not-pdf') }]) await assert.rejects(() => validateCv(invalid), BadRequestException);
  const action = pdf.context.obj({ S: PDFName.of('JavaScript'), JS: PDFString.of('alert(1)') });
  pdf.catalog.set(PDFName.of('OpenAction'), pdf.context.register(action));
  const scripted = Buffer.from(await pdf.save());
  await assert.rejects(() => validateCv({ ...file, buffer: scripted, size: scripted.length }), BadRequestException);
  const nested = await PDFDocument.create(); nested.addPage();
  nested.catalog.set(PDFName.of('NestedFixture'), nested.context.obj([{ S: PDFName.of('Launch'), F: PDFString.of('program.exe') }]));
  const embedded = Buffer.from(await nested.save());
  await assert.rejects(() => validateCv({ ...file, buffer: embedded, size: embedded.length }), BadRequestException);
});
test('responses never serialize private paths or stored authentication secrets', () => {
  assert.deepEqual(redactSecurityFields({ user: { email: 'a@example.test', mfaSecretEncrypted: 'private', codeHash: 'private', passwordHash: 'private' }, recoveryCodes: ['one-time-code'] }), { user: { email: 'a@example.test' }, recoveryCodes: ['one-time-code'] });
  const shown = presentCandidate({ id: 'candidate', cvPath: 'private/path', submissionId: 'request' } as never);
  assert.deepEqual(shown, { id: 'candidate' });
  assert.deepEqual(JSON.parse(JSON.stringify(redactSecurityFields({ amount: new Prisma.Decimal('1250.25'), passwordHash: 'private' }))), { amount: '1250.25' });
});
test('JWT access checks session ownership, revocation, token purpose and MFA verification', async () => {
  const user = { id: 'owner', email: 'a@example.test', role: Role.ADMIN, active: true, permissions: [], customerAccountId: null, mfaEnabledAt: null as Date | null };
  let session: any = { id: 'session', userId: 'owner', revokedAt: null, expiresAt: new Date(Date.now() + 60000), lastSeenAt: new Date(), mfaVerifiedAt: null };
  const prisma = { authSession: { findFirst: async ({ where }: any) => session?.id === where.id && session?.userId === where.userId && !session?.revokedAt && session?.expiresAt > new Date() ? { ...session, user } : null } };
  const strategy = new JwtStrategy({ get: () => 'fixture-test-secret' } as never, prisma as never);
  const token = { sub: 'owner', email: user.email, role: Role.ADMIN, permissions: [], sid: 'session', purpose: 'access' };
  assert.equal((await strategy.validate(token)).sid, 'session');
  await assert.rejects(() => strategy.validate({ ...token, purpose: 'mfa' }), UnauthorizedException);
  await assert.rejects(() => strategy.validate({ ...token, sid: undefined }), UnauthorizedException);
  session.revokedAt = new Date(); await assert.rejects(() => strategy.validate(token), UnauthorizedException);
  session.revokedAt = null; session.userId = 'other'; await assert.rejects(() => strategy.validate(token), UnauthorizedException);
  session.userId = 'owner'; user.mfaEnabledAt = new Date(); await assert.rejects(() => strategy.validate(token), UnauthorizedException);
  session.mfaVerifiedAt = new Date(); assert.equal((await strategy.validate(token)).sid, 'session');
});
