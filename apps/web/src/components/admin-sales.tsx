"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, RefreshCw } from "lucide-react";
import { money } from "@/lib/commerce";
import { apiQueryKey, request, useSession } from "./providers";
import { ErrorBox, Loading } from "./ui";

type Period = "today" | "7d" | "30d" | "90d";
type Sales = {
  period: Period;
  startAt: string;
  today: { orders: number; amount: number };
  current: { orders: number; amount: number; units: number; collected: number };
  previous: { orders: number; amount: number };
  changePercent: number | null;
  series: { bucket: string; orders: number; amount: number }[];
  topProducts: { id: string; name: string; units: number; amount: number }[];
};

const periods: [Period, string][] = [["today", "Hoy"], ["7d", "7 días"], ["30d", "30 días"], ["90d", "90 días"]];

function chartData(sales: Sales) {
  const values = new Map(sales.series.map((point) => [point.bucket, point.amount]));
  const count = sales.period === "today" ? 24 : sales.period === "7d" ? 7 : sales.period === "30d" ? 30 : 90;
  const buckets = Array.from({ length: count }, (_, index) => {
    const key = sales.period === "today"
      ? String(index).padStart(2, "0")
      : new Date(new Date(sales.startAt).getTime() + index * 86400000).toISOString().slice(0, 10);
    return { key, amount: values.get(key) ?? 0 };
  });
  if (sales.period !== "90d") return buckets;
  return Array.from({ length: Math.ceil(buckets.length / 7) }, (_, index) => ({
    key: buckets[index * 7].key,
    amount: buckets.slice(index * 7, index * 7 + 7).reduce((sum, day) => sum + day.amount, 0),
  }));
}

export function AdminSales() {
  const { user } = useSession();
  const [period, setPeriod] = useState<Period>("7d");
  const path = `admin/sales?period=${period}`;
  const q = useQuery<Sales>({
    queryKey: apiQueryKey(path, user?.id),
    queryFn: () => request<Sales>(path),
    enabled: !!user,
    refetchInterval: period === "today" ? 60000 : false,
  });
  return (
    <section className="admin-sales">
      <div className="admin-sales-heading">
        <div><h2>Ventas</h2><p className="muted small-copy">Resumen de la tienda</p></div>
        <div className="admin-sales-controls">
          <div className="admin-sales-periods" role="group" aria-label="Período de ventas">
            {periods.map(([value, title]) => (
              <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)}>{title}</button>
            ))}
          </div>
          <button className="icon-button" type="button" title="Actualizar ventas" aria-label="Actualizar ventas" onClick={() => void q.refetch()}><RefreshCw size={17} /></button>
        </div>
      </div>
      {q.isPending ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={() => void q.refetch()} /> : (
        <>
          <div className="admin-sales-today">
            <div><span>Pedidos de hoy</span><strong>{q.data.today.orders}</strong></div>
            <div><span>Importe de hoy</span><strong>{money(q.data.today.amount)}</strong></div>
          </div>
          <div className="admin-sales-metrics">
            <div><span>Importe de pedidos</span><strong>{money(q.data.current.amount)}</strong>
              <small className={q.data.changePercent !== null && q.data.changePercent < 0 ? "is-negative" : "is-positive"}>
                {q.data.changePercent === null ? "Sin período anterior" : <>{q.data.changePercent >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(q.data.changePercent)}% vs. período anterior</>}
              </small>
            </div>
            <div><span>Pedidos</span><strong>{q.data.current.orders}</strong></div>
            <div><span>Unidades</span><strong>{q.data.current.units}</strong></div>
            <div><span>Cobrado</span><strong>{money(q.data.current.collected)}</strong></div>
          </div>
          <div className="admin-sales-detail">
            <div className="admin-sales-chart-wrap">
              <h3>Evolución de pedidos</h3>
              {(() => {
                const bars = chartData(q.data);
                const max = Math.max(1, ...bars.map((bar) => bar.amount));
                return <div className="admin-sales-chart" role="img" aria-label={`Gráfico de importe de pedidos para ${periods.find(([value]) => value === period)?.[1]}`}>
                  {bars.map((bar, index) => (
                    <div className="admin-sales-bar-column" key={bar.key} title={`${bar.key}: ${money(bar.amount)}`}>
                      <div className="admin-sales-bar" style={{ height: `${Math.max(bar.amount > 0 ? 3 : 0, bar.amount / max * 100)}%` }} />
                      <span>{index === 0 || index === bars.length - 1 || (period === "7d" && index % 2 === 0) ? period === "today" ? `${bar.key}h` : bar.key.slice(5) : ""}</span>
                    </div>
                  ))}
                </div>;
              })()}
            </div>
            <div className="admin-sales-top">
              <h3>Productos más pedidos</h3>
              {q.data.topProducts.length ? <ol>{q.data.topProducts.map((product) => (
                <li key={`${product.id}-${product.name}`}><span>{product.name}</span><strong>{product.units} u.</strong></li>
              ))}</ol> : <p className="muted small-copy">Sin pedidos en este período.</p>}
            </div>
          </div>
          <p className="muted small-copy admin-sales-footnote">El importe corresponde a pedidos enviados; cobrado suma abonos vigentes registrados en el período.</p>
        </>
      )}
    </section>
  );
}
