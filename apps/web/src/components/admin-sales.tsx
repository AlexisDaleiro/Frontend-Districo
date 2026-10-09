"use client";

import { useEffect, useState, type PointerEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, Download, RefreshCw } from "lucide-react";
import { money } from "@/lib/commerce";
import { apiQueryKey, request, useApi, useSession, DEMO } from "./providers";
import { useAdminListField, ShareAdminList } from "./admin-list-navigation";
import { ListPagination } from "./admin-list-filters";
import { downloadPrivateFile } from "@/lib/http";
import { salesDate, shiftSalesDate, type SalesPeriod, type SalesReport } from "@/lib/sales-report";
import { ErrorBox, Loading } from "./ui";

type Sales = SalesReport;

const periods: [SalesPeriod, string][] = [["today", "Hoy"], ["7d", "7 días"], ["30d", "30 días"], ["90d", "90 días"], ["custom", "Personalizado"]];

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
  const count = sales.days;
  const days = Array.from({ length: count }, (_, index) => {
    const key = shiftSalesDate(sales.dateFrom, index);
    return {
      key,
      label: sales.period === "7d" ? dayFormat(key, { weekday: "short", day: "numeric" }).replace(".", "") : dayMonth(key),
      detail: dayFormat(key, { weekday: "long", day: "numeric", month: "long" }),
      amount: values.get(key)?.amount ?? 0,
      orders: values.get(key)?.orders ?? 0,
    };
  });
  if (count < 90) return days;
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
  const edgeName = sales.period === "today" ? "Ahora" : sales.dateTo === salesDate() && sales.days < 90 ? "Hoy" : null;
  const current = active === null ? null : points[active];
  const select = (index: number) => setActive(Math.min(last, Math.max(0, index)));
  const pick = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    select(Math.round((event.clientX - box.left) / box.width * last));
  };
  const describe = (point: TrendPoint) => `${point.detail}: ${money(point.amount, sales.currency)}, ${point.orders} ${point.orders === 1 ? "pedido" : "pedidos"}`;
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
            <strong>{money(current.amount, sales.currency)}</strong> · {current.orders} {current.orders === 1 ? "pedido" : "pedidos"}<br />{current.detail}
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
        <tbody>{points.map((point) => <tr key={point.key}><th scope="row">{point.detail}</th><td>{money(point.amount, sales.currency)}</td><td>{point.orders}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export function AdminSales() {
  const { user } = useSession();
  const [period, setPeriod] = useAdminListField('period', '7d', periods.map(([value]) => value));
  const [dateFrom, setDateFrom] = useAdminListField('dateFrom', shiftSalesDate(salesDate(), -6));
  const [dateTo, setDateTo] = useAdminListField('dateTo', salesDate());
  const [fromDraft, setFromDraft] = useState(dateFrom), [toDraft, setToDraft] = useState(dateTo);
  const [groupBy, setGroupBy] = useAdminListField('groupBy', 'salesperson', ['salesperson', 'customer', 'brand']);
  const [salespersonId, setSalesperson] = useAdminListField('salespersonId', '');
  const [customerId, setCustomer] = useAdminListField('customerId', '');
  const [brandId, setBrand] = useAdminListField('brandId', '');
  const [currency, setCurrency] = useAdminListField('currency', 'UYU', ['UYU', 'USD']);
  const [page, setPage] = useAdminListField('page', 1);
  const [customerSearch, setCustomerSearch] = useState(''), [customerTerm, setCustomerTerm] = useState('');
  const [exporting, setExporting] = useState(false), [exportError, setExportError] = useState<unknown>();
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string }>();
  useEffect(() => { const timer = setTimeout(() => setCustomerTerm(customerSearch.trim()), 250); return () => clearTimeout(timer); }, [customerSearch]);
  const options = useApi<{ salespeople: { id: string; name: string }[]; customers: { id: string; name: string; rut: string }[]; brands: { id: string; name: string }[] }>(`admin/sales/options?search=${encodeURIComponent(customerTerm)}`);
  const params = new URLSearchParams({ period, groupBy, currency, page: String(page), limit: '20' });
  if (period === 'custom') { params.set('dateFrom', dateFrom); params.set('dateTo', dateTo); }
  if (salespersonId) params.set('salespersonId', salespersonId);
  if (customerId) params.set('customerId', customerId);
  if (brandId) params.set('brandId', brandId);
  const path = `admin/sales?${params}`;
  const q = useQuery<Sales>({
    queryKey: apiQueryKey(path, user?.id),
    queryFn: () => request<Sales>(path),
    enabled: !!user,
    refetchInterval: period === "today" ? 60000 : false,
  });
  useEffect(() => {
    if (q.data && page > Math.max(1, Math.ceil(q.data.meta.total / q.data.meta.limit))) setPage(Math.max(1, Math.ceil(q.data.meta.total / q.data.meta.limit)));
  }, [q.data, page, setPage]);
  async function exportReport() {
    setExporting(true); setExportError(undefined);
    try {
      const exportParams = new URLSearchParams(params); exportParams.delete('page');
      const exportPath = `admin/sales/export?${exportParams}`;
      if (DEMO) {
        const csv = await request<string>(exportPath);
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a'); link.href = url; link.download = 'ventas.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else await downloadPrivateFile(exportPath, 'ventas.csv');
    } catch (error) { setExportError(error); }
    finally { setExporting(false); }
  }
  const groupTitle = groupBy === 'customer' ? 'Cliente' : groupBy === 'brand' ? 'Marca' : 'Vendedor';
  const customerChoices = [...(options.data?.customers ?? [])];
  if (customerId && !customerChoices.some((item) => item.id === customerId)) customerChoices.unshift({ id: customerId, name: selectedCustomer?.id === customerId ? selectedCustomer.name : 'Cliente seleccionado', rut: '' });
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
          <ShareAdminList />
          <button className="button secondary small" type="button" disabled={exporting || q.isPending || !!q.error} onClick={() => void exportReport()}><Download size={16} />{exporting ? 'Exportando…' : 'Exportar CSV'}</button>
        </div>
      </div>
      {period === 'custom' && <form className="admin-sales-date-range" onSubmit={(event) => { event.preventDefault(); setDateFrom(fromDraft); setDateTo(toDraft); setPage(1); }}>
        <label className="field">Desde<input className="form-input" type="date" required max={salesDate()} value={fromDraft} onChange={(event) => setFromDraft(event.target.value)} /></label>
        <label className="field">Hasta<input className="form-input" type="date" required min={fromDraft} max={salesDate()} value={toDraft} onChange={(event) => setToDraft(event.target.value)} /></label>
        <button className="button small secondary" type="submit">Aplicar fechas</button>
      </form>}
      <div className="admin-list-filters admin-sales-filters">
        <label className="field">Vendedor<select className="form-input" aria-label="Filtrar ventas por vendedor" value={salespersonId} onChange={(event) => { setSalesperson(event.target.value); setCustomer(''); setPage(1); }}><option value="">{user?.role === 'SALES' ? 'Mis clientes asignados' : 'Todos los vendedores'}</option>{options.data?.salespeople.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="field">Buscar cliente<input className="form-input" type="search" placeholder="Comercio, correo o RUT" maxLength={120} value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} /></label>
        <label className="field">Cliente<select className="form-input" aria-label="Filtrar ventas por cliente" value={customerId} onChange={(event) => { const id = event.target.value; setSelectedCustomer(customerChoices.find((item) => item.id === id)); setCustomer(id); setPage(1); }}><option value="">Todos los clientes</option>{customerChoices.map((item) => <option key={item.id} value={item.id}>{item.name}{item.rut ? ` · ${item.rut}` : ''}</option>)}</select></label>
        <label className="field">Marca<select className="form-input" aria-label="Filtrar ventas por marca" value={brandId} onChange={(event) => { setBrand(event.target.value); setPage(1); }}><option value="">Todas las marcas</option>{options.data?.brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="field">Moneda<select className="form-input" aria-label="Moneda del informe" value={currency} onChange={(event) => { setCurrency(event.target.value); setPage(1); }}><option value="UYU">Pesos uruguayos</option><option value="USD">Dólares</option></select></label>
        <button className="icon-button" title="Limpiar filtros de ventas" aria-label="Limpiar filtros de ventas" disabled={!(salespersonId || customerId || brandId || customerSearch || currency !== 'UYU')} onClick={() => { setSalesperson(''); setCustomer(''); setBrand(''); setCustomerSearch(''); setCurrency('UYU'); setPage(1); }}><RefreshCw size={16} /></button>
      </div>
      {options.error && <ErrorBox error={options.error} retry={() => void options.refetch()} />}
      {exportError !== undefined && <ErrorBox error={exportError} />}
      {q.isPending ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={() => void q.refetch()} /> : (
        <>
          <div className="admin-sales-today">
            <div><span>Pedidos de hoy</span><strong>{q.data.today.orders}</strong></div>
            <div><span>Importe de hoy</span><strong>{money(q.data.today.amount, q.data.currency)}</strong></div>
          </div>
          <div className="admin-sales-metrics">
            <div><span>Importe de pedidos</span><strong>{money(q.data.current.amount, q.data.currency)}</strong>
              <small className={q.data.changePercent !== null && q.data.changePercent < 0 ? "is-negative" : "is-positive"}>
                {q.data.changePercent === null ? "Sin período anterior" : <>{q.data.changePercent >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(q.data.changePercent)}% vs. período anterior</>}
              </small>
            </div>
            <div><span>Pedidos</span><strong>{q.data.current.orders}</strong></div>
            <div><span>Unidades</span><strong>{q.data.current.units}</strong></div>
            {q.data.current.collected !== undefined && <div><span>Cobrado</span><strong>{money(q.data.current.collected, q.data.currency)}</strong></div>}
          </div>
          <div className="admin-sales-detail">
            <div className="admin-sales-chart-wrap">
              <h3>Evolución de pedidos</h3>
              <SalesTrend key={path} sales={q.data} periodLabel={period === 'custom' ? `${q.data.dateFrom} al ${q.data.dateTo}` : periods.find(([value]) => value === period)?.[1] ?? ""} />
            </div>
            <div className="admin-sales-top">
              <h3>Productos más pedidos</h3>
              {q.data.topProducts.length ? <ol>{q.data.topProducts.map((product) => (
                <li key={`${product.id}-${product.name}`}><span>{product.name}</span><strong>{product.units} u.</strong></li>
              ))}</ol> : <p className="muted small-copy">Sin pedidos en este período.</p>}
            </div>
          </div>
          <div className="admin-sales-breakdown">
            <div className="admin-toolbar"><h3>Desglose de ventas</h3><div className="admin-sales-periods" role="group" aria-label="Agrupar ventas por">{[['salesperson', 'Vendedor'], ['customer', 'Cliente'], ['brand', 'Marca']].map(([value, title]) => <button type="button" key={value} aria-pressed={groupBy === value} onClick={() => { setGroupBy(value); setPage(1); }}>{title}</button>)}</div></div>
            {q.data.groups.length ? <div className="table-wrap"><table className="admin-sales-table"><thead><tr><th>{groupTitle}</th><th>Pedidos</th><th>Unidades</th><th>Importe</th></tr></thead><tbody>{q.data.groups.map((item) => <tr key={item.id ?? 'unassigned'}><td>{item.name}</td><td>{item.orders}</td><td>{item.units}</td><td>{money(item.amount, q.data.currency)}</td></tr>)}</tbody></table></div> : <p className="muted small-copy">Sin ventas para estos filtros.</p>}
            <ListPagination meta={q.data.meta} onPage={setPage} />
          </div>
          <p className="muted small-copy admin-sales-footnote">{q.data.dateFrom} al {q.data.dateTo} · Pedidos enviados, sin cancelados ni rechazados. Importes netos de descuentos, sin descontar devoluciones. Vendedores y marcas según la asignación actual.{q.data.current.collected !== undefined && ' Cobrado suma abonos vigentes registrados en el período.'}</p>
        </>
      )}
    </section>
  );
}
