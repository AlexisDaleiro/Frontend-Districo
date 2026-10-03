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
    expect(canSeeAdminSection({ ...custom, role: "ADMIN" }, "roles")).toBe(true);
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
