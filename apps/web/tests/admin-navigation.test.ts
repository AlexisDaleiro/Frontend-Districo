import { describe, expect, it } from "vitest";
import { adminNavigationTarget, adminSectionFromPath } from "../src/lib/admin-navigation";
import type { User } from "../src/lib/types";

const admin = { id: "qa-admin", role: "ADMIN", active: true, permissions: [] } as unknown as User;
const seller = { ...admin, id: "qa-seller", role: "SALES" } as User;

describe("preparación de navegación administrativa", () => {
  it("identifica secciones de fichas y vista previa sin cambiar sus rutas", () => {
    expect(adminSectionFromPath("/tienda/admin")).toBe("");
    expect(adminSectionFromPath("/tienda/admin/productos/alimento/vista-previa")).toBe("catalogo");
    expect(adminSectionFromPath("/tienda/admin/clientes/c1")).toBe("clientes");
  });
  it("anticipa sólo lecturas conocidas con permisos vigentes", () => {
    expect(adminNavigationTarget("/tienda/admin/clientes/c1?back=%2Ftienda%2Fadmin%2Fclientes", seller)?.queries).toEqual(["admin/customers/c1"]);
    expect(adminNavigationTarget("/tienda/admin/productos/alimento/vista-previa", admin)?.queries).toEqual(["products/admin/alimento"]);
    expect(adminNavigationTarget("/tienda/admin/marcas", admin)?.queries).toEqual(["brands/admin", "laboratories/admin"]);
    expect(adminNavigationTarget("/tienda/admin/clientes", seller)?.queries).toEqual(["admin/customers/page?page=1&limit=20"]);
    expect(adminNavigationTarget("/tienda/admin/roles", seller)).toBeNull();
    expect(adminNavigationTarget("/tienda/admin/clientes", { ...seller, staffAccess: { clientes: { canView: false, canEdit: false } } })).toBeNull();
  });
  it("no amplía filtros ni descarga documentos o ejecuta acciones", () => {
    const filtered = "/tienda/admin/clientes?search=pet&page=2&debt=WITH_DEBT";
    expect(adminNavigationTarget(filtered, admin)).toEqual({ href: filtered, queries: [] });
    for (const path of ["/tienda/admin/clientes/c1/documents/file", "/tienda/admin/roles/retirar", "/tienda/admin/pedidos/o1/refunds", "/api/backend/admin/customers/c1"]) {
      expect(adminNavigationTarget(path, admin)).toBeNull();
    }
  });
  it("rechaza visitantes, clientes, cuentas inactivas, rutas ajenas y enlaces externos", () => {
    for (const user of [null, { ...admin, role: "CLIENT" } as User, { ...admin, active: false }]) expect(adminNavigationTarget("/tienda/admin", user)).toBeNull();
    for (const path of ["/tienda/administrativo", "/tienda/productos", "https://other.invalid/tienda/admin", "//other.invalid/tienda/admin", "/tienda/admin\\clientes", "/tienda/admin/desconocida"]) {
      expect(adminNavigationTarget(path, admin)).toBeNull();
    }
  });
});
