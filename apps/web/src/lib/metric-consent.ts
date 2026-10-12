export function metricConsent() {
  try {
    return localStorage.getItem("districo-usage-consent") === "true";
  } catch {
    return false;
  }
}
