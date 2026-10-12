import { beforeEach, expect, it, vi } from "vitest";
import { demoRequest as api, resetDemo } from "../src/lib/demo";
import { canEditAdminFeature, canManageAdminProduct, sensitiveStaffFeatures, staffFeatures, type SensitiveStaffFeature } from "../src/lib/staff-access";
import type { ProductList, User } from "../src/lib/types";
import type { BulkPreview } from "../src/lib/admin-tools";

const allow = { canView: true, canEdit: true }, view = { canView: true, canEdit: false }, deny = { canView: false, canEdit: false };
const actions = Object.keys(sensitiveStaffFeatures) as SensitiveStaffFeature[];
beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) });
  resetDemo();
});

it("explicit action denial wins over broad catalog and billing editing", () => {
  const user: User = { id: "u", email: "u@example.test", role: "CUSTOM", permissions: [], staffAccess: { catalogo: allow, facturacion: allow, ...Object.fromEntries(actions.map((action) => [action, deny])) } };
  for (const action of actions) expect(canEditAdminFeature(user, action)).toBe(false);
  expect(canEditAdminFeature(user, "catalogo")).toBe(true);
  expect(canEditAdminFeature(user, "facturacion")).toBe(true);
});

it("each individual action requires only parent viewing and leaves other actions denied", () => {
  for (const action of actions) {
    const user: User = { id: "u", email: "u@example.test", role: "CUSTOM", permissions: [], staffAccess: { catalogo: view, facturacion: view, [action]: allow } };
    for (const other of actions) expect(canEditAdminFeature(user, other)).toBe(other === action);
    expect(canEditAdminFeature(user, "catalogo")).toBe(false);
    expect(canEditAdminFeature(user, "facturacion")).toBe(false);
    expect(canManageAdminProduct(user)).toBe(["stock", "precios"].includes(action));
    expect(canEditAdminFeature({ ...user, staffAccess: { ...user.staffAccess, [sensitiveStaffFeatures[action]]: deny } }, action)).toBe(false);
    expect(canEditAdminFeature({ ...user, active: false }, action)).toBe(false);
    expect(canEditAdminFeature({ ...user, role: "CLIENT" }, action)).toBe(false);
  }
});

it("legacy roles inherit their old actions, new empty roles do not", () => {
  const user: User = { id: "u", email: "u@example.test", role: "CUSTOM", permissions: [], staffAccess: { catalogo: allow, facturacion: view } };
  expect(canEditAdminFeature(user, "stock")).toBe(true);
  expect(canEditAdminFeature(user, "precios")).toBe(true);
  expect(canEditAdminFeature(user, "cobros")).toBe(false);
  for (const action of actions) expect(canEditAdminFeature({ ...user, staffAccess: {} }, action)).toBe(false);
});

async function member(action: SensitiveStaffFeature, catalogEdit = false) {
  const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
  state.users.push({ id: "action-user", email: "action@example.test", role: "CUSTOM", customRoleId: "action-role", active: true, permissions: [] });
  const access = Object.fromEntries(staffFeatures.map(([feature]) => [feature, feature === action ? allow : feature === "catalogo" ? catalogEdit ? allow : view : deny]));
  state.customRoles.push({ id: "action-role", name: "Action", key: "action", access });
  localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  await api("auth/login", "POST", { email: "action@example.test", password: "Demo1234!" });
  return (await api<ProductList>("products/admin/list?limit=1")).items[0];
}

it("demo: stock-only permissions allow inventory changes but deny prices and product editing", async () => {
  const p = await member("stock"), v = p.variants[0];
  await api(`inventory/variants/${v.id}/stock`, "PATCH", { physicalStock: 200 });
  await expect(api(`pricing/variants/${v.id}`, "PATCH", { amount: 123 })).rejects.toMatchObject({ status: 403 });
  await expect(api(`products/${p.id}`, "PATCH", { name: "Forbidden" })).rejects.toMatchObject({ status: 403 });
  expect((await api<ProductList>("products/admin/list?limit=1")).items[0].variants[0].physicalStock).toBe(200);
});

it("demo: prices-only permissions allow direct and bulk pricing but deny stock and activation", async () => {
  const p = await member("precios"), v = p.variants[0];
  await api(`pricing/variants/${v.id}`, "PATCH", { amount: 123 });
  const body = { ids: [p.id], reason: "Demo test", requestId: crypto.randomUUID(), mode: "FIXED", value: 200 };
  const preview = await api<BulkPreview>("admin/bulk/products/prices/preview", "POST", body);
  await api("admin/bulk/products/prices", "POST", { ...body, previewToken: preview.token });
  await expect(api(`inventory/variants/${v.id}/stock`, "PATCH", { physicalStock: 1 })).rejects.toMatchObject({ status: 403 });
  await expect(api("admin/bulk/products/active/preview", "POST", { ...body, active: false })).rejects.toMatchObject({ status: 403 });
});

it("demo: catalog editing cannot bypass denied stock through variants or denied prices through batches", async () => {
  const p = await member("reintegros", true), v = p.variants[0];
  await expect(api(`products/variants/${v.id}`, "PATCH", { physicalStock: 1 })).rejects.toMatchObject({ status: 403 });
  await expect(api(`products/${p.id}/variants`, "POST", { sku: "X", reservedStock: 0 })).rejects.toMatchObject({ status: 403 });
  await expect(api("admin/bulk/products/prices/preview", "POST", { ids: [p.id], reason: "Demo", requestId: crypto.randomUUID(), mode: "FIXED", value: 200 })).rejects.toMatchObject({ status: 403 });
});

it("demo: legacy matrices derive actions from the saved parent rather than role defaults", async () => {
  const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
  state.staffRoleAccess.CATALOG = { catalogo: deny };
  state.customRoles.push({ id: "legacy", name: "Legacy", key: "legacy", access: { catalogo: allow } });
  localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  await api("auth/login", "POST", { email: "admin@districo.com", password: "Demo1234!" });
  const roles = await api<{ role: string; id: string; access: Record<string, typeof allow> }[]>("admin/staff/access");
  expect(roles.find((role) => role.role === "CATALOG")!.access.stock).toEqual(deny);
  expect(roles.find((role) => role.id === "legacy")!.access.stock).toEqual(allow);
});
