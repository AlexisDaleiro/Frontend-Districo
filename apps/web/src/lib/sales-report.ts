export type SalesPeriod = 'today' | '7d' | '30d' | '90d' | 'custom';
export type SalesGroup = 'salesperson' | 'customer' | 'brand';
export type SalesMetric = { orders: number; amount: number; units: number };
export type SalesReport = {
  period: SalesPeriod; timezone: string; currency: string; startAt: string; endAt: string; dateFrom: string; dateTo: string; days: number;
  today: SalesMetric; current: SalesMetric & { collected?: number }; previous: SalesMetric; changePercent: number | null;
  series: { bucket: string; orders: number; amount: number }[];
  topProducts: { id: string; name: string; units: number; amount: number }[];
  groupBy: SalesGroup; groups: (SalesMetric & { id: string | null; name: string })[];
  meta: { total: number; page: number; limit: number };
};

export const salesDate = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Montevideo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
export const shiftSalesDate = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

export function salesMidnight(date: string) {
  const target = Date.parse(`${date}T00:00:00Z`);
  let value = target;
  for (let attempt = 0; attempt < 2; attempt++) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Montevideo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value));
    const p = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    value += target - Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
  }
  return new Date(value);
}

export function salesReportCsv(report: SalesReport) {
  const cell = (value: unknown) => { const raw = String(value ?? ''); return `"${(/^[\s]*[=+@-]/.test(raw) ? `'${raw}` : raw).replace(/"/g, '""')}"`; };
  const prefix = [report.dateFrom, report.dateTo, report.currency];
  const rows: unknown[][] = [['Desde', 'Hasta', 'Moneda', 'Tipo', 'ID', 'Nombre', 'Pedidos', 'Unidades', 'Importe'],
    [...prefix, 'Resumen', '', 'Período seleccionado', report.current.orders, report.current.units, report.current.amount],
    [...prefix, 'Comparación', '', 'Período anterior', report.previous.orders, report.previous.units, report.previous.amount],
    ...(report.current.collected !== undefined ? [[...prefix, 'Cobros', '', 'Abonos vigentes registrados', '', '', report.current.collected]] : []),
    ...report.series.map((item) => [...prefix, 'Serie', item.bucket, item.bucket, item.orders, '', item.amount]),
    ...report.groups.map((item) => [...prefix, report.groupBy, item.id ?? '', item.name, item.orders, item.units, item.amount])];
  return '\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
