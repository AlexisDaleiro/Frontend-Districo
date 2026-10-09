import { beforeEach, expect, it, vi } from "vitest";
import { demoRequest as api, resetDemo } from "../src/lib/demo";
import { isSalesLine, salesLineLabel } from "../src/lib/sales-line";
import { filterDirectory } from "../src/lib/entity-directory";
import type { Entity, Product, ProductCardList, ProductList } from "../src/lib/types";

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) });
  resetDemo();
});

const login = (email = "admin@districo.com") => api("auth/login", "POST", { email, password: "Demo1234!" });

it("labels all three lines without treating unknown as both", () => {
  expect(salesLineLabel("BOTH")).toBe("Ambos");
  expect(salesLineLabel("SPECIALIZED")).toBe("Línea especializada");
  expect(salesLineLabel("COMMERCIAL")).toBe("Línea comercial");
  expect(salesLineLabel(null)).toBeUndefined();
  expect(isSalesLine("OTHER")).toBe(false);
});

it("combines line, name, status and logo filters and keeps laboratories compatible", () => {
  const brands: Entity[] = [{ id: "a", name: "Álfa", salesLine: "BOTH", imageUrl: "logo.png" }, { id: "b", name: "Beta", salesLine: "SPECIALIZED", active: false }, { id: "c", name: "Gamma" }];
  expect(filterDirectory(brands, "alfa", "active", "with", "asc", "BOTH").map((brand) => brand.id)).toEqual(["a"]);
  expect(filterDirectory(brands, "", "", "", "asc", "unclassified").map((brand) => brand.id)).toEqual(["c"]);
  expect(filterDirectory(brands, "", "", "", "desc").map((brand) => brand.id)).toEqual(["c", "b", "a"]);
});

it("editing a brand updates all inherited product lines across requests, listings and cards", async () => {
  await login();
  const brands = await api<Entity[]>("brands/admin");
  const brand = brands.find((item) => item.name === "Biofresh")!;
  for (const salesLine of ["BOTH", "COMMERCIAL", "SPECIALIZED"] as const) {
    await api(`brands/${brand.id}`, "PATCH", { salesLine });
    const products = await api<ProductList>(`products?brandId=${brand.id}`);
    expect(products.items.length).toBeGreaterThan(1);
    expect(products.items.every((product) => product.brand?.salesLine === salesLine)).toBe(true);
    const detail = await api<Product>(`products/${products.items[0].slug}`);
    expect(detail.brand?.salesLine).toBe(salesLine);
    const adminDetail = await api<Product>(`products/admin/${detail.slug}`);
    expect(adminDetail.brand?.salesLine).toBe(salesLine);
    const cards = await api<ProductCardList>(`products/cards?brandId=${brand.id}`);
    expect(cards.items.every((product) => product.brand?.salesLine === salesLine)).toBe(true);
  }
});

it("brand creation accepts both and legacy brand updates preserve the line", async () => {
  await login();
  const brand = await api<Entity>("brands", "POST", { name: "Nueva marca", slug: "nueva-marca", salesLine: "BOTH" });
  expect(brand.salesLine).toBe("BOTH");
  expect((await api<Entity>(`brands/${brand.id}`, "PATCH", { name: "Nuevo nombre" })).salesLine).toBe("BOTH");
  await expect(api("brands", "POST", { name: "Invalid", salesLine: "OTHER" })).rejects.toMatchObject({ status: 400 });
  await expect(api(`brands/${brand.id}`, "PATCH", { salesLine: "OTHER" })).rejects.toMatchObject({ status: 400 });
  await login("cliente@gmail.com");
  await expect(api(`brands/${brand.id}`, "PATCH", { salesLine: "COMMERCIAL" })).rejects.toMatchObject({ status: 403 });
});

it("upgrades old demo brands without overwriting explicit classifications", async () => {
  const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
  const bio = state.brands.find((brand: Entity) => brand.name === "Biofresh");
  delete bio.salesLine;
  const other = state.brands.find((brand: Entity) => brand.id !== bio.id);
  other.salesLine = "BOTH";
  localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  await login();
  const brands = await api<Entity[]>("brands/admin");
  expect(brands.find((brand) => brand.id === bio.id)?.salesLine).toBe("SPECIALIZED");
  expect(brands.find((brand) => brand.id === other.id)?.salesLine).toBe("BOTH");
});

it("preserves legacy demo relations that are not present in the brand directory", async () => {
  const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
  const product = state.products[0];
  product.brand = { id: "legacy-brand", name: "Marca de ejemplo" };
  localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  await login();
  expect((await api<Product>(`products/admin/${product.slug}`)).brand).toEqual(product.brand);
});
