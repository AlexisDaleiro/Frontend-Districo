import { beforeEach, expect, it, vi } from "vitest";
import { normalizeProductSheet, sanitizeSheetHtml, sheetTextHtml } from "../src/lib/product-sheet";
import { allowedPath } from "../src/lib/proxy-policy";
import { affectedAdminQueries } from "../src/lib/admin-query-invalidation";
import { demoRequest as api, resetDemo } from "../src/lib/demo";
import type { Product, ProductList } from "../src/lib/types";
import sheets from "../public/data/fichas-tecnicas.json";

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) });
  resetDemo();
});

it("preserves tables while rejecting empty content and removing executable markup", () => {
  expect(sanitizeSheetHtml('<p onclick="x">A &amp; B</p><script>bad()</script><table><tr><th colspan="2" scope="col">Header</th><td style="color:red">23%</td></tr></table>'))
    .toBe('<p>A &amp; B</p><table><tr><th colspan="2" scope="col">Header</th><td>23%</td></tr></table>');
  expect(sheetTextHtml('A < B\nsegunda línea')).toBe('<p>A &lt; B</p><p>segunda línea</p>');
  expect(() => normalizeProductSheet({ technical: [{ label: "x", html: "<p></p>" }] })).toThrow("vacía");
  expect(() => normalizeProductSheet({ technical: [{ label: "x", text: "y" }, { label: " X ", text: "z" }] })).toThrow("repetirse");
  expect(normalizeProductSheet({})).toEqual({ technical: [], benefits: [] });
});

it("allows the dedicated route and invalidates both public and admin details", () => {
  expect(allowedPath("products/product-1/technical-sheet", "PATCH")).toBe(true);
  expect(allowedPath("products/product-1/technical-sheet", "POST")).toBe(false);
  expect(affectedAdminQueries("products/product-1/technical-sheet", "products/admin/slug")).toBe(true);
  expect(affectedAdminQueries("products/product-1/technical-sheet", "products/slug")).toBe(true);
});

it("demo initializes old content, saves persistently, rejects conflicts and permits clearing without fallback", async () => {
  await api("auth/login", "POST", { email: "admin@districo.com", password: "Demo1234!" });
  const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
  const legacy = Object.entries(sheets).find(([, sheet]) => "technical" in sheet)!;
  state.products[0].sourceUrl = legacy[0];
  delete state.products[0].technicalSheet;
  delete state.products[0].technicalSheetRevision;
  localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  const list = await api<ProductList>("products/admin/list");
  const product = list.items.find((item) => item.technicalSheet?.technical?.length)!;
  expect(product).toBeTruthy();
  const original = structuredClone(product);
  const saved = await api<Pick<Product, "technicalSheetRevision">>(`products/${product.id}/technical-sheet`, "PATCH", { revision: 0, technical: [{ label: "Composición básica", html: '<p onmouseover="bad">Actualizada</p>' }], benefits: [] });
  expect(saved.technicalSheetRevision).toBe(1);
  const detail = await api<Product>(`products/${product.slug}`);
  expect(detail.technicalSheet?.technical).toEqual([{ label: "Composición básica", html: "<p>Actualizada</p>" }]);
  expect(detail.categories).toEqual(original.categories);
  expect(detail.variants).toEqual(original.variants);
  await expect(api(`products/${product.id}/technical-sheet`, "PATCH", { revision: 0, technical: [], benefits: [] })).rejects.toMatchObject({ status: 409 });
  await api(`products/${product.id}/technical-sheet`, "PATCH", { revision: 1, technical: [], benefits: [] });
  expect((await api<Product>(`products/${product.slug}`)).technicalSheet).toEqual({ technical: [], benefits: [] });
});

it("customer and view-only catalog staff cannot edit sheets", async () => {
  await api("auth/login", "POST", { email: "cliente@gmail.com", password: "Demo1234!" });
  const product = (await api<ProductList>("products")).items[0];
  await expect(api(`products/${product.id}/technical-sheet`, "PATCH", { revision: 0, technical: [], benefits: [] })).rejects.toMatchObject({ status: 403 });
  await api("auth/login", "POST", { email: "admin@districo.com", password: "Demo1234!" });
  const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
  const staff = { id: "catalog-test", email: "catalog@example.test", role: "CATALOG", permissions: [], active: true };
  state.users.push(staff);
  state.staffRoleAccess.CATALOG.catalogo = { canView: true, canEdit: false };
  localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  await api("auth/login", "POST", { email: staff.email, password: "Demo1234!" });
  await expect(api(`products/${product.id}/technical-sheet`, "PATCH", { revision: 0, technical: [], benefits: [] })).rejects.toMatchObject({ status: 403 });
});
