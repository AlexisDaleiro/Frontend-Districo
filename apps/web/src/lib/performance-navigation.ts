type Start = { key: string; at: number };
const listeners = new Set<(start: Start) => void>();
export function beginPerformanceNavigation(href: string) {
  try {
    const url = new URL(href, location.href);
    if (
      url.origin !== location.origin ||
      url.pathname + url.search === location.pathname + location.search
    )
      return;
    const start = { key: url.pathname + url.search, at: performance.now() };
    for (const listener of listeners) listener(start);
  } catch {
    /* Instrumentation cannot interfere with navigation. */
  }
}
export function subscribePerformanceNavigation(
  listener: (start: Start) => void,
) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
