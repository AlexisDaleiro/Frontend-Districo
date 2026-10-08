"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, type ComponentProps, type Dispatch, type SetStateAction } from "react";
import { Copy } from "lucide-react";
import { useSession } from "./providers";
import { adminRecordHref, readAdminListValue, safeAdminListReturn, updateAdminListValue } from "@/lib/admin-list-navigation";
import { withSearch } from "@/lib/store-routes";

export function useAdminListField(key: string, fallback: string, allowed?: readonly string[]): [string, Dispatch<SetStateAction<string>>];
export function useAdminListField(key: string, fallback: number): [number, Dispatch<SetStateAction<number>>];
export function useAdminListField(key: string, fallback: boolean): [boolean, Dispatch<SetStateAction<boolean>>];
export function useAdminListField<T extends string | number | boolean>(key: string, fallback: T, allowed?: readonly string[]): [T, Dispatch<SetStateAction<T>>] {
  const params = useSearchParams();
  const value = readAdminListValue(new URLSearchParams(params.toString()), key, fallback, allowed);
  return [value, (action) => {
    const current = new URLSearchParams(window.location.search);
    const previous = readAdminListValue(current, key, fallback, allowed);
    const next = updateAdminListValue(current, key, typeof action === "function" ? action(previous) : action, fallback);
    const href = `${withSearch(window.location.pathname, next)}${window.location.hash}`;
    if (href !== `${window.location.pathname}${window.location.search}${window.location.hash}`) window.history.replaceState(null, "", href);
  }];
}

type Position = { y: number; x: number; tables: number[] };
function positionKey(userId: string, href: string) { return `districo-admin-scroll:${userId}:${href}`; }
function savePosition(userId: string, href: string) {
  const position: Position = { y: window.scrollY, x: window.scrollX, tables: Array.from(document.querySelectorAll<HTMLElement>(".admin-main .table-wrap"), (table) => table.scrollLeft) };
  try { sessionStorage.setItem(positionKey(userId, href), JSON.stringify(position)); } catch { /* Storage may be disabled by the browser. */ }
}

export function useAdminListScroll(ready: boolean) {
  const pathname = usePathname(), params = useSearchParams();
  const { user } = useSession();
  const href = withSearch(pathname, new URLSearchParams(params.toString()));
  const restored = useRef("");
  useLayoutEffect(() => {
    if (!ready || !user || restored.current === href) return;
    restored.current = href;
    let position: Position | undefined;
    try { position = JSON.parse(sessionStorage.getItem(positionKey(user.id, href)) ?? "null") ?? undefined; } catch { return; }
    if (!position || !Number.isFinite(position.y) || !Number.isFinite(position.x) || !Array.isArray(position.tables)) return;
    let frame = 0, attempts = 0, cancelled = false;
    const stop = () => { cancelled = true; cancelAnimationFrame(frame); };
    const restore = () => {
      if (cancelled) return;
      window.scrollTo({ left: position!.x, top: position!.y, behavior: "instant" });
      document.querySelectorAll<HTMLElement>(".admin-main .table-wrap").forEach((table, index) => { table.scrollLeft = position!.tables[index] ?? 0; });
      // Wait for the returned rows and Next's navigation scroll to settle.
      if (++attempts < 8 || document.documentElement.scrollHeight - window.innerHeight < position!.y && attempts < 120) frame = requestAnimationFrame(restore);
    };
    frame = requestAnimationFrame(restore);
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("pointerdown", stop);
    window.addEventListener("keydown", stop);
    return () => { stop(); window.removeEventListener("wheel", stop); window.removeEventListener("pointerdown", stop); window.removeEventListener("keydown", stop); };
  }, [ready, href, user]);
  useEffect(() => {
    if (!user || !ready) return;
    const save = () => savePosition(user.id, href);
    const beforeNavigation = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest("a[href]")) save();
    };
    document.addEventListener("click", beforeNavigation, true);
    window.addEventListener("pagehide", save);
    return () => { document.removeEventListener("click", beforeNavigation, true); window.removeEventListener("pagehide", save); };
  }, [ready, href, user]);
}

export function AdminRecordLink({ href, ...props }: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const pathname = usePathname(), params = useSearchParams();
  return <Link {...props} href={adminRecordHref(href, withSearch(pathname, new URLSearchParams(params.toString())))} />;
}

export function useAdminReturnHref(section: string) {
  const params = useSearchParams();
  return safeAdminListReturn(params.get("back"), section);
}

export function ShareAdminList() {
  const { notify } = useSession();
  return <button type="button" className="icon-button" title="Copiar enlace del listado" aria-label="Copiar enlace del listado" onClick={async () => {
    try { await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}${window.location.search}`); notify("Enlace del listado copiado."); }
    catch { notify("No se pudo copiar. Podés compartir la dirección del navegador."); }
  }}><Copy size={17} /></button>;
}
