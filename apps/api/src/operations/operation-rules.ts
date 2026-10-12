import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

export const closedOrders = ["DRAFT", "CANCELLED", "REJECTED"] as const;
export function cents(amount: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(amount).mul(100).round().toNumber();
}
export function remaining(
  total: Prisma.Decimal | number | string,
  paid: Prisma.Decimal | number | string,
  credited: Prisma.Decimal | number | string = 0,
  refunded: Prisma.Decimal | number | string = 0,
) {
  return (
    Math.max(
      0,
      cents(total) - cents(paid) - cents(credited) + cents(refunded),
    ) / 100
  );
}
export function agingBucket(dueAt: Date | null, now = new Date()) {
  if (!dueAt || dueAt > now) return "CURRENT";
  const days = Math.floor((now.getTime() - dueAt.getTime()) / 86400000);
  return days <= 30
    ? "1_30"
    : days <= 60
      ? "31_60"
      : days <= 90
        ? "61_90"
        : "90_PLUS";
}
export function overdueInstallments(order: {
  total: Prisma.Decimal;
  paidTotal: Prisma.Decimal;
  creditedTotal: Prisma.Decimal;
  refundedTotal: Prisma.Decimal;
  paymentSchedule: Prisma.JsonValue | null;
  paymentDueAt: Date | null;
}) {
  let paid =
    cents(order.paidTotal) -
    cents(order.refundedTotal) +
    cents(order.creditedTotal);
  if (Array.isArray(order.paymentSchedule) && order.paymentSchedule.length) {
    for (const entry of order.paymentSchedule) {
      const item = entry as { amountCents?: number; dueAt?: string };
      const amount = Number(item.amountCents ?? 0);
      if (paid >= amount) {
        paid -= amount;
        continue;
      }
      return item.dueAt ? new Date(item.dueAt) : null;
    }
    return null;
  }
  return remaining(
    order.total,
    order.paidTotal,
    order.creditedTotal,
    order.refundedTotal,
  )
    ? order.paymentDueAt
    : null;
}
export function validateQuantities(
  lines: { orderItemId: string; quantity: number }[],
  available: Map<string, number>,
) {
  const seen = new Set<string>();
  for (const line of lines) {
    if (
      seen.has(line.orderItemId) ||
      !Number.isInteger(line.quantity) ||
      line.quantity <= 0 ||
      line.quantity > (available.get(line.orderItemId) ?? 0)
    )
      throw new BadRequestException(
        "Las cantidades superan lo pendiente o repiten un producto.",
      );
    seen.add(line.orderItemId);
  }
  if (!lines.length)
    throw new BadRequestException("Seleccioná al menos un producto.");
}
