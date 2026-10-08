import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoRequest as api, resetDemo } from "../src/lib/demo";
import { demoRecommendationLabels, demoRecommendationPayload, demoRecommendations } from "../src/lib/demo-recommendations";
import { recommendationIds, recommendationPayload } from "../src/lib/recommendation-scope";
import type { Cart, Product, Rule } from "../src/lib/types";

const product = (id: string, overrides: Partial<Product> = {}): Product => ({ id, name: `Producto ${id}`, slug: id, active: true,
  productType: "FOOD", media: [], requiresMedicationPermission: false,
  brand: { id: `b-${id}`, name: `Marca ${id}` }, laboratory: { id: `l-${id}`, name: `Lab ${id}` },
  categories: [{ categoryId: `c-${id}` }], variants: [{ id: `v-${id}`, name: "1 kg", sku: id, availableStock: 10, physicalStock: 10, reservedStock: 0, active: true, saleMultiple: 1, minimumOrderQuantity: 1 }], ...overrides });
const p1 = product("p1"), p2 = product("p2"), p3 = product("p3");
const catalog = { products: [p1, p2, p3], brands: [p1.brand!, p2.brand!, p3.brand!], laboratories: [p1.laboratory!, p2.laboratory!, p3.laboratory!], categories: [{ id: "root-trigger", name: "Compra" }, { id: "c-p1", name: "Hija", parentId: "root-trigger", aliasIds: ["old-p1"] }, { id: "root-target", name: "Recomendados" }, { id: "c-p2", name: "Hija", parentId: "root-target" }, { id: "c-p3", name: "Otra hija", parentId: "root-target" }] };
const cart: Cart = { id: "cart1", items: [{ id: "item1", product: p1, variant: p1.variants[0], quantity: 2, unitPrice: 10, currency: "UYU", subtotal: 20 }], total: 20 };
const rule = (overrides: Partial<Rule> = {}): Rule => ({ id: "r1", name: "Complementos", triggerType: "PRODUCT", triggerIds: ["p-other", "p1"], targetType: "PRODUCT", targetIds: ["p2", "p3"], minimumQuantity: 1, ...overrides });
beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) });
  resetDemo();
});
describe("selecciones de recomendaciones", () => {
  it("conserva reglas antiguas y presentaciones específicas", () => {
    const legacy = rule({ triggerIds: undefined, triggerId: "v-p1", targetIds: undefined, products: [{ productId: "p2", variantId: "v-p2", position: 4 }] });
    const payload = recommendationPayload(legacy);
    expect(payload.triggerIds).toEqual(["v-p1"]);
    expect(payload.products).toEqual([{ productId: "p2", variantId: "v-p2", position: 4 }]);
    expect(demoRecommendations([legacy], catalog, cart, false)).toHaveLength(1);
    expect(demoRecommendationLabels(legacy, catalog).triggerTargets?.[0].name).toBe(p1.name);
  });
  it("rechaza selecciones vacías, repetidas, más de cien y mínimos inválidos", () => {
    for (const change of [{ triggerIds: [] }, { targetIds: [] }, { targetIds: ["p2", "p2"] }, { targetIds: Array.from({ length: 101 }, (_, i) => `p${i}`) }, { minimumQuantity: 0 }, { priority: -1 }, { minimumCartAmount: -1 }, { startsAt: "2026-10-05", endsAt: "2026-10-01" }]) expect(() => recommendationPayload(rule(change))).toThrow();
    expect(() => demoRecommendationPayload(rule({ targetIds: ["non-existent"] }), catalog)).toThrow(/no existe/);
    expect(() => demoRecommendationPayload(rule({ triggerIds: ["p1"], targetIds: ["p2"], products: [{ productId: "p2", variantId: "v-p1" }] }), catalog)).toThrow(/no pertenece/);
  });
  for (const triggerType of ["PRODUCT", "BRAND", "CATEGORY", "LABORATORY"]) for (const targetType of ["PRODUCT", "BRAND", "CATEGORY", "LABORATORY"]) {
    it(`activa ${triggerType} y recomienda ${targetType}`, () => {
      const ids: Record<string, string> = { PRODUCT: "p1", BRAND: "b-p1", CATEGORY: "root-trigger", LABORATORY: "l-p1" };
      const targets: Record<string, string[]> = { PRODUCT: ["p2", "p3"], BRAND: ["b-p2", "b-p3"], CATEGORY: ["root-target"], LABORATORY: ["l-p2", "l-p3"] };
      const results = demoRecommendations([rule({ triggerType, triggerIds: ["other", ids[triggerType]], targetType, targetIds: targets[targetType] })], catalog, cart, false);
      expect(results.map((item) => item.product.id)).toEqual(["p2", "p3"]);
    });
  }
  it("cuenta líneas una sola vez, respeta vigencia, mínimo y deduplica", () => {
    expect(demoRecommendations([rule({ minimumQuantity: 3 })], catalog, cart, false)).toHaveLength(0);
    expect(demoRecommendations([rule({ triggerIds: ["p1", "v-p1"], minimumQuantity: 3 })], catalog, cart, false)).toHaveLength(0);
    expect(demoRecommendations([rule(), rule({ id: "r2" })], catalog, cart, false)).toHaveLength(2);
    for (const change of [{ active: false }, { minimumCartAmount: 21 }, { startsAt: "2099-01-01" }, { endsAt: "2000-01-01" }]) expect(demoRecommendations([rule(change)], catalog, cart, false)).toHaveLength(0);
  });
  it("excluye carrito, inactivos, stock reservado y medicamentos restringidos", () => {
    const med = product("med", { requiresMedicationPermission: true });
    const empty = product("empty", { variants: [{ ...p1.variants[0], id: "empty-v", physicalStock: 3, reservedStock: 3 }] });
    const customCatalog = { ...catalog, products: [...catalog.products, med, empty, product("inactive", { active: false })] };
    const all = rule({ targetIds: customCatalog.products.map((item) => item.id) });
    expect(demoRecommendations([all], customCatalog, cart, false).map((item) => item.product.id)).toEqual(["p2", "p3"]);
    expect(demoRecommendations([all], customCatalog, cart, true).map((item) => item.product.id)).toEqual(["p2", "p3", "med"]);
  });
  it("incluye subcategorías y alias y limita a doce productos", () => {
    const aliasCatalog = { ...catalog, products: [product("p1", { categories: [{ categoryId: "old-p1" }] }), p2, p3] };
    expect(demoRecommendations([rule({ triggerType: "CATEGORY", triggerIds: ["root-trigger"] })], aliasCatalog, cart, false)).toHaveLength(2);
    const many = { ...catalog, products: Array.from({ length: 20 }, (_, i) => product(`x${i}`, { brand: p2.brand })) };
    many.products.push(p1);
    expect(demoRecommendations([rule({ targetType: "BRAND", targetIds: ["b-p2"] })], many, cart, false)).toHaveLength(12);
  });
});
describe("API demo de recomendaciones", () => {
  it("crea, lista, edita, activa, recomienda y elimina sin perder selecciones", async () => {
    await api("auth/login", "POST", { email: "admin@districo.com", password: "Demo1234!" });
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    const products: Product[] = state.products.filter((item: Product) => !item.requiresMedicationPermission && item.productType === "FOOD").slice(0, 4);
    const payload = { name: "Compra conjunta", triggerType: "PRODUCT", triggerIds: products.slice(0, 2).map((item) => item.id), targetType: "PRODUCT", targetIds: products.slice(2).map((item) => item.id) };
    const created = await api<Rule>("recommendations", "POST", payload);
    expect(recommendationIds(created, "target")).toHaveLength(2);
    const listed = await api<Rule[]>("admin/recommendations");
    expect(listed[0].triggerTargets?.map((item) => item.name)).toEqual(products.slice(0, 2).map((item) => item.name));
    await api(`recommendations/${created.id}/active`, "PATCH", { active: false });
    await api(`recommendations/${created.id}`, "PATCH", { ...payload, name: "Editada", targetIds: products.slice(1).map((item) => item.id) });
    expect((await api<Rule[]>("admin/recommendations"))[0].active).toBe(false);
    await api(`recommendations/${created.id}/active`, "PATCH", { active: true });
    await api("auth/login", "POST", { email: "cliente@gmail.com", password: "Demo1234!" });
    await api("cart/items", "POST", { variantId: products[0].variants[0].id, quantity: 1 });
    expect(await api<{ product: Product }[]>("cart/recommendations")).toHaveLength(3);
    await expect(api(`recommendations/${created.id}/active`, "PATCH", { active: false })).rejects.toMatchObject({ status: 403 });
    await api("auth/login", "POST", { email: "admin@districo.com", password: "Demo1234!" });
    await api(`recommendations/${created.id}`, "DELETE");
    expect(await api("admin/recommendations")).toEqual([]);
  });
  it("un rol de sólo lectura no puede crear ni editar reglas", async () => {
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    state.users.push({ id: "reader", email: "reader@example.test", role: "CATALOG", permissions: [], active: true });
    state.staffRoleAccess.CATALOG = { recomendaciones: { canView: true, canEdit: false } };
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
    await api("auth/login", "POST", { email: "reader@example.test", password: "Demo1234!" });
    expect(await api("admin/recommendations")).toEqual([]);
    await expect(api("recommendations", "POST", {})).rejects.toMatchObject({ status: 403 });
  });
});
