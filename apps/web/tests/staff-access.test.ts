import { describe, expect, it } from "vitest";
import { canEditAdminFeature, canSeeAdminSection, staffFeatures } from "../src/lib/staff-access";
import type { User } from "../src/lib/types";

const sales: User = { id: "sales", email: "sales@example.test", role: "SALES", permissions: [] };

describe("configurable staff access", () => {
  it("keeps existing role visibility until configured", () => {
    expect(canSeeAdminSection(sales, "pedidos")).toBe(true);
    expect(canSeeAdminSection(sales, "catalogo")).toBe(false);
    expect(canEditAdminFeature(sales, "pedidos")).toBe(true);
    expect(staffFeatures.map(([feature]) => feature)).toContain("facturacion");
    expect(staffFeatures.map(([feature]) => feature)).toEqual(expect.arrayContaining(["personal", "roles", "vendedores"]));
  });

  it("uses the saved view and edit rights", () => {
    const custom: User = { ...sales, staffAccess: {
      pedidos: { canView: true, canEdit: false },
      catalogo: { canView: true, canEdit: true },
    } };
    expect(canSeeAdminSection(custom, "pedidos")).toBe(true);
    expect(canEditAdminFeature(custom, "pedidos")).toBe(false);
    expect(canSeeAdminSection(custom, "catalogo")).toBe(true);
    expect(canEditAdminFeature(custom, "catalogo")).toBe(true);
    expect(canSeeAdminSection(custom, "personal")).toBe(false);
    expect(canSeeAdminSection(custom, "roles")).toBe(false);
    expect(canSeeAdminSection(custom, "vendedores")).toBe(false);
    expect(canSeeAdminSection({ ...custom, role: "ADMIN" }, "roles")).toBe(true);
  });

  it("separates read and edit access for people, roles and salespeople", () => {
    const delegated: User = { ...sales, staffAccess: {
      personal: { canView: true, canEdit: false },
      roles: { canView: false, canEdit: false },
      vendedores: { canView: true, canEdit: true },
    } };
    expect(canSeeAdminSection(delegated, "personal")).toBe(true);
    expect(canEditAdminFeature(delegated, "personal")).toBe(false);
    expect(canSeeAdminSection(delegated, "roles")).toBe(false);
    expect(canSeeAdminSection(delegated, "vendedores")).toBe(true);
    expect(canEditAdminFeature(delegated, "vendedores")).toBe(true);
    expect(canSeeAdminSection({ ...delegated, staffAccess: { ...delegated.staffAccess, vendedores: { canView: false, canEdit: false } } }, "vendedores")).toBe(false);
  });

  it("custom roles have no fallback permissions", () => {
    const custom: User = { ...sales, role: "CUSTOM", customRoleId: "custom-1", staffAccess: {
      catalogo: { canView: true, canEdit: false },
    } };
    expect(canSeeAdminSection(custom, "catalogo")).toBe(true);
    expect(canEditAdminFeature(custom, "catalogo")).toBe(false);
    expect(canSeeAdminSection(custom, "pedidos")).toBe(false);
    expect(canSeeAdminSection(custom, "personal")).toBe(false);
    expect(canSeeAdminSection(custom, "roles")).toBe(false);
  });
});
