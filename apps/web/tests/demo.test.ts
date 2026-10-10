import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoRequest as api, resetDemo } from "../src/lib/demo";
import type {
  Application,
  Attribute,
  Cart,
  ContactInquiry,
  CustomerDetail,
  Order,
  ProductCardList,
  ProductList,
  Rule,
  User,
} from "../src/lib/types";
import { firstQuantity, quantityError } from "../src/lib/commerce";
import { staffFeatures } from "../src/lib/staff-access";
beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  });
  resetDemo();
});
const login = (email = "cliente@gmail.com") =>
  api("auth/login", "POST", { email, password: "Demo1234!" });
describe("Demo B2B: permisos y aislamiento", () => {
  it("cuenta todas las presentaciones activas aunque la tarjeta sólo reciba una", async () => {
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    const product = state.products[0];
    product.variants = Array.from({ length: 5 }, (_, index) => ({ ...product.variants[0], id: `variant-${index}`, active: index < 4 }));
    state.products = [product];
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
    const cards = await api<ProductCardList>("products/cards");
    expect(cards.items[0].variantCount).toBe(4);
    expect(cards.items[0].variants).toHaveLength(1);
    expect(cards.items[0].variants[0].price).toBeUndefined();
    product.variants.forEach((variant: { active: boolean }) => { variant.active = false; });
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
    const empty = await api<ProductCardList>("products/cards");
    expect(empty.items[0].variantCount).toBe(0);
    expect(empty.items[0].variants).toHaveLength(0);
  });

  it("persiste la etapa editable y filtra alimentos por etapa sin buscar el nombre", async () => {
    await login("admin@districo.com");
    const attributes = await api<Attribute[]>("attributes");
    const value = attributes.find((attribute) => attribute.slug === "etapa")!.values[0];
    const products = await api<ProductList>("products?productType=FOOD");
    const product = products.items[0];
    await api(`products/${product.id}`, "PATCH", { attributeValueIds: [value.id] });
    expect((await api<ProductList>(`products?productType=FOOD&attributeValueIds=${value.id}`)).items.some((item) => item.id === product.id)).toBe(true);
    await api(`products/${product.id}`, "PATCH", { attributeValueIds: [] });
    expect((await api<ProductList>(`products?productType=FOOD&attributeValueIds=${value.id}`)).items.some((item) => item.id === product.id)).toBe(false);
  });
  it.each(["PRODUCT", "BRAND", "CATEGORY"].flatMap((trigger) => ["PRODUCT", "BRAND", "CATEGORY"].map((target) => [trigger, target])))
  ("activa por %s y descuenta a %s al confirmar el pedido", async (trigger, target) => {
    await login("admin@districo.com");
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    const products = state.products.filter((product: { requiresMedicationPermission: boolean; brand?: unknown; categories: unknown[] }) => !product.requiresMedicationPermission && product.brand && product.categories.length).slice(0, 2);
    const scopeId = (product: typeof products[number], scope: string) => scope === "PRODUCT" ? product.id : scope === "BRAND" ? product.brand.id : product.categories[0].categoryId;
    const created = await api<Rule>("promotions", "POST", { name: "Promo cruzada", type: "CROSS_DISCOUNT", startsAt: "2020-01-01T00:00:00Z",
      conditions: [{ targetType: trigger, targetIds: [scopeId(products[0], trigger), "alternative"], metric: "MIN_QUANTITY", minQuantity: 1 }],
      rewards: [{ targetType: target, targetId: scopeId(products[1], target), rewardType: "PERCENTAGE", percentage: 10 }],
    });
    expect(created.conditions?.[0].targetIds).toHaveLength(2);
    const client = state.users.find((user: User) => user.email === "cliente@gmail.com");
    const saved = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    saved.carts[client.id] = products.map((product: typeof products[number], index: number) => ({ id: `cart-${index}`, variantId: product.variants[0].id, quantity: firstQuantity(product.variants[0]) }));
    localStorage.setItem("districo-demo-v1", JSON.stringify(saved));
    await login();
    const order = await api<Order>("checkout", "POST", {});
    const expectedDiscount = products.filter((product: typeof products[number]) => scopeId(product, target) === scopeId(products[1], target))
      .reduce((sum: number, product: typeof products[number]) => sum + Number(product.variants[0].price.amount) * firstQuantity(product.variants[0]) * 0.1, 0);
    expect(order.discountTotal).toBeCloseTo(expectedDiscount);
    expect(order.total).toBeCloseTo(order.subtotal - expectedDiscount);
  });

  it("no descuenta si falta el activador y conserva la selección al editar", async () => {
    await login("admin@districo.com");
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    const product = state.products.find((item: { requiresMedicationPermission: boolean }) => !item.requiresMedicationPermission);
    const rule = await api<Rule>("promotions", "POST", { name: "Condicionada", type: "CROSS_DISCOUNT", startsAt: "2020-01-01T00:00:00Z",
      conditions: [{ targetType: "PRODUCT", targetIds: ["not-in-cart", "also-not-in-cart"], metric: "MIN_QUANTITY", minQuantity: 1 }],
      rewards: [{ targetType: "PRODUCT", targetId: product.id, rewardType: "PERCENTAGE", percentage: 10 }],
    });
    await api(`promotions/${rule.id}`, "PATCH", { ...rule, name: "Editada" });
    const listed = await api<Rule[]>("promotions");
    expect(listed[0].conditions?.[0].targetIds).toEqual(["not-in-cart", "also-not-in-cart"]);
    const saved = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    const client = state.users.find((user: User) => user.email === "cliente@gmail.com");
    saved.carts[client.id] = [{ id: "cart-1", variantId: product.variants[0].id, quantity: firstQuantity(product.variants[0]) }];
    localStorage.setItem("districo-demo-v1", JSON.stringify(saved));
    await login();
    expect((await api<Order>("checkout", "POST", {})).discountTotal).toBe(0);
  });
  it("aplica Ver y Editar de Personal, Roles y Vendedores a las rutas de la demo", async () => {
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    state.users.push({ id: "staff-permissions", email: "staff-permissions@example.test", role: "SALES", permissions: [], active: true, emailVerified: true });
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
    await login("admin@districo.com");
    await api("admin/staff/access/SALES", "PATCH", { entries: staffFeatures.map(([feature]) => ({
      feature, canView: ["personal", "vendedores"].includes(feature), canEdit: feature === "vendedores",
    })) });
    await api("auth/logout", "POST", {});
    await login("staff-permissions@example.test");
    expect(await api("admin/staff")).toBeTruthy();
    await expect(api("admin/staff/invitations", "POST", { email: "new@example.test", role: "SALES" })).rejects.toMatchObject({ status: 403 });
    await expect(api("admin/staff/access")).rejects.toMatchObject({ status: 403 });
    expect(await api("admin/salespeople?page=1&limit=20")).toBeTruthy();
    await expect(api("admin/salespeople/does-not-exist", "PATCH", { name: "Test", phone: "099123456" })).rejects.toMatchObject({ status: 404 });
  });
  it("expone las categorías del catálogo en modo demo", async () => {
    expect(await api("categories/catalog")).toEqual(await api("categories"));
  });
  it("mantiene el listado de tarjetas disponible en modo demo", async () => {
    const cards = await api<ProductCardList>("products/cards?limit=4");
    const products = await api<ProductList>("products?limit=4");
    expect(cards.items.map((product) => product.id)).toEqual(
      products.items.map((product) => product.id),
    );
    expect(cards.meta).toEqual(products.meta);
  });
  it("no devuelve precios al visitante ni a clientes sin permiso para medicamentos", async () => {
    let list = await api<ProductList>("products?limit=100");
    expect(list.items.every((p) => p.variants.every((v) => !v.price))).toBe(
      true,
    );
    await login();
    list = await api<ProductList>("products?limit=100");
    expect(
      list.items.some(
        (p) => !p.requiresMedicationPermission && p.variants[0]?.price,
      ),
    ).toBe(true);
    expect(
      list.items
        .filter((p) => p.requiresMedicationPermission)
        .every((p) => !p.variants[0]?.price),
    ).toBe(true);
    const restricted = list.items.find((p) => p.requiresMedicationPermission)!;
    await expect(
      api("cart/items", "POST", {
        variantId: restricted.variants[0].id,
        quantity: 1,
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
  it("rechaza administración por cliente", async () => {
    await login();
    await expect(api("admin/customers")).rejects.toMatchObject({ status: 403 });
    await expect(
      api("products", "POST", { name: "No autorizado" }),
    ).rejects.toMatchObject({ status: 403 });
  });
  it("aísla carritos e historial por usuario y cierra sesión", async () => {
    await login();
    await api("cart/items", "POST", { variantId: "variant-0", quantity: 2 });
    const order = await api<Order>("checkout", "POST", {});
    await login("clientemed@gmail.com");
    expect((await api<Cart>("cart")).items).toHaveLength(0);
    expect(await api("orders/me")).toEqual([]);
    await expect(api(`orders/me/${order.id}`)).rejects.toMatchObject({
      status: 404,
    });
    await api("auth/logout", "POST", {});
    await expect(api("cart")).rejects.toMatchObject({ status: 401 });
  });
});
describe("Demo B2B: recorrido comercial", () => {
  it("limita clientes y pedidos del vendedor a sus asignaciones", async () => {
    await login();
    await api("cart/items", "POST", { variantId: "variant-0", quantity: 1 });
    const own = await api<Order>("checkout", "POST", {});
    await login("clientemed@gmail.com");
    await api("cart/items", "POST", { variantId: "variant-0", quantity: 1 });
    const other = await api<Order>("checkout", "POST", {});
    await login("admin@districo.com");
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    state.users.push({ id: "seller-assigned", email: "assigned@example.test", role: "SALES", permissions: [], active: true, emailVerified: true });
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
    await api("admin/salespeople/seller-assigned", "PATCH", { name: "Vendedor asignado", phone: "099123456" });
    await api("admin/salespeople/seller-assigned/customers", "POST", { customerId: "account-normal" });
    await login("assigned@example.test");
    const customers = await api<{ items: CustomerDetail[] }>("admin/customers/page?page=1&limit=20");
    expect(customers.items.map((customer) => customer.id)).toEqual(["account-normal"]);
    const orders = await api<{ items: Order[] }>("admin/orders/page?page=1&limit=20");
    expect(orders.items.map((order) => order.id)).toEqual([own.id]);
    await expect(api("admin/customers/account-med")).rejects.toMatchObject({ status: 403 });
    await expect(api(`admin/orders/${other.id}`)).rejects.toMatchObject({ status: 403 });
    await expect(api(`admin/orders/${other.id}/status`, "PATCH", { status: "APPROVED" })).rejects.toMatchObject({ status: 403 });
  });
  it("gestiona vendedores y un único responsable por cliente", async () => {
    await login("admin@districo.com");
    const state = JSON.parse(localStorage.getItem("districo-demo-v1") ?? "{}");
    state.users.push(
      { id: "seller-1", email: "uno@example.test", role: "SALES", permissions: [], active: true, emailVerified: true },
      { id: "seller-2", email: "dos@example.test", role: "SALES", permissions: [], active: true, emailVerified: true },
    );
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
    const list = await api<{ items: { id: string; profile: unknown }[] }>("admin/salespeople?page=1&limit=20");
    expect(list.items.map((seller) => seller.id)).toEqual(["seller-2", "seller-1"]);
    await expect(api("admin/salespeople/seller-1/customers", "POST", { customerId: "account-normal" })).rejects.toMatchObject({ status: 400 });
    await api("admin/salespeople/seller-1", "PATCH", { name: "Vendedor Uno", phone: "099 123 456" });
    await api("admin/salespeople/seller-2", "PATCH", { name: "Vendedor Dos", phone: "098 765 432" });
    await api("admin/salespeople/seller-1/customers", "POST", { customerId: "account-normal" });
    expect((await api<{ customers: { id: string }[] }>("admin/salespeople/seller-1")).customers.map((customer) => customer.id)).toEqual(["account-normal"]);
    await login();
    expect((await api<{ customerAccount: CustomerDetail }>("auth/me")).customerAccount.salesperson).toMatchObject({
      name: "Vendedor Uno", phone: "099 123 456", user: { email: "uno@example.test" },
    });
    await login("admin@districo.com");
    await expect(api("admin/staff/seller-1/active", "PATCH", { active: false })).rejects.toMatchObject({ status: 400 });
    await expect(api("admin/staff/seller-1/role", "PATCH", { role: "CATALOG" })).rejects.toMatchObject({ status: 400 });
    await api("admin/salespeople/seller-2/customers", "POST", { customerId: "account-normal" });
    expect((await api<{ customers: unknown[] }>("admin/salespeople/seller-1")).customers).toHaveLength(0);
    expect((await api<{ salesperson: { name: string } }>("admin/customers/account-normal")).salesperson.name).toBe("Vendedor Dos");
    await api("admin/salespeople/seller-2/customers/account-normal", "DELETE");
    expect((await api<{ salesperson: unknown }>("admin/customers/account-normal")).salesperson).toBeNull();
  });
  it("completa solicitudes antiguas y muestra la ficha integral y filtros de pedidos", async () => {
    await login("admin@districo.com");
    const state = JSON.parse(localStorage.getItem("districo-demo-v1") ?? "{}");
    state.applications.push({ id: "old-application", email: "old@example.test", businessName: "Comercio antiguo", legalName: "Comercio antiguo", rut: "123456789012", status: "PENDING", documents: [] });
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
    await expect(api("admin/applications/old-application/approve", "POST", { medicationPermission: false })).rejects.toMatchObject({ status: 400 });
    const upload = new FormData();
    upload.append("file", new File(["%PDF-1.7"], "habilitacion.pdf", { type: "application/pdf" }));
    await api("admin/applications/old-application/documents", "POST", upload);
    const applications = await api<{ items: Application[] }>("admin/applications/page?status=PENDING");
    expect(applications.items.find((item) => item.id === "old-application")?.documents?.[0]?.originalName).toBe("habilitacion.pdf");
    await api("admin/applications/old-application/approve", "POST", { medicationPermission: false });
    const customer = (await api<CustomerDetail[]>("admin/customers")).find((item) => item.users?.[0]?.email === "old@example.test")!;
    await api(`admin/customers/${customer.id}`, "PATCH", { creditLimit: 1500 });
    const detail = await api<CustomerDetail>(`admin/customers/${customer.id}`);
    expect(detail.documents[0].originalName).toBe("habilitacion.pdf");
    expect(detail.creditChanges?.[0].action).toBe("CUSTOMER_CREDIT_UPDATED");
    expect(detail.availableCredit).toBe(1500);

    const saved = JSON.parse(localStorage.getItem("districo-demo-v1") ?? "{}");
    saved.orders.push({ id: "old-order", orderNumber: "DIS-OLD", createdAt: "2026-01-12T12:00:00.000Z", status: "SUBMITTED", userId: saved.users.find((item: User) => item.email === "old@example.test").id, customerAccount: saved.users.find((item: User) => item.email === "old@example.test").customerAccount, total: 100, paidTotal: 40, creditedTotal: 0, refundedTotal: 0, currency: "UYU", items: [] });
    localStorage.setItem("districo-demo-v1", JSON.stringify(saved));
    const orders = await api<{ items: Order[]; meta: { total: number } }>(`admin/orders/page?customerId=${customer.id}&dateFrom=2026-01-01&dateTo=2026-01-31&paymentStatus=PARTIAL`);
    expect(orders.meta.total).toBe(1);
    expect(orders.items[0].orderNumber).toBe("DIS-OLD");
    expect((await api<Order>("admin/orders/old-order")).user?.email).toBe("old@example.test");
    expect((await api<CustomerDetail>(`admin/customers/${customer.id}`)).debt).toBe(60);
  });
  it("registra y gestiona una consulta comercial", async () => {
    const created = await api<{ id: string; received: true }>(
      "contact-inquiries",
      "POST",
      {
        name: "Persona Consulta",
        businessName: "Comercio Consulta",
        email: "CONSULTA@example.test",
        locality: "Montevideo",
        message: "Necesito información sobre las líneas disponibles.",
      },
    );
    expect(created.received).toBe(true);
    await login("admin@districo.com");
    const list = await api<ContactInquiry[]>("admin/contact-inquiries");
    expect(list[0]).toMatchObject({
      id: created.id,
      email: "consulta@example.test",
      status: "NEW",
    });
    const updated = await api<ContactInquiry>(
      `admin/contact-inquiries/${created.id}`,
      "PATCH",
      { status: "IN_PROGRESS", internalNote: "Llamar por la tarde" },
    );
    expect(updated).toMatchObject({
      status: "IN_PROGRESS",
      internalNote: "Llamar por la tarde",
    });
  });
  it("solicitud, aprobación, login y pedido", async () => {
    const application = new FormData();
    for (const [key, value] of Object.entries({
      email: "comercio@example.test",
      password: "NoGuardarEstaClave",
      businessName: "Comercio ficticio",
      legalName: "Ficticio SRL",
      rut: "123456789012",
    })) application.append(key, value);
    await expect(api("applications", "POST", application)).rejects.toMatchObject({ status: 400 });
    application.append("documents", new File(["%PDF-1.7"], "permiso.pdf", { type: "application/pdf" }));
    const a = await api<Application>("applications", "POST", application);
    expect(a.documents?.[0]?.originalName).toBe("permiso.pdf");
    expect(localStorage.getItem("districo-demo-v1")).not.toContain(
      "NoGuardarEstaClave",
    );
    await expect(login("comercio@example.test")).rejects.toMatchObject({
      status: 401,
    });
    await login("admin@districo.com");
    await api(`admin/applications/${a.id}/approve`, "POST", {
      medicationPermission: true,
    });
    await login("comercio@example.test");
    expect((await api<User>("auth/me")).permissions).toContain(
      "CAN_BUY_MEDICATIONS",
    );
    await api("cart/items", "POST", { variantId: "variant-0", quantity: 2 });
    const order = await api<Order>("checkout", "POST", {});
    expect(order.status).toBe("SUBMITTED");
    expect(order.total).toBe(780);
    expect((await api<Cart>("cart")).items).toHaveLength(0);
    await expect(api("checkout", "POST", {})).rejects.toMatchObject({
      status: 400,
    });
    await login("admin@districo.com");
    expect((await api<Order[]>("admin/orders"))[0].id).toBe(order.id);
  });
  it("valida mínimos, múltiplos y existencias; agregar reemplaza cantidad", async () => {
    await login();
    await expect(
      api("cart/items", "POST", { variantId: "variant-8", quantity: 2 }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      api("cart/items", "POST", { variantId: "variant-8", quantity: 6 }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      api("cart/items", "POST", { variantId: "variant-0", quantity: 41 }),
    ).rejects.toMatchObject({ status: 400 });
    await api("cart/items", "POST", { variantId: "variant-0", quantity: 2 });
    await api("cart/items", "POST", { variantId: "variant-0", quantity: 3 });
    expect((await api<Cart>("cart")).items[0].quantity).toBe(3);
  });
  it("requiere revisión comercial y libera las reservas al rechazar", async () => {
    await login("clientepago@gmail.com");
    await api("cart/items", "POST", { variantId: "variant-0", quantity: 2 });
    await expect(api("checkout", "POST", {})).rejects.toMatchObject({
      status: 400,
    });
    const order = await api<Order>("checkout", "POST", {
      acceptManualReview: true,
    });
    expect(order.status).toBe("PENDING_REVIEW");
    await login("admin@districo.com");
    let stock = await api<{ availableStock: number }>(
      "inventory/variants/variant-0/stock",
    );
    expect(stock.availableStock).toBe(38);
    await api(`admin/orders/${order.id}/reject`, "POST", {});
    stock = await api("inventory/variants/variant-0/stock");
    expect(stock.availableStock).toBe(40);
    await api(`admin/orders/${order.id}/reject`, "POST", {});
    expect(
      (
        await api<{ availableStock: number }>(
          "inventory/variants/variant-0/stock",
        )
      ).availableStock,
    ).toBe(40);
    await api(`admin/orders/${order.id}/status`, "PATCH", { status: "PENDING_REVIEW" });
    stock = await api("inventory/variants/variant-0/stock");
    expect(stock.availableStock).toBe(38);
    await api(`admin/orders/${order.id}/status`, "PATCH", { status: "APPROVED" });
    stock = await api("inventory/variants/variant-0/stock");
    expect(stock.availableStock).toBe(38);
  });
  it("aplica una promoción simulada sin alterar los importes históricos", async () => {
    await login("admin@districo.com");
    await api("admin/promotions", "POST", {
      name: "10% demo",
      type: "PERCENTAGE",
      startsAt: "2020-01-01T00:00:00.000Z",
      conditions: [
        {
          targetType: "PRODUCT",
          targetId: "demo-product-0",
          metric: "MIN_QUANTITY",
          minQuantity: 1,
        },
      ],
      rewards: [
        {
          targetType: "PRODUCT",
          targetId: "demo-product-0",
          rewardType: "PERCENTAGE",
          percentage: 10,
        },
      ],
    });
    await login();
    await api("cart/items", "POST", { variantId: "variant-0", quantity: 1 });
    const order = await api<Order>("checkout", "POST", {});
    expect(order.discountTotal).toBe(39);
    expect(order.total).toBe(351);
    await login("admin@districo.com");
    await api("pricing/variants/variant-0", "PATCH", { amount: 900 });
    await login();
    expect((await api<Order>(`orders/me/${order.id}`)).total).toBe(351);
  });
  it("administración cambia estados: consume o libera reservas y conserva importes", async () => {
    type Stock = {
      physicalStock: number;
      reservedStock: number;
      availableStock: number;
    };
    const stock = () => api<Stock>("inventory/variants/variant-0/stock");
    await login();
    await api("cart/items", "POST", { variantId: "variant-0", quantity: 2 });
    const order = await api<Order>("checkout", "POST", {});
    await login("admin@districo.com");
    await api("pricing/variants/variant-0", "PATCH", { amount: 900 });
    await expect(
      api(`admin/orders/${order.id}/status`, "PATCH", { status: "OTRO" }),
    ).rejects.toMatchObject({ status: 400 });
    expect(await stock()).toMatchObject({
      physicalStock: 40,
      reservedStock: 2,
      availableStock: 38,
    });
    const approved = await api<Order>(
      `admin/orders/${order.id}/status`,
      "PATCH",
      { status: "APPROVED", reviewReason: "Stock confirmado" },
    );
    expect(approved.status).toBe("APPROVED");
    expect(await stock()).toMatchObject({
      physicalStock: 38,
      reservedStock: 0,
      availableStock: 38,
    });
    // Cancelar lo ya aprobado no devuelve unidades (como la API).
    await api(`admin/orders/${order.id}/status`, "PATCH", {
      status: "CANCELLED",
    });
    expect(await stock()).toMatchObject({
      physicalStock: 38,
      availableStock: 38,
    });
    const [listed] = await api<Order[]>("admin/orders");
    expect(listed).toMatchObject({
      status: "CANCELLED",
      reviewReason: "Stock confirmado",
      total: order.total,
      user: { email: "cliente@gmail.com" },
    });
    expect(listed.items[0].unitPrice).toBe(order.items[0].unitPrice);
  });
  it("reinicio elimina pedidos y sesión", async () => {
    await login();
    await api("cart/items", "POST", { variantId: "variant-0", quantity: 1 });
    await api("checkout", "POST", {});
    resetDemo();
    await expect(api("auth/me")).rejects.toMatchObject({ status: 401 });
    await login();
    expect(await api("orders/me")).toEqual([]);
  });
  it("encuentra el primer múltiplo válido aunque el mínimo no sea múltiplo", () => {
    const v = {
      id: "x",
      name: "x",
      sku: "x",
      availableStock: 30,
      minimumOrderQuantity: 3,
      saleMultiple: 2,
    };
    expect(firstQuantity(v)).toBe(4);
    expect(quantityError(v, 3)).toContain("múltiplo");
    expect(quantityError(v, NaN)).toBeTruthy();
  });
  it("filtra como la API: subcategorías incluidas, orden por nombre y página inválida", async () => {
    await login("admin@districo.com");
    const child = await api<{ id: string }>("categories", "POST", {
      name: "Cachorros",
      parentId: "alimentacion",
    });
    await api("products/demo-product-4", "PATCH", { categoryIds: [child.id] });
    const parent = await api<ProductList>(
      "products?categoryId=alimentacion&limit=100",
    );
    expect(parent.items.map((p) => p.id)).toContain("demo-product-4");
    expect(
      (await api<ProductList>(`products?categoryId=${child.id}`)).items,
    ).toHaveLength(1);
    const arenas = await api<ProductList>(
      "products?categoryId=arenas&limit=100",
    );
    const both = await api<ProductList>(
      `products?categoryId=arenas,${child.id}&limit=100`,
    );
    expect(both.items.map((p) => p.id).sort()).toEqual(
      [...arenas.items.map((p) => p.id), "demo-product-4"].sort(),
    );
    const all = await api<ProductList>("products?limit=5&page=2");
    const names = (await api<ProductList>("products?limit=100")).items.map(
      (p) => p.name,
    );
    expect(all.items.map((p) => p.name)).toEqual(names.slice(5, 10));
    expect((await api<ProductList>("products?page=abc")).meta.page).toBe(1);
  });
  it("carrito como la API: línea inexistente es 404 y no confirma líneas sin precio", async () => {
    await login();
    const cart = await api<Cart>("cart/items", "POST", {
      variantId: "variant-0",
      quantity: 2,
    });
    const itemId = cart.items[0].id;
    await api(`cart/items/${itemId}`, "DELETE");
    await expect(api(`cart/items/${itemId}`, "DELETE")).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      api(`cart/items/${itemId}`, "PATCH", { quantity: 3 }),
    ).rejects.toMatchObject({ status: 404 });
    await api("cart/items", "POST", { variantId: "variant-0", quantity: 2 });
    // La presentación pierde su precio vigente después de agregarla.
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    delete state.products[0].variants[0].price;
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
    expect((await api<Cart>("cart")).items[0].unitPrice).toBe(0);
    await expect(api("checkout", "POST", {})).rejects.toMatchObject({
      status: 400,
    });
    expect(await api("orders/me")).toEqual([]);
  });
});
