"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search, RotateCcw } from "lucide-react";
import { useApi } from "./providers";
import { ListPagination } from "./admin-list-filters";
import { Empty, ErrorBox, Loading } from "./ui";
import { label, money } from "@/lib/commerce";
import { storeRoutes, withSearch } from "@/lib/store-routes";
import { RepeatOrderButton } from "./repeat-order-button";

export type OrderSummary = {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  total: number;
  paidTotal: number;
  creditedTotal: number;
  refundedTotal: number;
  currency: string;
  itemCount: number;
};
export function CustomerOrdersList() {
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const filters = new URLSearchParams();
  for (const key of [
    "search",
    "status",
    "paymentStatus",
    "dateFrom",
    "dateTo",
    "page",
  ])
    if (params.get(key)) filters.set(key, params.get(key)!);
  filters.set("limit", "12");
  const q = useApi<{
    items: OrderSummary[];
    meta: { total: number; page: number; limit: number };
  }>(`orders/me/page?${filters}`);
  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    window.history.pushState(null, "", withSearch(storeRoutes.orders, next));
  }
  return (
    <section aria-label="Historial de pedidos">
      <form
        className="admin-toolbar"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          set("search", search.trim());
        }}
      >
        <label className="field">
          Número de pedido
          <input
            className="form-input"
            type="search"
            maxLength={120}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <button
          className="icon-button"
          type="submit"
          title="Buscar pedidos"
          aria-label="Buscar pedidos"
        >
          <Search size={18} />
        </button>
        <label className="field">
          Estado
          <select
            className="form-input"
            value={params.get("status") ?? ""}
            onChange={(event) => set("status", event.target.value)}
          >
            <option value="">Todos</option>
            {[
              "SUBMITTED",
              "PENDING_REVIEW",
              "APPROVED",
              "PROCESSING",
              "SHIPPED",
              "DELIVERED",
              "REJECTED",
              "CANCELLED",
            ].map((value) => (
              <option key={value} value={value}>
                {label(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Pago
          <select
            className="form-input"
            value={params.get("paymentStatus") ?? ""}
            onChange={(event) => set("paymentStatus", event.target.value)}
          >
            <option value="">Todos</option>
            <option value="PENDING">Pendiente</option>
            <option value="PARTIAL">Parcial</option>
            <option value="PAID">Pagado</option>
            <option value="CREDITED">Acreditado</option>
          </select>
        </label>
        <label className="field">
          Desde
          <input
            className="form-input"
            type="date"
            value={params.get("dateFrom") ?? ""}
            onChange={(event) => set("dateFrom", event.target.value)}
          />
        </label>
        <label className="field">
          Hasta
          <input
            className="form-input"
            type="date"
            value={params.get("dateTo") ?? ""}
            onChange={(event) => set("dateTo", event.target.value)}
          />
        </label>
        <button
          className="icon-button"
          type="button"
          title="Limpiar filtros"
          aria-label="Limpiar filtros"
          onClick={() => {
            setSearch("");
            window.history.pushState(null, "", storeRoutes.orders);
          }}
        >
          <RotateCcw size={18} />
        </button>
      </form>
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} retry={() => void q.refetch()} />
      ) : (
        <>
          {q.data.items.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th>Productos</th>
                    <th>Total</th>
                    <th>Saldo</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.items.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link
                          className="text-link"
                          href={`${storeRoutes.order(order.id)}?back=${encodeURIComponent(withSearch(storeRoutes.orders, new URLSearchParams(params)))}`}
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td>
                        {new Date(order.createdAt).toLocaleDateString("es-UY")}
                      </td>
                      <td>{label(order.status)}</td>
                      <td>{order.itemCount}</td>
                      <td>{money(order.total, order.currency)}</td>
                      <td>
                        {money(
                          Math.max(
                            0,
                            Number(order.total) -
                              Number(order.creditedTotal) -
                              Number(order.paidTotal) +
                              Number(order.refundedTotal),
                          ),
                          order.currency,
                        )}
                      </td>
                      <td>
                        <RepeatOrderButton orderId={order.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="No hay pedidos con estos filtros" />
          )}
          <ListPagination
            meta={q.data.meta}
            onPage={(page) => set("page", String(page))}
          />
        </>
      )}
    </section>
  );
}
