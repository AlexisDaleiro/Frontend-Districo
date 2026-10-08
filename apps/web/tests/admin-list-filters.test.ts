import { beforeEach, expect, it, vi } from "vitest";
import { demoRequest as api, resetDemo } from "../src/lib/demo";
import { adminListPath, staffListStatus } from "../src/lib/admin-list-filters";
import { affectedAdminQueries } from "../src/lib/admin-query-invalidation";
import type { Customer, Product, User } from "../src/lib/types";

type Page<T> = { items: T[]; meta: { total: number; page: number; limit: number } };
beforeEach(async () => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) });
  resetDemo();
  await api("auth/login", "POST", { email: "admin@districo.com", password: "Demo1234!" });
});
function fixture() {
  const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
  const base = state.users.find((user: User) => user.customerAccount);
  state.users = state.users.filter((user: User) => !user.customerAccount);
  state.customRoles = [{ id: "custom", name: "Operaciones", key: "operaciones", access: {} }];
  for (const [id, role, active, emailVerified] of [["seller-a", "SALES", true, true], ["seller-b", "SALES", false, true], ["invited", "SALES", false, false], ["expired", "SALES", false, false], ["custom-user", "CUSTOM", true, true]] as const) {
    state.users.push({ id, email: `${id}@example.test`, role, active, emailVerified, permissions: [], ...(role === "CUSTOM" ? { customRoleId: "custom" } : {}) });
    if (role === "SALES") state.salespeople[id] = { id: `profile-${id}`, name: id, phone: "099123456" };
  }
  state.staffInvitations = [{ userId: "invited", tokenHash: "unused", expiresAt: "2099-01-01", accepted: false, revoked: false }, { userId: "expired", tokenHash: "unused", expiresAt: "2000-01-01", accepted: false, revoked: false }];
  for (let i = 0; i < 25; i++) state.users.push({ ...base, id: `customer-${i}`, email: `customer-${i}@example.test`, customerAccount: { ...base.customerAccount, id: `c${i}`, businessName: `Cliente ${i}`, salespersonId: i === 24 ? null : "profile-seller-a", accountStatus: i === 24 ? "APPROVED" : "SUSPENDED" } });
  state.orders = Array.from({ length: 24 }, (_, i) => ({ id: `o${i}`, items: [], customerAccount: { id: `c${i}` }, status: "APPROVED", total: 100, creditedTotal: i === 22 ? 100 : 0, paidTotal: i === 23 ? 100 : 0, refundedTotal: i === 23 ? 10 : 0 }));
  localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  return state;
}
it("serializes filters safely and invalidates debt lists after financial changes", () => {
  const path = adminListPath("admin/staff/page", { search: "a+b & c", page: 2, status: "", disabled: false, customRoleId: undefined });
  expect(new URLSearchParams(path.split("?")[1]).get("search")).toBe("a+b & c");
  expect(path).not.toContain("status"); expect(path).not.toContain("disabled");
  expect(staffListStatus({ active: false, emailVerified: false, invitationPending: false })).toBe("UNVERIFIED");
  expect(affectedAdminQueries("admin/orders/o1/payments", "admin/customers/page?debt=WITH_DEBT")).toBe(true);
});
it("combines seller, suspension and actual debt before counting and paginating", async () => {
  fixture();
  const path = "admin/customers/page?salespersonId=profile-seller-a&accountStatus=SUSPENDED&debt=WITH_DEBT&limit=20";
  const first = await api<Page<Customer>>(path);
  expect(first.meta.total).toBe(23); expect(first.items).toHaveLength(20);
  const second = await api<Page<Customer>>(`${path}&page=2`);
  expect(second.items).toHaveLength(3);
  expect(second.items.map((item) => item.id)).not.toContain("c22");
  expect((await api<Page<Customer>>(path.replace("WITH_DEBT", "WITHOUT_DEBT"))).items.map((item) => item.id)).toEqual(["c22"]);
  expect((await api<Page<Customer>>("admin/customers/page?salespersonId=unassigned")).items.map((item) => item.id)).toEqual(["c24"]);
});
it("ignores canceled debt and protects balances and assigned seller scope", async () => {
  const state = fixture();
  state.orders.push({ id: "cancelled", items: [], customerAccount: { id: "c24" }, status: "CANCELLED", total: 100 });
  state.staffRoleAccess.SALES = { facturacion: { canView: false, canEdit: false } };
  state.session = "seller-a";
  localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  expect((await api<Page<Customer>>("admin/customers/page?salespersonId=profile-seller-b")).meta.total).toBe(0);
  await expect(api("admin/customers/page?debt=WITH_DEBT")).rejects.toMatchObject({ status: 403 });
  expect(await api<{ id: string }[]>("admin/customers/page/options")).toEqual([expect.objectContaining({ id: "profile-seller-a" })]);
  state.session = "admin";
  localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  expect((await api<Page<Customer>>("admin/customers/page?debt=WITHOUT_DEBT")).items.map((item) => item.id)).toEqual(["c22", "c24"]);
});
it("staff and sellers support role/status/search, distinguish expired invitations and exclude clients", async () => {
  fixture();
  expect((await api<Page<User>>("admin/staff/page?role=CUSTOM&customRoleId=custom&status=ACTIVE&search=operaciones")).items.map((item) => item.id)).toEqual(["custom-user"]);
  expect((await api<Page<User>>("admin/staff/page?role=SALES&status=PENDING")).items.map((item) => item.id)).toEqual(["invited"]);
  expect((await api<Page<User>>("admin/staff/page?status=UNVERIFIED")).items.map((item) => item.id)).toEqual(["expired"]);
  expect((await api<Page<User>>("admin/salespeople?status=INACTIVE&search=seller-b")).items.map((item) => item.id)).toEqual(["seller-b"]);
  const page = await api<Page<User>>("admin/staff/page?role=SALES&limit=2&page=2");
  expect(page.meta.total).toBe(4); expect(page.items).toHaveLength(2);
  expect(await api("admin/staff/page/options")).toEqual([expect.objectContaining({ id: "custom", name: "Operaciones" })]);
});
it("products filter brand and descendant category plus missing price/reserved stock before pagination", async () => {
  const state = fixture();
  const base: Product = state.products[0];
  state.categories = [{ id: "parent", name: "Padre" }, { id: "child", name: "Hija", parentId: "parent" }];
  state.products = Array.from({ length: 15 }, (_, i) => ({ ...base, id: `p${i}`, name: `Producto ${i}`, brand: { id: "brand", name: "Marca" }, categories: [{ categoryId: "child" }], variants: [{ ...base.variants[0], id: `v${i}`, price: undefined, physicalStock: 3, reservedStock: 3, availableStock: 0 }] }));
  state.products.push({ ...state.products[0], id: "in-stock", variants: [{ ...base.variants[0], physicalStock: 4, reservedStock: 3, availableStock: 1 }] });
  localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  const path = "products/admin/list?brandId=brand&categoryId=parent&withoutPrice=true&withoutStock=true&limit=12";
  const results = await api<Page<Product>>(path);
  expect(results.meta.total).toBe(15); expect(results.items).toHaveLength(12);
  expect((await api<Page<Product>>(`${path}&page=2`)).items).toHaveLength(3);
  expect((await api<Page<Product>>(path.replace("brandId=brand", "brandId=other"))).meta.total).toBe(0);
  expect((await api<Page<Product>>(path.replace("products/admin/list", "products"))).meta.total).toBe(16);
});
