import { describe, expect, it } from "vitest";
import { orderBalance } from "../src/lib/order-billing";

describe("order billing", () => {
  it("distinguishes unpaid, partial and full payments", () => {
    expect(orderBalance({ total: 100, paidTotal: 0 })).toEqual({ paid: 0, due: 100, status: "Sin pagos" });
    expect(orderBalance({ total: 100, paidTotal: "25.50" })).toEqual({ paid: 25.5, due: 74.5, status: "Parcial" });
    expect(orderBalance({ total: 100, paidTotal: "100.00" })).toEqual({ paid: 100, due: 0, status: "Completo" });
  });
});
