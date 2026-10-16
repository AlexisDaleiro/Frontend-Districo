import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST, maxDuration } from "../src/app/api/internal/notifications/dispatch/route";
import { allowedPath } from "../src/lib/proxy-policy";

const cronSecret = "scheduler-test-secret-32-characters-long";
const dispatchSecret = "backend-test-secret-32-characters-long";
const fetchMock = vi.fn();
const request = (authorization = `Bearer ${cronSecret}`) => new Request("https://districo.example/api/internal/notifications/dispatch", {
  method: "POST", headers: { Authorization: authorization },
});

describe("scheduler notification dispatch", () => {
  beforeEach(() => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("CRON_SECRET", cronSecret);
    vi.stubEnv("EMAIL_DISPATCH_SECRET", dispatchSecret);
    vi.stubEnv("API_SERVICE_URL", "https://private-api.example/service/api");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it.each(["", "Bearer incorrect", cronSecret])("rejects invalid authorization without contacting the backend (%s)", async (authorization) => {
    expect((await POST(request(authorization))).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(["CRON_SECRET", "EMAIL_DISPATCH_SECRET", "API_SERVICE_URL"])("fails closed when %s is missing", async (key) => {
    vi.stubEnv(key, "");
    expect((await POST(request())).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("forwards only the fixed operation using the separate backend secret", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    fetchMock.mockResolvedValue(Response.json({ processed: 3, privateDetails: "must not be relayed" }));
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, private");
    expect(await response.json()).toEqual({ processed: 3 });
    expect(fetchMock).toHaveBeenCalledWith(new URL("https://private-api.example/service/api/internal/notifications/dispatch"), expect.objectContaining({
      method: "POST", redirect: "error", cache: "no-store",
      headers: { Authorization: `Bearer ${dispatchSecret}`, Accept: "application/json" },
    }));
    expect(allowedPath("internal/notifications/dispatch", "POST")).toBe(false);
    expect(timeout).toHaveBeenCalledWith(50_000);
    expect(maxDuration).toBe(60);
    timeout.mockRestore();
  });
  it("does not disclose backend errors or treat them as successful dispatches", async () => {
    fetchMock.mockResolvedValue(new Response("private provider error", { status: 500 }));
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("private provider error");
  });
  it("rejects redirects, network failures and malformed dispatch responses", async () => {
    fetchMock.mockRejectedValueOnce(new Error("private network detail"));
    expect((await POST(request())).status).toBe(502);
    fetchMock.mockResolvedValueOnce(Response.json({ processed: "3" }));
    expect((await POST(request())).status).toBe(502);
  });
  it("never sends mail in demo mode", async () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_DATA_MODE", "demo");
    expect((await POST(request())).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
