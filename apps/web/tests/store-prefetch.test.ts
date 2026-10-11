import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { apiQueryKey, setSessionUser } from "../src/components/providers";
import { createStorePrefetcher, hasPurchaseVariants, previousCatalogData, storeBrowseTarget, storeReadPath } from "../src/lib/store-prefetch";
import type { ProductCardList } from "../src/lib/types";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const result = { items: [], meta: { page: 1, limit: 12, total: 0 } };
function fixture(read = vi.fn<(path: string) => Promise<typeof result>>(async () => result)) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const images = vi.fn();
  const prefetch = createStorePrefetcher({ client, userId: "customer-a", read: <T>(path: string) => read(path) as Promise<T>, images });
  return { client, read, images, prefetch };
}

describe("productos preparados antes de navegar", () => {
  it("reconoce solamente vistas locales de compra, no admin, formularios o rutas desconocidas", () => {
    expect(storeBrowseTarget("/tienda")).toEqual({ kind: "home" });
    expect(storeBrowseTarget("/tienda/categorias/perros")).toEqual({ kind: "catalog", id: "perros" });
    expect(storeBrowseTarget("/tienda/producto/alimento")).toEqual({ kind: "product", id: "alimento" });
    for (const path of ["/", "/tienda/admin", "/tienda/checkout", "/tienda/cuenta", "/tienda/producto/a%2Fb", "/tienda/categorias/%bad"]) expect(storeBrowseTarget(path)).toBeUndefined();
  });
  it("respeta filtros, categorías y rutas; no anticipa compras, admin o enlaces externos", () => {
    expect(storeReadPath("/tienda/categorias/cat-1?productType=FOOD&page=2")).toBe("products/cards?categoryId=cat-1&page=2&productType=FOOD&limit=12&includeVariants=true");
    expect(storeReadPath("/tienda/producto/alimento%20gato")).toBe("products/alimento%20gato");
    for (const href of ["https://other.test/tienda/productos", "//other.test/tienda/productos", "/\\other.test/tienda/productos", "/tienda/carrito", "/tienda/checkout", "/tienda/admin/catalogo", "/tienda/producto/a%2Fb", "/tienda/categorias/%bad"]) expect(storeReadPath(href)).toBeUndefined();
  });
  it("no confunde datos del cliente anterior con el resultado de otro filtro", () => {
    expect(previousCatalogData(result, apiQueryKey("products/cards?limit=12", "customer-a"), "customer-a")).toBe(result);
    expect(previousCatalogData(result, apiQueryKey("products/cards?limit=12", "customer-a"), "customer-b")).toBeUndefined();
    expect(previousCatalogData(result, apiQueryKey("products/cards?limit=12"), "customer-a")).toBeUndefined();
    expect(previousCatalogData(result, apiQueryKey("cart", "customer-a"), "customer-a")).toBeUndefined();
  });
  it("distingue variantes completas de las respuestas compactas antiguas", () => {
    const card = { variants: [{ id: "v", active: true }] } as ProductCardList["items"][number];
    expect(hasPurchaseVariants(card)).toBe(false);
    expect(hasPurchaseVariants({ ...card, variants: [{ ...card.variants[0], name: "3 kg", sku: "SKU", availableStock: 0, saleMultiple: 1, minimumOrderQuantity: 2 }] })).toBe(true);
  });
  it("deduplica intención, precarga y montaje; reutiliza sólo datos todavía frescos", async () => {
    let resolve!: (value: typeof result) => void;
    const read = vi.fn<(path: string) => Promise<typeof result>>(() => new Promise<typeof result>((done) => { resolve = done; }));
    const state = fixture(read);
    const href = "/tienda/productos?brandId=b";
    state.prefetch.prepare(href); state.prefetch.prepare(href, true);
    const mounted = state.client.fetchQuery({ queryKey: apiQueryKey(storeReadPath(href)!, "customer-a"), queryFn: () => read(storeReadPath(href)!) });
    expect(read).toHaveBeenCalledTimes(1);
    resolve(result); await mounted; await tick();
    state.prefetch.prepare(href); await tick();
    expect(read).toHaveBeenCalledTimes(1);
    await state.client.invalidateQueries({ queryKey: apiQueryKey(storeReadPath(href)!, "customer-a") });
    state.prefetch.prepare(href); await tick();
    expect(read).toHaveBeenCalledTimes(2);
    resolve(result); await tick(); state.prefetch.dispose(); state.client.clear();
  });
  it("limita concurrencia, prioriza intención y abandona la cola al salir", async () => {
    const releases: (() => void)[] = [];
    const state = fixture(vi.fn<(path: string) => Promise<typeof result>>(() => new Promise<typeof result>((resolve) => releases.push(() => resolve(result)))));
    for (const brand of ["a", "b", "c", "d"]) state.prefetch.prepare(`/tienda/productos?brandId=${brand}`);
    state.prefetch.prepare("/tienda/productos?brandId=d", true);
    expect(state.read).toHaveBeenCalledTimes(2);
    releases[0](); await tick();
    expect(state.read.mock.calls[2][0]).toContain("brandId=d");
    state.prefetch.dispose(); releases[1](); releases[2](); await tick();
    expect(state.read).toHaveBeenCalledTimes(3);
    expect(state.images).toHaveBeenCalledTimes(1);
    state.client.clear();
  });
  it("una lectura en vuelo no restaura precios después de cerrar sesión", async () => {
    let resolve!: (value: typeof result) => void;
    const state = fixture(vi.fn<(path: string) => Promise<typeof result>>(() => new Promise<typeof result>((done) => { resolve = done; })));
    const href = "/tienda/productos?brandId=b";
    state.prefetch.prepare(href);
    state.prefetch.dispose(); await setSessionUser(state.client, null);
    resolve(result); await tick();
    expect(state.client.getQueryData(apiQueryKey(storeReadPath(href)!, "customer-a"))).toBeUndefined();
    expect(state.images).not.toHaveBeenCalled();
    state.client.clear();
  });
});
