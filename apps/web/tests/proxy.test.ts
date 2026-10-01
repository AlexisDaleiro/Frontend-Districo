import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../src/app/api/backend/[...path]/route";
import { allowedPath, sanitize } from "../src/lib/proxy-policy";
import { backendApiUrl } from "../src/lib/backend-url";
import { isDemoMode } from "../src/lib/data-mode";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
const params = (path: string) => ({
  params: Promise.resolve({ path: path.split("/") }),
});
describe("Frontera entre frontend y API", () => {
  it("usa datos reales por defecto y reserva demo al desarrollo explícito", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_MODE", "");
    vi.stubEnv("BACKEND_API_URL", "http://backend.test/api");
    const upstream = vi.fn().mockResolvedValue(Response.json({ items: [], meta: {} }));
    vi.stubGlobal("fetch", upstream);
    expect(isDemoMode()).toBe(false);
    const result = await GET(
      new NextRequest("http://localhost/api/backend/products"),
      params("products"),
    );
    expect(result.status).toBe(200);
    expect(upstream).toHaveBeenCalledOnce();
    vi.stubEnv("NEXT_PUBLIC_DATA_MODE", "demo");
    vi.stubEnv("NODE_ENV", "production");
    expect(isDemoMode()).toBe(false);
  });
  it("usa el binding en Vercel y exige que exista allí", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("BACKEND_API_URL", "http://127.0.0.1:3001/api");
    vi.stubEnv("API_SERVICE_URL", "https://api.internal/");
    expect(backendApiUrl("products")?.toString()).toBe("https://api.internal/api/products");
    vi.stubEnv("API_SERVICE_URL", "");
    expect(backendApiUrl("products")).toBeUndefined();
  });
  it("limita rutas y elimina secretos recursivamente", () => {
    expect(allowedPath("../auth/login", "POST")).toBe(false);
    expect(allowedPath("https://elsewhere.test", "GET")).toBe(false);
    expect(allowedPath("products/id/variants", "POST")).toBe(true);
    expect(allowedPath("categories/catalog", "GET")).toBe(true);
    expect(allowedPath("admin/orders/order-1/payments", "POST")).toBe(true);
    expect(allowedPath("admin/orders/order-1/invoices", "POST")).toBe(true);
    expect(allowedPath("admin/orders/order-1/invoices/invoice-1", "GET")).toBe(true);
    expect(allowedPath("admin/orders/order-1/invoices/invoice-1", "POST")).toBe(false);
    expect(
      sanitize({
        passwordHash: "secret",
        user: { refreshTokens: ["x"], email: "a" },
        accessToken: "x",
        resetToken: "x",
      }),
    ).toEqual({ user: { email: "a" } });
  });
  it("no conecta al backend en demo", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_MODE", "demo");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const result = await GET(
      new NextRequest("http://localhost/api/backend/products"),
      params("products"),
    );
    expect(result.status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("acepta el host usado por el navegador aunque Next informe localhost", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_MODE", "real");
    vi.stubEnv("BACKEND_API_URL", "http://backend.test/api");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({})));
    const send = (origin: string) =>
      POST(
        new NextRequest("http://localhost:3000/api/backend/checkout", {
          method: "POST",
          headers: { host: "127.0.0.1:3000", origin },
          body: "{}",
        }),
        params("checkout"),
      );
    expect((await send("http://127.0.0.1:3000")).status).toBe(200);
    expect((await send("https://evil.test")).status).toBe(403);
    expect((await send("null")).status).toBe(403);
  });
  it("rechaza escrituras desde otro origen", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_MODE", "real");
    const result = await POST(
      new NextRequest("http://localhost/api/backend/checkout", {
        method: "POST",
        headers: { origin: "https://other.test" },
        body: "{}",
      }),
      params("checkout"),
    );
    expect(result.status).toBe(403);
  });
  it("envía el multipart de facturas sin convertirlo a JSON", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_MODE", "real");
    vi.stubEnv("BACKEND_API_URL", "http://backend.test/api");
    const upstream = vi.fn().mockResolvedValue(Response.json({ id: "invoice-1" }));
    vi.stubGlobal("fetch", upstream);
    const form = new FormData();
    form.set("requestId", "00000000-0000-4000-8000-000000000001");
    form.set("file", new Blob(["%PDF-1.7"], { type: "application/pdf" }), "factura.pdf");
    const result = await POST(new NextRequest("http://localhost:3000/api/backend/admin/orders/order-1/invoices", {
      method: "POST", headers: { origin: "http://localhost:3000" }, body: form,
    }), params("admin/orders/order-1/invoices"));
    expect(result.status).toBe(200);
    expect(upstream.mock.calls[0][1].headers["Content-Type"]).toMatch(/^multipart\/form-data;/);
    expect(upstream.mock.calls[0][1].body).toBeInstanceOf(ArrayBuffer);
  });
  it("permite registrar solo el número de factura por multipart", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_MODE", "real");
    vi.stubEnv("BACKEND_API_URL", "http://backend.test/api");
    const upstream = vi.fn().mockResolvedValue(Response.json({ id: "invoice-number-1" }));
    vi.stubGlobal("fetch", upstream);
    const form = new FormData();
    form.set("requestId", "00000000-0000-4000-8000-000000000007");
    form.set("invoiceNumber", "A-123");
    const result = await POST(new NextRequest("http://localhost:3000/api/backend/admin/orders/order-1/invoices", {
      method: "POST", headers: { origin: "http://localhost:3000" }, body: form,
    }), params("admin/orders/order-1/invoices"));
    expect(result.status).toBe(200);
    expect(upstream.mock.calls[0][1].headers["Content-Type"]).toMatch(/^multipart\/form-data;/);
    expect(upstream.mock.calls[0][1].body).toBeInstanceOf(ArrayBuffer);
  });
  it("convierte los tokens en cookies HttpOnly y no los devuelve al navegador", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_MODE", "real");
    vi.stubEnv("BACKEND_API_URL", "http://backend.test/api");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          accessToken: "access-secret",
          refreshToken: "refresh-secret",
          user: { sub: "client" },
        }),
      ),
    );
    const result = await POST(
      new NextRequest("http://localhost/api/backend/auth/login", {
        method: "POST",
        headers: {
          origin: "http://localhost",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: "a@test.test", password: "password" }),
      }),
      params("auth/login"),
    );
    expect(await result.json()).toEqual({ user: { sub: "client" } });
    const cookies = result.headers.get("set-cookie");
    expect(cookies).toContain("HttpOnly");
    expect(cookies).toContain("SameSite=lax");
    expect(result.headers.get("cache-control")).toContain("no-store");
  });
  it("no expone el token de recuperación inseguro del backend actual", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_MODE", "real");
    vi.stubEnv("BACKEND_API_URL", "http://backend.test/api");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const result = await POST(
      new NextRequest("http://localhost/api/backend/auth/forgot-password", {
        method: "POST",
        headers: { origin: "http://localhost" },
        body: "{}",
      }),
      params("auth/forgot-password"),
    );
    expect(result.status).toBe(501);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("transporta catálogo con autenticación sin caché y conserva errores", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_MODE", "real");
    vi.stubEnv("BACKEND_API_URL", "http://backend.test/api");
    const fetch = vi
      .fn()
      .mockResolvedValue(
        Response.json({ message: "Stock insuficiente" }, { status: 400 }),
      );
    vi.stubGlobal("fetch", fetch);
    const result = await GET(
      new NextRequest("http://localhost/api/backend/products?search=abc", {
        headers: { cookie: "districo-access=token" },
      }),
      params("products"),
    );
    expect(fetch).toHaveBeenCalledWith(
      "http://backend.test/api/products?search=abc",
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
      }),
    );
    expect(result.status).toBe(400);
    expect(await result.json()).toEqual({ message: "Stock insuficiente" });
  });
  it("renueva con la cookie, ignora el cuerpo del navegador y rota ambas cookies", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_MODE", "real");
    vi.stubEnv("BACKEND_API_URL", "http://backend.test/api");
    const fetch = vi.fn().mockResolvedValue(
      Response.json({
        accessToken: "new-access",
        refreshToken: "new-refresh",
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const result = await POST(
      new NextRequest("http://localhost/api/backend/auth/refresh", {
        method: "POST",
        headers: {
          origin: "http://localhost",
          cookie: "districo-refresh=old-refresh",
        },
        body: JSON.stringify({ refreshToken: "forged" }),
      }),
      params("auth/refresh"),
    );
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      refreshToken: "old-refresh",
    });
    expect(await result.json()).toEqual({});
    expect(result.cookies.get("districo-access")?.value).toBe("new-access");
    expect(result.cookies.get("districo-refresh")?.value).toBe("new-refresh");
  });
  it("borra las cookies si la renovación falla o al cerrar sesión, aunque la API no responda", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_MODE", "real");
    vi.stubEnv("BACKEND_API_URL", "http://backend.test/api");
    const request = (path: string) =>
      new NextRequest(`http://localhost/api/backend/${path}`, {
        method: "POST",
        headers: {
          origin: "http://localhost",
          cookie: "districo-access=a; districo-refresh=r",
        },
        body: "{}",
      });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(Response.json({ message: "x" }, { status: 401 })),
    );
    const refresh = await POST(request("auth/refresh"), params("auth/refresh"));
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const logout = await POST(request("auth/logout"), params("auth/logout"));
    for (const response of [refresh, logout])
      for (const name of ["districo-access", "districo-refresh"]) {
        expect(response.cookies.get(name)?.value).toBe("");
        expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
      }
  });
  it("no transporta el restablecimiento de contraseña del backend", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_MODE", "real");
    vi.stubEnv("BACKEND_API_URL", "http://backend.test/api");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const result = await POST(
      new NextRequest("http://localhost/api/backend/auth/reset-password", {
        method: "POST",
        headers: { origin: "http://localhost" },
        body: JSON.stringify({ resetToken: "x", password: "y" }),
      }),
      params("auth/reset-password"),
    );
    expect(result.status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });
});
