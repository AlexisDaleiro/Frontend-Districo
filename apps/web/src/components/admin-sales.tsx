"use client";

import { useState, type PointerEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, RefreshCw } from "lucide-react";
import { money } from "@/lib/commerce";
import { apiQueryKey, request, useSession } from "./providers";
import { ErrorBox, Loading } from "./ui";

type Period = "today" | "7d" | "30d" | "90d";
type Sales = {
  period: Period;
  timezone?: string;
  startAt: string;
  today: { orders: number; amount: number };
  current: { orders: number; amount: number; units: number; collected: number };
  previous: { orders: number; amount: number };
  changePercent: number | null;
  series: { bucket: string; orders: number; amount: number }[];
  topProducts: { id: string; name: string; units: number; amount: number }[];
};

const periods: [Period, string][] = [["today", "Hoy"], ["7d", "7 días"], ["30d", "30 días"], ["90d", "90 días"]];

type TrendPoint = { key: string; label: string; detail: string; amount: number; orders: number };

const dayFormat = (key: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("es-UY", { ...options, timeZone: "UTC" }).format(new Date(`${key}T00:00:00Z`));
const dayMonth = (key: string) => `${key.slice(8, 10)}/${key.slice(5, 7)}`;
const shortMoney = (value: number) =>
  value >= 1e6 ? `$ ${(value / 1e6).toLocaleString("es-UY", { maximumFractionDigits: 1 })} M`
    : value >= 1e3 ? `$ ${Math.round(value / 1e3)} k` : `$ ${Math.round(value)}`;

function currentHour(timezone = "America/Montevideo") {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: timezone }).format(new Date()));
}

function chartData(sales: Sales): TrendPoint[] {
  const values = new Map(sales.series.map((point) => [point.bucket, point]));
  if (sales.period === "today") {
    // Las horas que todavía no pasaron no se dibujan como ventas en cero.
    return Array.from({ length: currentHour(sales.timezone) + 1 }, (_, hour) => {
      const key = String(hour).padStart(2, "0");
      return { key, label: `${key} h`, detail: `De ${key}:00 a ${key}:59`, amount: values.get(key)?.amount ?? 0, orders: values.get(key)?.orders ?? 0 };
    });
  }
  const count = sales.period === "7d" ? 7 : sales.period === "30d" ? 30 : 90;
  const days = Array.from({ length: count }, (_, index) => {
    const key = new Date(new Date(sales.startAt).getTime() + index * 86400000).toISOString().slice(0, 10);
    return {
      key,
      label: sales.period === "7d" ? dayFormat(key, { weekday: "short", day: "numeric" }).replace(".", "") : dayMonth(key),
      detail: dayFormat(key, { weekday: "long", day: "numeric", month: "long" }),
      amount: values.get(key)?.amount ?? 0,
      orders: values.get(key)?.orders ?? 0,
    };
  });
  if (sales.period !== "90d") return days;
  return Array.from({ length: Math.ceil(days.length / 7) }, (_, index) => {
    const week = days.slice(index * 7, index * 7 + 7);
    return {
      key: week[0].key,
      label: dayMonth(week[0].key),
      detail: `Semana del ${dayMonth(week[0].key)} al ${dayMonth(week[week.length - 1].key)}`,
      amount: week.reduce((sum, day) => sum + day.amount, 0),
      orders: week.reduce((sum, day) => sum + day.orders, 0),
    };
  });
}

function niceMax(value: number) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((candidate) => value / magnitude <= candidate) ?? 10;
  return step * magnitude;
}

function SalesTrend({ sales, periodLabel }: { sales: Sales; periodLabel: string }) {
  const points = chartData(sales);
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(...points.map((point) => point.amount)));
  const lead = max / 10 ** Math.floor(Math.log10(max));
  const steps = lead === 2.5 || lead === 5 ? 5 : 4;
  const empty = points.every((point) => point.amount === 0);
  const ticks = empty ? [0] : Array.from({ length: steps + 1 }, (_, index) => max * index / steps);
  const last = points.length - 1;
  const x = (index: number) => (last === 0 ? 50 : index / last * 100);
  const y = (amount: number) => 100 - amount / max * 100;
  const line = points.map((point, index) => `${x(index)},${y(point.amount)}`).join(" L");
  const labelEvery = Math.max(1, Math.ceil(points.length / 5));
  const edgeName = sales.period === "today" ? "Ahora" : sales.period === "90d" ? null : "Hoy";
  const current = active === null ? null : points[active];
  const select = (index: number) => setActive(Math.min(last, Math.max(0, index)));
  const pick = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    select(Math.round((event.clientX - box.left) / box.width * last));
  };
  const describe = (point: TrendPoint) => `${point.detail}: ${money(point.amount)}, ${point.orders} ${point.orders === 1 ? "pedido" : "pedidos"}`;
  const align = (index: number) => (x(index) < 18 ? "is-start" : x(index) > 82 ? "is-end" : "");

  return (
    <div className="admin-sales-trend">
      <div className="admin-sales-trend-axis" aria-hidden="true">
        {ticks.map((tick) => <span key={tick} style={{ top: `${y(tick)}%` }}>{shortMoney(tick)}</span>)}
      </div>
      <div
        className="admin-sales-trend-plot"
        tabIndex={0}
        role="group"
        aria-label={`Evolución del importe de pedidos, ${periodLabel}. Usá las flechas para recorrer los valores.`}
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        onKeyDown={(event) => {
          const moves: Record<string, number> = { ArrowRight: (active ?? -1) + 1, ArrowLeft: (active ?? points.length) - 1, Home: 0, End: last };
          if (event.key in moves) { event.preventDefault(); select(moves[event.key]); }
          else if (event.key === "Escape") setActive(null);
        }}
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {ticks.map((tick) => <line key={tick} className={tick === 0 ? "is-base" : undefined} x1="0" x2="100" y1={y(tick)} y2={y(tick)} />)}
          <path className="admin-sales-trend-area" d={`M${x(0)},100 L${line} L${x(last)},100 Z`} />
          <path className="admin-sales-trend-line" d={`M${line}`} />
          {current && <line className="admin-sales-trend-guide" x1={x(active!)} x2={x(active!)} y1="0" y2="100" />}
        </svg>
        <span className="admin-sales-trend-end" aria-hidden="true" style={{ left: `${x(last)}%`, top: `${y(points[last].amount)}%` }} />
        {!current && !empty && <span className="admin-sales-trend-end-label" aria-hidden="true" style={{ left: `${x(last)}%`, top: `${y(points[last].amount)}%` }}>{shortMoney(points[last].amount)}</span>}
        {current && <>
          <span className="admin-sales-trend-dot" aria-hidden="true" style={{ left: `${x(active!)}%`, top: `${y(current.amount)}%` }} />
          <div className="admin-sales-trend-tip" aria-hidden="true" style={{
            left: `${x(active!)}%`,
            top: `${y(current.amount)}%`,
            // Se ubica arriba del punto, o debajo cuando el punto está cerca del borde superior.
            transform: `translate(${x(active!) < 18 ? "-12px" : x(active!) > 82 ? "calc(-100% + 12px)" : "-50%"}, ${y(current.amount) < 40 ? "14px" : "calc(-100% - 14px)"})`,
          }}>
            <strong>{money(current.amount)}</strong> · {current.orders} {current.orders === 1 ? "pedido" : "pedidos"}<br />{current.detail}
          </div>
        </>}
        {empty && <p className="admin-sales-trend-empty muted small-copy">Sin pedidos en este período.</p>}
      </div>
      <div className="admin-sales-trend-labels" aria-hidden="true">
        {points.map((point, index) => (index === last || (index % labelEvery === 0 && last - index >= labelEvery * 0.6)) && (
          <span key={point.key} className={`${align(index)} ${index === last ? "is-current" : ""}`} style={{ left: `${x(index)}%` }}>
            {index === last && edgeName ? edgeName : point.label}
          </span>
        ))}
      </div>
      <p className="visually-hidden" aria-live="polite">{current ? describe(current) : ""}</p>
      <table className="visually-hidden">
        <caption>Importe de pedidos, {periodLabel}</caption>
        <thead><tr><th scope="col">Período</th><th scope="col">Importe</th><th scope="col">Pedidos</th></tr></thead>
        <tbody>{points.map((point) => <tr key={point.key}><th scope="row">{point.detail}</th><td>{money(point.amount)}</td><td>{point.orders}</td></tr>)}</tbody>
      </table>
    </div>
  );
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
              <SalesTrend key={period} sales={q.data} periodLabel={periods.find(([value]) => value === period)?.[1] ?? ""} />
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
