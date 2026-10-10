"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  LockKeyhole,
  SlidersHorizontal,
  X,
  Minus,
  Plus,
  Check,
  ChevronDown,
  ChevronRight,
  ShoppingBag,
  Pencil,
} from "lucide-react";
import { apiQueryKey, request, useApi, usePublicApi, useSession, DEMO } from "./providers";
import { brandLogoSrc } from "@/lib/brand-logos";
import { CatalogPagination } from "./catalog-pagination";
import { FavoriteButton } from "./favorite-button";
import { TechnicalAccordions } from "./product-sheet";
import { TypeIcon, productTypeLinks } from "./store-art";
import { canonicalCategoryIds, catalogCardsPath } from "@/lib/catalog-query";
import { storeRoutes, withSearch } from "@/lib/store-routes";
import { canEditAdminFeature, canSeeAdminSection } from "@/lib/staff-access";
import { salesLineLabel } from "@/lib/sales-line";
import {
  ActionLink,
  Empty,
  ErrorBox,
  Loading,
  Modal,
  PageHeading,
  Picture,
} from "./ui";
import type {
  Attribute,
  Cart,
  Entity,
  Product,
  ProductCardData,
  ProductCardList,
  Variant,
} from "@/lib/types";
import {
  canBuy,
  firstQuantity,
  hiddenPriceText,
  label,
  money,
  purchasable,
  quantityError,
} from "@/lib/commerce";
export function ProductCard({ product }: { product: ProductCardData }) {
  const { user, notify } = useSession();
  const client = useQueryClient();
  const detail = useApi<Product>(`products/${encodeURIComponent(product.slug)}`);
  const active = detail.data?.variants.filter((item) => item.active !== false) ?? [];
  const [selection, setSelection] = useState<{ id: string; quantity: number }>();
  const variant = active.find((item) => item.id === selection?.id) ?? active[0];
  const quantity = variant ? (selection?.id === variant.id ? selection.quantity : firstQuantity(variant)) : 1;
  const price = variant?.price ?? (!detail.data ? product.variants[0]?.price : undefined);
  const allowed = canBuy(user, detail.data ?? product);
  const cart = useApi<Cart>("cart", allowed);
  const saved = cart.data?.items.find((item) => item.variant.id === variant?.id);
  const validation = variant ? quantityError(variant, quantity) : null;
  const mutation = useMutation({
    mutationFn: (item: { variantId: string; quantity: number }) => request<Cart>("cart/items", "POST", item),
    onSuccess: (nextCart) => {
      client.setQueryData(apiQueryKey("cart", user?.id), nextCart);
      void client.invalidateQueries({ queryKey: apiQueryKey("cart", user?.id) });
      notify("Cantidad guardada en tu carrito.");
    },
  });
  const prefetchDetail = () => {
    void client.prefetchQuery({
      queryKey: apiQueryKey(`products/${encodeURIComponent(product.slug)}`, user?.id),
      queryFn: () => request<Product>(`products/${encodeURIComponent(product.slug)}`),
      staleTime: 20_000,
    });
  };
  return (
    <article className="product-card" onMouseEnter={prefetchDetail} onFocus={prefetchDetail}>
      <FavoriteButton productId={product.id} name={product.name} className="product-card-favorite" />
      <div className="product-card-media">
      <Link href={storeRoutes.product(product.slug)} className="product-image" aria-label={`Ver ${product.name}`}>
        {product.requiresMedicationPermission && <span className="tag">Uso profesional</span>}
        <Picture src={product.media.find((item) => item.type === "IMAGE")?.url ?? "/images/placeholder.svg"} alt={product.name} loading="lazy" sizes="(max-width: 767px) 50vw, 300px" />
      </Link>
      <div className="product-variants" role="group" aria-label={`Presentaciones de ${product.name}`} aria-busy={detail.isPending}>
        {active.map((item) => (
          <button key={item.id} type="button" className="product-variant-pill" aria-pressed={variant?.id === item.id} disabled={mutation.isPending}
            title={[...new Set([item.name, item.presentation].filter(Boolean))].join(" · ") || item.sku}
            onClick={() => { setSelection({ id: item.id, quantity: firstQuantity(item) }); mutation.reset(); }}>
            {[...new Set([item.name, item.presentation].filter(Boolean))].join(" · ") || item.sku}
          </button>
        ))}
        {detail.isPending && <span className="muted">Cargando presentaciones…</span>}
        {detail.data && !active.length && <span className="muted">Sin presentaciones disponibles</span>}
      </div>
      </div>
      <p className="product-meta">{product.brand?.name ?? product.laboratory?.name ?? " "}</p>
      <Link href={storeRoutes.product(product.slug)}><h3>{product.name}</h3></Link>
      <div className="product-price">
        <div className="product-price-row">
          <span>Precio</span>
          {price ? <strong>{money(price.amount, price.currency)}</strong> : (
            <span className="product-price-locked"><LockKeyhole size={12} aria-hidden />{variant ? hiddenPriceText(user, detail.data ?? product) : detail.isPending ? "Cargando…" : "No disponible"}</span>
          )}
        </div>
      </div>
      <div className="product-card-buy">
        {detail.error ? (
          <ErrorBox error={detail.error} retry={() => void detail.refetch()} />
        ) : !allowed ? (
          <p className="product-card-note">{user ? "Tu cuenta no está habilitada para comprar este producto." : "Ingresá para comprar."}</p>
        ) : variant && purchasable(variant) ? (
          <>
            <fieldset className="product-card-actions" disabled={mutation.isPending}>
              <Quantity variant={variant} value={quantity} onChange={(value) => { setSelection({ id: variant.id, quantity: value }); mutation.reset(); }} />
              <button type="button" className="button small" aria-label={`Agregar ${product.name} al carrito`} disabled={!!validation || !variant.price || mutation.isPending}
                onClick={() => { if (!validation && variant.price && allowed) mutation.mutate({ variantId: variant.id, quantity }); }}>
                <ShoppingBag size={16} aria-hidden />{mutation.isPending ? "Guardando…" : "Agregar"}
              </button>
            </fieldset>
            {saved && <p className="product-card-note">En carrito: {saved.quantity}. La cantidad elegida reemplaza la anterior.</p>}
            {validation && <p className="field-error" role="status">{validation}</p>}
            {mutation.error && <ErrorBox error={mutation.error} />}
          </>
        ) : (
          <p className="product-card-note">{detail.isPending ? "Cargando…" : variant ? "Sin stock para el mínimo de compra" : "No disponible"}</p>
        )}
      </div>
    </article>
  );
}
export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <div className="product-grid">
      {products.map((p) => (
        <ProductCard product={p} key={p.id} />
      ))}
    </div>
  );
}
// La API entrega un árbol que providers aplana; se reordena por parentId para
// mostrar cada subcategoría debajo de su categoría superior.
function categoryTree(list: Entity[]) {
  const ids = new Set(list.map((c) => c.id));
  const children = new Map<string | null, Entity[]>();
  for (const c of list) {
    const parent = c.parentId && ids.has(c.parentId) ? c.parentId : null;
    children.set(parent, [...(children.get(parent) ?? []), c]);
  }
  const seen = new Set<string>();
  const walk = (
    parent: string | null,
    depth: number,
  ): { c: Entity; depth: number }[] =>
    (children.get(parent) ?? [])
      .filter((c) => !seen.has(c.id) && seen.add(c.id))
      .flatMap((c) => [{ c, depth }, ...walk(c.id, depth + 1)]);
  return walk(null, 0);
}
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
function CategoryPicker({
  categories,
  selected,
  onChange,
  onPreview,
}: {
  categories: Entity[];
  selected: string[];
  onChange: (ids: string[]) => void;
  onPreview: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    },
    [],
  );
  const preview = (id: string) => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => onPreview(id), 120);
  };
  const term = normalize(query.trim());
  const items = categoryTree(categories).filter(
    ({ c }) => !term || normalize(c.name).includes(term),
  );
  const names = categories
    .filter((c) => selected.includes(c.id))
    .map((c) => c.name);
  return (
    <details
      className="picker"
      open
      onKeyDown={(e) => {
        if (e.key !== "Escape" || !e.currentTarget.open) return;
        e.currentTarget.open = false;
        e.currentTarget.querySelector("summary")?.focus();
      }}
    >
      <summary className="form-input picker-summary">
        <span>
          {names.length === 0
            ? "Todas"
            : names.length === 1
              ? names[0]
              : `${names.length} categorías`}
        </span>
        <ChevronDown size={16} aria-hidden />
      </summary>
      <div className="picker-panel">
        <input
          type="search"
          className="form-input"
          placeholder="Buscar categoría…"
          aria-label="Buscar categoría"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="picker-list" role="group" aria-label="Categorías">
          {items.map(({ c, depth }) => (
            <label
              className="filter-option"
              key={c.id}
              style={depth && !term ? { paddingLeft: depth * 16 } : undefined}
              onMouseEnter={() => preview(c.id)}
              onMouseLeave={() => {
                if (previewTimer.current) clearTimeout(previewTimer.current);
              }}
            >
              <input
                type="checkbox"
                checked={selected.includes(c.id)}
                onFocus={() => onPreview(c.id)}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...selected, c.id]
                      : selected.filter((id) => id !== c.id),
                  )
                }
              />
              {c.name}
            </label>
          ))}
          {!items.length && <p className="picker-empty">Sin resultados</p>}
        </div>
        {!!selected.length && (
          <button
            type="button"
            className="text-link"
            onClick={() => onChange([])}
          >
            Limpiar selección <X size={14} />
          </button>
        )}
      </div>
    </details>
  );
}
function CatalogPromoPacks({ brandId }: { brandId: string }) {
  const products = usePublicApi<ProductCardList>(
    `products/cards?${new URLSearchParams({ brandId, limit: "3" })}`,
  );
  const images = products.data?.items.flatMap((product) => {
    const image = product.media.find((media) => media.type === "IMAGE");
    return image ? [image] : [];
  }) ?? [];
  if (!images.length) return null;
  return (
    <div className="catalog-promo-packs" aria-hidden="true">
      {images.map((image, index) => (
        <Picture key={`${image.url}-${index}`} src={image.url} alt="" sizes="140px" />
      ))}
    </div>
  );
}

export function Catalog({ categoryId }: { categoryId?: string }) {
  const params = useSearchParams(),
    router = useRouter();
  const filters = new URLSearchParams(params);
  if (categoryId) filters.set("categoryId", categoryId);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const client = useQueryClient();
  const { user, loading } = useSession();
  const products = useApi<ProductCardList>(catalogCardsPath(filters)),
    categories = useApi<Entity[]>("categories/catalog"),
    brands = useApi<Entity[]>("brands"),
    labs = useApi<Entity[]>("laboratories"),
    attributes = useApi<Attribute[]>("attributes");
  function prefetchCategory(next: URLSearchParams) {
    if (loading) return;
    const path = catalogCardsPath(next);
    void client.prefetchQuery({
      queryKey: apiQueryKey(path, user?.id),
      queryFn: () => request<ProductCardList>(path),
      staleTime: 20_000,
    });
  }
  function set(key: string, value: string) {
    const next = new URLSearchParams(filters);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    if (key === "categoryId") prefetchCategory(next);
    router.push(withSearch(storeRoutes.products, next), { scroll: false });
  }
  const categoryIds = canonicalCategoryIds(
    categories.data ?? [],
    (filters.get("categoryId") ?? "").split(",").filter(Boolean),
  );
  const filterContent = (
    <>
      <label className="filter-switch">
        Solo destacados
        <input
          type="checkbox"
          role="switch"
          checked={filters.get("featured") === "true"}
          onChange={(e) => set("featured", e.target.checked ? "true" : "")}
        />
      </label>
      <details className="filter-section" open>
        <summary>
          <h3>Categorías</h3>
          <ChevronDown size={16} aria-hidden />
        </summary>
        {!!categories.data?.length && (
          <CategoryPicker
            categories={categories.data}
            selected={categoryIds}
            onChange={(ids) => set("categoryId", ids.join(","))}
            onPreview={(id) => {
              const next = new URLSearchParams(filters);
              const ids = categoryIds.includes(id)
                ? categoryIds.filter((other) => other !== id)
                : [...categoryIds, id];
              if (ids.length) next.set("categoryId", ids.join(","));
              else next.delete("categoryId");
              next.delete("page");
              prefetchCategory(next);
            }}
          />
        )}
      </details>
      {[
        ["brandId", "Marcas", brands.data],
        ["laboratoryId", "Laboratorios", labs.data],
      ].map(([key, title, items]) => (
        <details className="filter-section" key={String(key)} open>
          <summary>
            <h3>{String(title)}</h3>
            <ChevronDown size={16} aria-hidden />
          </summary>
          <select
            className="form-input"
            aria-label={String(title)}
            value={filters.get(String(key)) ?? ""}
            onChange={(e) => set(String(key), e.target.value)}
          >
            <option value="">Todos</option>
            {(items as Entity[] | undefined)?.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </details>
      ))}
      {attributes.data?.map((a) => (
        <details className="filter-section" key={a.id}>
          <summary>
            <h3>{a.name}</h3>
            <ChevronDown size={16} aria-hidden />
          </summary>
          {a.values.map((v) => (
            <label className="filter-option" key={v.id}>
              <input
                type="checkbox"
                checked={(filters.get("attributeValueIds") ?? "")
                  .split(",")
                  .includes(v.id)}
                onChange={(e) => {
                  const ids = (filters.get("attributeValueIds") ?? "")
                    .split(",")
                    .filter(Boolean)
                    .filter((id) => id !== v.id);
                  if (e.target.checked) ids.push(v.id);
                  set("attributeValueIds", ids.join(","));
                }}
              />
              {v.value}
            </label>
          ))}
        </details>
      ))}
      <button
        className="text-link"
        style={{ marginTop: 20 }}
        onClick={() => router.push(storeRoutes.products, { scroll: false })}
      >
        Limpiar filtros <X size={14} />
      </button>
    </>
  );
  const categoryName = categoryId
    ? categories.data?.find((c) => c.id === categoryId)?.name
    : undefined;
  const productType = filters.get("productType") ?? "";
  const promoBrandKeys = ["biofresh", "granplus", "guabi", "threedogs", "stack"];
  const brandKey = (value: string) => normalize(value).replace(/[^a-z0-9]/g, "");
  const promoBrands = promoBrandKeys.flatMap((key) => {
    const brand = brands.data?.find((item) =>
      [item.name, item.slug ?? ""].some((value) => {
        const normalized = brandKey(value);
        return normalized === key || (key === "guabi" && normalized === "guabinatural");
      }),
    );
    return brand ? [brand] : [];
  });
  const selectedBrandIndex = promoBrands.findIndex(
    (brand) => brand.id === filters.get("brandId"),
  );
  const promoBrand = promoBrands[selectedBrandIndex + 1] ?? promoBrands[0];
  const promoName = promoBrand?.name ?? "Biofresh";
  const isBiofresh = normalize(promoName).trim() === "biofresh";
  const promoLogo = promoBrand?.imageUrl || brandLogoSrc(promoBrand?.slug) ||
    (isBiofresh ? "/images/brands/biofresh.png" : null);
  return (
    <div className="container section catalog-page">
      <div className="breadcrumbs">
        <Link href={storeRoutes.home}>Inicio</Link>
        <ChevronRight size={12} />
        {categoryName ? (
          <>
            <Link href={storeRoutes.products}>Catálogo</Link>
            <ChevronRight size={12} />
            <span>{categoryName}</span>
          </>
        ) : (
          <span>Catálogo</span>
        )}
      </div>
      <div className="catalog-head">
        <PageHeading title={categoryName ?? "Nuestro catálogo"}>
          Alimento, higiene, accesorios y farmacia de las marcas que
          distribuimos.
        </PageHeading>
        <Link
          className="catalog-promo"
          href={
            promoBrand
              ? withSearch(
                  storeRoutes.products,
                  new URLSearchParams({ brandId: promoBrand.id }),
                )
              : storeRoutes.brands
          }
        >
          <div className="catalog-promo-copy">
            {promoLogo ? (
              <Picture src={promoLogo} alt={promoName} sizes="100px" />
            ) : (
              <strong>{promoName}</strong>
            )}
            <h2>{isBiofresh ? "Una fórmula para cada etapa y tamaño" : `La línea de ${promoName}`}</h2>
            <p>{isBiofresh ? "Cachorros, adultos y senior, de razas mini a gigantes." : "Conocé sus productos y presentaciones disponibles."}</p>
            <span className="button small">Ver línea {promoName}</span>
          </div>
          {isBiofresh ? (
            <div className="catalog-promo-packs" aria-hidden="true">
              <Picture src="/images/product-0-3.png" alt="" sizes="120px" />
              <Picture src="/images/hero-biofresh-castrados.png" alt="" sizes="140px" />
              <Picture src="/images/product-0-2.png" alt="" sizes="120px" />
            </div>
          ) : promoBrand ? (
            <CatalogPromoPacks key={promoBrand.id} brandId={promoBrand.id} />
          ) : null}
        </Link>
      </div>
      <nav className="catalog-types" aria-label="Tipos de producto">
        {productTypeLinks.map((t) => (
          <button
            type="button"
            className="catalog-type"
            key={t.type}
            aria-pressed={productType === t.type}
            onClick={() =>
              set("productType", productType === t.type ? "" : t.type)
            }
          >
            <TypeIcon type={t.type} />
            {t.name}
          </button>
        ))}
      </nav>
        <div className="catalog-layout">
          <aside className="filters" aria-label="Filtros del catálogo">
            <div className="filters-panel">{filterContent}</div>
        </aside>
        <div className="catalog-results">
          <div className="catalog-toolbar">
            <span>
              {products.data
                ? `${products.data.meta.total} productos`
                : "Explorá nuestra selección"}
            </span>
            <button
              className="button secondary small filter-trigger"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal size={16} />
              Filtrar
            </button>
            <form
              className="inline-search"
              onSubmit={(e) => {
                e.preventDefault();
                set(
                  "search",
                  String(new FormData(e.currentTarget).get("search") ?? ""),
                );
              }}
            >
              <input
                key={filters.get("search")}
                className="form-input"
                aria-label="Buscar en el catálogo"
                name="search"
                placeholder="Nombre o código de producto"
                defaultValue={filters.get("search") ?? ""}
              />
              <button className="button small" type="submit">
                Buscar
              </button>
            </form>
          </div>
          <div className="active-filters">
            {categoryIds.map((id) => (
              <button
                className="chip"
                key={id}
                onClick={() =>
                  set(
                    "categoryId",
                    categoryIds.filter((other) => other !== id).join(","),
                  )
                }
              >
                {categories.data?.find((c) => c.id === id)?.name ?? "Categoría"}
                <X size={12} />
              </button>
            ))}
            {[
              "search",
              "brandId",
              "laboratoryId",
              "productType",
              "featured",
              "attributeValueIds",
            ]
              .filter((key) => filters.has(key))
              .map((key) => (
                <button className="chip" key={key} onClick={() => set(key, "")}>
                  {[
                    ...(categories.data ?? []),
                    ...(brands.data ?? []),
                    ...(labs.data ?? []),
                  ].find((e) => e.id === filters.get(key))?.name ??
                    (key === "featured"
                      ? "Destacados"
                      : key === "productType"
                        ? label(filters.get(key) ?? "")
                        : key === "attributeValueIds"
                          ? (filters.get(key) ?? "")
                              .split(",")
                              .map(
                                (id) =>
                                  attributes.data
                                    ?.flatMap((a) => a.values)
                                    .find((v) => v.id === id)?.value,
                              )
                              .filter(Boolean)
                              .join(", ") || "Atributos"
                          : filters.get(key))}
                  <X size={12} />
                </button>
              ))}
          </div>
          {[categories, brands, labs, attributes].find((q) => q.error)
            ?.error && (
            <ErrorBox
              error="No se pudieron cargar algunos filtros. Volvé a intentar."
              retry={() => {
                void categories.refetch();
                void brands.refetch();
                void labs.refetch();
                void attributes.refetch();
              }}
            />
          )}
          {products.isPending ? (
            <Loading />
          ) : products.error ? (
            <ErrorBox
              error={products.error}
              retry={() => void products.refetch()}
            />
          ) : !products.data.items.length ? (
            <Empty title="No encontramos productos">
              <p>Probá con otra búsqueda o quitá algún filtro.</p>
              <ActionLink href={storeRoutes.products}>
                Ver todo el catálogo
              </ActionLink>
            </Empty>
          ) : (
            <>
              <ProductGrid
                key={filters.toString()}
                products={products.data.items}
              />
              <CatalogPagination
                page={products.data.meta.page}
                totalPages={Math.max(
                  1,
                  Math.ceil(
                    products.data.meta.total / products.data.meta.limit,
                  ),
                )}
                onPageChange={(nextPage) => set("page", String(nextPage))}
              />
            </>
          )}
        </div>
      </div>
      <Modal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filtrar productos"
        sheet
      >
        {filterContent}
        <button
          className="button"
          style={{ width: "100%", marginTop: 25 }}
          onClick={() => setFiltersOpen(false)}
        >
          Ver resultados
        </button>
      </Modal>
    </div>
  );
}
export function Quantity({
  value,
  onChange,
  variant,
}: {
  value: number;
  onChange: (value: number) => void;
  variant: Variant;
}) {
  return (
    <div className="quantity">
      <button
        type="button"
        aria-label="Disminuir cantidad"
        disabled={value <= firstQuantity(variant)}
        onClick={() =>
          onChange(
            Math.max(firstQuantity(variant), value - variant.saleMultiple),
          )
        }
      >
        <Minus size={14} />
      </button>
      <input
        type="number"
        aria-label="Cantidad"
        min={firstQuantity(variant)}
        step={variant.saleMultiple}
        max={variant.availableStock}
        value={Number.isNaN(value) ? "" : value}
        onChange={(e) => onChange(e.target.valueAsNumber)}
      />
      <button
        type="button"
        aria-label="Aumentar cantidad"
        disabled={value + variant.saleMultiple > variant.availableStock}
        onClick={() => onChange(value + variant.saleMultiple)}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
function BuyForm({ product, variant }: { product: Product; variant: Variant }) {
  const [quantity, setQuantity] = useState(firstQuantity(variant));
  const { user, notify } = useSession();
  const client = useQueryClient();
  const error = quantityError(variant, quantity);
  const mutation = useMutation({
    mutationFn: () =>
      request<Cart>("cart/items", "POST", { variantId: variant.id, quantity }),
    onSuccess: () => {
      void client.invalidateQueries();
      notify("Cantidad guardada en tu carrito.");
    },
  });
  if (!user)
    return (
      <div className="detail-buy">
        <h3>Tu próximo pedido empieza acá</h3>
        <p className="info-note">
          Ingresá con tu cuenta mayorista para ver precios y comprar.
        </p>
        <div className="actions">
          <ActionLink href={storeRoutes.login}>Ingresar</ActionLink>
          <Link className="text-link" href={storeRoutes.requestAccount}>
            Solicitar cuenta
          </Link>
        </div>
      </div>
    );
  if (!canBuy(user, product))
    return (
      <div className="detail-buy">
        <LockKeyhole size={20} />
        <p>Tu cuenta no está habilitada para comprar este producto.</p>
        {product.requiresMedicationPermission && (
          <p className="info-note">
            Producto de uso profesional: requiere habilitación para medicamentos
            veterinarios.
          </p>
        )}
        <Link className="text-link" href={storeRoutes.contact}>
          Consultar a DISTRICO
        </Link>
      </div>
    );
  if (!purchasable(variant))
    return (
      <div className="detail-buy">
        <p>
          {variant.availableStock > 0
            ? `Hay ${variant.availableStock} unidades disponibles, menos que el mínimo de compra (${firstQuantity(variant)}).`
            : "Esta presentación no tiene stock disponible."}
        </p>
        <Link className="text-link" href={storeRoutes.contact}>
          Consultar a DISTRICO
        </Link>
      </div>
    );
  return (
    <div className="detail-buy">
      <p className="small-copy">
        Mínimo: {variant.minimumOrderQuantity} · Múltiplos de{" "}
        {variant.saleMultiple}
      </p>
      <div className="actions">
        <Quantity value={quantity} onChange={setQuantity} variant={variant} />
        <button
          className="button"
          disabled={!!error || !variant.price || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          <ShoppingBag size={17} />
          {mutation.isPending ? "Guardando…" : "Guardar en carrito"}
        </button>
      </div>
      <p className="info-note">
        Si ya está en el carrito, esta cantidad reemplaza la anterior.
      </p>
      {error && (
        <p className="field-error" role="status">
          {error}
        </p>
      )}
      {!variant.price && (
        <p className="field-error">Sin precio vigente. Consultá a DISTRICO.</p>
      )}
      {mutation.error && <ErrorBox error={mutation.error} />}{" "}
      {mutation.isSuccess && (
        <Link className="text-link buy-success" href={storeRoutes.cart}>
          <Check size={16} />
          Ver mi carrito
        </Link>
      )}
    </div>
  );
}
function RelatedProducts({ product }: { product: Product }) {
  // La categoría más específica es la última; comparte caché con el catálogo.
  const categoryId = product.categories.at(-1)?.categoryId;
  const q = useApi<ProductCardList>(
    catalogCardsPath(new URLSearchParams(categoryId ? { categoryId } : {})),
    !!categoryId,
  );
  const items = q.data?.items.filter((p) => p.id !== product.id).slice(0, 4);
  if (!categoryId || !items?.length) return null;
  const category = product.categories.at(-1)?.category;
  return (
    <section className="detail-related">
      <div className="section-title">
        <div>
          <h2>Más de {category?.name ?? "esta categoría"}</h2>
        </div>
        <Link
          className="text-link"
          href={catalogLink("categoryId", categoryId)}
        >
          Ver todos
        </Link>
      </div>
      <ProductGrid products={items} />
    </section>
  );
}
function ProductInfo({
  product,
  variant,
}: {
  product: Product;
  variant?: Variant;
}) {
  const [activeSection, setActiveSection] = useState<"specs" | "extra">("specs");
  const categories = product.categories.filter((c) => c.category);
  const technical = product.technicalSheet?.technical ?? [];
  // Solo filas con dato: la ficha no inventa valores.
  const rows: [string, ReactNode][] = [
    [
      "Marca",
      product.brand && (
        <Link href={catalogLink("brandId", product.brand.id)}>
          {product.brand.name}
        </Link>
      ),
    ],
    ["Laboratorio", product.laboratory?.name],
    ["Línea de venta", salesLineLabel(product.brand?.salesLine)],
    [
      "Categorías",
      categories.length > 0 &&
        categories.map((c, i) => (
          <span key={c.categoryId}>
            {i > 0 && " · "}
            <Link href={catalogLink("categoryId", c.categoryId)}>
              {c.category?.name}
            </Link>
          </span>
        )),
    ],
    ["Tipo", product.productType !== "OTHER" && label(product.productType)],
    ...(product.productType === "FOOD" ? product.attributes?.filter((item) => item.attributeValue.attribute.slug === "etapa").map((item): [string, ReactNode] => ["Etapa", item.attributeValue.value]) ?? [] : []),
    [
      "Presentación",
      variant &&
        [variant.name, variant.presentation].filter(Boolean).join(" · "),
    ],
    ["SKU", variant?.sku],
    ["EAN", variant?.ean],
    [
      "Venta",
      variant &&
        `Mínimo ${variant.minimumOrderQuantity} · Múltiplos de ${variant.saleMultiple}`,
    ],
    [
      "Uso profesional",
      product.requiresMedicationPermission &&
        "Requiere habilitación para medicamentos veterinarios",
    ],
  ];
  return (
    <div className="detail-details">
      <div className="detail-section-nav" aria-label="Información del producto">
        <button
          type="button"
          aria-pressed={activeSection === "specs"}
          aria-controls="detail-panel-specs"
          onClick={() => setActiveSection("specs")}
        >
          Ficha técnica
        </button>
        <button
          type="button"
          aria-pressed={activeSection === "extra"}
          aria-controls="detail-panel-extra"
          onClick={() => setActiveSection("extra")}
        >
          {technical.length > 0 ? "Información técnica" : "Descripción"}
        </button>
      </div>
      <div className="detail-sections">
        <section id="detail-panel-specs" aria-labelledby="detalle-ficha" hidden={activeSection !== "specs"}>
          <h2 id="detalle-ficha">Ficha técnica</h2>
          <dl className="detail-specs">
            {rows
              .filter(([, value]) => value)
              .map(([title, value]) => (
                <div key={title}>
                  <dt>{title}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
          </dl>
        </section>
        {/* Después de la ficha: la información técnica reemplaza a la descripción cuando existe. */}
        {technical.length > 0 ? (
          <section id="detail-panel-extra" aria-labelledby="detalle-tecnica" hidden={activeSection !== "extra"}>
            <h2 id="detalle-tecnica">Información técnica</h2>
            <TechnicalAccordions blocks={technical} />
          </section>
        ) : (
          <section id="detail-panel-extra" aria-labelledby="detalle-descripcion" hidden={activeSection !== "extra"}>
            <h2 id="detalle-descripcion">Descripción</h2>
            <p style={{ whiteSpace: "pre-line" }}>
              {product.description?.replace(/<[^>]+>/g, " ") ||
                "Consultá a DISTRICO para obtener más información."}
            </p>
            {product.sourceUrl && (
              <a
                className="text-link"
                style={{ marginTop: 16 }}
                href={product.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Información del proveedor <ArrowUpRight size={14} />
              </a>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
// Barra fija en mobile: aparece mientras el bloque de compra está fuera de la
// vista y lleva hasta él. No repite «Guardar en carrito».
function BuyBar({ variant, target }: { variant: Variant; target: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = document.getElementById(target);
    if (!node || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(!entry.isIntersecting),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [target]);
  return (
    <div
      className={"detail-buybar" + (visible ? " is-visible" : "")}
      aria-hidden={!visible}
    >
      <div>
        <small>{variant.name}</small>
        <strong>
          {variant.price
            ? money(variant.price.amount, variant.price.currency)
            : "Sin precio"}
        </strong>
      </div>
      <button
        type="button"
        className="button"
        tabIndex={visible ? 0 : -1}
        onClick={() => {
          const node = document.getElementById(target);
          node?.scrollIntoView({ behavior: "smooth", block: "center" });
          node
            ?.querySelector<HTMLElement>("input")
            ?.focus({ preventScroll: true });
        }}
      >
        Ir a comprar
      </button>
    </div>
  );
}
const catalogLink = (key: "brandId" | "categoryId", id: string) =>
  withSearch(storeRoutes.products, new URLSearchParams({ [key]: id }));
function ProductDetailContent({ product }: { product: Product }) {
  const { user } = useSession();
  const [variantId, setVariantId] = useState(
    product.variants.find((v) => v.active !== false)?.id ?? "",
  );
  const [imageId, setImageId] = useState<string>();
  const variant = product.variants.find((v) => v.id === variantId);
  const variants = product.variants.filter((v) => v.active !== false);
  // Imágenes generales y las de la presentación elegida, en el orden de la API
  // (principal primero); la de la presentación se muestra al elegirla.
  const images = product.media.filter(
    (m) => m.type === "IMAGE" && (!m.variantId || m.variantId === variantId),
  );
  const image =
    images.find((m) => m.id === imageId) ??
    images.find((m) => m.variantId === variantId) ??
    images[0];
  const category = product.categories.at(-1);
  return (
    <>
      <div className="detail-grid">
        <div className="detail-gallery">
          <div
            className="detail-image"
            onPointerMove={(e) => {
              if (e.pointerType !== "mouse") return;
              const r = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty(
                "--zoom-origin",
                `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`,
              );
            }}
          >
            <Picture
              key={image?.id ?? "placeholder"}
              src={image?.url ?? "/images/placeholder.svg"}
              alt={image?.alt || product.name}
            />
          </div>
          {images.length > 1 && (
            <div className="thumbs">
              {images.map((m, index) => (
                <button
                  type="button"
                  key={m.id}
                  aria-label={`Ver imagen ${index + 1} de ${images.length}`}
                  aria-pressed={m.id === image?.id}
                  onClick={() => setImageId(m.id)}
                >
                  <Picture src={m.url} alt="" sizes="96px" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="detail-info">
          <p className="eyebrow detail-eyebrow">
            {product.brand ? (
              <Link href={catalogLink("brandId", product.brand.id)}>
                {product.brand.name}
              </Link>
            ) : (
              product.laboratory?.name
            )}
            {category?.category && (
              <>
                {(product.brand || product.laboratory) && " · "}
                <Link href={catalogLink("categoryId", category.categoryId)}>
                  {category.category.name}
                </Link>
              </>
            )}
          </p>
          <h1>{product.name}</h1>
          <FavoriteButton productId={product.id} name={product.name} className="detail-favorite" />
          {canSeeAdminSection(user, "catalogo") && canEditAdminFeature(user, "catalogo") && (
            <Link href={storeRoutes.adminProduct(product.slug)} className="icon-button detail-edit" title="Editar producto" aria-label="Editar producto">
              <Pencil size={19} />
            </Link>
          )}
          {product.shortDescription &&
            product.shortDescription.trim().toLocaleLowerCase() !==
              product.name.trim().toLocaleLowerCase() && (
              <p className="muted detail-lead">{product.shortDescription}</p>
            )}
          {variant && (
            <div className="detail-availability">
              <span
                className={variant.availableStock > 0 ? "" : "is-unavailable"}
              >
                {variant.availableStock > 0
                  ? "Disponible para pedidos"
                  : "Sin stock"}
              </span>
              <span>SKU {variant.sku}</span>
            </div>
          )}
          <div className="detail-pills">
            {product.newProduct && <span className="status-pill">Nuevo</span>}
            {product.featured && <span className="status-pill">Destacado</span>}
            {product.requiresMedicationPermission && (
              <span className="status-pill pending">Uso profesional</span>
            )}
          </div>
          {variant ? (
            <>
              <div className="detail-variants">
                <p id="presentaciones">
                  {variants.length > 1
                    ? variants.length + " presentaciones"
                    : "Presentación"}
                </p>
                <div role="radiogroup" aria-labelledby="presentaciones">
                  {variants.map((v) => (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={v.id === variantId}
                      key={v.id}
                      onClick={() => {
                        setVariantId(v.id);
                        setImageId(undefined);
                      }}
                    >
                      {v.name}
                      <strong>
                        {v.price
                          ? money(v.price.amount, v.price.currency)
                          : hiddenPriceText(user, product)}
                      </strong>
                      <small>
                        {v.availableStock > 0 ? "Disponible" : "Sin stock"} ·
                        Mín. {firstQuantity(v)}
                      </small>
                    </button>
                  ))}
                </div>
              </div>
              <div className="detail-purchase" id="comprar">
                <div className="detail-price-heading">
                  {variant.price ? (
                    <div>
                      <p className="detail-price-label">Precio por unidad</p>
                      <p className="price">
                        {money(variant.price.amount, variant.price.currency)}
                      </p>
                    </div>
                  ) : (
                    <span />
                  )}
                </div>
                {variant.presentation && (
                  <p className="muted small-copy">{variant.presentation}</p>
                )}
                <BuyForm key={variantId} product={product} variant={variant} />
              </div>
              <p className="detail-assistance">
                ¿Necesitás asesoramiento?{" "}
                <Link href={storeRoutes.contact}>Consultá a DISTRICO</Link>
              </p>
              {user && canBuy(user, product) && (
                <BuyBar variant={variant} target="comprar" />
              )}
            </>
          ) : (
            <p className="panel">
              Este producto todavía no tiene presentaciones disponibles.
            </p>
          )}
          {DEMO && (
            <p className="info-note">
              Nombre e imagen de catálogo público. Precio, stock, permisos y
              presentación comercial son datos de demostración.
            </p>
          )}
          {!DEMO && product.tags?.includes("DATOS_COMERCIALES_FICTICIOS") && (
            <p className="info-note">Precios y stock de demostración. No constituyen una oferta comercial.</p>
          )}
        </div>
      </div>
      <ProductInfo product={product} variant={variant} />
      <RelatedProducts product={product} />
    </>
  );
}
export function ProductDetail({ slug }: { slug: string }) {
  const q = useApi<Product>(`products/${encodeURIComponent(slug)}`);
  return (
    <div className="container section detail-page">
      <div className="breadcrumbs">
        <Link href={storeRoutes.home}>Inicio</Link>
        <ChevronRight size={12} />
        <Link href={storeRoutes.products}>Catálogo</Link>
        <ChevronRight size={12} />
        <span>{q.data?.name ?? "Producto"}</span>
      </div>
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} retry={() => void q.refetch()} />
      ) : (
        <ProductDetailContent key={q.data.id} product={q.data} />
      )}
    </div>
  );
}
