import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { customerPaymentStatus, orderInstallments, paymentSchedulePreview } from "../src/lib/payment-terms";
import { reviewRequired } from "../src/lib/commerce";
import { demoRequest as api, resetDemo } from "../src/lib/demo";
import type { Order, User } from "../src/lib/types";

const now = new Date("2026-01-31T18:00:00Z");
const order = (extra: Partial<Order> = {}): Order => ({ id: "o", orderNumber: "TEST", userId: "u", status: "SUBMITTED", createdAt: now.toISOString(), currency: "UYU",
  total: 100.01, subtotal: 100.01, discountTotal: 0, items: [], paymentMethod: "INSTALLMENTS", installmentCount: 3, paymentTermMonths: 3, paymentSchedule: paymentSchedulePreview(100.01, 3, now), ...extra });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
  resetDemo();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("Condiciones de pago", () => {
  it.each([1, 3, 6])("reparte centavos exactos en %s meses y conserva el día", (months) => {
    const schedule = paymentSchedulePreview(100.01, months, now);
    expect(schedule.reduce((sum, item) => sum + item.amountCents, 0)).toBe(10001);
    expect(schedule[0].dueAt).toBe("2026-03-01T02:59:59.999Z");
    if (months > 1) expect(schedule[1].dueAt).toBe("2026-04-01T02:59:59.999Z");
  });
  it("permite pendientes pero mantiene revisión por atraso y restricción", () => {
    expect(reviewRequired("PAYMENT_PENDING")).toBe(false);
    expect(reviewRequired("PAYMENT_DELAY")).toBe(true);
    expect(reviewRequired("RESTRICTED")).toBe(true);
  });
  it("no vence antes de finalizar el día en Uruguay", () => {
    const current = order();
    expect(customerPaymentStatus([current], new Date("2026-03-01T02:59:59.998Z"))).toBe("PAYMENT_PENDING");
    expect(customerPaymentStatus([current], new Date("2026-03-01T02:59:59.999Z"))).toBe("PAYMENT_DELAY");
  });
  it("pagar la cuota vencida recupera pendiente; anular o reintegrar recupera atraso", () => {
    const time = new Date("2026-03-02T00:00:00Z");
    expect(customerPaymentStatus([order({ paidTotal: 33.34 })], time)).toBe("PAYMENT_PENDING");
    expect(customerPaymentStatus([order({ paidTotal: 33.33 })], time)).toBe("PAYMENT_DELAY");
    expect(customerPaymentStatus([order({ paidTotal: 33.34, refundedTotal: 0.01 })], time)).toBe("PAYMENT_DELAY");
    expect(customerPaymentStatus([order({ creditedTotal: 33.34 })], time)).toBe("PAYMENT_PENDING");
    expect(customerPaymentStatus([order({ paidTotal: 100.01 })], time)).toBe("GOOD_STANDING");
  });
  it("prioriza deuda vencida y omite pedidos cancelados o rechazados", () => {
    const time = new Date("2026-04-02T00:00:00Z");
    expect(customerPaymentStatus([order(), order({ paymentMethod: "CASH", paymentSchedule: [] })], time)).toBe("PAYMENT_DELAY");
    expect(customerPaymentStatus([order({ status: "REJECTED" }), order({ status: "CANCELLED" })], time)).toBe("GOOD_STANDING");
  });
  it("contado vence al entregar; los pedidos anteriores no reciben un vencimiento inventado", () => {
    expect(orderInstallments(order({ paymentMethod: "CASH", paymentDueAt: null }), now)[0].status).toBe("Pendiente");
    expect(orderInstallments(order({ paymentMethod: "CASH", paymentDueAt: now.toISOString() }), now)[0].status).toBe("Atrasada");
    expect(customerPaymentStatus([order({ paymentMethod: null, paymentSchedule: null })], new Date("2030-01-01"))).toBe("PAYMENT_PENDING");
  });
  it("confirma en demo, actualiza el cliente, permite otra compra y cambia con el reloj", async () => {
    await api("auth/login", "POST", { email: "cliente@gmail.com", password: "Demo1234!" });
    await api("cart/items", "POST", { variantId: "variant-0", quantity: 1 });
    const created = await api<Order>("checkout", "POST", { paymentMethod: "INSTALLMENTS", paymentTermMonths: 3 });
    expect(created.paymentSchedule).toHaveLength(3);
    expect((await api<User>("auth/me")).customerAccount?.creditStatus).toBe("PAYMENT_PENDING");
    await api("cart/items", "POST", { variantId: "variant-0", quantity: 1 });
    const second = await api<Order>("checkout", "POST", { paymentMethod: "CASH" });
    expect(second.status).toBe("SUBMITTED");
    vi.setSystemTime(new Date(created.paymentSchedule![0].dueAt).getTime() + 1);
    expect((await api<User>("auth/me")).customerAccount?.creditStatus).toBe("PAYMENT_DELAY");
    await api("cart/items", "POST", { variantId: "variant-0", quantity: 1 });
    await expect(api("checkout", "POST", {})).rejects.toMatchObject({ status: 400 });
    await api("auth/login", "POST", { email: "admin@districo.com", password: "Demo1234!" });
    await api(`admin/orders/${created.id}/payments`, "POST", { amount: (created.paymentSchedule![0].amountCents / 100).toFixed(2) });
    await api("auth/login", "POST", { email: "cliente@gmail.com", password: "Demo1234!" });
    expect((await api<User>("auth/me")).customerAccount?.creditStatus).toBe("PAYMENT_PENDING");
  });
  it("rechaza planes inválidos sin vaciar el carrito", async () => {
    await api("auth/login", "POST", { email: "cliente@gmail.com", password: "Demo1234!" });
    await api("cart/items", "POST", { variantId: "variant-0", quantity: 1 });
    await expect(api("checkout", "POST", { paymentMethod: "INSTALLMENTS", paymentTermMonths: 2 })).rejects.toMatchObject({ status: 400 });
    const valid = await api<Order>("checkout", "POST", { paymentMethod: "INSTALLMENTS", paymentTermMonths: 6 });
    expect(valid.items).toHaveLength(1);
    expect(valid.paymentSchedule).toHaveLength(6);
  });
  it("los pendientes siguen sujetos al límite de crédito", async () => {
    await api("auth/login", "POST", { email: "cliente@gmail.com", password: "Demo1234!" });
    const current = await api<User>("auth/me");
    await api("auth/login", "POST", { email: "admin@districo.com", password: "Demo1234!" });
    await api(`admin/customers/${current.customerAccount!.id}`, "PATCH", { creditLimit: 1 });
    await api("auth/login", "POST", { email: "cliente@gmail.com", password: "Demo1234!" });
    await api("cart/items", "POST", { variantId: "variant-0", quantity: 1 });
    const created = await api<Order>("checkout", "POST", { paymentMethod: "INSTALLMENTS", paymentTermMonths: 3 });
    expect(created.status).toBe("PENDING_REVIEW");
    expect(created.reviewReason).toBe("CREDIT_LIMIT_EXCEEDED");
  });
});
