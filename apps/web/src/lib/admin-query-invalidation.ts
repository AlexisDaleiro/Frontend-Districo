import type { QueryClient } from "@tanstack/react-query";

const relatedPaths: Record<string, string[]> = {
  categories: ["categories", "products"],
  brands: ["brands", "products"],
  laboratories: ["laboratories", "products"],
  products: ["products", "inventory", "admin/dashboard", "admin/promotions", "admin/recommendations"],
  pricing: ["products", "pricing", "cart"],
  inventory: ["inventory", "products", "cart"],
  "admin/contact-inquiries": ["admin/contact-inquiries", "admin/dashboard"],
  "admin/applications": ["admin/applications", "admin/customers", "admin/dashboard"],
  "admin/customers": ["admin/customers", "admin/orders"],
  "admin/salespeople": ["admin/salespeople", "admin/customers"],
  "admin/orders": ["admin/orders", "admin/sales", "admin/dashboard", "inventory", "products", "cart"],
  promotions: ["promotions", "admin/promotions", "products", "cart", "admin/dashboard"],
  "admin/promotions": ["promotions", "admin/promotions", "products", "cart", "admin/dashboard"],
  recommendations: ["recommendations", "admin/recommendations", "cart"],
  "admin/recommendations": ["recommendations", "admin/recommendations", "cart"],
  "admin/banners": ["admin/banners", "banners"],
  "admin/staff": ["admin/staff", "admin/salespeople"],
};

export function affectedAdminQueries(mutationPath: string, queryPath: string): boolean {
  if (mutationPath.startsWith("admin/bulk/")) {
    const affected = mutationPath.startsWith("admin/bulk/products/")
      ? ["products", "pricing", "cart", "admin/dashboard", "admin/search", "admin/bulk/history"]
      : ["admin/customers", "admin/orders", "admin/salespeople", "account/me", "admin/search", "admin/bulk/history"];
    return affected.some((path) => queryPath === path || queryPath.startsWith(`${path}/`) || queryPath.startsWith(`${path}?`));
  }
  const parts = mutationPath.split("/");
  const area = parts[0] === "admin" ? parts.slice(0, 2).join("/") : parts[0];
  const affected = relatedPaths[area] ?? [area];
  return affected.some((path) => queryPath === path || queryPath.startsWith(`${path}/`) || queryPath.startsWith(`${path}?`));
}

export function invalidateAdminMutation(client: QueryClient, mutationPath: string) {
  return client.invalidateQueries({
    predicate: (query) => typeof query.queryKey[2] === "string" &&
      affectedAdminQueries(mutationPath, query.queryKey[2]),
  });
}
