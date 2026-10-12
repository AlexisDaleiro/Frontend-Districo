import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  performanceApiTarget,
  performancePage,
  performanceThreshold,
} from "../src/lib/performance-contract";
import { beginPerformanceNavigation } from "../src/lib/performance-navigation";
import {
  commitPerformanceNavigation,
  flushPerformanceSamples,
  recordPerformanceApi,
  recordPerformanceSample,
  recordPerformanceVital,
  startPerformanceCapture,
} from "../src/lib/performance-recorder";

let stop: (() => void) | undefined;
let data: Map<string, string>;
let target: EventTarget;
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.useFakeTimers();
  data = new Map();
  target = new EventTarget();
  Object.assign(target, { setInterval, clearInterval });
  vi.stubGlobal("window", target);
  vi.stubGlobal(
    "document",
    Object.assign(new EventTarget(), { visibilityState: "visible" }),
  );
  vi.stubGlobal(
    "location",
    new URL(
      "https://example.test/tienda/producto/private-id?email=private@example.test",
    ),
  );
  vi.stubGlobal("navigator", { userAgent: "Mobile" });
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  });
  vi.stubGlobal(
    "PerformanceObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("StorageEvent", class extends Event {});
  vi.stubGlobal("requestAnimationFrame", (callback: (time: number) => void) =>
    setTimeout(() => callback(performance.now()), 16),
  );
  fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ accepted: true }),
  }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  stop?.();
  stop = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const start = (busy = () => false) => {
  stop = startPerformanceCapture("a3e3cdf", () => ({
    busy: busy(),
    error: false,
  }));
};
it("classifies paths without persisting IDs, search terms, invoices, or authentication endpoints", () => {
  expect(performancePage("/tienda/producto/secret?customer=private")).toBe(
    "PRODUCT",
  );
  expect(performancePage("/tienda/admin/clientes/customer-id")).toBe("ADMIN");
  expect(performanceApiTarget("auth/me")).toBeNull();
  expect(performanceApiTarget("performance-samples")).toBeNull();
  expect(
    performanceApiTarget("admin/operations/performance?dateFrom=2026-10-01"),
  ).toBeNull();
  expect(performanceThreshold("LCP")).toBe(2500);
  expect(performanceThreshold("INP")).toBe(200);
});
it("does not send without consent or write the prior-visit flag", async () => {
  start();
  recordPerformanceVital({ id: "vital", name: "LCP", value: 900 });
  await flushPerformanceSamples();
  expect(fetchMock).not.toHaveBeenCalled();
  expect(data.has("districo-performance-visited")).toBe(false);
});
it("upserts the final vital value and transmits only coarse numeric metrics without cookies or referrer", async () => {
  data.set("districo-usage-consent", "true");
  start();
  recordPerformanceVital({ id: "same", name: "LCP", value: 1000 });
  recordPerformanceVital({ id: "same", name: "LCP", value: 1400 });
  recordPerformanceApi("products/secret?email=private@example.test", 120, true);
  recordPerformanceApi("auth/me", 10, true);
  await flushPerformanceSamples();
  const options = fetchMock.mock.calls[0][1] as RequestInit;
  const batch = JSON.parse(options.body as string);
  expect(options.credentials).toBe("omit");
  expect(options.referrerPolicy).toBe("no-referrer");
  expect(options.keepalive).toBe(true);
  expect(batch.visit).toBe("FIRST");
  expect(batch.samples).toHaveLength(2);
  expect(batch.samples[0]).toMatchObject({
    name: "LCP",
    value: 1400,
    sequence: 2,
    page: "PRODUCT",
    phase: "DOCUMENT",
  });
  expect(options.body).not.toMatch(/private|secret|email|https|userAgent/);
});
it("caps samples but prioritizes Core Web Vitals at page close, and stops on unavailable storage", async () => {
  data.set("districo-usage-consent", "true");
  start();
  recordPerformanceVital({ id: "inp", name: "INP", value: 150 });
  for (let index = 0; index < 220; index++)
    recordPerformanceSample({
      name: "IMAGE",
      target: "EXTERNAL_IMAGE",
      value: index,
    });
  await flushPerformanceSamples();
  const batch = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(batch.samples).toHaveLength(20);
  expect(batch.samples[0].name).toBe("INP");
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ accepted: false }),
  });
  await flushPerformanceSamples();
  await flushPerformanceSamples();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
it("revoking consent discards queued samples and storage exceptions do not escape", async () => {
  data.set("districo-usage-consent", "true");
  start();
  recordPerformanceVital({ id: "lcp", name: "LCP", value: 100 });
  data.set("districo-usage-consent", "false");
  target.dispatchEvent(new Event("usage-consent-changed"));
  await flushPerformanceSamples();
  expect(fetchMock).not.toHaveBeenCalled();
  vi.stubGlobal("localStorage", {
    getItem() {
      throw new Error("blocked");
    },
  });
  expect(() => recordPerformanceApi("products", 80, true)).not.toThrow();
});
it("measures route render separately from observed query readiness, without labelling it LCP", async () => {
  data.set("districo-usage-consent", "true");
  let busy = true;
  start(() => busy);
  beginPerformanceNavigation("/tienda/productos?search=private");
  location.href = "https://example.test/tienda/productos?search=private";
  commitPerformanceNavigation(location.pathname + location.search);
  await vi.advanceTimersByTimeAsync(500);
  busy = false;
  await vi.advanceTimersByTimeAsync(200);
  await flushPerformanceSamples();
  const samples = JSON.parse(fetchMock.mock.calls[0][1].body).samples as {
    name: string;
    value: number;
    phase: string;
  }[];
  expect(samples.find((sample) => sample.name === "NAVIGATION")?.phase).toBe(
    "SOFT",
  );
  expect(
    samples.find((sample) => sample.name === "DATA_READY")?.value,
  ).toBeGreaterThanOrEqual(600);
  expect(samples.some((sample) => sample.name === "LCP")).toBe(false);
});
