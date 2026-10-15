"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { adminNavigationTarget, adminSectionFromPath } from "@/lib/admin-navigation";
import { AdminNav } from "./admin-navigation";
import { API_STALE_TIME, apiQueryKey, request, useSession } from "./providers";

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useSession();
  const router = useRouter(), client = useQueryClient();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const main = root.current?.querySelector<HTMLElement>(".admin-main");
    if (main?.dataset.preserveViewport && main.dataset.preserveViewport !== pathname) {
      delete main.dataset.preserveViewport;
      main.style.removeProperty("min-height");
    }
  }, [pathname]);
  useEffect(() => {
    const element = root.current;
    if (!element || !user) return;
    const prepared = new Map<string, number>();
    const prepare = (event: Event) => {
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || anchor.origin !== location.origin || anchor.download || anchor.target === "_blank") return;
      const target = adminNavigationTarget(`${anchor.pathname}${anchor.search}`, user);
      if (!target || target.href === `${location.pathname}${location.search}`) return;
      const now = Date.now();
      if (now - (prepared.get(target.href) ?? 0) < API_STALE_TIME) return;
      prepared.set(target.href, now);
      router.prefetch(target.href);
      for (const path of target.queries) void client.prefetchQuery({
        queryKey: apiQueryKey(path, user.id), queryFn: () => request(path), staleTime: API_STALE_TIME,
      });
    };
    element.addEventListener("pointerover", prepare);
    element.addEventListener("focusin", prepare);
    element.addEventListener("touchstart", prepare, { passive: true });
    return () => {
      element.removeEventListener("pointerover", prepare);
      element.removeEventListener("focusin", prepare);
      element.removeEventListener("touchstart", prepare);
    };
  }, [user, router, client]);
  return <div className="container admin-page section" ref={root}><div className="admin-shell">
    <AdminNav section={adminSectionFromPath(pathname)} email={user?.email} />
    <div className="admin-main">{children}</div>
  </div></div>;
}
