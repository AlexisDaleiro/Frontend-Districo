import { describe, expect, it } from "vitest";
import { orderBalance } from "../src/lib/order-billing";

describe("order billing", () => {
  it("distinguishes unpaid, partial and full payments", () => {
    expect(orderBalance({ total: 100, paidTotal: 0 })).toMatchObject({ paid: 0, due: 100, status: "Pendiente" });
    expect(orderBalance({ total: 100, paidTotal: "25.50" })).toMatchObject({ paid: 25.5, due: 74.5, status: "Parcial" });
    expect(orderBalance({ total: 100, paidTotal: "100.00" })).toMatchObject({ paid: 100, due: 0, status: "Completo" });
  });
  it("tracks partial returns without overstating the balance", () => {
    expect(orderBalance({ total: 100, paidTotal: 70, creditedTotal: 30, refundedTotal: 20 })).toMatchObject({ paid: 50, credited: 30, refunded: 20, refundable: 10, due: 20, status: "Parcial" });
    expect(orderBalance({ total: 100, paidTotal: 100, creditedTotal: 100, refundedTotal: 100 })).toMatchObject({ paid: 0, due: 0, status: "Acreditado" });
  });
});
