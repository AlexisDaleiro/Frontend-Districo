import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoRequest as api, resetDemo } from "../src/lib/demo";
import type {
  Application,
  Cart,
  Order,
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
  it("solicitud, aprobación, login y pedido", async () => {
    const a = await api<Application>("applications", "POST", {
      email: "comercio@example.test",
      password: "NoGuardarEstaClave",
      businessName: "Comercio ficticio",
      legalName: "Ficticio SRL",
      rut: "123456789012",
      requestedMedicationPermission: true,
    });
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
});
