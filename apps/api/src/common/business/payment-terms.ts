import { BadRequestException } from '@nestjs/common';

export type PaymentMethod = 'CASH' | 'INSTALLMENTS';
export type PaymentTermsInput = { paymentMethod?: string; paymentTermMonths?: number };
export type PaymentInstallment = { number: number; amountCents: number; dueAt: string };

export function normalizePaymentTerms(input: PaymentTermsInput) {
  const method = input.paymentMethod ?? 'CASH';
  if (method !== 'CASH' && method !== 'INSTALLMENTS') throw new BadRequestException('Elegí contado o cuotas.');
  if (method === 'CASH') {
    if (input.paymentTermMonths !== undefined && input.paymentTermMonths !== null) throw new BadRequestException('El pago al contado vence al entregar el pedido, sin plazo en meses.');
    return { paymentMethod: method, paymentTermMonths: null, installmentCount: 1 };
  }
  if (![1, 3, 6].includes(input.paymentTermMonths ?? 0)) throw new BadRequestException('Elegí un plazo de 1, 3 o 6 meses.');
  return { paymentMethod: method, paymentTermMonths: input.paymentTermMonths!, installmentCount: input.paymentTermMonths! };
}

export function createPaymentSchedule(total: number, months: number, confirmedAt: Date): PaymentInstallment[] {
  const cents = Math.round(total * 100);
  if (!Number.isSafeInteger(cents) || cents < 0 || ![1, 3, 6].includes(months)) throw new BadRequestException('Condiciones de pago inválidas.');
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Montevideo', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(confirmedAt);
  const part = (name: string) => Number(parts.find((item) => item.type === name)!.value);
  const year = part('year'), month = part('month') - 1, day = part('day');
  // Each due date keeps the original calendar day, clamped to month end in Uruguay.
  return Array.from({ length: months }, (_, index) => {
    const target = month + index + 1;
    const lastDay = new Date(Date.UTC(year, target + 1, 0)).getUTCDate();
    return { number: index + 1, amountCents: Math.floor(cents / months) + (index < cents % months ? 1 : 0),
      dueAt: new Date(Date.UTC(year, target, Math.min(day, lastDay) + 1, 2, 59, 59, 999)).toISOString() };
  });
}
