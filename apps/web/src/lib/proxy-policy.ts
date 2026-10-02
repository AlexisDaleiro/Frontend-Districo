export function allowedPath(path: string, method: string) {
  const id = "[a-zA-Z0-9_-]+";
  const rules: Record<string, string[]> = {
    GET: [
      "auth/me",
      "products",
      "products/cards",
      "products/admin/list",
      `products/admin/${id}`,
      `products/${id}`,
      "brands",
      "laboratories",
      "categories",
      "categories/catalog",
      "attributes",
      "cart",
      "cart/recommendations",
      "orders/me",
      "banners",
      `orders/me/${id}`,
      "promotions",
      "promotions/expiration",
      "recommendations",
      `inventory/variants/${id}/stock`,
      "admin/(dashboard|sales|customers|applications|orders|promotions|recommendations|audit-logs|banners|staff)",
      "admin/(customers|orders|applications|contact-inquiries)/page",
      `admin/orders/${id}/invoices/${id}`,
      `admin/orders/${id}/credit-notes/${id}`,
      "admin/contact-inquiries",
    ],
    POST: [
      // forgot-password se admite solo para responder 501 en el proxy; el flujo de
      // restablecimiento del backend expone el token y no se transporta.
      "auth/(login|refresh|logout|forgot-password)",
      "auth/staff-invitations/accept",
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
      `admin/orders/${id}/(payments|invoices|credit-notes|refunds)`,
      `admin/orders/${id}/(payments|invoices)/${id}/void`,
      "admin/banners",
      "admin/staff/invitations",
      "admin/(promotions|recommendations)",
    ],
    PATCH: [
      `products/${id}`,
      `products/(variants|media)/${id}`,
      `cart/items/${id}`,
      `pricing/variants/${id}`,
      `inventory/variants/${id}/stock`,
      `admin/customers/${id}`,
      `admin/staff/${id}/role`,
      `admin/staff/${id}/active`,
      `admin/contact-inquiries/${id}`,
      `admin/orders/${id}/status`,
      `admin/banners/${id}`,
      `(brands|categories|laboratories)/${id}`,
    ],
    DELETE: [`cart/items/${id}`, `products/media/${id}`, `admin/banners/${id}`],
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
