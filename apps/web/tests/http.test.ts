import { afterEach, describe, expect, it, vi } from "vitest";
import { http } from "../src/lib/http";
afterEach(() => vi.unstubAllGlobals());
describe("Renovación de sesión en el navegador", () => {
  it("agrupa los 401 simultáneos en una sola renovación y reintenta", async () => {
    let refreshed = false;
    const fetch = vi.fn(async (url: string) => {
      if (url.endsWith("auth/refresh")) {
        await new Promise((r) => setTimeout(r, 10));
        refreshed = true;
        return Response.json({});
      }
      return refreshed
        ? Response.json({ ok: url })
        : Response.json({ message: "x" }, { status: 401 });
    });
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("window", { dispatchEvent: vi.fn() });
    const results = await Promise.all([http("cart"), http("orders/me")]);
    expect(results).toHaveLength(2);
    expect(
      fetch.mock.calls.filter(([url]) => url.endsWith("auth/refresh")),
    ).toHaveLength(1);
  });
  it("si la renovación falla, avisa que la sesión expiró", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ message: "x" }, { status: 401 })),
    );
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", { dispatchEvent });
    await expect(http("cart")).rejects.toMatchObject({ status: 401 });
    expect(dispatchEvent.mock.calls[0][0].type).toBe("session-expired");
  });
  it("un visitante sin sesión no borra las consultas públicas", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ message: "x" }, { status: 401 })),
    );
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", { dispatchEvent });
    await expect(http("auth/me")).rejects.toMatchObject({ status: 401 });
    expect(dispatchEvent).not.toHaveBeenCalled();
  });
});
