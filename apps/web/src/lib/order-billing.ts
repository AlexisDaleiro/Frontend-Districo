import type { Order } from "./types";

export function orderBalance(order: Pick<Order, "total" | "paidTotal" | "creditedTotal" | "refundedTotal">) {
  const total = Math.round(Number(order.total) * 100);
  const paid = Math.round(Number(order.paidTotal ?? 0) * 100);
  const credited = Math.round(Number(order.creditedTotal ?? 0) * 100);
  const refunded = Math.round(Number(order.refundedTotal ?? 0) * 100);
  const netTotal = Math.max(0, total - credited);
  const netPaid = Math.max(0, paid - refunded);
  return {
    paid: netPaid / 100,
    credited: credited / 100,
    refunded: refunded / 100,
    refundable: Math.max(0, Math.min(paid, credited) - refunded) / 100,
    creditable: Math.max(0, total - credited) / 100,
    due: Math.max(0, netTotal - netPaid) / 100,
    status: netTotal === 0 ? "Acreditado" : netPaid >= netTotal ? "Completo" : netPaid <= 0 ? "Pendiente" : "Parcial",
  };
}
