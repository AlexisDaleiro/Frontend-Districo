import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoRequest as api, resetDemo } from "../src/lib/demo";
import { inactiveIntegrations } from "../src/lib/integrations";
import { allowedPath } from "../src/lib/proxy-policy";
import { canEditAdminFeature, canSeeAdminSection, staffFeatures } from "../src/lib/staff-access";
import type { User } from "../src/lib/types";

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
  resetDemo();
});
const login = () => api("auth/login", "POST", { email: "admin@districo.com", password: "Demo1234!" });

describe("Integraciones", () => {
  it("muestra los tres proveedores inactivos sin credenciales ni conexiones ficticias", async () => {
    await login();
    expect(await api("admin/integrations")).toEqual(inactiveIntegrations);
    expect(inactiveIntegrations.map((item) => item.name)).toEqual(["WhatsApp", "Mailing", "Mercarea"]);
    expect(inactiveIntegrations.every((item) => item.status === "INACTIVE")).toBe(true);
    expect(inactiveIntegrations.every((item) => Object.keys(item).sort().join() === "id,name,status")).toBe(true);
  });
  it("deniega visitantes y clientes aunque intenten abrir el endpoint directamente", async () => {
    await expect(api("admin/integrations")).rejects.toMatchObject({ status: 401 });
    await login();
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    const member = state.users.find((user: User) => user.id === state.session);
    member.role = "CLIENT";
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
    await expect(api("admin/integrations")).rejects.toMatchObject({ status: 403 });
    expect(canSeeAdminSection(member, "integraciones")).toBe(false);
  });
  it("permite delegar la consulta a un rol personalizado, nunca editar", async () => {
    await login();
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    state.users.push({ id: "integration-reader", email: "reader@example.test", active: true, role: "CUSTOM", customRoleId: "reader-role", permissions: [] });
    state.customRoles = [{ id: "reader-role", name: "Lectura de integraciones", access: { integraciones: { canView: true, canEdit: false } } }];
    state.session = "integration-reader";
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
    expect(await api("admin/integrations")).toEqual(inactiveIntegrations);
    const reader = { ...state.users.at(-1), staffAccess: state.customRoles[0].access } as User;
    expect(canSeeAdminSection(reader, "integraciones")).toBe(true);
    expect(canEditAdminFeature(reader, "integraciones")).toBe(false);
    state.customRoles[0].access.integraciones.canView = false;
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
    await expect(api("admin/integrations")).rejects.toMatchObject({ status: 403 });
  });
  it("no concede acceso por defecto a otros roles y rechaza permisos de escritura", async () => {
    const user = { id: "test", email: "staff@example.test", active: true, permissions: [] };
    for (const role of ["SALES", "CATALOG", "FINANCE"] as const) expect(canSeeAdminSection({ ...user, role }, "integraciones")).toBe(false);
    expect(canSeeAdminSection({ ...user, role: "ADMIN" }, "integraciones")).toBe(true);
    expect(canEditAdminFeature({ ...user, role: "ADMIN" }, "integraciones")).toBe(false);
    await login();
    const entries = staffFeatures.map(([feature]) => ({ feature, canView: feature === "integraciones", canEdit: feature === "integraciones" }));
    await expect(api("admin/staff/access/SALES", "PATCH", { entries })).rejects.toMatchObject({ status: 400 });
    const custom = await api<{ id: string }>("admin/staff/roles", "POST", { name: "Lectura externa" });
    await expect(api(`admin/staff/roles/${custom.id}/access`, "PATCH", { entries })).rejects.toMatchObject({ status: 400 });
  });
  it("el proxy admite exclusivamente la consulta administrativa", () => {
    expect(allowedPath("admin/integrations", "GET")).toBe(true);
    expect(allowedPath("integrations", "GET")).toBe(false);
    for (const method of ["POST", "PATCH", "DELETE"]) expect(allowedPath("admin/integrations", method)).toBe(false);
  });
});
