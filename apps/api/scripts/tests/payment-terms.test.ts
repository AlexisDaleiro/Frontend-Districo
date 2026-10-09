import assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { createPaymentSchedule, normalizePaymentTerms } from '../../src/common/business/payment-terms';

assert.deepEqual(normalizePaymentTerms({}), { paymentMethod: 'CASH', paymentTermMonths: null, installmentCount: 1 });
for (const months of [1, 3, 6]) {
  assert.equal(normalizePaymentTerms({ paymentMethod: 'INSTALLMENTS', paymentTermMonths: months }).installmentCount, months);
  const schedule = createPaymentSchedule(100.01, months, new Date('2026-01-31T18:00:00Z'));
  assert.equal(schedule.length, months);
  assert.equal(schedule.reduce((sum, item) => sum + item.amountCents, 0), 10001);
  assert.equal(schedule[0].dueAt, '2026-03-01T02:59:59.999Z');
  if (months > 1) assert.equal(schedule[1].dueAt, '2026-04-01T02:59:59.999Z');
}
assert.equal(createPaymentSchedule(60, 1, new Date('2026-02-01T01:00:00Z'))[0].dueAt, '2026-03-01T02:59:59.999Z');
assert.equal(createPaymentSchedule(60, 1, new Date('2028-01-31T18:00:00Z'))[0].dueAt, '2028-03-01T02:59:59.999Z');
assert.equal(createPaymentSchedule(0.01, 6, new Date())[0].amountCents, 1);
assert.throws(() => normalizePaymentTerms({ paymentMethod: 'INSTALLMENTS' }), BadRequestException);
assert.throws(() => normalizePaymentTerms({ paymentMethod: 'INSTALLMENTS', paymentTermMonths: 2 }), BadRequestException);
assert.throws(() => normalizePaymentTerms({ paymentMethod: 'CASH', paymentTermMonths: 3 }), BadRequestException);
assert.throws(() => normalizePaymentTerms({ paymentMethod: 'OTHER' }), BadRequestException);
assert.throws(() => createPaymentSchedule(-1, 3, new Date()), BadRequestException);
console.log('Payment terms: calendar, rounding and validation passed.');
