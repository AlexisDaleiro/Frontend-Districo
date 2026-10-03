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
      "categories/admin",
      `categories/admin/${id}/(products|candidates)`,
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
      "admin/staff/access",
      "admin/salespeople",
      `admin/salespeople/${id}`,
      "admin/(customers|orders|applications|contact-inquiries)/page",
      `admin/customers/${id}`,
      `admin/customers/${id}/documents/${id}`,
      `admin/orders/${id}`,
      "admin/orders/export",
      `admin/applications/${id}/documents/${id}`,
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
      `products/${id}/media/upload`,
      "brands",
      `brands/${id}/logo`,
      "categories",
      `categories/${id}/products`,
      "laboratories",
      `laboratories/${id}/logo`,
      "promotions",
      "promotions/expiration",
      "recommendations",
      `admin/applications/${id}/(approve|reject)`,
      `admin/applications/${id}/documents`,
      `admin/orders/${id}/(approve|reject)`,
      `admin/orders/${id}/(payments|invoices|credit-notes|refunds)`,
      `admin/orders/${id}/(payments|invoices)/${id}/void`,
      "admin/banners",
      "admin/staff/invitations",
      `admin/salespeople/${id}/customers`,
      "admin/staff/roles",
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
      "admin/staff/access/(SALES|CATALOG|FINANCE)",
      `admin/staff/roles/${id}/access`,
      `admin/staff/${id}/active`,
      `admin/salespeople/${id}`,
      `admin/contact-inquiries/${id}`,
      `admin/orders/${id}/status`,
      `admin/banners/${id}`,
      `promotions/${id}`,
      `promotions/${id}/(activate|deactivate)`,
      `promotions/expiration/${id}`,
      `recommendations/${id}`,
      `recommendations/${id}/active`,
      `(brands|categories|laboratories)/${id}`,
    ],
    DELETE: [`cart/items/${id}`, `products/media/${id}`, `categories/${id}/products/${id}`, `admin/banners/${id}`, `admin/salespeople/${id}/customers/${id}`, `(brands|laboratories)/${id}`, `brands/${id}/logo`, `laboratories/${id}/logo`, `promotions/${id}`, `promotions/expiration/${id}`, `recommendations/${id}`],
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
