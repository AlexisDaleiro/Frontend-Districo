import { DEMO } from "./data-mode";
import { metricConsent } from "./metric-consent";
import {
  performanceApiTarget,
  performanceNames,
  performancePage,
  type PerformanceContext,
  type PerformanceSample,
} from "./performance-contract";
import { subscribePerformanceNavigation } from "./performance-navigation";

const MAX_SAMPLES = 180;
let capture:
  | {
      context: PerformanceContext;
      page: PerformanceSample["page"];
      phase: PerformanceSample["phase"];
      queue: Map<string, PerformanceSample>;
      ids: Map<string, string>;
      revisions: Map<string, number>;
      count: number;
      stopped: boolean;
      pending?: {
        key: string;
        at: number;
        committed: boolean;
        shell: boolean;
        quietAt?: number;
      };
    }
  | undefined;
let activeQueries: () => { busy: boolean; error: boolean } = () => ({
  busy: false,
  error: false,
});
export function recordPerformanceSample(
  sample: Omit<
    PerformanceSample,
    "id" | "sequence" | "page" | "phase" | "cache" | "outcome"
  > &
    Partial<Pick<PerformanceSample, "page" | "phase" | "cache" | "outcome">>,
  key?: string,
) {
  try {
    const state = capture;
    if (
      !state ||
      state.stopped ||
      DEMO ||
      !metricConsent() ||
      !Number.isFinite(sample.value) ||
      sample.value < 0 ||
      sample.value > 180000 ||
      (sample.name === "CLS" && sample.value > 10)
    )
      return;
    const known = key ? state.ids.get(key) : undefined;
    const core = ["LCP", "INP", "CLS", "FCP", "TTFB"].includes(sample.name);
    if (!known && state.count >= (core ? MAX_SAMPLES : MAX_SAMPLES - 5)) return;
    const id = known ?? crypto.randomUUID();
    if (!known) state.count++;
    if (key) state.ids.set(key, id);
    const sequence = (state.revisions.get(id) ?? 0) + 1;
    state.revisions.set(id, sequence);
    state.queue.set(id, {
      page: performancePage(location.pathname),
      phase: state.phase,
      cache: "UNKNOWN",
      outcome: "OK",
      ...sample,
      id,
      sequence,
    });
  } catch {
    /* Metrics must not affect shopping or account actions. */
  }
}
export function recordPerformanceVital(metric: {
  id: string;
  name: string;
  value: number;
  navigationType?: string;
}) {
  if (
    !capture ||
    !performanceNames.includes(metric.name as PerformanceSample["name"])
  )
    return;
  recordPerformanceSample(
    {
      name: metric.name as PerformanceSample["name"],
      value: metric.value,
      target: "PAGE",
      page: capture.page,
      phase:
        metric.navigationType === "back-forward-cache" ? "RESTORE" : "DOCUMENT",
    },
    `vital:${metric.id}`,
  );
}
export function recordPerformanceApi(
  path: string,
  duration: number,
  success: boolean,
) {
  const target = performanceApiTarget(path);
  if (target)
    recordPerformanceSample({
      name: "API",
      value: duration,
      target,
      outcome: success ? "OK" : "ERROR",
    });
}
export async function flushPerformanceSamples() {
  const state = capture;
  if (!state || state.stopped) return;
  if (!metricConsent()) {
    state.queue.clear();
    return;
  }
  const core = ["LCP", "INP", "CLS", "FCP", "TTFB"];
  const samples = [...state.queue.values()]
    .sort(
      (a, b) => Number(core.includes(b.name)) - Number(core.includes(a.name)),
    )
    .slice(0, 20);
  if (!samples.length) return;
  for (const sample of samples) state.queue.delete(sample.id);
  try {
    const response = await fetch("/api/backend/performance-samples", {
      method: "POST",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      keepalive: true,
      priority: "low",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consent: true, ...state.context, samples }),
      signal: AbortSignal.timeout(8000),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.accepted === false) {
      state.stopped = true;
      state.queue.clear();
    }
  } catch {
    state.stopped = true;
    state.queue.clear();
  }
}
export function commitPerformanceNavigation(key: string) {
  const pending = capture?.pending;
  if (pending?.key === key) pending.committed = true;
}
export function startPerformanceCapture(
  release: string,
  queries: typeof activeQueries,
  environment: PerformanceContext["environment"] = "LOCAL",
) {
  if (
    typeof window === "undefined" ||
    DEMO ||
    capture ||
    !globalThis.crypto?.randomUUID
  )
    return () => {};
  activeQueries = queries;
  function view(restored = false) {
    let visit: PerformanceContext["visit"] = "UNKNOWN";
    if (metricConsent()) {
      try {
        visit = localStorage.getItem("districo-performance-visited")
          ? "RETURNING"
          : "FIRST";
        localStorage.setItem("districo-performance-visited", "true");
      } catch {
        /* No persistent identifier is required. */
      }
    }
    capture = {
      context: {
        viewId: crypto.randomUUID(),
        device: /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)
          ? "MOBILE"
          : "DESKTOP",
        visit,
        environment:
          environment === "PRODUCTION" &&
          !["localhost", "127.0.0.1", "::1"].includes(location.hostname)
            ? "PRODUCTION"
            : "LOCAL",
        release: /^[a-f0-9]{7,40}$/i.test(release) ? release : "unknown",
      },
      page: performancePage(location.pathname),
      phase: restored ? "RESTORE" : "DOCUMENT",
      queue: new Map(),
      ids: new Map(),
      revisions: new Map(),
      count: 0,
      stopped: false,
      pending: {
        key: location.pathname + location.search,
        at: restored ? performance.now() : 0,
        committed: restored,
        shell: true,
      },
    };
  }
  view();
  const unsubscribe = subscribePerformanceNavigation((start) => {
    if (!capture || !metricConsent()) return;
    if (capture.pending?.key === start.key) return;
    capture.phase = "SOFT";
    capture.pending = { ...start, committed: false, shell: false };
  });
  const interval = window.setInterval(() => {
    const state = capture,
      pending = state?.pending;
    if (
      !state ||
      !pending ||
      !pending.committed ||
      document.visibilityState !== "visible"
    )
      return;
    const now = performance.now();
    if (now - pending.at > 180000) {
      state.pending = undefined;
      return;
    }
    if (!pending.shell) {
      pending.shell = true;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (capture === state && state.pending === pending)
            recordPerformanceSample({
              name: "NAVIGATION",
              target: "PAGE",
              value: performance.now() - pending.at,
            });
        }),
      );
    }
    const readiness = activeQueries();
    if (readiness.busy) {
      pending.quietAt = undefined;
      return;
    }
    pending.quietAt ??= now;
    if (now - pending.quietAt < 100) return;
    state.pending = undefined;
    recordPerformanceSample({
      name: "DATA_READY",
      target: "PAGE",
      value: now - pending.at,
      outcome: readiness.error ? "ERROR" : "OK",
    });
  }, 50);
  const flush = window.setInterval(() => {
    void flushPerformanceSamples();
  }, 10000);
  const hide = () => {
    void flushPerformanceSamples();
  };
  const hidden = () => {
    if (document.visibilityState === "hidden") hide();
  };
  const show = (event: PageTransitionEvent) => {
    if (event.persisted) view(true);
  };
  const pop = () => {
    if (capture && metricConsent()) {
      capture.phase = "SOFT";
      capture.pending = {
        key: location.pathname + location.search,
        at: performance.now(),
        committed: false,
        shell: false,
      };
    }
  };
  const consent = (event: Event) => {
    if (event instanceof StorageEvent && event.key !== "districo-usage-consent")
      return;
    if (!metricConsent()) {
      capture?.queue.clear();
      capture?.ids.clear();
      return;
    }
    if (capture?.context.visit === "UNKNOWN") {
      view();
      if (capture?.pending) capture.pending.committed = true;
    }
    if (capture) capture.stopped = false;
  };
  let resources: PerformanceObserver | undefined;
  try {
    resources = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
        if (entry.initiatorType !== "img" || !Number.isFinite(entry.duration))
          continue;
        let local = false;
        try {
          local = new URL(entry.name).origin === location.origin;
        } catch {
          continue;
        }
        recordPerformanceSample({
          name: "IMAGE",
          target: local ? "LOCAL_IMAGE" : "EXTERNAL_IMAGE",
          value: entry.duration,
          outcome: entry.responseStatus >= 400 ? "ERROR" : "OK",
          cache:
            entry.encodedBodySize > 0
              ? entry.transferSize > 0
                ? "NETWORK"
                : "CACHE"
              : "UNKNOWN",
        });
      }
    });
    resources.observe({ type: "resource", buffered: true });
  } catch {
    /* Unsupported resource timing is not a zero-valued measurement. */
  }
  document.addEventListener("visibilitychange", hidden);
  window.addEventListener("pagehide", hide);
  window.addEventListener("pageshow", show);
  window.addEventListener("popstate", pop);
  window.addEventListener("usage-consent-changed", consent);
  window.addEventListener("storage", consent);
  return () => {
    unsubscribe();
    resources?.disconnect();
    clearInterval(interval);
    clearInterval(flush);
    document.removeEventListener("visibilitychange", hidden);
    window.removeEventListener("pagehide", hide);
    window.removeEventListener("pageshow", show);
    window.removeEventListener("popstate", pop);
    window.removeEventListener("usage-consent-changed", consent);
    window.removeEventListener("storage", consent);
    capture = undefined;
  };
}
