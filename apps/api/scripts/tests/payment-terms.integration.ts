import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { databaseError, loadBackendEnv } from '../script-env';
import { createPaymentSchedule } from '../../src/common/business/payment-terms';

async function main() {
  loadBackendEnv();
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const rollback = new Error('ROLLBACK_PAYMENT_TEST');
  try {
    const [access] = await prisma.$queryRaw<{ anonymous_can_run: boolean; authenticated_can_run: boolean }[]>`
      SELECT has_function_privilege('anon', 'public.refresh_customer_payment_status(text)', 'EXECUTE') AS anonymous_can_run,
        has_function_privilege('authenticated', 'public.refresh_customer_payment_status(text)', 'EXECUTE') AS authenticated_can_run`;
    assert.equal(access.anonymous_can_run, false, 'Visitors cannot invoke private bookkeeping functions');
    assert.equal(access.authenticated_can_run, false, 'Supabase API users cannot invoke private bookkeeping functions');
    await prisma.$transaction(async (tx) => {
      const id = randomUUID();
      const customer = await tx.customerAccount.create({ data: { businessName: 'Test temporal cuotas', legalName: 'Test', rut: `TEST-${id}`, accountStatus: 'APPROVED' } });
      const user = await tx.user.create({ data: { email: `payment-${id}@example.test`, passwordHash: 'unused-test-hash', role: 'CLIENT', customerAccountId: customer.id } });
      const schedule = createPaymentSchedule(100.01, 3, new Date());
      const createOrder = (data: object = {}) => tx.order.create({ data: { orderNumber: `TEST-${randomUUID()}`, userId: user.id, customerAccountId: customer.id,
        total: '100.01', subtotal: '100.01', discountTotal: 0, paymentMethod: 'INSTALLMENTS', paymentTermMonths: 3, installmentCount: 3,
        paymentSchedule: schedule, paymentDueAt: new Date(schedule[2].dueAt), ...data } });
      const status = async () => (await tx.customerAccount.findUniqueOrThrow({ where: { id: customer.id } })).creditStatus;
      const order = await createOrder();
      assert.equal(await status(), 'PAYMENT_PENDING');
      schedule[0].dueAt = new Date(Date.now() - 3600000).toISOString();
      await tx.order.update({ where: { id: order.id }, data: { paymentSchedule: schedule } });
      assert.equal(await status(), 'PAYMENT_DELAY');
      await tx.order.update({ where: { id: order.id }, data: { paidTotal: '33.34' } });
      assert.equal(await status(), 'PAYMENT_PENDING');
      await tx.order.update({ where: { id: order.id }, data: { paidTotal: '33.33' } });
      assert.equal(await status(), 'PAYMENT_DELAY');
      await tx.order.update({ where: { id: order.id }, data: { creditedTotal: '0.01' } });
      assert.equal(await status(), 'PAYMENT_PENDING');
      await tx.order.update({ where: { id: order.id }, data: { refundedTotal: '0.01' } });
      assert.equal(await status(), 'PAYMENT_DELAY');
      await tx.order.update({ where: { id: order.id }, data: { paidTotal: '100.01', creditedTotal: 0, refundedTotal: 0 } });
      assert.equal(await status(), 'GOOD_STANDING');
      await tx.order.update({ where: { id: order.id }, data: { paidTotal: 0 } });
      assert.equal(await status(), 'PAYMENT_DELAY');
      const another = await createOrder({ paymentSchedule: createPaymentSchedule(100.01, 3, new Date()) });
      assert.equal(await status(), 'PAYMENT_DELAY', 'An overdue order takes precedence over a new pending order');
      await tx.order.update({ where: { id: order.id }, data: { status: 'REJECTED' } });
      assert.equal(await status(), 'PAYMENT_PENDING');
      await tx.order.update({ where: { id: another.id }, data: { status: 'CANCELLED' } });
      assert.equal(await status(), 'GOOD_STANDING');
      const cash = await createOrder({ paymentMethod: 'CASH', paymentTermMonths: null, installmentCount: 1, paymentSchedule: [], paymentDueAt: null });
      assert.equal(await status(), 'PAYMENT_PENDING');
      const delivered = await tx.order.update({ where: { id: cash.id }, data: { status: 'DELIVERED' } });
      assert.ok(delivered.deliveredAt);
      assert.equal(delivered.paymentDueAt?.toISOString(), delivered.deliveredAt?.toISOString());
      assert.equal(await status(), 'PAYMENT_DELAY');
      await tx.order.update({ where: { id: cash.id }, data: { paidTotal: '100.01' } });
      assert.equal(await status(), 'GOOD_STANDING');
      await tx.customerAccount.update({ where: { id: customer.id }, data: { creditStatus: 'RESTRICTED' } });
      await tx.$queryRaw`SELECT public.refresh_customer_payment_status(${customer.id})::text`;
      assert.equal(await status(), 'RESTRICTED');
      const audits = await tx.auditLog.count({ where: { entityId: customer.id, action: 'CUSTOMER_PAYMENT_STATUS_AUTOMATIC' } });
      assert.ok(audits >= 10);
      throw rollback;
    }, { timeout: 60000 });
  } catch (error) {
    if (error !== rollback) throw error;
    console.log('Supabase: cuotas, atraso, pagos, anulaciones, crédito, reintegros y contado verificados. Pruebas revertidas sin dejar datos.');
  } finally { await prisma.$disconnect(); }
}
main().catch((error: unknown) => { console.error(error instanceof assert.AssertionError ? error.stack : databaseError(error)); process.exitCode = 1; });
