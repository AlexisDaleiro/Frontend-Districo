"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { apiQueryKey, request, useApi, useSession, DEMO } from "./providers";
import { canonicalCategoryIds, catalogCardsPath } from "@/lib/catalog-query";
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
  const variant = product.variants.find((v) => v.active !== false);
  const price = variant?.price;
  const { user } = useSession();
  const client = useQueryClient();
  const prefetchDetail = () => {
    const path = `products/${encodeURIComponent(product.slug)}`;
    void client.prefetchQuery({
      queryKey: apiQueryKey(path, user?.id),
      queryFn: () => request<Product>(path),
      staleTime: 20_000,
    });
  };
  return (
    <article
      className="product-card"
      onMouseEnter={prefetchDetail}
      onFocus={prefetchDetail}
    >
      <Link
        href={`/producto/${product.slug}`}
        className="product-image"
        aria-label={`Ver ${product.name}`}
      >
        <span className="tag">
          {product.requiresMedicationPermission
            ? "Uso profesional"
            : product.featured
              ? "Selección DISTRICO"
              : "Catálogo"}
        </span>
        <Picture
          src={
            product.media.find((m) => m.type === "IMAGE")?.url ??
            "/images/placeholder.svg"
          }
          alt={product.name}
          loading="lazy"
          sizes="(max-width: 767px) 50vw, 300px"
        />
      </Link>
      <p className="product-meta">
        {product.brand?.name ??
          product.laboratory?.name ??
          "Selección mayorista"}
      </p>
      <Link href={`/producto/${product.slug}`}>
        <h3>{product.name}</h3>
      </Link>
      <div className="product-bottom">
        {price ? (
          <strong>{money(price.amount, price.currency)}</strong>
        ) : (
          <span className="row" style={{ gap: 5 }}>
            <LockKeyhole size={12} />
            {variant ? hiddenPriceText(user, product) : "Sin presentaciones"}
          </span>
        )}
        <Link
          href={`/producto/${product.slug}`}
          className="icon-button"
          aria-label={`Ver presentaciones de ${product.name}`}
        >
          <ArrowUpRight size={16} />
        </Link>
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
export function Catalog() {
  const params = useSearchParams(),
    router = useRouter();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const client = useQueryClient();
  const { user, loading } = useSession();
  const products = useApi<ProductCardList>(catalogCardsPath(params)),
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
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    if (key === "categoryId") prefetchCategory(next);
    router.push(`/catalogo?${next}`, { scroll: false });
  }
  const categoryIds = canonicalCategoryIds(
    categories.data ?? [],
    (params.get("categoryId") ?? "").split(",").filter(Boolean),
  );
  const filterContent = (
    <>
      <div className="filter-section">
        <h3>Categorías</h3>
        {!!categories.data?.length && (
          <CategoryPicker
            categories={categories.data}
            selected={categoryIds}
            onChange={(ids) => set("categoryId", ids.join(","))}
            onPreview={(id) => {
              const next = new URLSearchParams(params);
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
      </div>
      {[
        ["brandId", "Marcas", brands.data],
        ["laboratoryId", "Laboratorios", labs.data],
      ].map(([key, title, items]) => (
        <div className="filter-section" key={String(key)}>
          <h3>{String(title)}</h3>
          <select
            className="form-input"
            aria-label={String(title)}
            value={params.get(String(key)) ?? ""}
            onChange={(e) => set(String(key), e.target.value)}
          >
            <option value="">Todos</option>
            {(items as Entity[] | undefined)?.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>
      ))}
      {attributes.data?.map((a) => (
        <div className="filter-section" key={a.id}>
          <h3>{a.name}</h3>
          {a.values.map((v) => (
            <label className="filter-option" key={v.id}>
              <input
                type="checkbox"
                checked={(params.get("attributeValueIds") ?? "")
                  .split(",")
                  .includes(v.id)}
                onChange={(e) => {
                  const ids = (params.get("attributeValueIds") ?? "")
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
        </div>
      ))}
      <button
        className="text-link"
        style={{ marginTop: 20 }}
        onClick={() => router.push("/catalogo", { scroll: false })}
      >
        Limpiar filtros <X size={14} />
      </button>
    </>
  );
  return (
    <div className="container section">
      <div className="breadcrumbs">
        <Link href="/">Inicio</Link>
        <ChevronRight size={12} />
        <span>Catálogo</span>
      </div>
      <PageHeading eyebrow="Todo para tu negocio" title="Nuestro catálogo">
        Encontrá la solución indicada, con el respaldo de nuestras marcas.
      </PageHeading>
      <div className="catalog-layout">
        <aside className="filters" aria-label="Filtros del catálogo">
          {filterContent}
        </aside>
        <div>
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
                key={params.get("search")}
                className="form-input"
                aria-label="Buscar en el catálogo"
                name="search"
                placeholder="Nombre o código de producto"
                defaultValue={params.get("search") ?? ""}
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
              .filter((key) => params.has(key))
              .map((key) => (
                <button className="chip" key={key} onClick={() => set(key, "")}>
                  {[
                    ...(categories.data ?? []),
                    ...(brands.data ?? []),
                    ...(labs.data ?? []),
                  ].find((e) => e.id === params.get(key))?.name ??
                    (key === "featured"
                      ? "Destacados"
                      : key === "productType"
                        ? label(params.get(key) ?? "")
                        : key === "attributeValueIds"
                          ? (params.get(key) ?? "")
                              .split(",")
                              .map(
                                (id) =>
                                  attributes.data
                                    ?.flatMap((a) => a.values)
                                    .find((v) => v.id === id)?.value,
                              )
                              .filter(Boolean)
                              .join(", ") || "Atributos"
                          : params.get(key))}
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
              <ActionLink href="/catalogo">Ver todo el catálogo</ActionLink>
            </Empty>
          ) : (
            <>
              <ProductGrid products={products.data.items} />
              <div className="pagination">
                <button
                  className="button secondary small"
                  disabled={products.data.meta.page <= 1}
                  onClick={() =>
                    set("page", String(products.data.meta.page - 1))
                  }
                >
                  Anterior
                </button>
                <span>
                  {products.data.meta.page} /{" "}
                  {Math.max(
                    1,
                    Math.ceil(
                      products.data.meta.total / products.data.meta.limit,
                    ),
                  )}
                </span>
                <button
                  className="button secondary small"
                  disabled={
                    products.data.meta.page * products.data.meta.limit >=
                    products.data.meta.total
                  }
                  onClick={() =>
                    set("page", String(products.data.meta.page + 1))
                  }
                >
                  Siguiente
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <Modal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filtrar productos"
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
          <ActionLink href="/ingresar">Ingresar</ActionLink>
          <Link className="text-link" href="/solicitar-cuenta">
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
        <Link className="text-link" href="/contacto">
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
        <Link className="text-link" href="/contacto">
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
        <Link className="text-link" href="/carrito">
          <Check size={16} />
          Ver mi carrito
        </Link>
      )}
    </div>
  );
}
function ProductDetailContent({ product }: { product: Product }) {
  const [variantId, setVariantId] = useState(
    product.variants.find((v) => v.active !== false)?.id ?? "",
  );
  const [imageId, setImageId] = useState<string>();
  const variant = product.variants.find((v) => v.id === variantId);
  // Imágenes generales y las de la presentación elegida, en el orden de la API
  // (principal primero); la de la presentación se muestra al elegirla.
  const images = product.media.filter(
    (m) => m.type === "IMAGE" && (!m.variantId || m.variantId === variantId),
  );
  const image =
    images.find((m) => m.id === imageId) ??
    images.find((m) => m.variantId === variantId) ??
    images[0];
  return (
    <div className="detail-grid">
      <div>
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
        <p className="eyebrow">
          {product.brand?.name ??
            product.laboratory?.name ??
            product.categories[0]?.category?.name}
        </p>
        <h1>{product.name}</h1>
        <p className="muted small-copy">{product.shortDescription}</p>
        {variant && (
          <>
            <div className="row" style={{ marginTop: 20 }}>
              <span
                className={`status-pill${variant.availableStock > 0 ? "" : " pending"}`}
              >
                {variant.availableStock > 0 ? "Disponible" : "Sin stock"}
              </span>
              <span className="muted small-copy">SKU {variant.sku}</span>
            </div>
            {variant.price && (
              <p className="price">
                {money(variant.price.amount, variant.price.currency)}
              </p>
            )}
            <label className="field" style={{ marginTop: 22 }}>
              Presentación
              <select
                value={variantId}
                onChange={(e) => {
                  setVariantId(e.target.value);
                  setImageId(undefined);
                }}
              >
                {product.variants
                  .filter((v) => v.active !== false)
                  .map((v) => (
                    <option value={v.id} key={v.id}>
                      {v.name}
                    </option>
                  ))}
              </select>
            </label>
            {variant.presentation && (
              <p className="muted small-copy" style={{ marginTop: 8 }}>
                {variant.presentation}
              </p>
            )}
            <BuyForm key={variantId} product={product} variant={variant} />
          </>
        )}
        {!variant && (
          <p className="panel">
            Este producto todavía no tiene presentaciones disponibles.
          </p>
        )}
        <div style={{ marginTop: 30 }}>
          <h3>Acerca del producto</h3>
          <p
            className="small-copy muted"
            style={{ marginTop: 12, whiteSpace: "pre-line" }}
          >
            {product.description?.replace(/<[^>]+>/g, " ") ||
              "Consultá a DISTRICO para obtener más información."}
          </p>
          {product.sourceUrl && (
            <a
              className="text-link"
              style={{ marginTop: 12 }}
              href={product.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Información del proveedor <ArrowUpRight size={14} />
            </a>
          )}
        </div>
        {DEMO && (
          <p className="info-note">
            Nombre e imagen de catálogo público. Precio, stock, permisos y
            presentación comercial son datos de demostración.
          </p>
        )}
      </div>
    </div>
  );
}
export function ProductDetail({ slug }: { slug: string }) {
  const q = useApi<Product>(`products/${encodeURIComponent(slug)}`);
  return (
    <div className="container section">
      <div className="breadcrumbs">
        <Link href="/">Inicio</Link>
        <ChevronRight size={12} />
        <Link href="/catalogo">Catálogo</Link>
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
