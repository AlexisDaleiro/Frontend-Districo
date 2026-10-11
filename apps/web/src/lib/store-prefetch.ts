import { QueryClient } from "@tanstack/react-query";
import { API_STALE_TIME, apiQueryKey } from "@/components/providers";
import { catalogCardsPath } from "./catalog-query";
import { storeRoutes } from "./store-routes";
import type { Product, ProductCardList, Variant } from "./types";

export function storeBrowseTarget(pathname: string): { kind: "home" | "catalog" | "product"; id?: string } | undefined {
  if (pathname === storeRoutes.home) return { kind: "home" };
  if (pathname === storeRoutes.products) return { kind: "catalog" };
  for (const [prefix, kind] of [[`${storeRoutes.categories}/`, "catalog"], [storeRoutes.product(""), "product"]] as const) {
    if (!pathname.startsWith(prefix)) continue;
    try {
      const id = decodeURIComponent(pathname.slice(prefix.length));
      if (id && !id.includes("/") && !id.includes("\\")) return { kind, id };
    } catch { return; }
  }
}

export function storeReadPath(href: string): string | undefined {
  if (!href.startsWith("/") || href.startsWith("//") || href.includes("\\")) return;
  const url = new URL(href, "https://districo.local");
  if (url.pathname === storeRoutes.products) return catalogCardsPath(url.searchParams);
  const categoryPrefix = `${storeRoutes.categories}/`;
  const productPrefix = storeRoutes.product("");
  try {
    if (url.pathname.startsWith(categoryPrefix)) {
      const id = decodeURIComponent(url.pathname.slice(categoryPrefix.length));
      if (!id || id.includes("/")) return;
      url.searchParams.set("categoryId", id);
      return catalogCardsPath(url.searchParams);
    }
    if (url.pathname.startsWith(productPrefix)) {
      const slug = decodeURIComponent(url.pathname.slice(productPrefix.length));
      if (slug && !slug.includes("/")) return `products/${encodeURIComponent(slug)}`;
    }
    if (url.pathname === storeRoutes.home) return "products/cards?featured=true&limit=10&includeVariants=true";
  } catch { /* Malformed links must not start speculative requests. */ }
}

export function hasPurchaseVariants(product: ProductCardList["items"][number]): product is typeof product & { variants: Variant[] } {
  if (product.variantCount != null && product.variantCount !== product.variants.length) return false;
  return product.variants.every((variant) => typeof variant.name === "string" && typeof variant.sku === "string" &&
    Number.isFinite(variant.availableStock) && Number.isFinite(variant.saleMultiple) && Number.isFinite(variant.minimumOrderQuantity));
}

export function previousCatalogData<T>(data: T | undefined, previousKey: readonly unknown[] | undefined, userId?: string) {
  return previousKey?.[1] === (userId ?? "public") && String(previousKey?.[2]).startsWith("products/cards?") ? data : undefined;
}

type PrefetchOptions = {
  client: QueryClient;
  userId: string;
  read: <T>(path: string) => Promise<T>;
  images: (urls: string[]) => void;
};

// Two speculative reads at most; intentional destinations jump ahead of viewport guesses.
export function createStorePrefetcher({ client, userId, read, images }: PrefetchOptions) {
  const queue: { path: string }[] = [];
  const pending = new Set<string>();
  let running = 0, disposed = false;
  const pump = () => {
    while (!disposed && running < 2 && queue.length) {
      const { path } = queue.shift()!;
      running++;
      void client.prefetchQuery({ queryKey: apiQueryKey(path, userId), queryFn: () => read(path), staleTime: API_STALE_TIME, retry: false })
        .then(() => {
          if (disposed) return;
          const data = client.getQueryData<Product | ProductCardList>(apiQueryKey(path, userId));
          const products = data && ("items" in data ? data.items.slice(0, 6) : [data]);
          images(products?.flatMap((product) => product.media.filter((media) => media.type === "IMAGE").slice(0, 1).map((media) => media.url)) ?? []);
        }).finally(() => { running--; pending.delete(path); pump(); });
    }
  };
  return {
    prepare(href: string, intent = false) {
      const path = storeReadPath(href);
      if (disposed || !path) return;
      const queued = queue.findIndex((item) => item.path === path);
      if (queued !== -1) {
        if (intent) queue.unshift(...queue.splice(queued, 1));
        return;
      }
      if (pending.has(path)) return;
      // Do not grow a backlog while scrolling a large directory.
      if (queue.length >= 6) { if (!intent) return; pending.delete(queue.pop()!.path); }
      pending.add(path);
      if (intent) queue.unshift({ path }); else queue.push({ path });
      pump();
    },
    dispose() { disposed = true; queue.length = 0; pending.clear(); },
  };
}
