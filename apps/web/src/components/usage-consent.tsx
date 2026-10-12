"use client";
import { useSyncExternalStore } from "react";
import { metricConsent } from "@/lib/usage-metrics";
const subscribe = (callback: () => void) => {
  window.addEventListener("usage-consent-changed", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("usage-consent-changed", callback);
    window.removeEventListener("storage", callback);
  };
};
export function UsageConsent() {
  const consent = useSyncExternalStore(subscribe, metricConsent, () => false);
  return (
    <div className="container usage-consent">
      <label>
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => {
            try {
              localStorage.setItem(
                "districo-usage-consent",
                String(event.target.checked),
              );
              if (!event.target.checked) {
                sessionStorage.removeItem("districo-usage-session");
                sessionStorage.removeItem("districo-checkout-session");
              }
              window.dispatchEvent(new Event("usage-consent-changed"));
            } catch {
              /* Storage may be disabled. */
            }
          }}
        />{" "}
        Permitir métricas de uso sin datos de contacto
      </label>
    </div>
  );
}
