import { ApiError } from "./http";
import { canEditAdminFeature, canViewAdminFeature, type StaffFeature } from "./staff-access";
import type { BulkEntry, BulkHistoryRecord } from "./admin-tools";
import type { Order, Product, User } from "./types";

type HistoryRecord = BulkHistoryRecord & { userId: string; requestId: string; inputHash: string };
export type DemoToolsState = {
  users: User[]; products: Product[]; orders: Order[];
  salespeople?: Record<string, { id: string; name: string; phone: string }>;
  bulkHistory?: HistoryRecord[];
  staffRoleAccess?: Partial<Record<User["role"], User["staffAccess"]>>;
  customRoles?: { id: string; access: NonNullable<User["staffAccess"]> }[];
};
const actions = { active: "ADMIN_BULK_PRODUCTS_ACTIVE", prices: "ADMIN_BULK_PRODUCTS_PRICES", salesperson: "ADMIN_BULK_CUSTOMERS_SALESPERSON" };
const hash = async (value: unknown) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)))))
  .map((byte) => byte.toString(16).padStart(2, "0")).join("");

export async function demoAdminTools(state: DemoToolsState, path: string, method: string, body: Record<string, unknown>, actor?: User) {
  if (!actor || actor.active === false) throw new ApiError("Ingresá para continuar.", 401);
  if (actor.role === "CLIENT") throw new ApiError("No tenés permiso para esta acción.", 403);
  const user = { ...actor, staffAccess: actor.role === "CUSTOM"
    ? state.customRoles?.find((role) => role.id === actor.customRoleId)?.access
    : state.staffRoleAccess?.[actor.role] };
  const requireAccess = (feature: StaffFeature, edit = false) => {
    if (!canViewAdminFeature(user, feature) || (edit && !canEditAdminFeature(user, feature))) throw new ApiError("No tenés permiso para esta acción.", 403);
  };
  const query = new URL(path, "https://demo.invalid").searchParams;
  const route = path.split("?")[0];
  const profileId = state.salespeople?.[user.id]?.id;
  const accounts = [...new Map(state.users.flatMap((member) => member.customerAccount ? [[member.customerAccount.id, member.customerAccount] as const] : [])).values()];
  const visibleAccounts = accounts.filter((account) => user.role !== "SALES" || (!!profileId && account.salespersonId === profileId));
  const scopedOrders = state.orders.filter((order) => user.role !== "SALES" || visibleAccounts.some((account) => account.id === order.customerAccount?.id));
  if (route === "admin/search" && method === "GET") {
    const term = (query.get("search") ?? "").trim().toLowerCase();
    if (term.length < 2 || term.length > 120) throw new ApiError("Ingresá entre 2 y 120 caracteres.", 400);
    const matches = (...values: (string | null | undefined)[]) => values.some((value) => value?.toLowerCase().includes(term));
    return {
      customers: canViewAdminFeature(user, "clientes") ? visibleAccounts.filter((account) => matches(account.id, account.businessName, account.legalName, account.rut, account.phone,
        ...state.users.filter((member) => member.customerAccount?.id === account.id).map((member) => member.email))).slice(0, 5)
        .map((account) => ({ id: account.id, businessName: account.businessName, rut: account.rut, email: state.users.find((member) => member.customerAccount?.id === account.id)?.email ?? "" })) : [],
      orders: canViewAdminFeature(user, "pedidos") ? scopedOrders.filter((order) => matches(order.id, order.orderNumber, order.customerAccount?.businessName, order.user?.email)).slice(0, 5)
        .map((order) => ({ id: order.id, orderNumber: order.orderNumber, status: order.status, user: order.user ?? { email: "" }, customerAccount: order.customerAccount ? { businessName: order.customerAccount.businessName } : null })) : [],
      products: canViewAdminFeature(user, "catalogo") ? state.products.filter((product) => matches(product.id, product.name, product.slug, ...product.variants.map((variant) => variant.sku))).slice(0, 5)
        .map((product) => ({ id: product.id, slug: product.slug, name: product.name, active: product.active !== false })) : [],
    };
  }
  if (route === "admin/bulk/history" && method === "GET") {
    const feature = query.get("feature");
    if (feature !== "catalogo" && feature !== "vendedores") throw new ApiError("Historial inválido.", 400);
    requireAccess(feature);
    if (feature === "vendedores") requireAccess("clientes");
    const allowed = feature === "catalogo" ? [actions.active, actions.prices] : [actions.salesperson];
    const all = (state.bulkHistory ?? []).filter((record) => allowed.includes(record.action) && (user.role !== "SALES" || record.userId === user.id)).slice().reverse();
    const page = Math.max(1, Number(query.get("page")) || 1), limit = Math.min(100, Math.max(1, Number(query.get("limit")) || 10));
    return { items: all.slice((page - 1) * limit, page * limit).map((record) => ({ id: record.id, action: record.action, createdAt: record.createdAt, user: record.user, metadata: record.metadata })), meta: { total: all.length, page, limit } };
  }
  const operation = route.split("/")[3] as keyof typeof actions;
  if (method !== "POST" || !['admin/bulk/products/active', 'admin/bulk/products/prices', 'admin/bulk/customers/salesperson'].some((target) => route === target || route === `${target}/preview`)) throw new ApiError("Acción no disponible.", 404);
  requireAccess(operation === "salesperson" ? "vendedores" : "catalogo", true);
  if (operation === "salesperson") requireAccess("clientes");
  const ids = Array.isArray(body.ids) ? body.ids as string[] : [];
  const reason = String(body.reason ?? "").trim();
  const requestId = String(body.requestId ?? "");
  if (!ids.length || ids.length > 100 || new Set(ids).size !== ids.length || ids.some((id) => typeof id !== "string" || !id) || reason.length < 3 || reason.length > 500 || !/^[0-9a-f-]{36}$/i.test(requestId)) throw new ApiError("Revisá la selección y el motivo.", 400);
  const { previewToken: _previewToken, ...input } = body;
  void _previewToken;
  const inputHash = await hash({ ...input, ids: [...ids].sort() });
  const saved = state.bulkHistory?.find((record) => record.requestId === requestId && record.userId === user.id);
  if (saved && !route.endsWith("/preview")) {
    if (saved.inputHash !== inputHash || saved.action !== actions[operation]) throw new ApiError("El identificador pertenece a otra operación.", 409);
    return { batchId: saved.id, entries: saved.metadata.entries, changed: saved.metadata.changed };
  }
  const entries: BulkEntry[] = [];
  const changes: (() => void)[] = [];
  const snapshot: unknown[] = [];
  if (operation === "salesperson") {
    const seller = state.users.find((member) => member.id === body.salespersonUserId && member.role === "SALES" && !member.customerAccount);
    const profile = seller && state.salespeople?.[seller.id];
    if (!seller || !profile || seller.active === false || seller.emailVerified === false) throw new ApiError("Seleccioná un vendedor activo con su ficha completa.", 400);
    snapshot.push({ userId: seller.id, ...profile });
    for (const id of [...ids].sort()) {
      const account = visibleAccounts.find((item) => item.id === id);
      if (!account) throw new ApiError("Un cliente no está disponible para esta asignación.", 403);
      const previous = Object.values(state.salespeople ?? {}).find((item) => item.id === account.salespersonId);
      entries.push({ id, name: account.businessName, before: previous?.name ?? "Sin vendedor", after: profile.name, changed: account.salespersonId !== profile.id });
      snapshot.push({ id, salespersonId: account.salespersonId });
      changes.push(() => { for (const member of state.users) if (member.customerAccount?.id === id) member.customerAccount.salespersonId = profile.id; });
    }
  } else {
    if (operation === "active" && typeof body.active !== "boolean") throw new ApiError("Estado inválido.", 400);
    const value = Number(body.value);
    if (operation === "prices" && (!['PERCENTAGE', 'FIXED'].includes(String(body.mode)) || !Number.isFinite(value) || (body.mode === "PERCENTAGE" ? value <= -100 || value > 1000 || !value : value <= 0 || value > 9999999999.99))) throw new ApiError("Revisá el porcentaje o importe.", 400);
    for (const id of [...ids].sort()) {
      const product = state.products.find((item) => item.id === id);
      if (!product) throw new ApiError("Producto no encontrado.", 400);
      if (operation === "active") {
        const active = product.active !== false;
        snapshot.push({ id, active });
        entries.push({ id, name: product.name, before: active ? "Activo" : "Inactivo", after: body.active ? "Activo" : "Inactivo", changed: active !== body.active });
        changes.push(() => { product.active = body.active as boolean; });
      } else {
        const variants = product.variants.filter((variant) => variant.active !== false);
        if (!variants.length) throw new ApiError("Todos los productos deben tener presentaciones activas.", 400);
        for (const variant of variants) {
          if (body.mode === "PERCENTAGE" && !variant.price) throw new ApiError(`${product.name} / ${variant.name} no tiene precio vigente.`, 400);
          const currency = variant.price?.currency ?? "UYU";
          if (currency !== "UYU") throw new ApiError("El lote sólo admite UYU.", 400);
          const amount = Math.round(((body.mode === "FIXED" ? value : Number(variant.price!.amount) * (1 + value / 100)) + Number.EPSILON) * 100) / 100;
          if (amount <= 0 || amount > 9999999999.99) throw new ApiError("Precio fuera de rango.", 400);
          snapshot.push({ id: variant.id, price: variant.price });
          entries.push({ id: variant.id, name: `${product.name} / ${variant.name} (${variant.sku})`, before: variant.price ? `${Number(variant.price.amount).toFixed(2)} UYU` : "Sin precio", after: `${amount.toFixed(2)} UYU`, changed: Number(variant.price?.amount) !== amount });
          changes.push(() => { variant.price = { amount, currency }; });
        }
      }
    }
  }
  if (operation === "prices" && entries.length > 500) throw new ApiError("Seleccioná menos productos: el lote admite hasta 500 presentaciones.", 400);
  const preview = { token: await hash({ inputHash, snapshot }), entries, changed: entries.filter((entry) => entry.changed).length };
  if (route.endsWith("/preview")) return preview;
  if (body.previewToken !== preview.token) throw new ApiError("Los datos cambiaron. Revisá la vista previa.", 409);
  changes.forEach((change) => change());
  const record: HistoryRecord = { id: crypto.randomUUID(), action: actions[operation], createdAt: new Date().toISOString(), user: { email: user.email },
    userId: user.id, requestId, inputHash, metadata: { reason, entries, changed: preview.changed } };
  (state.bulkHistory ??= []).push(record);
  return { batchId: record.id, entries, changed: preview.changed };
}
