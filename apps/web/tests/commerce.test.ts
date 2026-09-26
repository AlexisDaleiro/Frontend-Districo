import { describe, expect, it } from "vitest";
import {
  canBuy,
  hiddenPriceText,
  purchasable,
  quantityError,
} from "../src/lib/commerce";
import type { Permission, User, Variant } from "../src/lib/types";
const user = (permissions: Permission[], role: User["role"] = "CLIENT") =>
  ({ id: "u", email: "u@example.test", role, permissions }) as User;
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
  });
  it("como la API, comprar exige también ver precios", () => {
    const orderOnly = user(["CAN_PLACE_ORDERS"]);
    expect(canBuy(orderOnly, food)).toBe(false);
    expect(hiddenPriceText(orderOnly, food)).toBe("Precio no habilitado");
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
