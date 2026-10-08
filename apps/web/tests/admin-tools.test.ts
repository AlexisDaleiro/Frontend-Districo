import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoRequest as api, resetDemo } from "../src/lib/demo";
import { affectedAdminQueries } from "../src/lib/admin-query-invalidation";
import { allowedPath } from "../src/lib/proxy-policy";
import { shortcutForm, submitShortcutForm, type AdminSearchResult, type BulkPreview, type BulkResult } from "../src/lib/admin-tools";
import type { ProductList, User } from "../src/lib/types";
import { staffFeatures } from "../src/lib/staff-access";

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) });
  resetDemo();
});
const login = (email = "admin@districo.com") => api("auth/login", "POST", { email, password: "Demo1234!" });
const bulk = (ids: string[]) => ({ ids, reason: "Cambio de prueba", requestId: crypto.randomUUID() });

describe("admin tools", () => {
  it("registers only the intended proxy routes and invalidates related data", () => {
    expect(allowedPath("admin/search", "GET")).toBe(true);
    expect(allowedPath("admin/bulk/history", "GET")).toBe(true);
    expect(allowedPath("admin/bulk/products/prices/preview", "POST")).toBe(true);
    expect(allowedPath("admin/bulk/customers/salesperson", "POST")).toBe(true);
    expect(allowedPath("admin/bulk/products/delete", "POST")).toBe(false);
    expect(affectedAdminQueries("admin/bulk/products/prices", "products/admin/list?page=1")).toBe(true);
    expect(affectedAdminQueries("admin/bulk/products/prices", "cart")).toBe(true);
    expect(affectedAdminQueries("admin/bulk/products/active", "admin/bulk/history?feature=catalogo")).toBe(true);
    expect(affectedAdminQueries("admin/bulk/customers/salesperson", "account/me")).toBe(true);
    expect(affectedAdminQueries("admin/bulk/customers/salesperson", "admin/orders/page?page=1")).toBe(true);
    expect(affectedAdminQueries("admin/bulk/products/active", "admin/customers/page")).toBe(false);
  });

  it("previews, confirms, records before/after, and deduplicates a batch", async () => {
    await login();
    const products = await api<ProductList>("products/admin/list?limit=2");
    const body = { ...bulk(products.items.map((item) => item.id)), active: false };
    const preview = await api<BulkPreview>("admin/bulk/products/active/preview", "POST", body);
    expect(preview.changed).toBe(2);
    expect((await api<ProductList>("products/admin/list?limit=2")).items.every((product) => product.active)).toBe(true);
    await expect(api("admin/bulk/products/active", "POST", body)).rejects.toMatchObject({ status: 409 });
    const result = await api<BulkResult>("admin/bulk/products/active", "POST", { ...body, previewToken: preview.token });
    expect(await api("admin/bulk/products/active", "POST", { ...body, previewToken: preview.token })).toEqual(result);
    expect((await api<ProductList>("products/admin/list?limit=2")).items.every((product) => product.active === false)).toBe(true);
    const history = await api<{ items: { metadata: { reason: string; entries: unknown[] } }[] }>("admin/bulk/history?feature=catalogo");
    expect(history.items).toHaveLength(1);
    expect(history.items[0].metadata.reason).toBe(body.reason);
    expect(history.items[0].metadata.entries).toHaveLength(2);
  });

  it("applies prices to active presentations only and refuses stale previews", async () => {
    await login();
    const product = (await api<ProductList>("products/admin/list?limit=1")).items[0];
    const body = { ...bulk([product.id]), mode: "PERCENTAGE", value: 10 };
    const preview = await api<BulkPreview>("admin/bulk/products/prices/preview", "POST", body);
    expect(preview.entries[0].after).toBe(`${(Number(product.variants[0].price!.amount) * 1.1).toFixed(2)} UYU`);
    await api(`pricing/variants/${product.variants[0].id}`, "PATCH", { amount: 500 });
    await expect(api("admin/bulk/products/prices", "POST", { ...body, previewToken: preview.token })).rejects.toMatchObject({ status: 409 });
    const renewed = await api<BulkPreview>("admin/bulk/products/prices/preview", "POST", body);
    await api("admin/bulk/products/prices", "POST", { ...body, previewToken: renewed.token });
    expect((await api<ProductList>("products/admin/list?limit=1")).items[0].variants[0].price!.amount).toBe(550);
  });

  it("rejects invalid selections atomically", async () => {
    await login();
    const product = (await api<ProductList>("products/admin/list?limit=1")).items[0];
    await expect(api("admin/bulk/products/active/preview", "POST", { ...bulk([product.id, "missing"]), active: false })).rejects.toMatchObject({ status: 400 });
    expect((await api<ProductList>("products/admin/list?limit=1")).items[0].active).toBe(true);
    await expect(api("admin/bulk/products/active/preview", "POST", { ...bulk([product.id, product.id]), active: false })).rejects.toMatchObject({ status: 400 });
    await expect(api("admin/bulk/products/active/preview", "POST", { ...bulk(Array.from({ length: 101 }, (_, i) => `p-${i}`)), active: false })).rejects.toMatchObject({ status: 400 });
  });

  it("global search rejects clients and hides forbidden groups for staff", async () => {
    await login("cliente@gmail.com");
    await expect(api("admin/search?search=demo")).rejects.toMatchObject({ status: 403 });
    await login();
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    state.users.push({ id: "catalog-viewer", role: "CATALOG", email: "viewer@example.test", active: true, permissions: [] });
    state.staffRoleAccess.CATALOG = Object.fromEntries(staffFeatures.map(([feature]) => [feature, { canView: feature === "catalogo", canEdit: false }]));
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
    await login("viewer@example.test");
    const result = await api<AdminSearchResult>("admin/search?search=BIOFRESH");
    expect(result.products.length).toBeGreaterThan(0);
    expect(result.customers).toEqual([]);
    expect(result.orders).toEqual([]);
    await expect(api("admin/bulk/products/active/preview", "POST", { ...bulk([result.products[0].id]), active: false })).rejects.toMatchObject({ status: 403 });
  });

  it("reassigns multiple clients exclusively and seller search remains scoped", async () => {
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    state.users.push({ id: "seller-1", email: "seller@example.test", role: "SALES", active: true, emailVerified: true, permissions: [] });
    state.salespeople["seller-1"] = { id: "profile-1", name: "Vendedor Demo", phone: "099123456" };
    const ids = state.users.filter((member: User) => member.customerAccount).slice(0, 2).map((member: User) => member.customerAccount!.id);
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
    await login();
    const body = { ...bulk(ids), salespersonUserId: "seller-1" };
    const preview = await api<BulkPreview>("admin/bulk/customers/salesperson/preview", "POST", body);
    expect(preview.changed).toBe(2);
    await api("admin/bulk/customers/salesperson", "POST", { ...body, previewToken: preview.token });
    await login("seller@example.test");
    const search = await api<AdminSearchResult>("admin/search?search=demo");
    expect(search.customers.map((customer) => customer.id).sort()).toEqual(ids.sort());
    expect(search.products).toEqual([]);
    await expect(api("admin/bulk/customers/salesperson/preview", "POST", body)).rejects.toMatchObject({ status: 403 });
  });

  it("Ctrl+S submits only an enabled marked form and ignores ambiguous forms", () => {
    const submit = vi.fn();
    const button = { disabled: false };
    const form = { querySelector: () => button, getAttribute: () => null, requestSubmit: submit, closest: () => null, getClientRects: () => [1] } as unknown as HTMLFormElement;
    expect(submitShortcutForm(form)).toBe(true);
    expect(submit).toHaveBeenCalledWith(button);
    button.disabled = true;
    expect(submitShortcutForm(form)).toBe(false);
    expect(submit).toHaveBeenCalledTimes(1);
    const root = { querySelector: () => null, activeElement: { closest: () => null }, querySelectorAll: () => [form] } as unknown as Document;
    expect(shortcutForm(root)).toBe(form);
    const ambiguous = { ...root, querySelectorAll: () => [form, form] } as unknown as Document;
    expect(shortcutForm(ambiguous)).toBeUndefined();
    const focused = { ...ambiguous, activeElement: { closest: () => form } } as unknown as Document;
    expect(shortcutForm(focused)).toBe(form);
  });
});
