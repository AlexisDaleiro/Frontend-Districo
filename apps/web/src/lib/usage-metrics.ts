import { http } from "./http";
import { DEMO } from "./data-mode";
export type UsageKind =
  "SEARCH" | "NO_RESULTS" | "CHECKOUT_STARTED" | "CHECKOUT_COMPLETED";
export function metricConsent() {
  try {
    return localStorage.getItem("districo-usage-consent") === "true";
  } catch {
    return false;
  }
}
export function recordUsage(kind: UsageKind) {
  if (DEMO || !metricConsent()) return;
  try {
    const checkout = kind.startsWith("CHECKOUT_");
    const storageKey = checkout
      ? "districo-checkout-session"
      : "districo-usage-session";
    const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null") as {
      id: string;
      createdAt: number;
    } | null;
    const session =
      saved && saved.createdAt > Date.now() - (checkout ? 6 * 60 : 30) * 60000
        ? saved
        : { id: crypto.randomUUID(), createdAt: Date.now() };
    sessionStorage.setItem(storageKey, JSON.stringify(session));
    const key = `districo-usage-${session.id}-${kind}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "true");
    void http("usage-events", "POST", {
      sessionId: session.id,
      kind,
      consent: true,
    }).catch(() => {
      sessionStorage.removeItem(key);
    });
    if (kind === "CHECKOUT_COMPLETED") sessionStorage.removeItem(storageKey);
  } catch {
    /* Metrics are optional and must never block a purchase. */
  }
}
