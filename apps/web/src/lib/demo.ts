import { seedProducts, seedUsers, categories } from "./demo-seed";
import type {
  Application,
  Cart,
  Customer,
  Entity,
  Expiration,
  Order,
  Product,
  Rule,
  User,
} from "./types";
import { can, quantityError, reviewRequired } from "./commerce";
import { ApiError } from "./http";
type State = {
  version: number;
  session: string | null;
  products: Product[];
  users: User[];
  carts: Record<string, { id: string; variantId: string; quantity: number }[]>;
  applications: Application[];
  orders: Order[];
  rules: Rule[];
  promotions: Rule[];
  expiration: Expiration[];
  categories: Entity[];
  brands: Entity[];
  laboratories: Entity[];
};
const KEY = "districo-demo-v1";
export const blankState = (): State => ({
  version: 1,
  session: null,
  products: seedProducts(),
  users: seedUsers(),
  carts: {},
  applications: [],
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
  const b = (body ?? {}) as Record<string, unknown>;
  const user = s.users.find((u) => u.id === s.session);
  const needUser = () => {
    if (!user) throw new ApiError("Ingresá para continuar.", 401);
    return user;
  };
  const needAdmin = () => {
    if (needUser().role !== "ADMIN")
      throw new ApiError("Acceso exclusivo de administración.", 403);
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
    if (!found || b.password !== "Demo1234!")
      throw new ApiError(
        "Credenciales demo inválidas. Usá Demo1234! en las cuentas de prueba.",
        401,
      );
    s.session = found.id;
    result = { user: found };
  } else if (route === "auth/me") result = needUser();
  else if (route === "auth/logout") {
    s.session = null;
    result = { success: true };
  } else if (route === "applications" && method === "POST") {
    if (
      s.users.some((u) => u.email === b.email) ||
      s.applications.some((a) => a.email === b.email && a.status === "PENDING")
    )
      throw new ApiError(
        "Ya existe una cuenta o solicitud con ese correo.",
        400,
      );
    const { password: _password, ...safe } = b;
    void _password;
    const application = { ...safe, id: id(), status: "PENDING" } as Application;
    s.applications.push(application);
    result = application;
  } else if (route === "products" && method === "GET") {
    let items = s.products.filter((p) => p.active !== false);
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
        (p: Product, v: string) => p.categories.some((c) => c.categoryId === v),
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
    const page = Math.max(1, Number(query.get("page") ?? 1)),
      limit = Math.min(100, Math.max(1, Number(query.get("limit") ?? 12)));
    result = {
      items: items
        .slice((page - 1) * limit, page * limit)
        .map((p) => publicProduct(p, user)),
      meta: { total: items.length, page, limit },
    };
  } else if (
    ["categories", "brands", "laboratories", "attributes"].includes(route) &&
    method === "GET"
  )
    result =
      route === "attributes"
        ? []
        : s[route as "categories" | "brands" | "laboratories"];
  else if (route.startsWith("products/") && method === "GET") {
    const p = s.products.find(
      (p) => p.slug === route.split("/")[1] && p.active !== false,
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
    for (const item of cart.items) {
      const error = quantityError(item.variant, item.quantity);
      if (error) throw new ApiError(error, 400);
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
      status: review ? "PENDING_REVIEW" : "SUBMITTED",
      requiresManualReview: review,
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
      };
    else if (route === "admin/applications") result = s.applications;
    else if (route.startsWith("admin/applications/")) {
      const a = s.applications.find((a) => a.id === parts[2]);
      if (!a || a.status !== "PENDING")
        throw new ApiError("La solicitud ya fue revisada o no existe.", 400);
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
    } else if (route === "admin/customers")
      result = s.users
        .filter((u) => u.customerAccount)
        .map((u) => ({
          ...u.customerAccount,
          users: [{ id: u.id, email: u.email }],
        }));
    else if (route.startsWith("admin/customers/")) {
      const u = s.users.find((u) => u.customerAccount?.id === parts[2]);
      if (!u) throw new ApiError("Cliente no encontrado.", 404);
      Object.assign(u.customerAccount!, b);
      if (b.medicationPermission !== undefined) {
        u.permissions = u.permissions.filter(
          (p) => p !== "CAN_BUY_MEDICATIONS",
        );
        if (b.medicationPermission) u.permissions.push("CAN_BUY_MEDICATIONS");
      }
      result = u.customerAccount;
    } else if (route === "admin/orders") result = s.orders;
    else if (route.startsWith("admin/orders/")) {
      const o = s.orders.find((o) => o.id === parts[2]);
      if (!o) throw new ApiError("Pedido no encontrado.", 404);
      const status =
        parts[3] === "approve"
          ? "APPROVED"
          : parts[3] === "reject"
            ? "REJECTED"
            : String(b.status);
      if (
        ["SUBMITTED", "PENDING_REVIEW"].includes(o.status) &&
        ["APPROVED", "PROCESSING", "REJECTED", "CANCELLED"].includes(status)
      ) {
        for (const item of o.items) {
          const v = s.products
            .flatMap((p) => p.variants)
            .find((v) => v.id === item.variantId)!;
          v.reservedStock = Math.max(0, (v.reservedStock ?? 0) - item.quantity);
          if (["REJECTED", "CANCELLED"].includes(status))
            v.availableStock += item.quantity;
          else v.physicalStock = (v.physicalStock ?? 0) - item.quantity;
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
    } else if (["brands", "categories", "laboratories"].includes(parts[0])) {
      const collection =
        s[parts[0] as "brands" | "categories" | "laboratories"];
      if (method === "POST") {
        const value = { id: id(), ...b } as Entity;
        collection.push(value);
        result = value;
      } else {
        const value = collection.find((x) => x.id === parts[1]);
        Object.assign(value!, b);
        result = value;
      }
    } else if (route === "admin/audit-logs") result = [];
    else
      throw new ApiError("Esta operación no está disponible en la demo.", 404);
  } else
    throw new ApiError("Esta operación no está disponible en la demo.", 404);
  if (method !== "GET") write(s);
  return structuredClone(result) as T;
}
