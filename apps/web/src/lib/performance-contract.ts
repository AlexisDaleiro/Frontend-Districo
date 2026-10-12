import { storeRoutes } from "./store-routes";
export const performancePages = {
  HOME: "Inicio de tienda",
  CATALOG: "Catálogo",
  PRODUCT: "Ficha de producto",
  CATEGORY: "Categorías",
  BRANDS: "Marcas",
  CART: "Carrito",
  CHECKOUT: "Checkout",
  ACCOUNT: "Mi cuenta",
  ORDERS: "Mis pedidos",
  LOGIN: "Ingreso",
  REGISTER: "Solicitud de cuenta",
  ADMIN: "Dashboard",
  INSTITUTIONAL: "Institucional",
  JOBS: "Empleos",
  OTHER: "Otras páginas",
} as const;
export const performanceNames = [
  "LCP",
  "INP",
  "CLS",
  "FCP",
  "TTFB",
  "NAVIGATION",
  "DATA_READY",
  "API",
  "IMAGE",
] as const;
export type PerformanceName = (typeof performanceNames)[number];
export type PerformancePage = keyof typeof performancePages;
export type PerformanceSample = {
  id: string;
  sequence: number;
  name: PerformanceName;
  value: number;
  page: PerformancePage;
  target:
    | "PAGE"
    | "CATALOG"
    | "PRODUCT"
    | "TAXONOMY"
    | "ACCOUNT"
    | "ORDERS"
    | "ADMIN"
    | "OTHER"
    | "LOCAL_IMAGE"
    | "EXTERNAL_IMAGE";
  phase: "DOCUMENT" | "SOFT" | "RESTORE";
  cache: "UNKNOWN" | "NETWORK" | "CACHE";
  outcome: "OK" | "ERROR";
};
export type PerformanceContext = {
  viewId: string;
  device: "MOBILE" | "DESKTOP";
  visit: "FIRST" | "RETURNING" | "UNKNOWN";
  environment: "PRODUCTION" | "LOCAL";
  release: string;
};
export function performancePage(path: string): PerformancePage {
  const pathname = path.split(/[?#]/)[0];
  if (pathname === storeRoutes.home) return "HOME";
  if (pathname === storeRoutes.products) return "CATALOG";
  if (pathname.startsWith(`${storeRoutes.home}/producto/`)) return "PRODUCT";
  if (
    pathname === storeRoutes.categories ||
    pathname.startsWith(`${storeRoutes.categories}/`)
  )
    return "CATEGORY";
  if (pathname === storeRoutes.brands) return "BRANDS";
  if (pathname === storeRoutes.cart) return "CART";
  if (pathname === storeRoutes.checkout) return "CHECKOUT";
  if (
    pathname === storeRoutes.orders ||
    pathname.startsWith(`${storeRoutes.orders}/`)
  )
    return "ORDERS";
  if (
    pathname === storeRoutes.account ||
    pathname.startsWith(`${storeRoutes.account}/`)
  )
    return "ACCOUNT";
  if (pathname === storeRoutes.login || pathname === storeRoutes.recoverAccess)
    return "LOGIN";
  if (
    pathname === storeRoutes.requestAccount ||
    pathname === storeRoutes.staffInvitation
  )
    return "REGISTER";
  if (
    pathname === storeRoutes.admin ||
    pathname.startsWith(`${storeRoutes.admin}/`)
  )
    return "ADMIN";
  if (pathname === "/trabajo" || pathname.startsWith("/trabajo/"))
    return "JOBS";
  return pathname.startsWith(`${storeRoutes.home}/`)
    ? "OTHER"
    : "INSTITUTIONAL";
}
export function performanceApiTarget(
  path: string,
): PerformanceSample["target"] | null {
  const area = path.split(/[/?#]/)[0];
  if (["auth", "usage-events", "performance-samples"].includes(area))
    return null;
  if (area === "products")
    return path.startsWith("products/") &&
      !path.startsWith("products/cards") &&
      !path.startsWith("products/suggestions") &&
      !path.startsWith("products/admin")
      ? "PRODUCT"
      : "CATALOG";
  if (["categories", "brands", "laboratories", "attributes"].includes(area))
    return "TAXONOMY";
  if (area === "account") return "ACCOUNT";
  if (area === "orders") return "ORDERS";
  if (area === "admin")
    return path.startsWith("admin/operations/performance") ? null : "ADMIN";
  return "OTHER";
}
export function performanceThreshold(name: string) {
  return name === "LCP"
    ? 2500
    : name === "INP"
      ? 200
      : name === "CLS"
        ? 0.1
        : null;
}
