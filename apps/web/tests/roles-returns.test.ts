import { beforeEach, expect, it, vi } from "vitest";
import { demoRequest as api, resetDemo } from "../src/lib/demo";
import { allowedPath } from "../src/lib/proxy-policy";
import { returnedQuantities, type ProductReturnPreview } from "../src/lib/product-returns";
import type { Order } from "../src/lib/types";

const key = "districo-demo-v1";
beforeEach(async () => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) });
  resetDemo();
  await api("auth/login", "POST", { email: "admin@districo.com", password: "Demo1234!" });
});

it("renames and duplicates permissions, blocks assigned retirement and preserves retired role history", async () => {
  const role = await api<{ id: string }>("admin/staff/roles", "POST", { name: "Deposito" });
  await api(`admin/staff/roles/${role.id}`, "PATCH", { name: "Logistica" });
  const copy = await api<{ id: string }>(`admin/staff/roles/${role.id}/duplicate`, "POST", { name: "Logistica auxiliar" });
  await api("admin/staff/invitations", "POST", { email: "invited@example.test", role: "CUSTOM", customRoleId: role.id });
  await expect(api(`admin/staff/roles/${role.id}`, "DELETE")).rejects.toMatchObject({ status: 409 });
  await api(`admin/staff/roles/${copy.id}`, "DELETE");
  const roles = await api<{ id?: string; name?: string; assignedUsers?: number }[]>("admin/staff/access");
  expect(roles.find((item) => item.id === role.id)).toMatchObject({ name: "Logistica", assignedUsers: 1 });
  expect(roles.some((item) => item.id === copy.id)).toBe(false);
  const state = JSON.parse(localStorage.getItem(key)!);
  expect(state.roleHistory.map((item: { action: string }) => item.action)).toEqual(["rename", "duplicate", "retire"]);
  expect(state.customRoles.find((item: { id: string }) => item.id === copy.id).retiredAt).toBeTruthy();
  await expect(api("admin/staff/invitations", "POST", { email: "retired@example.test", role: "CUSTOM", customRoleId: copy.id })).rejects.toMatchObject({ status: 400 });
});

function seedReturn() {
  const state = JSON.parse(localStorage.getItem(key)!);
  const variant = state.products[0].variants[0];
  state.orders.push({ id: "return-test", orderNumber: "DIS-RETURN", status: "SHIPPED", createdAt: new Date().toISOString(), total: 100, paidTotal: 20, creditedTotal: 0, currency: "UYU",
    items: [{ id: "item-1", variantId: variant.id, productName: "Alimento", variantName: variant.name, sku: variant.sku, quantity: 4, unitPrice: 25, subtotal: 100 }] });
  state.consumedOrderIds.push("return-test");
  localStorage.setItem(key, JSON.stringify(state));
  return { variantId: variant.id, stock: variant.physicalStock };
}

it("requires confirmation, updates only chosen stock and keeps cumulative return history", async () => {
  const initial = seedReturn();
  const body = { requestId: crypto.randomUUID(), reason: "Recepcion parcial", items: [{ orderItemId: "item-1", quantity: 3, restockedQuantity: 2 }] };
  const path = "admin/orders/return-test/returns";
  const preview = await api<ProductReturnPreview>(`${path}/preview`, "POST", body);
  expect(preview.stock[0].after).toBe(initial.stock + 2);
  expect((await api<Order>("admin/orders/return-test")).returns).toBeUndefined();
  await expect(api(path, "POST", body)).rejects.toMatchObject({ status: 409 });
  await api(path, "POST", { ...body, previewToken: preview.token });
  await api(path, "POST", { ...body, previewToken: preview.token });
  const order = await api<Order>("admin/orders/return-test");
  expect(order.returns).toHaveLength(1); expect(returnedQuantities(order).get("item-1")).toBe(3);
  expect(order.paidTotal).toBe(20); expect(order.creditedTotal).toBe(0);
  expect(order.returns![0].recordedByEmail).toBe("admin@districo.com");
  await expect(api(`${path}/preview`, "POST", { ...body, requestId: crypto.randomUUID() })).rejects.toMatchObject({ status: 400 });
});

it("read-only order staff cannot submit returns", async () => {
  seedReturn();
  const state = JSON.parse(localStorage.getItem(key)!);
  state.users.push({ id: "viewer", email: "viewer@example.test", role: "CUSTOM", customRoleId: "viewer-role", permissions: [], active: true });
  state.customRoles.push({ id: "viewer-role", name: "Consulta", key: "consulta", access: { pedidos: { canView: true, canEdit: false } } });
  localStorage.setItem(key, JSON.stringify(state));
  await api("auth/login", "POST", { email: "viewer@example.test", password: "Demo1234!" });
  expect(await api("admin/orders/return-test")).toBeTruthy();
  await expect(api("admin/orders/return-test/returns/preview", "POST", {})).rejects.toMatchObject({ status: 403 });
  await expect(api("admin/staff/roles/viewer-role", "DELETE")).rejects.toMatchObject({ status: 403 });
});

it("proxy permits only lifecycle and receipt methods", () => {
  for (const [path, method] of [["admin/staff/roles/role-1", "PATCH"], ["admin/staff/roles/role-1", "DELETE"], ["admin/staff/roles/role-1/duplicate", "POST"], ["admin/orders/order-1/returns", "POST"], ["admin/orders/order-1/returns/preview", "POST"]])
    expect(allowedPath(path, method)).toBe(true);
  expect(allowedPath("admin/orders/order-1/returns", "DELETE")).toBe(false);
  expect(allowedPath("admin/staff/roles/role-1/duplicate", "PATCH")).toBe(false);
});
