import { beforeEach, expect, it, vi } from "vitest";
import { demoRequest as api, resetDemo } from "../src/lib/demo";
import { customerDiscountSchema, demoCustomerPricing } from "../src/lib/customer-discount";
import { affectedAdminQueries } from "../src/lib/admin-query-invalidation";
import { allowedPath } from "../src/lib/proxy-policy";
import type { Cart, CustomerDetail, Order } from "../src/lib/types";

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) });
  resetDemo();
  const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
  const client = state.users.find((user: { email: string }) => user.email === "cliente@gmail.com");
  client.customerAccount.salespersonId = "profile-seller";
  state.users.push({ id: "seller", email: "seller@example.test", role: "SALES", active: true, emailVerified: true, permissions: [] });
  state.salespeople.seller = { id: "profile-seller", name: "Vendedor QA", phone: "099123456" };
  const product = state.products.find((item: { requiresMedicationPermission: boolean }) => !item.requiresMedicationPermission);
  state.products = [{ ...product, id: "discount-product", slug: "discount-product", variants: [{ ...product.variants[0], id: "discount-variant", name: "Presentación", sku: "DISCOUNT-QA", price: { amount: 100, currency: "UYU" }, minimumOrderQuantity: 1, saleMultiple: 1, physicalStock: 100, reservedStock: 0, availableStock: 100 }] }];
  state.promotions = [{ id: "promo", name: "30% QA", active: true, conditions: [{ targetType: "PRODUCT", targetId: "discount-product", minQuantity: 1 }], rewards: [{ targetType: "PRODUCT", targetId: "discount-product", rewardType: "PERCENTAGE", percentage: 30 }] }];
  localStorage.setItem("districo-demo-v1", JSON.stringify(state));
});
const login = (email = "seller@example.test") => api("auth/login", "POST", { email, password: "Demo1234!" });

it("best discount, stacking, ties, caps and cents mirror the API contract", () => {
  expect(demoCustomerPricing([100, 100], [30, 0], 10).pricing).toMatchObject({ total: 160, discountTotal: 40, promotionDiscountTotal: 30, customerDiscountTotal: 10 });
  expect(demoCustomerPricing([100, 100], [30, 0], 10, "STACK").pricing).toMatchObject({ total: 153, discountTotal: 47, customerDiscountTotal: 17 });
  expect(demoCustomerPricing([100], [10], 10).pricing.customerDiscountTotal).toBe(0);
  expect(demoCustomerPricing([0.05, 0.05], [], 10).pricing.total).toBe(0.08);
  expect(demoCustomerPricing([100], [500], 100, "STACK").pricing.total).toBe(0);
});

it("rejects invalid rates, missing mode and unrelated fields", () => {
  for (const discountPercentage of [-1, 101, 1.001, Infinity, NaN, "10", null]) expect(customerDiscountSchema.safeParse({ discountPercentage, discountMode: "STACK" }).success).toBe(false);
  expect(customerDiscountSchema.safeParse({ discountPercentage: 10 }).success).toBe(false);
  expect(customerDiscountSchema.safeParse({ discountPercentage: 10, discountMode: "STACK", creditLimit: 5 }).success).toBe(false);
});

it("seller changes only the assigned client discount, with idempotent history and no credit edits", async () => {
  await login();
  const dto = { discountPercentage: 12.5, discountMode: "STACK" };
  await api("admin/customers/account-normal/discount", "PATCH", dto);
  await api("admin/customers/account-normal/discount", "PATCH", dto);
  const record = await api<CustomerDetail>("admin/customers/account-normal");
  expect(record.discountPercentage).toBe(12.5); expect(record.discountChanges).toHaveLength(1);
  expect(record.discountChanges![0].metadata).toEqual({ before: { discountPercentage: 0, discountMode: "BEST_PRICE" }, after: dto });
  await expect(api("admin/customers/account-normal", "PATCH", { creditLimit: 999 })).rejects.toMatchObject({ status: 403 });
  await expect(api("admin/customers/account-vet/discount", "PATCH", dto)).rejects.toMatchObject({ status: 403 });
  await expect(api("admin/customers/account-normal/discount", "PATCH", { ...dto, discountPercentage: 10.001 })).rejects.toMatchObject({ status: 400 });
});

it("revoking discount editing blocks an already signed-in seller; clients cannot change discounts", async () => {
  await login();
  const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
  state.staffRoleAccess.SALES = { ...state.staffRoleAccess.SALES, "descuentos-clientes": { canView: true, canEdit: false } };
  localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  await expect(api("admin/customers/account-normal/discount", "PATCH", { discountPercentage: 10, discountMode: "STACK" })).rejects.toMatchObject({ status: 403 });
  state.staffRoleAccess.SALES["descuentos-clientes"] = { canView: false, canEdit: false };
  localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  const list = await api<{ items: CustomerDetail[] }>("admin/customers/page");
  expect(list.items[0]).not.toHaveProperty("discountPercentage");
  expect(await api<CustomerDetail>("admin/customers/account-normal")).not.toHaveProperty("discountChanges");
  await login("cliente@gmail.com");
  await expect(api("admin/customers/account-normal/discount", "PATCH", { discountPercentage: 10, discountMode: "STACK" })).rejects.toMatchObject({ status: 403 });
});

it.each(["BEST_PRICE", "STACK"])("cart and confirmed order agree in %s mode, including installment schedule", async (discountMode) => {
  await login();
  await api("admin/customers/account-normal/discount", "PATCH", { discountPercentage: 10, discountMode });
  await login("cliente@gmail.com");
  const cart = await api<Cart>("cart/items", "POST", { variantId: "discount-variant", quantity: 1 });
  const order = await api<Order>("checkout", "POST", { paymentMethod: "INSTALLMENTS", paymentTermMonths: 3 });
  expect(order.total).toBe(discountMode === "STACK" ? 63 : 70); expect(order.total).toBe(cart.pricing!.total);
  expect(order.customerDiscountTotal).toBe(discountMode === "STACK" ? 7 : 0);
  expect(order.paymentSchedule!.reduce((sum, item) => sum + item.amountCents, 0)).toBe(order.total * 100);
  await login(); await api("admin/customers/account-normal/discount", "PATCH", { discountPercentage: 0, discountMode: "BEST_PRICE" });
  await login("cliente@gmail.com"); expect((await api<Order>(`orders/me/${order.id}`)).total).toBe(order.total);
});

it("checkout rereads a discount changed since cart preview", async () => {
  await login("cliente@gmail.com");
  expect((await api<Cart>("cart/items", "POST", { variantId: "discount-variant", quantity: 1 })).pricing!.total).toBe(70);
  await login(); await api("admin/customers/account-normal/discount", "PATCH", { discountPercentage: 50, discountMode: "BEST_PRICE" });
  await login("cliente@gmail.com"); expect((await api<Order>("checkout", "POST", {})).total).toBe(50);
});

it("the proxy only permits the dedicated PATCH; saving refreshes client detail and cart without unrelated requests", () => {
  const path = "admin/customers/account-normal/discount";
  expect(allowedPath(path, "PATCH")).toBe(true); expect(allowedPath(path, "POST")).toBe(false);
  for (const query of ["cart", "auth/me", "admin/customers/account-normal", "admin/customers/page?limit=20"]) expect(affectedAdminQueries(path, query)).toBe(true);
  expect(affectedAdminQueries(path, "products")).toBe(false); expect(affectedAdminQueries(path, "admin/orders")).toBe(false);
});
