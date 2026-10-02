import type { User } from "./types";

export type StaffRole = Exclude<User["role"], "CLIENT">;

export const staffRoles: StaffRole[] = ["ADMIN", "SALES", "CATALOG", "FINANCE"];

const sectionRoles: Record<string, StaffRole[]> = {
  "": staffRoles,
  consultas: ["ADMIN", "SALES"],
  solicitudes: ["ADMIN", "SALES"],
  clientes: ["ADMIN", "SALES", "FINANCE"],
  pedidos: ["ADMIN", "SALES", "FINANCE"],
  catalogo: ["ADMIN", "CATALOG"],
  organizacion: ["ADMIN", "CATALOG"],
  marcas: ["ADMIN", "CATALOG"],
  categorias: ["ADMIN", "CATALOG"],
  promociones: ["ADMIN", "CATALOG"],
  banners: ["ADMIN", "CATALOG"],
  recomendaciones: ["ADMIN", "CATALOG"],
  personal: ["ADMIN"],
};

export const isStaff = (user: User | null | undefined) => !!user && user.role !== "CLIENT";
export const canSeeAdminSection = (role: User["role"] | undefined, section: string) =>
  !!role && (sectionRoles[section]?.includes(role as StaffRole) ?? false);
