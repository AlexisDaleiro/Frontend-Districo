import { storeRoutes, withSearch } from "./store-routes";

export function readAdminListValue<T extends string | number | boolean>(params: URLSearchParams, key: string, fallback: T, allowed?: readonly string[]): T {
  const value = params.get(key);
  if (value === null) return fallback;
  if (typeof fallback === "number") return (/^[1-9]\d{0,5}$/.test(value) ? Math.min(Number(value), 100000) : fallback) as T;
  if (typeof fallback === "boolean") return (value === "true" ? true : value === "false" ? false : fallback) as T;
  if (value.length > 120 || allowed && !allowed.includes(value)) return fallback;
  if (key === "role" && value && !["ADMIN", "SALES", "CATALOG", "FINANCE", "CUSTOM"].includes(value) && !/^custom:[a-zA-Z0-9_-]+$/.test(value)) return fallback;
  if ((key === "dateFrom" || key === "dateTo") && value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) return fallback;
  return value as T;
}

export function updateAdminListValue(params: URLSearchParams, key: string, value: string | number | boolean, fallback: string | number | boolean) {
  const next = new URLSearchParams(params);
  if (value === fallback) next.delete(key);
  else next.set(key, String(value));
  if (key !== "page") next.delete("page");
  return next;
}

export function safeAdminListReturn(value: string | null | undefined, section: string) {
  const fallback = storeRoutes.adminSection(section);
  if (!value || value.length > 4096 || /[\\\r\n]/.test(value)) return fallback;
  try {
    const url = new URL(value, "https://admin.invalid");
    return value.startsWith("/") && url.origin === "https://admin.invalid" && url.pathname === fallback && !url.hash ? withSearch(fallback, url.searchParams) : fallback;
  } catch { return fallback; }
}

export function adminRecordHref(path: string, list: string) {
  const url = new URL(path, "https://admin.invalid");
  url.searchParams.set("back", list);
  return `${withSearch(url.pathname, url.searchParams)}${url.hash}`;
}
