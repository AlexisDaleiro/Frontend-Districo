import type { Order } from "./types";
import { orderBalance } from "./order-billing";

export function paymentSchedulePreview(total: number, months: number, confirmedAt = new Date()) {
  if (![1, 3, 6].includes(months) || !Number.isFinite(total) || total < 0) throw new Error("Condiciones de pago inválidas.");
  const cents = Math.round(total * 100);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Montevideo", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(confirmedAt);
  const part = (name: string) => Number(parts.find((item) => item.type === name)!.value);
  const year = part("year"), month = part("month") - 1, day = part("day");
  return Array.from({ length: months }, (_, index) => {
    const target = month + index + 1;
    const lastDay = new Date(Date.UTC(year, target + 1, 0)).getUTCDate();
    return { number: index + 1, amountCents: Math.floor(cents / months) + (index < cents % months ? 1 : 0),
      dueAt: new Date(Date.UTC(year, target, Math.min(day, lastDay) + 1, 2, 59, 59, 999)).toISOString() };
  });
}

export const paymentDate = (date: string) => new Date(date).toLocaleDateString("es-UY", { timeZone: "America/Montevideo" });

export function orderInstallments(order: Order, now = new Date()) {
  const schedule = order.paymentMethod === "CASH"
    ? [{ number: 1, amountCents: Math.round(Number(order.total) * 100), dueAt: order.paymentDueAt ?? null }]
    : order.paymentSchedule ?? [];
  let settled = Math.round(Number(order.creditedTotal ?? 0) * 100) + Math.max(0, Math.round(Number(order.paidTotal ?? 0) * 100) - Math.round(Number(order.refundedTotal ?? 0) * 100));
  const inactive = ["DRAFT", "REJECTED", "CANCELLED"].includes(order.status);
  return schedule.map((installment) => {
    const applied = Math.min(installment.amountCents, settled);
    settled -= applied;
    const due = (installment.amountCents - applied) / 100;
    return { ...installment, due, status: inactive ? "Anulada" : due === 0 ? "Saldada" : installment.dueAt && new Date(installment.dueAt).getTime() <= now.getTime() ? "Atrasada" : "Pendiente" };
  });
}

export function customerPaymentStatus(orders: Order[], now = new Date()) {
  const open = orders.filter((order) => !["DRAFT", "REJECTED", "CANCELLED"].includes(order.status) && orderBalance(order).due > 0);
  return open.some((order) => orderInstallments(order, now).some((item) => item.status === "Atrasada"))
    ? "PAYMENT_DELAY" : open.length ? "PAYMENT_PENDING" : "GOOD_STANDING";
}
