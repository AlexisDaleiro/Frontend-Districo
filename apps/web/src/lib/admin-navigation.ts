import { canSeeAdminSection } from "./staff-access";
import { storeRoutes } from "./store-routes";
import type { User } from "./types";

export function adminSectionFromPath(pathname: string) {
  const path = pathname.slice(storeRoutes.admin.length).split("/").filter(Boolean)[0] ?? "";
  return path === "productos" ? "catalogo" : path;
}

const sectionQueries: Record<string, readonly string[]> = {
  "": ["admin/dashboard"],
  consultas: ["admin/contact-inquiries/page?page=1&limit=20"],
  solicitudes: ["admin/applications/page?page=1&limit=20&search="],
  clientes: ["admin/customers/page?page=1&limit=20"],
  vendedores: ["admin/salespeople?page=1&limit=20"],
  pedidos: ["admin/orders/page?page=1&limit=20"],
  catalogo: ["products/admin/list?limit=12&page=1"],
  marcas: ["brands/admin", "laboratories/admin"],
  categorias: ["categories/admin"],
  promociones: ["admin/promotions/page?page=1&limit=20"],
  banners: ["admin/banners?placement=ECOMMERCE"],
  recomendaciones: ["admin/recommendations/page?page=1&limit=20"],
  personal: ["admin/staff/page?page=1&limit=20"],
  roles: ["admin/staff/access"],
  "ofertas-laborales": ["admin/jobs?page=1&limit=20"],
  integraciones: ["admin/integrations"],
  cartera: ["admin/operations/portfolio?page=1&limit=20"],
  finanzas: ["admin/operations/finance/movements?page=1&limit=20"],
  logistica: ["admin/operations/logistics?page=1&limit=20"],
  metricas: ["admin/operations/metrics"],
};
export const adminSectionPaths = Object.keys(sectionQueries);

// Only prepare known read endpoints. Filtered lists reuse their existing cache,
// rather than guessing or widening the user's selected filters.
export function adminNavigationTarget(href: string, user: User | null) {
  if (!href.startsWith("/") || href.startsWith("//") || href.length > 4096 || /[\\\r\n]/.test(href)) return null;
  const url = new URL(href, "https://admin.invalid");
  if (url.pathname !== storeRoutes.admin && !url.pathname.startsWith(`${storeRoutes.admin}/`)) return null;
  const section = adminSectionFromPath(url.pathname);
  if (!canSeeAdminSection(user, section)) return null;
  const segments = url.pathname.slice(storeRoutes.admin.length).split("/").filter(Boolean);
  let queries: readonly string[] = [];
  if (segments.length <= 1) queries = url.search ? [] : sectionQueries[section] ?? [];
  else if (segments.length === 2) {
    const id = segments[1];
    if (["clientes", "pedidos", "vendedores", "ofertas-laborales"].includes(segments[0])) {
      const resources: Record<string, string> = { clientes: "customers", pedidos: "orders", vendedores: "salespeople", "ofertas-laborales": "jobs" };
      queries = [`admin/${resources[segments[0]]}/${id}`];
    } else if (segments[0] === "productos") queries = [`products/admin/${id}`];
    else return null;
  } else if (segments.length === 3 && segments[0] === "productos" && segments[2] === "vista-previa") queries = [`products/admin/${segments[1]}`];
  else return null;
  return { href: `${url.pathname}${url.search}`, queries };
}
