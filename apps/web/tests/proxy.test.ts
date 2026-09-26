import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../src/app/api/backend/[...path]/route";
import { allowedPath, sanitize } from "../src/lib/proxy-policy";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
const params = (path: string) => ({
  params: Promise.resolve({ path: path.split("/") }),
});
describe("Frontera entre frontend y API", () => {
  it("limita rutas y elimina secretos recursivamente", () => {
    expect(allowedPath("../auth/login", "POST")).toBe(false);
    expect(allowedPath("https://elsewhere.test", "GET")).toBe(false);
    expect(allowedPath("products/id/variants", "POST")).toBe(true);
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
    const fetch = vi
      .fn()
      .mockResolvedValue(
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
