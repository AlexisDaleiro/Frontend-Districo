import type { User } from "./types";

export type StaffRole = Exclude<User["role"], "CLIENT">;
export type BuiltInStaffRole = Exclude<StaffRole, "CUSTOM">;

export const staffRoles: BuiltInStaffRole[] = ["ADMIN", "SALES", "CATALOG", "FINANCE"];

export const staffFeatures = [
  ["resumen", "Resumen"], ["ventas", "Ventas"], ["consultas", "Consultas"],
  ["solicitudes", "Solicitudes"], ["clientes", "Clientes"], ["pedidos", "Pedidos"],
  ["facturacion", "Pagos y facturas"], ["catalogo", "Catálogo"],
  ["marcas", "Marcas y laboratorios"], ["categorias", "Categorías"],
  ["promociones", "Promociones"], ["banners", "Banners"],
  ["recomendaciones", "Recomendaciones"],
] as const;
export type StaffFeature = typeof staffFeatures[number][0];

const sectionFeature: Record<string, StaffFeature | "personal"> = {
  "": "resumen", consultas: "consultas", solicitudes: "solicitudes", clientes: "clientes",
  pedidos: "pedidos", catalogo: "catalogo", marcas: "marcas", categorias: "categorias",
  promociones: "promociones", banners: "banners", recomendaciones: "recomendaciones",
  personal: "personal", roles: "personal", organizacion: "catalogo",
};

const defaultSections: Record<BuiltInStaffRole, string[]> = {
  ADMIN: Object.keys(sectionFeature),
  SALES: ["", "consultas", "solicitudes", "clientes", "pedidos"],
  CATALOG: ["", "catalogo", "marcas", "categorias", "promociones", "banners", "recomendaciones"],
  FINANCE: ["", "clientes", "pedidos"],
};

export const isStaff = (user: User | null | undefined) => !!user && user.role !== "CLIENT";

export function canViewAdminFeature(user: User | null | undefined, feature: StaffFeature) {
  if (!user || !isStaff(user)) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "CUSTOM") return user.staffAccess?.[feature]?.canView ?? false;
  const fallback = feature === "ventas" || feature === "facturacion"
    ? ["SALES", "FINANCE"].includes(user.role)
    : defaultSections[user.role as BuiltInStaffRole].includes(feature === "resumen" ? "" : feature);
  return user.staffAccess?.[feature]?.canView ?? fallback;
}

export function canSeeAdminSection(user: User | null | undefined, section: string) {
  if (!user || !isStaff(user)) return false;
  const feature = sectionFeature[section];
  if (!feature) return false;
  if (feature === "personal") return user.role === "ADMIN";
  return canViewAdminFeature(user, feature);
}

export function canEditAdminFeature(user: User | null | undefined, feature: StaffFeature) {
  if (!user || !isStaff(user)) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "CUSTOM") return user.staffAccess?.[feature]?.canEdit ?? false;
  return user.staffAccess?.[feature]?.canEdit ?? (
    (user.role === "SALES" && ["consultas", "pedidos"].includes(feature)) ||
    (user.role === "CATALOG" && ["catalogo", "marcas", "categorias", "promociones", "banners", "recomendaciones"].includes(feature)) ||
    (user.role === "FINANCE" && feature === "facturacion")
  );
}
