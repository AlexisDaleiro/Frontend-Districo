import type { User } from "./types";

export type StaffRole = Exclude<User["role"], "CLIENT">;
export type BuiltInStaffRole = Exclude<StaffRole, "CUSTOM">;

export const staffRoles: BuiltInStaffRole[] = ["ADMIN", "SALES", "CATALOG", "FINANCE"];

export const sensitiveStaffFeatures = {
  stock: "catalogo", precios: "catalogo", cobros: "facturacion",
  "anular-cobros": "facturacion", reintegros: "facturacion",
} as const;
export type SensitiveStaffFeature = keyof typeof sensitiveStaffFeatures;
export const isSensitiveStaffFeature = (feature: string): feature is SensitiveStaffFeature =>
  Object.prototype.hasOwnProperty.call(sensitiveStaffFeatures, feature);

export const staffFeatures = [
  ["resumen", "Resumen"], ["ventas", "Ventas"], ["consultas", "Consultas"],
  ["solicitudes", "Solicitudes"], ["clientes", "Clientes"], ["pedidos", "Pedidos"],
  ["descuentos-clientes", "Descuentos de clientes"],
  ["facturacion", "Pagos y facturas"], ["catalogo", "Catálogo"],
  ["marcas", "Marcas y laboratorios"], ["categorias", "Categorías"],
  ["promociones", "Promociones"], ["banners", "Banners"],
  ["recomendaciones", "Recomendaciones"], ["personal", "Personal"],
  ["roles", "Roles"], ["vendedores", "Vendedores"],
  ["ofertas-laborales", "Ofertas laborales"],
  ["integraciones", "Integraciones"],
  ["cartera", "Prioridades de cartera"], ["finanzas", "Finanzas"], ["logistica", "Depósito y logística"], ["metricas", "Métricas"],
  ["stock", "Ajustar stock"], ["precios", "Cambiar precios"], ["cobros", "Registrar cobros"],
  ["anular-cobros", "Anular cobros"], ["reintegros", "Realizar reintegros"],
] as const;
export type StaffFeature = typeof staffFeatures[number][0];

const sectionFeature: Record<string, StaffFeature> = {
  "": "resumen", consultas: "consultas", solicitudes: "solicitudes", clientes: "clientes",
  pedidos: "pedidos", catalogo: "catalogo", marcas: "marcas", categorias: "categorias",
  promociones: "promociones", banners: "banners", recomendaciones: "recomendaciones",
  personal: "personal", roles: "roles", vendedores: "vendedores", organizacion: "catalogo",
  "ofertas-laborales": "ofertas-laborales",
  integraciones: "integraciones",
  cartera: "cartera", finanzas: "finanzas", logistica: "logistica", metricas: "metricas",
};

const defaultSections: Record<BuiltInStaffRole, string[]> = {
  ADMIN: Object.keys(sectionFeature),
  SALES: ["", "consultas", "solicitudes", "clientes", "pedidos", "cartera"],
  CATALOG: ["", "catalogo", "marcas", "categorias", "promociones", "banners", "recomendaciones"],
  FINANCE: ["", "clientes", "pedidos", "finanzas", "metricas"],
};

export const isStaff = (user: User | null | undefined) =>
  !!user && user.active !== false && [...staffRoles, "CUSTOM"].includes(user.role);

export function canViewAdminFeature(user: User | null | undefined, feature: StaffFeature): boolean {
  if (!user || !isStaff(user)) return false;
  if (user.role === "ADMIN") return true;
  if (isSensitiveStaffFeature(feature)) return canEditAdminFeature(user, feature);
  if (user.role === "CUSTOM") return user.staffAccess?.[feature]?.canView ?? false;
  const fallback = feature === "ventas" || feature === "facturacion" || feature === "descuentos-clientes"
    ? ["SALES", "FINANCE"].includes(user.role)
    : defaultSections[user.role as BuiltInStaffRole].includes(feature === "resumen" ? "" : feature);
  return user.staffAccess?.[feature]?.canView ?? fallback;
}

export function canSeeAdminSection(user: User | null | undefined, section: string) {
  if (!user || !isStaff(user)) return false;
  const feature = sectionFeature[section];
  if (!feature) return false;
  return canViewAdminFeature(user, feature);
}

export function canAccessAdmin(user: User | null | undefined) {
  return Object.keys(sectionFeature).some((section) => canSeeAdminSection(user, section));
}

export function canEditAdminFeature(user: User | null | undefined, feature: StaffFeature): boolean {
  if (!user || !isStaff(user)) return false;
  if (["integraciones", "metricas", "cartera"].includes(feature)) return false;
  if (user.role === "ADMIN") return true;
  if (isSensitiveStaffFeature(feature)) {
    const parent = sensitiveStaffFeatures[feature];
    if (!canViewAdminFeature(user, parent)) return false;
    const access = user.staffAccess?.[feature];
    return access ? access.canView && access.canEdit : canEditAdminFeature(user, parent);
  }
  if (user.role === "CUSTOM") return user.staffAccess?.[feature]?.canEdit ?? false;
  return user.staffAccess?.[feature]?.canEdit ?? (
    (user.role === "SALES" && ["consultas", "pedidos", "descuentos-clientes"].includes(feature)) ||
    (user.role === "CATALOG" && ["catalogo", "marcas", "categorias", "promociones", "banners", "recomendaciones"].includes(feature)) ||
    (user.role === "FINANCE" && ["facturacion", "finanzas"].includes(feature))
  );
}

export const canManageAdminProduct = (user: User | null | undefined) =>
  canEditAdminFeature(user, "catalogo") || canEditAdminFeature(user, "stock") || canEditAdminFeature(user, "precios");
