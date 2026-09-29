import type { Order } from "./types";

export function orderBalance(order: Pick<Order, "total" | "paidTotal">) {
  const total = Math.round(Number(order.total) * 100);
  const paid = Math.round(Number(order.paidTotal ?? 0) * 100);
  return {
    paid: paid / 100,
    due: Math.max(0, total - paid) / 100,
    status: paid <= 0 ? "Sin pagos" : paid < total ? "Parcial" : "Completo",
  };
}
