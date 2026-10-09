import type { Order, Product, User } from './types';
import { canViewAdminFeature } from './staff-access';
import { salesDate, salesMidnight, shiftSalesDate, type SalesGroup, type SalesMetric, type SalesPeriod, type SalesReport } from './sales-report';

export function demoSalesReport(orders: Order[], users: User[], products: Product[], params: URLSearchParams, user: User, allGroups = false, now = new Date()): SalesReport {
  const period = (params.get('period') ?? '7d') as SalesPeriod;
  const today = salesDate(now), daysForPeriod = period === 'today' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const dateFrom = period === 'custom' ? params.get('dateFrom') ?? '' : shiftSalesDate(today, 1 - daysForPeriod);
  const dateTo = period === 'custom' ? params.get('dateTo') ?? '' : today;
  const valid = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
  if (!valid(dateFrom) || !valid(dateTo) || dateFrom > dateTo || dateTo > today) throw new Error('Elegí fechas válidas, en orden y no posteriores a hoy.');
  const days = Math.round((Date.parse(dateTo) - Date.parse(dateFrom)) / 86400000) + 1;
  if (days > 366) throw new Error('El informe admite hasta 366 días por consulta.');
  const start = salesMidnight(dateFrom), end = salesMidnight(shiftSalesDate(dateTo, 1)), previousStart = salesMidnight(shiftSalesDate(dateFrom, -days));
  const currency = params.get('currency') ?? 'UYU', groupBy = (params.get('groupBy') ?? 'salesperson') as SalesGroup;
  const customer = (order: Order) => users.find((item) => item.id === order.userId)?.customerAccount;
  const validOrders = orders.filter((order) => !['DRAFT', 'REJECTED', 'CANCELLED'].includes(order.status) && order.currency === currency && new Date(order.createdAt) <= now &&
    (user.role !== 'SALES' || customer(order)?.salesperson?.userId === user.id) &&
    (!params.get('salespersonId') || customer(order)?.salesperson?.id === params.get('salespersonId')) &&
    (!params.get('customerId') || customer(order)?.id === params.get('customerId')));
  const items = (order: Order) => order.items.filter((item) => !params.get('brandId') || products.find((product) => product.variants.some((variant) => variant.id === item.variantId))?.brand?.id === params.get('brandId'));
  const metric = (from: Date, to: Date): SalesMetric => validOrders.filter((order) => new Date(order.createdAt) >= from && new Date(order.createdAt) < to).reduce((sum, order) => {
    const lines = items(order);
    return { orders: sum.orders + Number(lines.length > 0), units: sum.units + lines.reduce((value, item) => value + item.quantity, 0), amount: sum.amount + lines.reduce((value, item) => value + item.subtotal, 0) };
  }, { orders: 0, units: 0, amount: 0 });
  const current = metric(start, end), previous = metric(previousStart, start);
  const groups = new Map<string, SalesMetric & { id: string | null; name: string; ordersSet: Set<string> }>();
  const series = new Map<string, { bucket: string; orders: number; amount: number }>();
  const top = new Map<string, { id: string; name: string; units: number; amount: number }>();
  for (const order of validOrders.filter((order) => new Date(order.createdAt) >= start && new Date(order.createdAt) < end)) {
    const lines = items(order);
    if (!lines.length) continue;
    const bucket = period === 'today' ? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: 'America/Montevideo' }).format(new Date(order.createdAt)) : salesDate(new Date(order.createdAt));
    const point = series.get(bucket) ?? { bucket, orders: 0, amount: 0 };
    point.orders++; point.amount += lines.reduce((sum, item) => sum + item.subtotal, 0); series.set(bucket, point);
    for (const item of lines) {
      const product = products.find((product) => product.variants.some((variant) => variant.id === item.variantId));
      const account = customer(order), seller = account?.salesperson;
      const id = groupBy === 'customer' ? account?.id ?? null : groupBy === 'brand' ? product?.brand?.id ?? null : seller?.id ?? null;
      const name = groupBy === 'customer' ? account?.businessName ?? users.find((item) => item.id === order.userId)?.email ?? 'Sin cliente' : groupBy === 'brand' ? product?.brand?.name ?? 'Sin marca' : seller?.name ?? 'Sin vendedor asignado';
      const group = groups.get(id ?? '') ?? { id, name, orders: 0, units: 0, amount: 0, ordersSet: new Set<string>() };
      group.ordersSet.add(order.id); group.orders = group.ordersSet.size; group.units += item.quantity; group.amount += item.subtotal; groups.set(id ?? '', group);
      const key = product?.id ?? item.variantId;
      const entry = top.get(key) ?? { id: key, name: item.productName, units: 0, amount: 0 };
      entry.units += item.quantity; entry.amount += item.subtotal; top.set(key, entry);
    }
  }
  const all = [...groups.values()].sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name) || String(a.id).localeCompare(String(b.id)));
  const page = Math.max(1, Number(params.get('page')) || 1), limit = Math.min(100, Math.max(1, Number(params.get('limit')) || 20));
  const payments = !params.get('brandId') && canViewAdminFeature(user, 'facturacion') ? validOrders.reduce((sum, order) => sum + (order.payments ?? []).filter((payment) => !payment.voidedAt && new Date(payment.createdAt) >= start && new Date(payment.createdAt) < end && new Date(payment.createdAt) <= now).reduce((value, payment) => value + Number(payment.amount), 0), 0) : undefined;
  return { period, timezone: 'America/Montevideo', currency, startAt: start.toISOString(), endAt: end.toISOString(), dateFrom, dateTo, days,
    today: metric(salesMidnight(today), salesMidnight(shiftSalesDate(today, 1))), current: { ...current, ...(payments !== undefined ? { collected: payments } : {}) }, previous,
    changePercent: previous.amount ? Math.round((current.amount - previous.amount) / previous.amount * 1000) / 10 : null,
    series: [...series.values()].sort((a, b) => a.bucket.localeCompare(b.bucket)), topProducts: [...top.values()].sort((a, b) => b.units - a.units || a.name.localeCompare(b.name)).slice(0, 8), groupBy,
    groups: (allGroups ? all : all.slice((page - 1) * limit, page * limit)).map(({ id, name, orders, units, amount }) => ({ id, name, orders, units, amount })), meta: { total: all.length, page, limit } };
}
