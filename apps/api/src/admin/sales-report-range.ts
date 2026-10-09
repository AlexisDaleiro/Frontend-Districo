const zone = 'America/Montevideo';
const dayMs = 86400000;

export const salesDate = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
export const shiftSalesDate = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * dayMs).toISOString().slice(0, 10);

export function salesMidnight(date: string) {
  const target = Date.parse(`${date}T00:00:00Z`);
  let value = target;
  for (let attempt = 0; attempt < 2; attempt++) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value));
    const p = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const local = Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
    value += target - local;
  }
  return new Date(value);
}

export function salesRange(query: { period: string; dateFrom?: string; dateTo?: string }, now = new Date()) {
  const today = salesDate(now);
  let from = query.dateFrom, to = query.dateTo;
  if (query.period !== 'custom') {
    const days = query.period === 'today' ? 1 : query.period === '7d' ? 7 : query.period === '30d' ? 30 : 90;
    from = shiftSalesDate(today, 1 - days);
    to = today;
  }
  const valid = (value?: string) => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!valid(from) || !valid(to) || from! > to! || to! > today) throw new Error('Elegí fechas válidas, en orden y no posteriores a hoy.');
  const days = Math.round((Date.parse(to!) - Date.parse(from!)) / dayMs) + 1;
  if (days > 366) throw new Error('El informe admite hasta 366 días por consulta.');
  return { dateFrom: from!, dateTo: to!, days, start: salesMidnight(from!), end: salesMidnight(shiftSalesDate(to!, 1)), previousStart: salesMidnight(shiftSalesDate(from!, -days)), todayStart: salesMidnight(today), tomorrowStart: salesMidnight(shiftSalesDate(today, 1)) };
}
