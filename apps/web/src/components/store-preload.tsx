"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { request, useSession } from "./providers";
import { createStorePrefetcher, storeBrowseTarget, storeReadPath } from "@/lib/store-prefetch";
import { storeRoutes } from "@/lib/store-routes";

const imageCache = new Map<string, HTMLImageElement>();
export function automaticStorePreloadAllowed() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !connection?.saveData && !["slow-2g", "2g"].includes(connection?.effectiveType ?? "");
}

export function warmStoreImages(urls: string[]) {
  for (const url of urls) {
    if (imageCache.has(url)) continue;
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    imageCache.set(url, image);
    void image.decode().catch(() => {});
    if (imageCache.size > 64) imageCache.delete(imageCache.keys().next().value!);
  }
}

export function StorePreload() {
  const pathname = usePathname(), params = useSearchParams();
  const { user, loading } = useSession();
  const client = useQueryClient();
  useEffect(() => {
    if (loading || !user) return;
    const prefetch = createStorePrefetcher({ client, userId: user.id, read: request, images: warmStoreImages });
    let budget = 6;
    const current = `${pathname}${params.size ? `?${params}` : ""}`;
    const currentRead = storeReadPath(current);
    const visited = new Set<string>();
    const automatic = automaticStorePreloadAllowed();
    const hrefOf = (element: Element) => {
      const link = element.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target || link.hasAttribute("download") || link.origin !== location.origin) return;
      const href = link.pathname + link.search;
      return href !== current && storeReadPath(href) !== currentRead ? href : undefined;
    };
    const intent = (event: Event) => {
      if (!(event.target instanceof Element)) return;
      const href = hrefOf(event.target);
      if (href) prefetch.prepare(href, true);
    };
    const navigate = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target || link.hasAttribute("download") || link.origin !== location.origin || link.hash ||
        !storeBrowseTarget(link.pathname) || (!storeBrowseTarget(pathname) && pathname !== storeRoutes.brands)) return;
      event.preventDefault();
      const href = link.pathname + link.search;
      prefetch.prepare(href, true);
      if (href === location.pathname + location.search) return;
      window.history.pushState(null, "", href);
      if (link.pathname !== pathname) requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "instant" });
        if (event.detail === 0) document.getElementById("contenido")?.focus({ preventScroll: true });
      });
    };
    const observer = automatic && typeof IntersectionObserver !== "undefined" ? new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || !budget) continue;
        const href = hrefOf(entry.target);
        if (!href || visited.has(href)) continue;
        visited.add(href); budget--;
        prefetch.prepare(href);
        observer!.unobserve(entry.target);
      }
    }) : undefined;
    const observeLink = (link: HTMLAnchorElement) => {
      if (hrefOf(link)) observer?.observe(link);
    };
    const scan = (node: ParentNode) => {
      if (!observer || !budget) return;
      if (node instanceof HTMLAnchorElement) observeLink(node);
      node.querySelectorAll<HTMLAnchorElement>("a[href]").forEach(observeLink);
    };
    const mutations = observer ? new MutationObserver((records) => {
      for (const record of records) for (const node of record.addedNodes) if (node instanceof Element) scan(node);
    }) : undefined;
    mutations?.observe(document.body, { childList: true, subtree: true });
    scan(document.body);
    document.addEventListener("pointerover", intent);
    document.addEventListener("focusin", intent);
    document.addEventListener("touchstart", intent, { passive: true });
    document.addEventListener("click", navigate, true);
    return () => {
      prefetch.dispose(); observer?.disconnect(); mutations?.disconnect();
      document.removeEventListener("pointerover", intent);
      document.removeEventListener("focusin", intent);
      document.removeEventListener("touchstart", intent);
      document.removeEventListener("click", navigate, true);
    };
  }, [client, user, loading, pathname, params]);
  return null;
}
