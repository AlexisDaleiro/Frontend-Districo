import { describe, expect, it } from "vitest";
import {
  canBuy,
  hiddenPriceText,
  orderStockEffect,
  orderTransitions,
  purchasable,
  quantityError,
} from "../src/lib/commerce";
import type { Permission, User, Variant } from "../src/lib/types";
const user = (permissions: Permission[], role: User["role"] = "CLIENT") =>
  ({ id: "u", email: "u@example.test", role, permissions, customerAccount: role === "CLIENT" ? { accountStatus: "APPROVED" } : undefined }) as User;
const client = user(["CAN_VIEW_PRICES", "CAN_PLACE_ORDERS"]);
const vet = user([
  "CAN_VIEW_PRICES",
  "CAN_PLACE_ORDERS",
  "CAN_BUY_MEDICATIONS",
]);
const food = { requiresMedicationPermission: false };
const medication = { requiresMedicationPermission: true };
const variant = (v: Partial<Variant>): Variant => ({
  id: "v",
  name: "Presentación",
  sku: "SKU",
  availableStock: 10,
  saleMultiple: 1,
  minimumOrderQuantity: 1,
  ...v,
});
describe("Ficha: precio y compra según permisos", () => {
  it("visitante, cliente y cliente veterinario", () => {
    expect(canBuy(null, food)).toBe(false);
    expect(hiddenPriceText(null, medication)).toBe("Ingresá para ver precios");
    expect(canBuy(client, food)).toBe(true);
    expect(canBuy(client, medication)).toBe(false);
    expect(hiddenPriceText(client, medication)).toBe(
      "Requiere habilitación profesional",
    );
    expect(canBuy(vet, medication)).toBe(true);
    expect(hiddenPriceText(vet, food)).toBe("Sin precio vigente");
    expect(canBuy(user([], "ADMIN"), medication)).toBe(true);
    expect(canBuy(user(["CAN_VIEW_PRICES", "CAN_PLACE_ORDERS"], "SALES"), food)).toBe(false);
  });
  it("como la API, comprar exige también ver precios", () => {
    const orderOnly = user(["CAN_PLACE_ORDERS"]);
    expect(canBuy(orderOnly, food)).toBe(false);
    expect(hiddenPriceText(orderOnly, food)).toBe("Precio no habilitado");
  });
  it("un cliente suspendido puede ver precios pero no comprar", () => {
    const suspended = { ...client, customerAccount: { ...client.customerAccount!, accountStatus: "SUSPENDED" as const } };
    expect(hiddenPriceText(suspended, food)).toBe("Sin precio vigente");
    expect(canBuy(suspended, food)).toBe(false);
  });
  it("stock insuficiente para el mínimo y el múltiplo", () => {
    expect(purchasable(variant({ availableStock: 0 }))).toBe(false);
    expect(quantityError(variant({ availableStock: 0 }), 1)).toBe(
      "Sin stock disponible.",
    );
    const v = variant({
      minimumOrderQuantity: 5,
      saleMultiple: 2,
      availableStock: 5,
    });
    expect(purchasable(v)).toBe(false);
    expect(purchasable({ ...v, availableStock: 6 })).toBe(true);
    expect(quantityError(v, 5)).toBe("Elegí un múltiplo de 2.");
  });
});
describe("gestión de pedidos", () => {
  it("permite revisar un rechazo, pero no cambia estados finales ni vuelve atrás", () => {
    for (const final of ["DELIVERED", "CANCELLED"])
      expect(orderTransitions[final]).toBeUndefined();
    expect(orderTransitions.REJECTED).toEqual(["PENDING_REVIEW"]);
    expect(orderTransitions.APPROVED).not.toContain("SUBMITTED");
    expect(orderTransitions.PENDING_REVIEW).toContain("APPROVED");
  });
  it("describe el efecto sobre reservas según el estado de origen", () => {
    expect(orderStockEffect("PENDING_REVIEW", "APPROVED")).toMatch(/descuenta/);
    expect(orderStockEffect("SUBMITTED", "REJECTED")).toMatch(/libera/);
    expect(orderStockEffect("APPROVED", "CANCELLED")).toMatch(/no devuelve/);
    expect(orderStockEffect("APPROVED", "PROCESSING")).toMatch(/no modifica/);
    expect(orderStockEffect("REJECTED", "PENDING_REVIEW")).toMatch(/reservar/);
  });
});
