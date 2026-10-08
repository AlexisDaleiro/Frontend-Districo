import { seedProducts, seedUsers, categories } from "./demo-seed";
import type {
  Application,
  Cart,
  ContactInquiry,
  Customer,
  CustomerAddress,
  Entity,
  Expiration,
  Order,
  Product,
  Rule,
  User,
} from "./types";
import { can, orderStatuses, quantityError, reviewRequired } from "./commerce";
import { ApiError } from "./http";
import { orderBalance } from "./order-billing";
import { demoAdminTools, type DemoToolsState } from "./demo-admin-tools";
import { demoProductReturn } from "./demo-product-returns";
import { canEditAdminFeature, canViewAdminFeature, staffFeatures, staffRoles, type StaffFeature, type StaffRole } from "./staff-access";
type DemoRoleAccess = Record<StaffFeature, { canView: boolean; canEdit: boolean }>;
function defaultDemoRoleAccess(role: StaffRole): DemoRoleAccess {
  const user = { id: "demo", email: "demo@example.test", role, permissions: [] } as User;
  return Object.fromEntries(staffFeatures.map(([feature]) => [feature, {
    canView: canViewAdminFeature(user, feature),
    canEdit: !["resumen", "ventas"].includes(feature) && canEditAdminFeature(user, feature),
  }])) as DemoRoleAccess;
}
function completeDemoRoleAccess(role: StaffRole, saved?: Partial<DemoRoleAccess>): DemoRoleAccess {
  return { ...defaultDemoRoleAccess(role), ...saved };
}
type State = {
  version: number;
  session: string | null;
  products: Product[];
  users: User[];
  carts: Record<string, { id: string; variantId: string; quantity: number }[]>;
  applications: Application[];
  contactInquiries: ContactInquiry[];
  orders: Order[];
  rules: Rule[];
  promotions: Rule[];
  expiration: Expiration[];
  categories: Entity[];
  brands: Entity[];
  laboratories: Entity[];
  banners?: { id: string; title: string; subtitle?: string; actionLabel: string; href: string; alt: string; imageUrl: string; position: number; active: boolean; startsAt?: string; endsAt?: string }[];
  staffInvitations?: { userId: string; tokenHash: string; expiresAt: string; accepted: boolean; revoked: boolean }[];
  staffRoleAccess?: Partial<Record<StaffRole, DemoRoleAccess>>;
  customRoles?: { id: string; name: string; key: string; access: DemoRoleAccess; retiredAt?: string }[];
  roleHistory?: { action: string; roleId: string; actorId: string; createdAt: string; name: string; previousName: string }[];
  creditChanges?: Record<string, { id: string; action: string; createdAt: string; metadata: unknown; user: { email: string } }[]>;
  salespeople?: Record<string, { id: string; name: string; phone: string }>;
  consumedOrderIds?: string[];
  bulkHistory?: DemoToolsState["bulkHistory"];
};
const KEY = "districo-demo-v1";
export const blankState = (): State => ({
  version: 1,
  session: null,
  products: seedProducts(),
  users: seedUsers(),
  carts: {},
  applications: [],
  contactInquiries: [],
  orders: [],
  rules: [],
  promotions: [],
  expiration: [],
  categories: [...categories],
  brands: Array.from(
    new Map(
      seedProducts().flatMap((p) =>
        p.brand ? [[p.brand.id, p.brand] as const] : [],
      ),
    ).values(),
  ),
  laboratories: [],
  banners: [],
  staffInvitations: [],
  staffRoleAccess: {},
  customRoles: [],
  creditChanges: {},
  salespeople: {},
  consumedOrderIds: [],
});
let memory: State | undefined;
export function resetDemo() {
  memory = blankState();
  localStorage.setItem(KEY, JSON.stringify(memory));
}
function read() {
  if (typeof localStorage === "undefined") return (memory ??= blankState());
  const raw = localStorage.getItem(KEY);
  if (!raw) return blankState();
  try {
    const data = JSON.parse(raw) as State;
    if (
      data.version !== 1 ||
      !Array.isArray(data.products) ||
      !Array.isArray(data.users)
    )
      throw Error();
    data.contactInquiries ??= [];
    data.banners ??= [];
    data.staffInvitations ??= [];
    data.staffRoleAccess ??= {};
    data.customRoles ??= [];
    for (const role of staffRoles) data.staffRoleAccess[role] = completeDemoRoleAccess(role, data.staffRoleAccess[role]);
    for (const role of data.customRoles) role.access = completeDemoRoleAccess("CUSTOM", role.access);
    data.creditChanges ??= {};
    data.salespeople ??= {};
    data.consumedOrderIds ??= [];
    for (const order of data.orders) order.items.forEach((item, index) => { item.id ??= `${order.id}-item-${index}`; });
    return data;
  } catch {
    throw new ApiError(
      "Los datos de prueba no se pueden leer. Usá Reiniciar demo para recuperar el escenario.",
    );
  }
}
function write(state: State) {
  memory = state;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      throw new ApiError(
        "No se pudieron guardar los datos de prueba. Revisá el espacio del navegador.",
      );
    }
  }
}
const id = () => crypto.randomUUID();
async function demoHash(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function demoImage(file: File) {
  if (!file.size || file.size > 300_000 || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new ApiError("En la demo, usá un PNG, JPG o WebP de hasta 300 KB.", 400);
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new ApiError("No se pudo leer la imagen.", 400));
    reader.readAsDataURL(file);
  });
}
function descendants(categories: Entity[], rootId: string) {
  const ids = new Set([rootId]);
  for (let added = true; added;) {
    added = false;
    for (const c of categories)
      if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) {
        ids.add(c.id);
        added = true;
      }
  }
  return ids;
}
function publicProduct(p: Product, user?: User): Product {
  const priceAllowed =
    can(user, "CAN_VIEW_PRICES") &&
    (!p.requiresMedicationPermission || can(user, "CAN_BUY_MEDICATIONS"));
  return {
    ...p,
    medicationRestricted:
      p.requiresMedicationPermission && !can(user, "CAN_BUY_MEDICATIONS"),
    variants: p.variants.map((v) => ({
      ...v,
      price: priceAllowed ? v.price : undefined,
    })),
  };
}
function userCart(s: State, u: User): Cart {
  const items = (s.carts[u.id] ?? []).map((item) => {
    const product = s.products.find((p) =>
      p.variants.some((v) => v.id === item.variantId),
    );
    const variant = product?.variants.find((v) => v.id === item.variantId);
    if (!product || !variant)
      throw new ApiError(
        "Un producto de tu carrito ya no existe. Reiniciá la demo.",
      );
    return {
      id: item.id,
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        requiresMedicationPermission: product.requiresMedicationPermission,
        imageUrl: (
          product.media.find((media) => media.type === "IMAGE" && media.variantId === variant.id) ??
          product.media.find((media) => media.type === "IMAGE" && !media.variantId)
        )?.url ?? null,
      },
      variant,
      quantity: item.quantity,
      unitPrice: variant.price?.amount ?? 0,
      currency: variant.price?.currency ?? "UYU",
      subtotal: (variant.price?.amount ?? 0) * item.quantity,
    };
  });
  return {
    id: `cart-${u.id}`,
    items,
    total: items.reduce((a, b) => a + b.subtotal, 0),
  };
}
function targetMatch(
  p: Product,
  variantId: string,
  type: string,
  targetId?: string,
) {
  return (
    !targetId ||
    (type === "PRODUCT"
      ? p.id === targetId
      : type === "PRODUCT_VARIANT"
        ? variantId === targetId
        : type === "BRAND"
          ? p.brand?.id === targetId
          : type === "LABORATORY"
            ? p.laboratory?.id === targetId
            : p.categories.some((c) => c.categoryId === targetId))
  );
}
// Only used by the explicitly simulated adapter. Real commerce is computed by the API.
function discounts(s: State, cart: Cart) {
  const now = new Date().toISOString();
  const totals = cart.items.map(() => 0);
  for (const promo of s.promotions.filter(
    (p) =>
      p.active !== false &&
      (!p.startsAt || p.startsAt <= now) &&
      (!p.endsAt || p.endsAt >= now),
  )) {
    const eligible = promo.conditions?.every((c) => {
      const rows = cart.items.filter((i) =>
        targetMatch(
          s.products.find((p) => p.id === i.product.id)!,
          i.variant.id,
          c.targetType,
          c.targetId,
        ),
      );
      return c.metric === "MIN_AMOUNT"
        ? rows.reduce((n, i) => n + i.subtotal, 0) >= (c.minAmount ?? 0)
        : rows.reduce((n, i) => n + i.quantity, 0) >= (c.minQuantity ?? 1);
    });
    if (!eligible) continue;
    cart.items.forEach((item, index) => {
      for (const reward of promo.rewards ?? []) {
        if (
          targetMatch(
            s.products.find((p) => p.id === item.product.id)!,
            item.variant.id,
            reward.targetType,
            reward.targetId,
          )
        ) {
          const amount =
            reward.rewardType === "PERCENTAGE"
              ? (item.subtotal * (reward.percentage ?? 0)) / 100
              : reward.rewardType === "PROMOTIONAL_PRICE"
                ? item.subtotal - (reward.amount ?? 0) * item.quantity
                : (reward.amount ?? 0) * item.quantity;
          totals[index] = Math.max(
            totals[index],
            Math.min(item.subtotal, Math.max(0, amount)),
          );
        }
      }
    });
  }
  for (const promo of s.expiration.filter(
    (p) =>
      p.active !== false && p.startsAt <= now && (!p.endsAt || p.endsAt >= now),
  ))
    cart.items.forEach((item, index) => {
      if (
        (promo.variantId && promo.variantId === item.variant.id) ||
        (!promo.variantId && promo.productId === item.product.id)
      ) {
        const quantity = Math.min(
          item.quantity,
          promo.quantityLimit ?? item.quantity,
        );
        const amount =
          promo.promotionalPrice !== undefined
            ? (item.unitPrice - promo.promotionalPrice) * quantity
            : (item.unitPrice * quantity * (promo.discountPercentage ?? 0)) /
              100;
        totals[index] = Math.max(
          totals[index],
          Math.max(0, Math.min(item.subtotal, amount)),
        );
      }
    });
  return totals;
}
export async function demoRequest<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const s = read();
  const [route, search = ""] = path.split("?");
  const query = new URLSearchParams(search);
  const b = body instanceof FormData ? Object.fromEntries(body.entries()) : (body ?? {}) as Record<string, unknown>;
  const salespersonFor = (account?: Customer) => {
    if (!account?.salespersonId) return null;
    const staff = s.users.find((entry) => s.salespeople?.[entry.id]?.id === account.salespersonId);
    const profile = staff && s.salespeople?.[staff.id];
    return staff && profile ? { ...profile, userId: staff.id, user: { email: staff.email } } : null;
  };
  const user = s.users.find((u) => u.id === s.session);
  const needUser = () => {
    if (!user || user.active === false) throw new ApiError("Ingresá para continuar.", 401);
    return user;
  };
  const needAdmin = () => {
    const member = needUser();
    if (member.role === "ADMIN") return;
    if (member.role === "CLIENT") throw new ApiError("No tenés permiso para esta acción.", 403);
    if (member.role === "SALES") {
      const profileId = s.salespeople?.[member.id]?.id;
      const assigned = (accountId?: string) => !!profileId && !!accountId && s.users.some((entry) => entry.customerAccount?.id === accountId && entry.customerAccount?.salespersonId === profileId);
      const customerId = /^admin\/customers\/(?!page(?:\/|$))([^/]+)/.exec(route)?.[1];
      if (customerId && !assigned(customerId)) throw new ApiError("No tenés permiso para esta acción.", 403);
      const orderId = /^admin\/orders\/(?!page(?:\/|$)|export(?:\/|$))([^/]+)/.exec(route)?.[1];
      if (orderId) {
        const order = s.orders.find((entry) => entry.id === orderId);
        if (!order || !assigned(order.customerAccount?.id)) throw new ApiError("No tenés permiso para esta acción.", 403);
      }
    }
    const feature = route.startsWith("admin/orders/") && /\/(payments|invoices|credit-notes|refunds)(\/|$)/.test(route) ? "facturacion" :
      route.startsWith("admin/contact-inquiries") ? "consultas" :
      route.startsWith("admin/applications") ? "solicitudes" :
      route.startsWith("admin/staff/access") || route.startsWith("admin/staff/roles") ? "roles" :
      route.startsWith("admin/staff") ? "personal" :
      route.startsWith("admin/salespeople") ? "vendedores" :
      route.startsWith("admin/customers") ? "clientes" :
      route.startsWith("admin/orders") ? "pedidos" :
      route === "admin/dashboard" ? "resumen" : route === "admin/sales" ? "ventas" :
      route.startsWith("admin/promotions") || route.startsWith("promotions") ? "promociones" :
      route.startsWith("admin/recommendations") || route.startsWith("recommendations") ? "recomendaciones" :
      route.startsWith("admin/banners") ? "banners" :
      /^(products|pricing|inventory|attributes)(\/|$)/.test(route) ? "catalogo" :
      /^(brands|laboratories)(\/|$)/.test(route) ? "marcas" :
      /^(categories)(\/|$)/.test(route) ? "categorias" :
      /^(recommendations)(\/|$)/.test(route) ? "recomendaciones" : null;
    const access = member.role === "CUSTOM" ? s.customRoles?.find((item) => item.id === member.customRoleId)?.access : s.staffRoleAccess?.[member.role];
    const decorated = { ...member, staffAccess: access ?? (member.role === "CUSTOM" ? undefined : defaultDemoRoleAccess(member.role as StaffRole)) };
    if (feature && (method === "GET" ? canViewAdminFeature(decorated, feature) : canEditAdminFeature(decorated, feature))) return;
    throw new ApiError("No tenés permiso para esta acción.", 403);
  };
  const needBuyer = () => {
    const u = needUser();
    if (
      !can(u, "CAN_PLACE_ORDERS") ||
      !can(u, "CAN_VIEW_PRICES") ||
      u.customerAccount?.accountStatus === "SUSPENDED"
    )
      throw new ApiError("La cuenta no está habilitada para comprar.", 403);
    return u;
  };
  let result: unknown;
  if (route === "auth/login" && method === "POST") {
    const found = s.users.find(
      (u) => u.email.toLowerCase() === String(b.email).toLowerCase(),
    );
    if (!found || found.active === false ||
        (found.demoPasswordHash ? await demoHash(String(b.password)) !== found.demoPasswordHash : b.password !== "Demo1234!"))
      throw new ApiError(
        "Credenciales demo inválidas. Usá Demo1234! en las cuentas de prueba.",
        401,
      );
    s.session = found.id;
    result = { user: found };
  } else if (route === "auth/me") {
    const current = needUser();
    result = current.role === "CLIENT" ? { ...current, customerAccount: current.customerAccount
      ? { ...current.customerAccount, salesperson: salespersonFor(current.customerAccount) } : undefined } : { ...current, staffAccess: current.role === "CUSTOM"
      ? s.customRoles?.find((item) => item.id === current.customRoleId)?.access ?? defaultDemoRoleAccess("CUSTOM")
      : s.staffRoleAccess?.[current.role] ?? defaultDemoRoleAccess(current.role) };
  }
  else if (route === "auth/staff-invitations/accept" && method === "POST") {
    const tokenHash = await demoHash(String(b.token ?? ""));
    const invitation = s.staffInvitations?.find((item) => item.tokenHash === tokenHash && !item.revoked && !item.accepted && item.expiresAt > new Date().toISOString());
    const member = s.users.find((item) => item.id === invitation?.userId && !item.customerAccount);
    if (!invitation || !member || member.active || member.emailVerified || String(b.password ?? "").length < 12)
      throw new ApiError("Invitación inválida o vencida.", 401);
    member.demoPasswordHash = await demoHash(String(b.password));
    member.active = true;
    member.emailVerified = true;
    invitation.accepted = true;
    result = { success: true };
  }
  else if (route === "account/me" || route.startsWith("account/me/addresses")) {
    const account = needUser().customerAccount;
    if (!account) throw new ApiError("No hay una cuenta de cliente activa.", 403);
    const addresses = (account.addresses ??= []);
    const addressId = route.split("/")[3];
    const syncPrimary = () => {
      account.address = addresses[0]?.address;
      account.city = addresses[0]?.city ?? undefined;
      account.department = addresses[0]?.department ?? undefined;
    };
    if (route === "account/me" && method === "PATCH") {
      if (Object.keys(b).some((key) => !["businessName", "legalName", "rut"].includes(key)))
        throw new ApiError("Este dato no se puede editar desde Mi cuenta.", 400);
      for (const key of ["businessName", "legalName", "rut"] as const) {
        if (b[key] !== undefined) {
          const value = String(b[key]).trim();
          if (!value) throw new ApiError("Completá los datos del cliente.", 400);
          account[key] = value;
        }
      }
      result = account;
    } else if (route === "account/me/addresses" && method === "POST") {
      const label = String(b.label ?? "").trim();
      const address = String(b.address ?? "").trim();
      if (!label || !address) throw new ApiError("Completá el nombre y la dirección.", 400);
      const created: CustomerAddress = {
        id: id(), label, address,
        city: String(b.city ?? "").trim() || null,
        department: String(b.department ?? "").trim() || null,
      };
      addresses.push(created);
      syncPrimary();
      result = created;
    } else if (addressId && ["PATCH", "DELETE"].includes(method)) {
      const index = addresses.findIndex((address) => address.id === addressId);
      if (index < 0) throw new ApiError("Dirección no encontrada.", 404);
      if (method === "DELETE") {
        addresses.splice(index, 1);
        result = { success: true };
      } else {
        const updated = addresses[index];
        for (const key of ["label", "address", "city", "department"] as const) {
          if (b[key] !== undefined) {
            const value = String(b[key]).trim();
            if (!value && ["label", "address"].includes(key))
              throw new ApiError("Completá el nombre y la dirección.", 400);
            if (key === "label" || key === "address") updated[key] = value;
            else updated[key] = value || null;
          }
        }
        result = updated;
      }
      syncPrimary();
    } else throw new ApiError("Esta operación no está disponible en la demo.", 404);
  }
  else if (route === "auth/logout") {
    s.session = null;
    result = { success: true };
  } else if (route === "applications" && method === "POST") {
    const email = String(b.email ?? "").toLowerCase();
    if (
      s.users.some((u) => u.email.toLowerCase() === email) ||
      s.applications.some((a) => a.email === email && a.status === "PENDING")
    )
      throw new ApiError(
        "Ya existe una cuenta o solicitud con ese correo.",
        400,
      );
    const { password: _password, documents: _documents, requestedMedicationPermission: _requestedMedicationPermission, ...safe } = b;
    void _password;
    void _documents;
    void _requestedMedicationPermission;
    const documents = body instanceof FormData
      ? body.getAll("documents").filter((entry): entry is File => entry instanceof File).map((file) => ({ id: id(), type: "BUSINESS_PERMIT", originalName: file.name }))
      : [];
    if (!documents.length) throw new ApiError("Adjuntá al menos un permiso o habilitación del negocio.", 400);
    if (documents.length > 3) throw new ApiError("Podés adjuntar hasta 3 archivos.", 400);
    const application = {
      ...safe,
      email,
      id: id(),
      status: "PENDING",
      documents,
    } as Application;
    s.applications.push(application);
    result = application;
  } else if (route === "contact-inquiries" && method === "POST") {
    if (String(b.website ?? "").trim()) {
      result = { received: true };
    } else {
      const now = new Date().toISOString();
      const inquiry: ContactInquiry = {
        id: id(),
        name: String(b.name ?? "").trim(),
        businessName: String(b.businessName ?? "").trim() || undefined,
        email: String(b.email ?? "").trim().toLowerCase(),
        phone: String(b.phone ?? "").trim() || undefined,
        locality: String(b.locality ?? "").trim() || undefined,
        message: String(b.message ?? "").trim(),
        status: "NEW",
        createdAt: now,
        updatedAt: now,
      };
      s.contactInquiries.unshift(inquiry);
      result = { received: true, id: inquiry.id, createdAt: now };
    }
  } else if (["products", "products/cards", "products/admin/list"].includes(route) && method === "GET") {
    if (route === "products/admin/list") needAdmin();
    let items = route === "products/admin/list" ? [...s.products] : s.products.filter((p) => p.active !== false);
    const active = query.get("active");
    if (active !== null && route === "products/admin/list") items = items.filter((p) => (p.active !== false) === (active === "true"));
    const term = (query.get("search") ?? "").toLowerCase();
    if (term)
      items = items.filter((p) =>
        [
          p.name,
          p.brand?.name,
          p.laboratory?.name,
          ...p.variants.flatMap((v) => [v.sku, v.ean]),
        ].some((v) => v?.toLowerCase().includes(term)),
      );
    for (const [key, test] of [
      [
        "categoryId",
        // Igual que la API: lista separada por comas, incluye subcategorías.
        (p: Product, v: string) =>
          v
            .split(",")
            .some((id) =>
              p.categories.some((c) =>
                descendants(s.categories, id).has(c.categoryId),
              ),
            ),
      ],
      ["brandId", (p: Product, v: string) => p.brand?.id === v],
      ["laboratoryId", (p: Product, v: string) => p.laboratory?.id === v],
      ["productType", (p: Product, v: string) => p.productType === v],
      ["featured", (p: Product, v: string) => p.featured === (v === "true")],
    ] as const) {
      const value = query.get(key);
      if (value) items = items.filter((p) => test(p, value));
    }
    const attrs = query.get("attributeValueIds")?.split(",");
    if (attrs)
      items = items.filter((p) =>
        attrs.every((a) =>
          p.attributes?.some((v) => v.attributeValue.id === a),
        ),
      );
    items.sort((a, b) => a.name.localeCompare(b.name));
    const page = Math.max(1, Math.floor(Number(query.get("page"))) || 1),
      limit = Math.min(100, Math.max(1, Number(query.get("limit") ?? 12)));
    result = {
      items: items
        .slice((page - 1) * limit, page * limit)
        .map((p) => publicProduct(p, user)),
      meta: { total: items.length, page, limit },
    };
  } else if (
    ["categories", "categories/catalog", "categories/admin", "brands", "laboratories", "attributes"].includes(route) &&
    method === "GET"
  )
    result = route === "attributes" ? [] : route === "categories/admin" ? (needAdmin(), s.categories) :
      route === "categories" || route === "categories/catalog" ? s.categories.filter((category) => category.active !== false) :
      s[route as "brands" | "laboratories"];
  else if (route.startsWith("categories/admin/") && method === "GET") {
    needAdmin();
    const [, , categoryId, list] = route.split("/");
    if (!s.categories.some((category) => category.id === categoryId) || !["products", "candidates"].includes(list))
      throw new ApiError("Categoría no encontrada.", 404);
    const linked = list === "products";
    const term = (query.get("search") ?? "").toLowerCase();
    const matches = s.products.filter((product) =>
      product.categories.some((category) => category.categoryId === categoryId) === linked &&
      (!term || [product.name, ...product.variants.map((variant) => variant.sku)].some((value) => value.toLowerCase().includes(term)))
    ).sort((a, b) => a.name.localeCompare(b.name));
    const page = Math.max(1, Number(query.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.get("limit")) || 20));
    result = { items: matches.slice((page - 1) * limit, page * limit).map((product) => ({
      id: product.id, name: product.name, slug: product.slug, active: product.active !== false, brand: product.brand,
    })), meta: { total: matches.length, page, limit } };
  }
  else if (route.startsWith("products/") && method === "GET") {
    if (route.startsWith("products/admin/")) needAdmin();
    const slug = route.startsWith("products/admin/") ? route.split("/")[2] : route.split("/")[1];
    const p = s.products.find(
      (p) => p.slug === slug && (route.startsWith("products/admin/") || p.active !== false),
    );
    if (!p) throw new ApiError("Producto no encontrado.", 404);
    result = publicProduct(p, user);
  } else if (route === "cart" && method === "GET")
    result = userCart(s, needBuyer());
  else if (route === "cart/recommendations") {
    const u = needBuyer(),
      cart = userCart(s, u);
    result = s.rules
      .filter(
        (r) =>
          cart.items
            .filter((i) =>
              targetMatch(
                s.products.find((p) => p.id === i.product.id)!,
                i.variant.id,
                r.triggerType ?? "PRODUCT",
                r.triggerId,
              ),
            )
            .reduce((a, i) => a + i.quantity, 0) >= (r.minimumQuantity ?? 1),
      )
      .flatMap((r) =>
        (r.products ?? [])
          .map((ref) => s.products.find((p) => p.id === ref.productId))
          .filter(
            (p): p is Product =>
              !!p &&
              !cart.items.some((i) => i.product.id === p.id) &&
              (!p.requiresMedicationPermission ||
                can(u, "CAN_BUY_MEDICATIONS")),
          )
          .map((product) => ({
            rule: r.name,
            product: publicProduct(product, u),
          })),
      );
  } else if (route === "cart/items" || route.startsWith("cart/items/")) {
    const u = needBuyer();
    const items = (s.carts[u.id] ??= []);
    const itemId = route.split("/")[2];
    // Igual que la API: modificar o quitar una línea inexistente es un 404.
    if (itemId && !items.some((i) => i.id === itemId))
      throw new ApiError("Item de carrito no encontrado.", 404);
    if (method === "DELETE") {
      s.carts[u.id] = items.filter((i) => i.id !== itemId);
    } else {
      const variantId =
        method === "POST"
          ? String(b.variantId)
          : items.find((i) => i.id === itemId)?.variantId;
      const product = s.products.find((p) =>
        p.variants.some((v) => v.id === variantId),
      );
      const variant = product?.variants.find((v) => v.id === variantId);
      if (!product || !variant)
        throw new ApiError("Presentación no encontrada.", 404);
      if (
        product.requiresMedicationPermission &&
        !can(u, "CAN_BUY_MEDICATIONS")
      )
        throw new ApiError(
          "Tu cuenta no está habilitada para este producto.",
          403,
        );
      if (!variant.price) throw new ApiError("Sin precio vigente.", 400);
      const quantity = Number(b.quantity);
      const error = quantityError(variant, quantity);
      if (error) throw new ApiError(error, 400);
      const existing = items.find((i) => i.variantId === variantId);
      if (existing) existing.quantity = quantity;
      else items.push({ id: id(), variantId: variant.id, quantity });
      s.carts[u.id] = items;
    }
    result = userCart(s, u);
  } else if (route === "checkout" && method === "POST") {
    const u = needBuyer(),
      cart = userCart(s, u);
    if (!cart.items.length) throw new ApiError("El carrito está vacío.", 400);
    const review = reviewRequired(u.customerAccount?.creditStatus);
    if (review && !b.acceptManualReview)
      throw new ApiError("Aceptá la revisión manual del pedido.", 400);
    const addresses = u.customerAccount?.addresses ?? [];
    const selectedAddress = addresses.find((address) => address.id === b.deliveryAddressId);
    if (b.deliveryAddressId && !selectedAddress) throw new ApiError("Dirección de entrega no encontrada.", 400);
    if (addresses.length > 1 && !selectedAddress) throw new ApiError("Elegí una dirección de entrega.", 400);
    const delivery = selectedAddress ?? addresses[0];
    for (const item of cart.items) {
      const error = quantityError(item.variant, item.quantity);
      if (error) throw new ApiError(error, 400);
      if (!item.variant.price)
        throw new ApiError("La variante no tiene precio vigente.", 400);
      if (
        item.product.requiresMedicationPermission &&
        !can(u, "CAN_BUY_MEDICATIONS")
      )
        throw new ApiError("Hay un producto restringido en el carrito.", 403);
    }
    const reductions = discounts(s, cart);
    const discountTotal = reductions.reduce((a, b) => a + b, 0);
    const order: Order = {
      id: id(),
      orderNumber: `DEMO-${Date.now()}`,
      userId: u.id,
      customerAccount: u.customerAccount,
      deliveryAddressId: delivery?.id ?? null,
      deliveryLabel: delivery?.label ?? null,
      deliveryAddress: delivery?.address ?? u.customerAccount?.address ?? null,
      deliveryCity: delivery?.city ?? u.customerAccount?.city ?? null,
      deliveryDepartment: delivery?.department ?? u.customerAccount?.department ?? null,
      status: review ? "PENDING_REVIEW" : "SUBMITTED",
      requiresManualReview: review,
      acceptedManualReview: !!b.acceptManualReview,
      reviewReason: review ? u.customerAccount?.creditStatus : undefined,
      createdAt: new Date().toISOString(),
      currency: "UYU",
      subtotal: cart.total,
      discountTotal,
      total: cart.total - discountTotal,
      items: cart.items.map((i, index) => ({
        variantId: i.variant.id,
        productName: i.product.name,
        variantName: i.variant.name,
        sku: i.variant.sku,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        subtotal: i.subtotal - reductions[index],
      })),
    };
    for (const item of cart.items) {
      const variant = s.products
        .flatMap((p) => p.variants)
        .find((v) => v.id === item.variant.id)!;
      variant.availableStock -= item.quantity;
      variant.reservedStock = (variant.reservedStock ?? 0) + item.quantity;
    }
    s.orders.unshift(order);
    s.carts[u.id] = [];
    result = order;
  } else if (route === "orders/me" || route.startsWith("orders/me/")) {
    const u = needUser();
    const orders = s.orders.filter((o) => o.userId === u.id);
    result =
      route === "orders/me"
        ? orders
        : orders.find((o) => o.id === route.split("/")[2]);
    if (!result) throw new ApiError("Pedido no encontrado.", 404);
  } else if (route === "banners" && method === "GET") {
    const now = new Date().toISOString();
    result = (s.banners ?? []).filter((banner) => banner.active && (!banner.startsAt || banner.startsAt <= now) && (!banner.endsAt || banner.endsAt >= now)).sort((a, b) => a.position - b.position);
  } else if (route === "admin/search" || route.startsWith("admin/bulk/")) {
    result = await demoAdminTools(s, path, method, b, user);
  } else if (
    route.startsWith("admin/") ||
    route.startsWith("inventory/") ||
    ["POST", "PATCH", "DELETE"].includes(method) ||
    ["promotions", "promotions/expiration", "recommendations"].includes(route)
  ) {
    needAdmin();
    const parts = route.split("/");
    if (route === "admin/dashboard")
      result = {
        products: s.products.length,
        pendingApplications: s.applications.filter(
          (a) => a.status === "PENDING",
        ).length,
        pendingReviewOrders: s.orders.filter(
          (o) => o.status === "PENDING_REVIEW",
        ).length,
        activePromotions: s.promotions.length,
        newContactInquiries: s.contactInquiries.filter(
          (inquiry) => inquiry.status === "NEW",
        ).length,
      };
    else if (route === "admin/sales") {
      const period = query.get("period") ?? "7d";
      const days = period === "today" ? 1 : period === "7d" ? 7 : period === "30d" ? 30 : 90;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const start = new Date(todayStart.getTime() - (days - 1) * 86400000);
      const previousStart = new Date(start.getTime() - days * 86400000);
      const valid = s.orders.filter((order) => !["DRAFT", "REJECTED", "CANCELLED"].includes(order.status));
      const current = valid.filter((order) => new Date(order.createdAt) >= start);
      const previous = valid.filter((order) => new Date(order.createdAt) >= previousStart && new Date(order.createdAt) < start);
      const today = valid.filter((order) => new Date(order.createdAt) >= todayStart);
      const amount = (orders: Order[]) => orders.reduce((sum, order) => sum + order.total, 0);
      const top = new Map<string, { id: string; name: string; units: number; amount: number }>();
      const series = new Map<string, { bucket: string; orders: number; amount: number }>();
      for (const order of current) {
        const bucket = period === "today" ? new Date(order.createdAt).toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "America/Montevideo" }) : new Date(order.createdAt).toLocaleDateString("sv-SE", { timeZone: "America/Montevideo" });
        const point = series.get(bucket) ?? { bucket, orders: 0, amount: 0 };
        point.orders++;
        point.amount += order.total;
        series.set(bucket, point);
        for (const item of order.items) {
          const key = item.variantId;
          const entry = top.get(key) ?? { id: key, name: item.productName, units: 0, amount: 0 };
          entry.units += item.quantity;
          entry.amount += item.subtotal;
          top.set(key, entry);
        }
      }
      const currentAmount = amount(current), previousAmount = amount(previous);
      result = { period, timezone: "America/Montevideo", startAt: start.toISOString(), today: { orders: today.length, amount: amount(today) }, current: { orders: current.length, amount: currentAmount, units: current.flatMap((order) => order.items).reduce((sum, item) => sum + item.quantity, 0), collected: current.reduce((sum, order) => sum + (order.payments ?? []).filter((payment) => !payment.voidedAt).reduce((subtotal, payment) => subtotal + Number(payment.amount), 0), 0) }, previous: { orders: previous.length, amount: previousAmount }, changePercent: previousAmount ? Math.round((currentAmount - previousAmount) / previousAmount * 1000) / 10 : null, series: [...series.values()].sort((a, b) => a.bucket.localeCompare(b.bucket)), topProducts: [...top.values()].sort((a, b) => b.units - a.units).slice(0, 8) };
    } else if (route === "admin/banners") {
      if (method === "GET") result = [...(s.banners ?? [])].sort((a, b) => a.position - b.position);
      else if (method === "POST") {
        const desktop = b.desktop;
        if (!(desktop instanceof File)) throw new ApiError("Adjuntá una imagen de escritorio.", 400);
        const banner = { id: id(), title: String(b.title), subtitle: String(b.subtitle ?? ""), actionLabel: String(b.actionLabel), href: String(b.href), alt: String(b.alt), imageUrl: await demoImage(desktop), position: Number(b.position ?? 0), active: b.active === "true", startsAt: String(b.startsAt ?? ""), endsAt: String(b.endsAt ?? "") };
        (s.banners ??= []).push(banner);
        result = banner;
      }
    } else if (route.startsWith("admin/banners/")) {
      const index = (s.banners ?? []).findIndex((banner) => banner.id === parts[2]);
      if (index < 0) throw new ApiError("Banner no encontrado.", 404);
      if (method === "DELETE") { (s.banners ?? []).splice(index, 1); result = { success: true }; }
      else {
        const banner = s.banners![index];
        Object.assign(banner, { title: String(b.title), subtitle: String(b.subtitle ?? ""), actionLabel: String(b.actionLabel), href: String(b.href), alt: String(b.alt), position: Number(b.position ?? 0), active: b.active === "true", startsAt: String(b.startsAt ?? ""), endsAt: String(b.endsAt ?? "") });
        if (b.desktop instanceof File) banner.imageUrl = await demoImage(b.desktop);
        result = banner;
      }
    }
    else if (route === "admin/contact-inquiries" || route === "admin/contact-inquiries/page") {
      const status = query.get("status");
      const term = (query.get("search") ?? "").trim().toLowerCase();
      const all = s.contactInquiries.filter(
        (inquiry) =>
          (!status || inquiry.status === status) &&
          (!term ||
            [
              inquiry.name,
              inquiry.businessName,
              inquiry.email,
              inquiry.locality,
              inquiry.message,
            ].some((value) => value?.toLowerCase().includes(term))),
      );
      const page = Math.max(1, Number(query.get("page")) || 1), limit = Math.max(1, Number(query.get("limit")) || 20);
      result = route.endsWith("/page") ? { items: all.slice((page - 1) * limit, page * limit), meta: { total: all.length, page, limit } } : all;
    } else if (
      route.startsWith("admin/contact-inquiries/") &&
      method === "PATCH"
    ) {
      const inquiry = s.contactInquiries.find((item) => item.id === parts[2]);
      if (!inquiry) throw new ApiError("Consulta no encontrada.", 404);
      if (["NEW", "IN_PROGRESS", "RESOLVED"].includes(String(b.status)))
        inquiry.status = b.status as ContactInquiry["status"];
      if (b.internalNote !== undefined)
        inquiry.internalNote = String(b.internalNote).trim() || null;
      inquiry.handledById = user!.id;
      inquiry.handledBy = { id: user!.id, email: user!.email };
      inquiry.resolvedAt =
        inquiry.status === "RESOLVED"
          ? inquiry.resolvedAt ?? new Date().toISOString()
          : null;
      inquiry.updatedAt = new Date().toISOString();
      result = inquiry;
    }
    else if (route === "admin/applications") result = s.applications;
    else if (route === "admin/applications/page") {
      const term = (query.get("search") ?? "").toLowerCase();
      const status = query.get("status");
      const all = s.applications.filter((a) => (!status || a.status === status) && (!term || [a.businessName, a.legalName, a.rut, a.email, a.contactName].some((value) => value?.toLowerCase().includes(term))));
      const page = Math.max(1, Number(query.get("page")) || 1), limit = Math.max(1, Number(query.get("limit")) || 20);
      result = { items: all.slice((page - 1) * limit, page * limit), meta: { total: all.length, page, limit } };
    }
    else if (route === "admin/salespeople" && method === "GET") {
      const term = (query.get("search") ?? "").trim().toLowerCase();
      const all = s.users.filter((entry) => entry.role === "SALES" && !entry.customerAccount)
        .filter((entry) => !term || [entry.email, s.salespeople?.[entry.id]?.name, s.salespeople?.[entry.id]?.phone].some((value) => value?.toLowerCase().includes(term)))
        .sort((a, b) => a.email.localeCompare(b.email))
        .map((entry) => {
          const profile = s.salespeople?.[entry.id];
          return { id: entry.id, email: entry.email, active: entry.active !== false, emailVerified: entry.emailVerified !== false,
            profile: profile ? { ...profile, customerCount: s.users.filter((client) => client.customerAccount?.salespersonId === profile.id).length } : null };
        });
      const page = Math.max(1, Number(query.get("page")) || 1), limit = Math.max(1, Number(query.get("limit")) || 20);
      result = { items: all.slice((page - 1) * limit, page * limit), meta: { total: all.length, page, limit } };
    }
    else if (route.startsWith("admin/salespeople/")) {
      const seller = s.users.find((entry) => entry.id === parts[2] && entry.role === "SALES" && !entry.customerAccount);
      if (!seller) throw new ApiError("Vendedor no encontrado.", 404);
      const profile = s.salespeople?.[seller.id] ?? null;
      if (method === "GET") {
        result = { id: seller.id, email: seller.email, active: seller.active !== false, emailVerified: seller.emailVerified !== false,
          profile, customers: profile ? s.users.filter((entry) => entry.customerAccount?.salespersonId === profile.id)
            .map((entry) => ({ ...entry.customerAccount, users: [{ email: entry.email }] })) : [] };
      } else if (method === "PATCH" && parts.length === 3) {
        const name = String(b.name ?? "").trim(), phone = String(b.phone ?? "").trim();
        if (name.length < 2 || name.length > 100 || !/^\+?[\d\s().-]{6,30}$/.test(phone) || phone.replace(/\D/g, "").length < 6) throw new ApiError("Revisá el nombre y el teléfono.", 400);
        (s.salespeople ??= {})[seller.id] = { id: profile?.id ?? id(), name, phone };
        result = { id: seller.id, email: seller.email, profile: s.salespeople[seller.id] };
      } else if (method === "POST" && parts[3] === "customers") {
        if (seller.active === false || seller.emailVerified === false) throw new ApiError("Activá la cuenta del vendedor antes de asignarle clientes.", 400);
        if (!profile) throw new ApiError("Completá el nombre y el teléfono del vendedor antes de asignarle clientes.", 400);
        const customer = s.users.find((entry) => entry.customerAccount?.id === b.customerId)?.customerAccount;
        if (!customer) throw new ApiError("Cliente no encontrado.", 404);
        for (const entry of s.users) if (entry.customerAccount?.id === customer.id) entry.customerAccount.salespersonId = profile.id;
        result = { customerId: customer.id, salespersonId: profile.id };
      } else if (method === "DELETE" && parts[3] === "customers") {
        const customer = s.users.find((entry) => entry.customerAccount?.id === parts[4])?.customerAccount;
        if (!profile || !customer || customer.salespersonId !== profile.id) throw new ApiError("Este cliente ya no está asignado al vendedor.", 409);
        for (const entry of s.users) if (entry.customerAccount?.id === customer.id) entry.customerAccount.salespersonId = null;
        result = { customerId: customer.id, salespersonId: null };
      } else throw new ApiError("Acción no disponible.", 404);
    }
    else if (route === "admin/staff") result = s.users.filter((u) => !u.customerAccount).map(({ id, email, role, customRoleId, active, emailVerified }) => ({
      id, email, role, customRoleId, customRole: s.customRoles?.find((item) => item.id === customRoleId) ?? null, active: active !== false, emailVerified: emailVerified !== false,
      invitationPending: emailVerified === false && !!s.staffInvitations?.some((item) => item.userId === id && !item.revoked && !item.accepted && item.expiresAt > new Date().toISOString()),
    }));
    else if (route === "admin/staff/access" && method === "GET") result = [
      ...staffRoles.map((role) => ({ role, id: null, name: null, access: s.staffRoleAccess?.[role] ?? defaultDemoRoleAccess(role) })),
      ...(s.customRoles ?? []).filter((item) => !item.retiredAt).map((item) => ({ role: "CUSTOM", id: item.id, name: item.name, access: item.access, assignedUsers: s.users.filter((user) => user.customRoleId === item.id).length })),
    ];
    else if (route.startsWith("admin/staff/access/") && method === "PATCH") {
      const role = parts[3] as StaffRole;
      const entries = b.entries as { feature: StaffFeature; canView: boolean; canEdit: boolean }[];
      if (!staffRoles.some((item) => item === role) || role === "ADMIN" || !Array.isArray(entries) || entries.length !== staffFeatures.length ||
          new Set(entries.map((entry) => entry.feature)).size !== staffFeatures.length ||
          entries.some((entry) => !staffFeatures.some(([feature]) => feature === entry.feature) || entry.canEdit && !entry.canView)) {
        throw new ApiError("Configuración de permisos inválida.", 400);
      }
      s.staffRoleAccess ??= {};
      s.staffRoleAccess[role] = Object.fromEntries(entries.map((entry) => [entry.feature, { canView: entry.canView, canEdit: entry.canEdit }])) as DemoRoleAccess;
      result = staffRoles.map((item) => ({ role: item, id: null, name: null, access: s.staffRoleAccess?.[item] ?? defaultDemoRoleAccess(item) }));
    }
    else if (route === "admin/staff/roles" && method === "POST") {
      const name = String(b.name ?? "").trim();
      const key = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (name.length < 2 || name.length > 60 || !key) throw new ApiError("Ingresá un nombre válido para el rol.", 400);
      if (s.customRoles?.some((item) => item.key === key)) throw new ApiError("Ya existe un rol con ese nombre.", 409);
      const created = { id: id(), name, key, access: defaultDemoRoleAccess("CUSTOM") };
      (s.customRoles ??= []).push(created);
      result = { id: created.id, name: created.name };
    }
    else if (route.startsWith("admin/staff/roles/") && parts[4] === "access" && method === "PATCH") {
      const item = s.customRoles?.find((entry) => entry.id === parts[3] && !entry.retiredAt);
      const entries = b.entries as { feature: StaffFeature; canView: boolean; canEdit: boolean }[];
      if (!item) throw new ApiError("Rol no encontrado.", 404);
      if (!Array.isArray(entries) || entries.length !== staffFeatures.length ||
          new Set(entries.map((entry) => entry.feature)).size !== staffFeatures.length ||
          entries.some((entry) => !staffFeatures.some(([feature]) => feature === entry.feature) || entry.canEdit && !entry.canView)) {
        throw new ApiError("Configuración de permisos inválida.", 400);
      }
      item.access = Object.fromEntries(entries.map((entry) => [entry.feature, { canView: entry.canView, canEdit: entry.canEdit }])) as DemoRoleAccess;
      result = { success: true };
    }
    else if (route.startsWith("admin/staff/roles/") && ((parts.length === 4 && ["PATCH", "DELETE"].includes(method)) || parts[4] === "duplicate" && method === "POST")) {
      const current = s.customRoles?.find((entry) => entry.id === parts[3] && !entry.retiredAt);
      if (!current) throw new ApiError("El rol no existe o fue retirado.", 404);
      const previousName = current.name;
      const action = method === "DELETE" ? "retire" : method === "PATCH" ? "rename" : "duplicate";
      let saved = current;
      if (action === "retire") {
        if (s.users.some((item) => item.customRoleId === current.id)) throw new ApiError("Reasigná los usuarios de este rol antes de retirarlo, incluidas las invitaciones pendientes.", 409);
        current.retiredAt = new Date().toISOString();
      } else {
        const name = String(b.name ?? "").trim();
        const key = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        if (name.length < 2 || name.length > 60 || !key) throw new ApiError("Ingresá un nombre válido para el rol.", 400);
        if (s.customRoles?.some((item) => item.key === key && (action === "duplicate" || item.id !== current.id))) throw new ApiError("Ya existe un rol con ese nombre.", 409);
        if (action === "rename") { current.name = name; current.key = key; }
        else {
          const actor = user!.role === "CUSTOM" ? s.customRoles?.find((item) => item.id === user!.customRoleId)?.access : completeDemoRoleAccess(user!.role as StaffRole, s.staffRoleAccess?.[user!.role as StaffRole]);
          if (user!.role !== "ADMIN" && staffFeatures.some(([feature]) => current.access[feature].canView && !actor?.[feature].canView || current.access[feature].canEdit && !actor?.[feature].canEdit)) throw new ApiError("No podés otorgar permisos que no tenés.", 403);
          saved = { id: id(), name, key, access: structuredClone(current.access) };
          s.customRoles!.push(saved);
        }
      }
      (s.roleHistory ??= []).push({ action, roleId: saved.id, actorId: user!.id, createdAt: new Date().toISOString(), name: saved.name, previousName });
      result = { id: saved.id, name: saved.name };
    }
    else if (route === "admin/staff/invitations" && method === "POST") {
      const email = String(b.email ?? "").trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email) || ![...staffRoles, "CUSTOM"].includes(String(b.role) as StaffRole) ||
          (b.role === "CUSTOM" && !s.customRoles?.some((item) => item.id === b.customRoleId && !item.retiredAt))) throw new ApiError("Datos inválidos.", 400);
      let member = s.users.find((item) => item.email.toLowerCase() === email);
      if (member && (member.customerAccount || member.active !== false || member.emailVerified !== false || member.role === "CLIENT")) throw new ApiError("Ese correo ya pertenece a una cuenta activa o de cliente.", 409);
      if (!member) {
        member = { id: id(), email, role: b.role as User["role"], permissions: [], active: false, emailVerified: false };
        s.users.push(member);
      }
      member.role = b.role as User["role"];
      member.customRoleId = member.role === "CUSTOM" ? String(b.customRoleId) : null;
      for (const item of s.staffInvitations ?? []) if (item.userId === member.id && !item.accepted) item.revoked = true;
      const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      s.staffInvitations!.push({ userId: member.id, tokenHash: await demoHash(token), expiresAt, accepted: false, revoked: false });
      result = { id: member.id, email, role: member.role, customRoleId: member.customRoleId, token, expiresAt };
    }
    else if (route.startsWith("admin/staff/") && parts[3] === "active" && method === "PATCH") {
      const member = s.users.find((item) => item.id === parts[2] && !item.customerAccount);
      if (!member) throw new ApiError("Usuario interno no encontrado.", 404);
      if (member.id === user!.id && b.active === false) throw new ApiError("No podés desactivar tu cuenta.", 403);
      if (b.active === true && member.emailVerified === false) throw new ApiError("Debe aceptar la invitación.", 400);
      if (b.active === false && s.salespeople?.[member.id] && s.users.some((entry) => entry.customerAccount?.salespersonId === s.salespeople?.[member.id]?.id)) throw new ApiError("Reasigná sus clientes antes de desactivar al vendedor.", 400);
      if (b.active === false && member.role === "ADMIN" && s.users.filter((item) => item.role === "ADMIN" && item.active !== false && !item.customerAccount).length <= 1) throw new ApiError("Debe quedar al menos un administrador activo.", 400);
      member.active = b.active === true;
      if (!member.active) for (const item of s.staffInvitations ?? []) if (item.userId === member.id && !item.accepted) item.revoked = true;
      result = { id: member.id, email: member.email, role: member.role, active: member.active };
    }
    else if (route.startsWith("admin/staff/") && parts[3] === "role" && method === "PATCH") {
      const member = s.users.find((u) => u.id === parts[2] && !u.customerAccount);
      if (!member) throw new ApiError("Usuario interno no encontrado.", 404);
      if (member.id === user!.id && b.role !== "ADMIN") throw new ApiError("No podés quitarte tu acceso de administrador.", 403);
      if (b.role !== "SALES" && s.salespeople?.[member.id] && s.users.some((entry) => entry.customerAccount?.salespersonId === s.salespeople?.[member.id]?.id)) throw new ApiError("Reasigná sus clientes antes de cambiar el rol del vendedor.", 400);
      if (![...staffRoles, "CUSTOM"].includes(String(b.role) as StaffRole) ||
          (b.role === "CUSTOM" && !s.customRoles?.some((item) => item.id === b.customRoleId && !item.retiredAt))) throw new ApiError("Rol inválido.", 400);
      member.role = b.role as typeof member.role;
      member.customRoleId = member.role === "CUSTOM" ? String(b.customRoleId) : null;
      member.permissions = [];
      result = { id: member.id, email: member.email, role: member.role, customRoleId: member.customRoleId, active: member.active };
    }
    else if (route.startsWith("admin/applications/")) {
      const a = s.applications.find((a) => a.id === parts[2]);
      if (!a || a.status !== "PENDING")
        throw new ApiError("La solicitud ya fue revisada o no existe.", 400);
      if (parts[3] === "documents" && method === "POST") {
        const file = b.file instanceof File ? b.file : null;
        if (!file || !["application/pdf", "image/png", "image/jpeg"].includes(file.type) || file.size > 5_000_000 || !file.size)
          throw new ApiError("Adjuntá un PDF, PNG o JPG de hasta 5 MB.", 400);
        if ((a.documents?.length ?? 0) >= 3) throw new ApiError("La solicitud ya tiene el máximo de tres archivos.", 400);
        const document = { id: id(), type: "BUSINESS_PERMIT", originalName: file.name };
        (a.documents ??= []).push(document);
        result = document;
      } else {
      if (parts[3] === "approve" && !a.documents?.length)
        throw new ApiError("La solicitud no tiene permisos o habilitaciones adjuntos.", 400);
      a.status = parts[3] === "approve" ? "APPROVED" : "REJECTED";
      a.rejectionReason = String(b.rejectionReason ?? "");
      if (a.status === "APPROVED") {
        const medication = !!b.medicationPermission;
        const account: Customer = {
          ...a,
          id: id(),
          accountStatus: "APPROVED",
          creditStatus: "GOOD_STANDING",
          medicationPermission: medication,
          addresses: a.address?.trim()
            ? [{ id: id(), label: "Principal", address: a.address.trim(), city: a.city, department: a.department }]
            : [],
        };
        s.users.push({
          id: id(),
          email: a.email,
          role: "CLIENT",
          permissions: [
            "CAN_VIEW_PRICES",
            "CAN_PLACE_ORDERS",
            ...(medication ? ["CAN_BUY_MEDICATIONS" as const] : []),
          ],
          customerAccount: account,
        });
      }
      result = a;
      }
    } else if (route === "admin/customers/page") {
      const term = (query.get("search") ?? "").toLowerCase();
      const sellerId = user?.role === "SALES" ? s.salespeople?.[user.id]?.id : undefined;
      const all = s.users.filter((u) => u.customerAccount && (user?.role !== "SALES" || !!sellerId && u.customerAccount.salespersonId === sellerId)).filter((u) => !term || [u.email, u.customerAccount?.businessName, u.customerAccount?.legalName, u.customerAccount?.rut, u.customerAccount?.phone].some((value) => value?.toLowerCase().includes(term))).map((u) => ({ ...u.customerAccount, users: [{ id: u.id, email: u.email }], salesperson: salespersonFor(u.customerAccount) }));
      const page = Math.max(1, Number(query.get("page")) || 1), limit = Math.max(1, Number(query.get("limit")) || 20);
      result = { items: all.slice((page - 1) * limit, page * limit), meta: { total: all.length, page, limit } };
    } else if (route === "admin/customers")
      result = s.users
        .filter((u) => u.customerAccount && (user?.role !== "SALES" || !!s.salespeople?.[user.id] && u.customerAccount.salespersonId === s.salespeople[user.id].id))
        .map((u) => ({
          ...u.customerAccount,
          users: [{ id: u.id, email: u.email }],
          salesperson: salespersonFor(u.customerAccount),
        }));
    else if (route.startsWith("admin/customers/")) {
      const u = s.users.find((u) => u.customerAccount?.id === parts[2]);
      if (!u) throw new ApiError("Cliente no encontrado.", 404);
      if (method === "GET") {
        const account = u.customerAccount!;
        const orders = s.orders.filter((o) => o.customerAccount?.id === account.id || o.userId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const debt = orders.filter((o) => !["CANCELLED", "REJECTED"].includes(o.status)).reduce((sum, o) => sum + orderBalance(o).due, 0);
        const application = s.applications.find((a) => a.email.toLowerCase() === u.email.toLowerCase() && a.status === "APPROVED");
        result = { ...account, users: [{ id: u.id, email: u.email }], salesperson: salespersonFor(account), addresses: account.addresses ?? [], documents: (application?.documents ?? []).map((d) => ({ ...d, mimeType: "application/pdf", status: "ACTIVE", uploadedAt: new Date().toISOString() })), orderCount: orders.length, recentOrders: orders.slice(0, 10).map(({ id, orderNumber, createdAt, status, total, currency }) => ({ id, orderNumber, createdAt, status, total, currency })), debt, availableCredit: account.creditLimit == null ? null : Math.max(0, Number(account.creditLimit) - debt), creditChanges: s.creditChanges?.[account.id] ?? [] };
      } else {
      const previousCredit = { creditLimit: u.customerAccount?.creditLimit ?? null, creditStatus: u.customerAccount?.creditStatus, internalCreditNote: u.customerAccount?.internalCreditNote };
      Object.assign(u.customerAccount!, b);
      if (b.medicationPermission !== undefined) {
        u.permissions = u.permissions.filter(
          (p) => p !== "CAN_BUY_MEDICATIONS",
        );
        if (b.medicationPermission) u.permissions.push("CAN_BUY_MEDICATIONS");
      }
      if ((b.creditLimit !== undefined && Number(previousCredit.creditLimit ?? 0) !== Number(b.creditLimit ?? 0)) ||
          (b.creditStatus !== undefined && b.creditStatus !== previousCredit.creditStatus) ||
          (b.internalCreditNote !== undefined && b.internalCreditNote !== previousCredit.internalCreditNote)) {
        (s.creditChanges ??= {})[u.customerAccount!.id] ??= [];
        s.creditChanges[u.customerAccount!.id].unshift({ id: id(), action: "CUSTOMER_CREDIT_UPDATED", createdAt: new Date().toISOString(), metadata: { before: previousCredit, after: { creditLimit: u.customerAccount?.creditLimit ?? null, creditStatus: u.customerAccount?.creditStatus, internalCreditNote: u.customerAccount?.internalCreditNote } }, user: { email: user!.email } });
      }
      result = u.customerAccount;
      }
    } else if (route === "admin/orders/page") {
      const term = (query.get("search") ?? "").toLowerCase();
      const status = query.get("status");
      const customer = (query.get("customer") ?? "").toLowerCase();
      const customerId = query.get("customerId");
      const dateFrom = query.get("dateFrom");
      const dateTo = query.get("dateTo");
      const paymentStatus = query.get("paymentStatus");
      const all = s.orders.filter((o) => {
        if (user?.role === "SALES" && !s.users.some((entry) => entry.customerAccount?.id === o.customerAccount?.id && entry.customerAccount?.salespersonId === s.salespeople?.[user.id]?.id && !!s.salespeople?.[user.id])) return false;
        const email = s.users.find((u) => u.id === o.userId)?.email ?? "";
        const payment = orderBalance(o).status;
        return (!status || o.status === status) && (!term || [o.id, o.orderNumber, o.customerAccount?.businessName, email].some((value) => value?.toLowerCase().includes(term))) &&
          (!customer || [o.customerAccount?.businessName, o.customerAccount?.legalName, email].some((value) => value?.toLowerCase().includes(customer))) &&
          (!customerId || o.customerAccount?.id === customerId) && (!dateFrom || o.createdAt.slice(0, 10) >= dateFrom) && (!dateTo || o.createdAt.slice(0, 10) <= dateTo) &&
          (!paymentStatus || ({ PENDING: "Pendiente", PARTIAL: "Parcial", PAID: "Completo", CREDITED: "Acreditado" } as Record<string, string>)[paymentStatus] === payment);
      }).map((o) => ({ ...o, user: { email: s.users.find((u) => u.id === o.userId)?.email ?? "" } }));
      const page = Math.max(1, Number(query.get("page")) || 1), limit = Math.max(1, Number(query.get("limit")) || 20);
      result = { items: all.slice((page - 1) * limit, page * limit), meta: { total: all.length, page, limit } };
    } else if (route === "admin/orders")
      result = s.orders.filter((o) => user?.role !== "SALES" || s.users.some((entry) => entry.customerAccount?.id === o.customerAccount?.id && entry.customerAccount?.salespersonId === s.salespeople?.[user.id]?.id && !!s.salespeople?.[user.id])).map((o) => ({
        ...o,
        user: { email: s.users.find((u) => u.id === o.userId)?.email ?? "" },
      }));
    else if (route.startsWith("admin/orders/") && parts[3] === "returns" && method === "POST") {
      result = await demoProductReturn(s, parts[2], b, user!, parts[4] === "preview", demoHash);
    }
    else if (route.startsWith("admin/orders/") && ["credit-notes", "refunds"].includes(parts[3]) && method === "POST") {
      const order = s.orders.find((item) => item.id === parts[2]);
      if (!order) throw new ApiError("Pedido no encontrado.", 404);
      const amount = Number(b.amount);
      const reason = String(b.reason ?? "").trim();
      if (!Number.isFinite(amount) || amount <= 0 || reason.length < 3) throw new ApiError("Indicá un importe y motivo válidos.", 400);
      if (parts[3] === "credit-notes") {
        const noteNumber = String(b.noteNumber ?? "").trim() || null;
        const file = b.file instanceof File ? b.file : null;
        if ((!noteNumber && !file) || amount > order.total - Number(order.creditedTotal ?? 0)) throw new ApiError("El crédito supera el importe restante o falta la nota.", 400);
        const note = { id: id(), amount, noteNumber, reason, originalName: file?.name ?? null, createdAt: new Date().toISOString(), recordedByEmail: user!.email };
        (order.creditNotes ??= []).unshift(note);
        order.creditedTotal = Number(order.creditedTotal ?? 0) + amount;
        result = note;
      } else {
        if (amount > Math.min(Number(order.paidTotal ?? 0), Number(order.creditedTotal ?? 0)) - Number(order.refundedTotal ?? 0)) throw new ApiError("El reintegro supera el saldo respaldado por pagos y notas de crédito.", 400);
        const refund = { id: id(), amount, reason, reference: String(b.reference ?? "").trim() || null, createdAt: new Date().toISOString(), recordedByEmail: user!.email };
        (order.refunds ??= []).unshift(refund);
        order.refundedTotal = Number(order.refundedTotal ?? 0) + amount;
        result = refund;
      }
    }
    else if (route.startsWith("admin/orders/") && ["payments", "invoices"].includes(parts[3])) {
      const order = s.orders.find((item) => item.id === parts[2]);
      if (!order) throw new ApiError("Pedido no encontrado.", 404);
      const collection = parts[3] === "payments" ? (order.payments ??= []) : (order.invoices ??= []);
      if (parts[5] === "void" && method === "POST") {
        const record = collection.find((item) => item.id === parts[4]);
        if (!record) throw new ApiError("Registro no encontrado.", 404);
        if (record.voidedAt) throw new ApiError("El registro ya fue anulado.", 409);
        if (String(b.reason ?? "").trim().length < 3) throw new ApiError("Indicá el motivo de anulación.", 400);
        record.voidedAt = new Date().toISOString();
        record.voidReason = String(b.reason).trim();
        if (parts[3] === "payments") order.paidTotal = Math.max(0, Number(order.paidTotal ?? 0) - Number((record as NonNullable<Order["payments"]>[number]).amount));
        result = record;
      } else if (parts[3] === "payments" && method === "POST") {
        const amount = Number(b.amount);
        if (!Number.isFinite(amount) || amount <= 0 || amount > order.total - Number(order.paidTotal ?? 0)) throw new ApiError("El importe supera el saldo pendiente.", 400);
        const payment = { id: id(), amount, createdAt: new Date().toISOString() };
        order.payments!.unshift(payment);
        order.paidTotal = Number(order.paidTotal ?? 0) + amount;
        result = payment;
      } else if (parts[3] === "invoices" && method === "POST") {
        const number = String(b.invoiceNumber ?? "").trim();
        const file = b.file;
        if (!number && !(file instanceof File)) throw new ApiError("Ingresá un número o archivo de factura.", 400);
        const replaced = b.replacesInvoiceId ? order.invoices!.find((item) => item.id === b.replacesInvoiceId) : undefined;
        if (b.replacesInvoiceId && (!replaced || replaced.voidedAt || String(b.replacementReason ?? "").trim().length < 3)) throw new ApiError("Factura a reemplazar o motivo inválido.", 400);
        if (replaced) { replaced.voidedAt = new Date().toISOString(); replaced.voidReason = String(b.replacementReason).trim(); }
        const invoice = { id: id(), invoiceNumber: number || null, originalName: file instanceof File ? file.name : null, createdAt: new Date().toISOString(), replacesInvoiceId: replaced?.id ?? null, replacementReason: replaced ? String(b.replacementReason).trim() : null };
        order.invoices!.unshift(invoice);
        result = invoice;
      } else throw new ApiError("Acción no disponible en la demo.", 400);
    } else if (route.startsWith("admin/orders/") && parts.length === 3 && method === "GET") {
      const order = s.orders.find((item) => item.id === parts[2]);
      if (!order) throw new ApiError("Pedido no encontrado.", 404);
      result = { ...order, user: { email: s.users.find((u) => u.id === order.userId)?.email ?? "" } };
    } else if (route.startsWith("admin/orders/")) {
      const o = s.orders.find((o) => o.id === parts[2]);
      if (!o) throw new ApiError("Pedido no encontrado.", 404);
      const status =
        parts[3] === "approve"
          ? "APPROVED"
          : parts[3] === "reject"
            ? "REJECTED"
            : String(b.status);
      if (!orderStatuses.includes(status))
        throw new ApiError("Estado de pedido inválido.", 400);
      if (o.status === "REJECTED" && status !== "REJECTED") {
        if (status !== "PENDING_REVIEW") throw new ApiError("Un pedido rechazado solo puede volver a revisión.", 400);
        if (!s.consumedOrderIds?.includes(o.id)) {
          const variants = o.items.map((item) => ({
            item,
            variant: s.products.flatMap((product) => product.variants).find((variant) => variant.id === item.variantId),
          }));
          if (variants.some(({ item, variant }) => !variant?.active ||
            (variant.physicalStock ?? 0) - (variant.reservedStock ?? 0) < item.quantity)) {
            throw new ApiError("No hay stock disponible para reabrir este pedido.", 400);
          }
          for (const { item, variant } of variants) {
            variant!.reservedStock = (variant!.reservedStock ?? 0) + item.quantity;
            variant!.availableStock = (variant!.physicalStock ?? 0) - variant!.reservedStock;
          }
        }
        o.requiresManualReview = true;
        o.reviewReason = String(b.reviewReason ?? "Pedido reabierto para revisión");
      }
      if (typeof b.reviewReason === "string") o.reviewReason = b.reviewReason;
      if (
        ["SUBMITTED", "PENDING_REVIEW"].includes(o.status) &&
        ["APPROVED", "PROCESSING", "REJECTED", "CANCELLED"].includes(status)
      ) {
        for (const item of o.items) {
          const v = s.products
            .flatMap((p) => p.variants)
            .find((v) => v.id === item.variantId);
          if (!v) continue;
          v.reservedStock = Math.max(0, (v.reservedStock ?? 0) - item.quantity);
          if (["REJECTED", "CANCELLED"].includes(status))
            v.availableStock += item.quantity;
          else {
            v.physicalStock = (v.physicalStock ?? 0) - item.quantity;
            (s.consumedOrderIds ??= []).push(o.id);
          }
        }
      }
      o.status = status;
      result = o;
    } else if (route === "products" && method === "POST") {
      const p: Product = {
        ...b,
        id: id(),
        name: String(b.name),
        productType: String(b.productType ?? "OTHER"),
        requiresMedicationPermission: !!b.requiresMedicationPermission,
        slug: String(b.slug || `producto-${id()}`),
        variants: [],
        media: [],
        categories: ((b.categoryIds as string[]) ?? []).map((categoryId) => ({
          categoryId,
          category: s.categories.find((c) => c.id === categoryId),
        })),
        brand: s.brands.find((x) => x.id === b.brandId),
        laboratory: s.laboratories.find((x) => x.id === b.laboratoryId),
      };
      s.products.push(p);
      result = p;
    } else if (parts[0] === "products" && parts[1] === "variants") {
      const v = s.products
        .flatMap((p) => p.variants)
        .find((v) => v.id === parts[2]);
      if (!v) throw new ApiError("Presentación no encontrada.", 404);
      Object.assign(v, b);
      result = v;
    } else if (parts[0] === "products" && parts[2] === "variants") {
      const p = s.products.find((p) => p.id === parts[1])!;
      const v = {
        id: id(),
        availableStock: Number(b.physicalStock ?? 0),
        saleMultiple: 1,
        minimumOrderQuantity: 1,
        ...b,
      } as Product["variants"][number];
      p.variants.push(v);
      result = v;
    } else if (parts[0] === "products" && parts[1] === "media") {
      const p = s.products.find((p) => p.media.some((m) => m.id === parts[2]))!;
      if (method === "DELETE")
        p.media = p.media.filter((m) => m.id !== parts[2]);
      else
        Object.assign(
          p.media.find((m) => m.id === parts[2])!,
          b,
        );
      result = { success: true };
    } else if (parts[0] === "products" && parts[2] === "media" && parts[3] === "upload") {
      const p = s.products.find((product) => product.id === parts[1]);
      if (!p || !(body instanceof FormData)) throw new ApiError("Producto no encontrado.", 404);
      const files = body.getAll("files").filter((value): value is File => value instanceof File);
      if (!files.length || files.length > 8) throw new ApiError("Seleccioná hasta 8 imágenes.", 400);
      const uploaded = [];
      for (const file of files) {
        const media = { id: id(), productId: p.id, type: "IMAGE" as const, url: await demoImage(file), alt: p.name, position: p.media.length, isPrimary: !p.media.length };
        p.media.push(media);
        uploaded.push(media);
      }
      result = uploaded;
    } else if (parts[0] === "products" && parts[2] === "media") {
      const p = s.products.find((p) => p.id === parts[1])!;
      const m = { id: id(), ...b } as Product["media"][number];
      p.media.push(m);
      result = m;
    } else if (parts[0] === "products" && method === "PATCH") {
      const p = s.products.find((p) => p.id === parts[1])!;
      Object.assign(p, b);
      if (b.brandId) p.brand = s.brands.find((x) => x.id === b.brandId);
      if (b.laboratoryId)
        p.laboratory = s.laboratories.find((x) => x.id === b.laboratoryId);
      if (b.categoryIds)
        p.categories = (b.categoryIds as string[]).map((categoryId) => ({
          categoryId,
          category: s.categories.find((c) => c.id === categoryId),
        }));
      result = p;
    } else if (["pricing", "inventory"].includes(parts[0])) {
      const v = s.products
        .flatMap((p) => p.variants)
        .find((v) => v.id === parts[2]);
      if (!v) throw new ApiError("Presentación no encontrada.", 404);
      if (method === "PATCH") {
        if (parts[0] === "pricing")
          v.price = {
            amount: Number(b.amount),
            currency: String(b.currency ?? "UYU"),
          };
        else {
          v.physicalStock = Number(b.physicalStock);
          v.availableStock = v.physicalStock - (v.reservedStock ?? 0);
        }
      }
      result = v;
    } else if (
      [
        "promotions",
        "admin/promotions",
        "recommendations",
        "admin/recommendations",
        "promotions/expiration",
      ].includes(route)
    ) {
      const collection =
        route === "promotions/expiration"
          ? s.expiration
          : route.includes("recommendations")
            ? s.rules
            : s.promotions;
      if (method === "POST") {
        const value = { id: id(), active: true, ...b };
        collection.push(value as Rule & Expiration);
        result = value;
      } else result = collection;
    } else if (parts[0] === "categories" && parts[1] && parts[2] === "products") {
      const category = s.categories.find((item) => item.id === parts[1]);
      const productId = method === "POST" ? String(b.productId ?? "") : parts[3];
      const product = s.products.find((item) => item.id === productId);
      if (!category || !product) throw new ApiError("Categoría o producto no encontrado.", 404);
      if (method === "POST") {
        if (!product.categories.some((item) => item.categoryId === category.id))
          product.categories.push({ categoryId: category.id, category });
        result = { linked: true };
      } else if (method === "DELETE") {
        product.categories = product.categories.filter((item) => item.categoryId !== category.id);
        result = { removed: true };
      } else throw new ApiError("Acción no disponible en la demo.", 400);
    } else if (["brands", "categories", "laboratories"].includes(parts[0])) {
      const collection =
        s[parts[0] as "brands" | "categories" | "laboratories"];
      if (method === "POST") {
        const value = { id: id(), ...b } as Entity;
        collection.push(value);
        result = value;
      } else if (method === "DELETE" && parts[0] !== "categories") {
        const index = collection.findIndex((item) => item.id === parts[1]);
        if (index < 0) throw new ApiError("Marca o laboratorio no encontrado.", 404);
        const inUse = s.products.some((product) => parts[0] === "brands" ? product.brand?.id === parts[1] : product.laboratory?.id === parts[1]);
        if (inUse) throw new ApiError("Tiene productos asociados. Reasignalos antes de eliminarlo.", 409);
        const targetType = parts[0] === "brands" ? "BRAND" : "LABORATORY";
        const inRules = s.rules.some((rule) => rule.active !== false && rule.triggerType === targetType && rule.triggerId === parts[1]) ||
          s.promotions.some((promotion) => promotion.active !== false && [...(promotion.conditions ?? []), ...(promotion.rewards ?? [])].some((target) => target.targetType === targetType && target.targetId === parts[1]));
        if (inRules) throw new ApiError("Está en una promoción o recomendación activa. Quitalo de esas reglas antes de eliminarlo.", 409);
        collection.splice(index, 1);
        result = { deleted: true };
      } else {
        const value = collection.find((x) => x.id === parts[1]);
        Object.assign(value!, b);
        result = value;
      }
    } else if (parts[0] === "promotions" && parts[1] && parts[1] !== "expiration") {
      const promotion = s.promotions.find((item) => item.id === parts[1]);
      if (!promotion) throw new ApiError("Promoción no encontrada.", 404);
      if (method === "DELETE") {
        s.promotions = s.promotions.filter((item) => item.id !== parts[1]);
        result = { success: true };
      } else if (parts[2] === "activate" || parts[2] === "deactivate") {
        promotion.active = parts[2] === "activate";
        result = promotion;
      } else if (method === "PATCH") {
        Object.assign(promotion, b);
        result = promotion;
      } else throw new ApiError("Acción no disponible en la demo.", 400);
    } else if (route === "admin/audit-logs") result = [];
    else
      throw new ApiError("Esta operación no está disponible en la demo.", 404);
  } else
    throw new ApiError("Esta operación no está disponible en la demo.", 404);
  if (method !== "GET") write(s);
  return structuredClone(result) as T;
}
