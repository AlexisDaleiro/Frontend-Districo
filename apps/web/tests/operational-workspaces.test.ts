import { beforeEach, expect, it, vi } from "vitest";
import { demoRequest, resetDemo } from "../src/lib/demo";
import { metricConsent, recordUsage } from "../src/lib/usage-metrics";
import { allowedPath } from "../src/lib/proxy-policy";
import type { Order, ProductList } from "../src/lib/types";

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  });
  resetDemo();
});
it("paged customer history isolates users, filters and never returns product payloads", async () => {
  await demoRequest("auth/login", "POST", {
    email: "cliente@gmail.com",
    password: "Demo1234!",
  });
  const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
  state.orders = Array.from({ length: 30 }, (_, index) => ({
    id: `o${index}`,
    orderNumber: `ORDER-${index}`,
    userId: index < 25 ? state.session : "another",
    status: "DELIVERED",
    createdAt: "2026-10-12T10:00:00Z",
    total: 100,
    paidTotal: index < 5 ? 100 : 0,
    currency: "UYU",
    items: [{ name: "Large product payload" }],
  }));
  localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  const page = await demoRequest<{
    items: (Order & { itemCount: number })[];
    meta: { total: number };
  }>("orders/me/page?page=2&limit=12&paymentStatus=PENDING");
  expect(page.meta.total).toBe(20);
  expect(page.items).toHaveLength(8);
  expect(page.items[0].itemCount).toBe(1);
  expect(page.items[0]).not.toHaveProperty("items");
  const search = await demoRequest<{ meta: { total: number } }>(
    "orders/me/page?search=ORDER-1&dateFrom=2026-10-12&dateTo=2026-10-12",
  );
  expect(search.meta.total).toBe(11);
});
it("autocomplete matches SKU, expands food synonyms and preserves structured stage filters", async () => {
  const products = await demoRequest<ProductList>(
    "products?productType=FOOD&limit=100",
  );
  const product = products.items[0],
    sku = product.variants[0].sku;
  const suggestions = await demoRequest<{ items: { id: string }[] }>(
    `products/suggestions?search=${encodeURIComponent(sku)}&productType=FOOD`,
  );
  expect(suggestions.items.some((item) => item.id === product.id)).toBe(true);
  const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
  state.products[0].name = "Alimento ejemplo";
  localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  expect(
    (await demoRequest<ProductList>("products?search=comida")).items.some(
      (item) => item.name === "Alimento ejemplo",
    ),
  ).toBe(true);
  expect(
    (
      await demoRequest<ProductList>(
        "products?search=comida&attributeValueIds=nonexistent",
      )
    ).items,
  ).toHaveLength(0);
});
it("metrics are opt-in and cannot block a purchase when browser storage is unavailable", () => {
  expect(metricConsent()).toBe(false);
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  recordUsage("CHECKOUT_STARTED");
  expect(fetch).not.toHaveBeenCalled();
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw new Error("storage disabled");
    },
  });
  expect(() => recordUsage("SEARCH")).not.toThrow();
  expect(fetch).not.toHaveBeenCalled();
});
it("public proxy blocks scheduled maintenance even though authenticated module routes are allowed", () => {
  expect(allowedPath("internal/operations/maintenance", "POST")).toBe(false);
  expect(allowedPath("admin/operations/logistics", "GET")).toBe(true);
});
