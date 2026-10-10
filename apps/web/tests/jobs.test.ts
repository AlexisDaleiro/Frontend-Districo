import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoRequest as api, resetDemo } from "../src/lib/demo";
import { demoJobOpenings, jobDraftSchema, type JobList, type JobOpening } from "../src/data/job-openings";
import { allowedPath } from "../src/lib/proxy-policy";
import { affectedAdminQueries } from "../src/lib/admin-query-invalidation";
import { canSeeAdminSection, canEditAdminFeature } from "../src/lib/staff-access";
import type { User } from "../src/lib/types";

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
  resetDemo();
});
const login = () => api("auth/login", "POST", { email: "admin@districo.com", password: "Demo1234!" });
const draft = () => jobDraftSchema.parse({ ...demoJobOpenings[0], title: "Venta de prueba", published: "2020-01-01", isExample: false });

describe("Ofertas laborales", () => {
  it("publica dos ejemplos claramente identificados sin requerir sesión", async () => {
    const jobs = await api<JobOpening[]>("jobs");
    expect(jobs).toHaveLength(2);
    expect(jobs.every((job) => job.isExample)).toBe(true);
    await expect(api("admin/jobs")).rejects.toMatchObject({ status: 401 });
  });
  it("crea, edita, desactiva, reactiva y elimina sin reponer ejemplos eliminados", async () => {
    await login();
    const job = await api<JobOpening>("admin/jobs", "POST", draft());
    expect((await api<JobOpening[]>("jobs")).some((item) => item.id === job.id)).toBe(true);
    const edited = await api<JobOpening>(`admin/jobs/${job.id}`, "PATCH", { ...draft(), title: "Título editado", active: false });
    expect(edited.title).toBe("Título editado");
    expect((await api<JobOpening[]>("jobs")).some((item) => item.id === job.id)).toBe(false);
    await api(`admin/jobs/${job.id}`, "PATCH", { ...draft(), active: true });
    expect((await api<JobOpening[]>("jobs")).some((item) => item.id === job.id)).toBe(true);
    await api(`admin/jobs/${job.id}`, "DELETE");
    await expect(api(`admin/jobs/${job.id}`, "PATCH", draft())).rejects.toMatchObject({ status: 404 });
    for (const example of demoJobOpenings) await api(`admin/jobs/${example.id}`, "DELETE");
    expect(await api("jobs")).toEqual([]);
  });
  it("oculta las programadas y filtra y pagina antes de devolver el listado", async () => {
    await login();
    const future = await api<JobOpening>("admin/jobs", "POST", { ...draft(), title: "Futura", published: "2099-01-01" });
    expect((await api<JobOpening[]>("jobs")).some((item) => item.id === future.id)).toBe(false);
    const inactive = await api<JobOpening>("admin/jobs", "POST", { ...draft(), active: false });
    const page = await api<JobList>("admin/jobs?status=inactive&search=venta&limit=1&page=1");
    expect(page.meta).toEqual({ total: 1, page: 1, limit: 1 });
    expect(page.items[0].id).toBe(inactive.id);
    expect((await api<JobList>("admin/jobs?limit=1&page=2")).items).toHaveLength(1);
    await expect(api("admin/jobs?limit=999")).rejects.toMatchObject({ status: 400 });
  });
  it("rechaza correos inseguros, fechas inválidas, listas vacías y campos incompletos", async () => {
    await login();
    for (const invalid of [{ contactEmail: "javascript:alert(1)" }, { published: "2026-02-30" }, { requirements: [] }, { active: "true" }, { description: "" }]) {
      await expect(api("admin/jobs", "POST", { ...draft(), ...invalid })).rejects.toMatchObject({ status: 400 });
    }
  });
  it("respeta ver/editar, incluyendo roles personalizados", async () => {
    await login();
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    state.users.push({ id: "jobs-reader", email: "reader@example.test", active: true, role: "CUSTOM", customRoleId: "reader-role", permissions: [] });
    state.customRoles = [{ id: "reader-role", name: "Lectura de empleos", access: { "ofertas-laborales": { canView: true, canEdit: false } } }];
    state.session = "jobs-reader";
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
    expect((await api<JobList>("admin/jobs")).meta.total).toBe(2);
    await expect(api("admin/jobs", "POST", draft())).rejects.toMatchObject({ status: 403 });
    await expect(api(`admin/jobs/${demoJobOpenings[0].id}`, "PATCH", draft())).rejects.toMatchObject({ status: 403 });
    await expect(api(`admin/jobs/${demoJobOpenings[0].id}`, "DELETE")).rejects.toMatchObject({ status: 403 });
    const user = { ...state.users.at(-1), staffAccess: state.customRoles[0].access } as User;
    expect(canSeeAdminSection(user, "ofertas-laborales")).toBe(true);
    expect(canEditAdminFeature(user, "ofertas-laborales")).toBe(false);
    expect(canSeeAdminSection({ ...user, staffAccess: {} }, "ofertas-laborales")).toBe(false);
  });
  it("sólo admite las rutas declaradas y actualiza la landing sin recargar todo", () => {
    for (const [path, method] of [["jobs", "GET"], ["admin/jobs", "GET"], ["admin/jobs", "POST"], ["admin/jobs/job-1", "PATCH"], ["admin/jobs/job-1", "DELETE"]]) expect(allowedPath(path, method)).toBe(true);
    expect(allowedPath("jobs", "POST")).toBe(false);
    expect(allowedPath("admin/jobs/../staff", "PATCH")).toBe(false);
    expect(affectedAdminQueries("admin/jobs/one", "jobs")).toBe(true);
    expect(affectedAdminQueries("admin/jobs", "admin/jobs?status=active")).toBe(true);
    expect(affectedAdminQueries("admin/jobs", "products")).toBe(false);
  });
});
