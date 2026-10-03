import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoRequest as api, resetDemo } from "../src/lib/demo";
import type {
  Application,
  Cart,
  ContactInquiry,
  CustomerDetail,
  Order,
  ProductCardList,
  ProductList,
  User,
} from "../src/lib/types";
import { firstQuantity, quantityError } from "../src/lib/commerce";
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
