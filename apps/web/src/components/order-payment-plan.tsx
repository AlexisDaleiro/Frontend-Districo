"use client";
import { money } from "@/lib/commerce";
import { orderBalance } from "@/lib/order-billing";
import { orderInstallments, paymentDate } from "@/lib/payment-terms";
import type { Order } from "@/lib/types";

export function OrderPaymentPlan({ order }: { order: Order }) {
  if (!order.paymentMethod) return null;
  const balance = orderBalance(order);
  return <section className="order-payment-plan" aria-label="Condiciones de pago">
    <h3>Condiciones de pago</h3>
    <p><strong>{order.paymentMethod === "CASH" ? "Al contado" : `${order.installmentCount} ${order.installmentCount === 1 ? "cuota mensual" : "cuotas mensuales"} · ${order.paymentTermMonths} ${order.paymentTermMonths === 1 ? "mes" : "meses"}`}</strong></p>
    <p className="small-copy">Pagado: {money(balance.paid, order.currency)} · Saldo pendiente: {money(balance.due, order.currency)}</p>
    <div className="table-wrap"><table><thead><tr><th>Cuota</th><th>Vencimiento</th><th>Importe</th><th>Saldo</th><th>Estado</th></tr></thead>
      <tbody>{orderInstallments(order).map((item) => <tr key={item.number}>
        <td>{item.number}</td><td>{item.dueAt ? paymentDate(item.dueAt) : "Al entregar el pedido"}</td>
        <td>{money(item.amountCents / 100, order.currency)}</td><td>{money(item.due, order.currency)}</td>
        <td><span className={`status-pill ${item.status === "Atrasada" ? "pending" : ""}`}>{item.status}</span></td>
      </tr>)}</tbody></table></div>
    {order.paymentMethod === "INSTALLMENTS" && <p className="small-copy muted">Vencimientos al finalizar el día en Uruguay. Abonos y notas de crédito se aplican a las cuotas más antiguas.</p>}
  </section>;
}
