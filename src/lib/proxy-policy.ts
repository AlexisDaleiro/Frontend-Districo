export function allowedPath(path: string, method: string) {
  const id = "[a-zA-Z0-9_-]+";
  const rules: Record<string, string[]> = {
    GET: [
      "auth/me",
      "products",
      `products/${id}`,
      "brands",
      "laboratories",
      "categories",
      "attributes",
      "cart",
      "cart/recommendations",
      "orders/me",
      `orders/me/${id}`,
      "promotions",
      "promotions/expiration",
      "recommendations",
      `inventory/variants/${id}/stock`,
      "admin/(dashboard|customers|applications|orders|promotions|recommendations|audit-logs)",
    ],
    POST: [
      "auth/(login|refresh|logout|forgot-password|reset-password)",
      "applications",
      "cart/items",
      "checkout",
      "products",
      `products/${id}/(variants|media)`,
      "brands",
      "categories",
      "laboratories",
      "promotions",
      "promotions/expiration",
      "recommendations",
      `admin/applications/${id}/(approve|reject)`,
      `admin/orders/${id}/(approve|reject)`,
      "admin/(promotions|recommendations)",
    ],
    PATCH: [
      `products/${id}`,
      `products/(variants|media)/${id}`,
      `cart/items/${id}`,
      `pricing/variants/${id}`,
      `inventory/variants/${id}/stock`,
      `admin/customers/${id}`,
      `admin/orders/${id}/status`,
      `(brands|categories|laboratories)/${id}`,
    ],
    DELETE: [`cart/items/${id}`, `products/media/${id}`],
  };
  return (rules[method] ?? []).some((pattern) =>
    new RegExp(`^${pattern}$`).test(path),
  );
}
export function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([key]) =>
            ![
              "passwordHash",
              "tokenHash",
              "refreshTokens",
              "resetToken",
              "accessToken",
              "refreshToken",
            ].includes(key),
        )
        .map(([key, item]) => [key, sanitize(item)]),
    );
  return value;
}
