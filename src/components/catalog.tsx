"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  LockKeyhole,
  SlidersHorizontal,
  X,
  Minus,
  Plus,
  Check,
  ChevronRight,
  ShoppingBag,
} from "lucide-react";
import { request, useApi, useSession, DEMO } from "./providers";
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
  ProductList,
  Variant,
} from "@/lib/types";
import { can, firstQuantity, money, quantityError } from "@/lib/commerce";
export function ProductCard({ product }: { product: Product }) {
  const variant = product.variants.find((v) => v.active !== false);
  const price = variant?.price;
  const { user } = useSession();
  return (
    <article className="product-card">
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
            {user ? "Consultar disponibilidad" : "Ingresá para ver precios"}
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
export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="product-grid">
      {products.map((p) => (
        <ProductCard product={p} key={p.id} />
      ))}
    </div>
  );
}
export function Catalog() {
  const params = useSearchParams(),
    router = useRouter();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtered = new URLSearchParams();
  for (const key of [
    "search",
    "categoryId",
    "brandId",
    "laboratoryId",
    "attributeValueIds",
    "page",
    "featured",
    "productType",
  ]) {
    const value = params.get(key);
    if (value) filtered.set(key, value);
  }
  filtered.set("limit", "12");
  const products = useApi<ProductList>(`products?${filtered}`),
    categories = useApi<Entity[]>("categories"),
    brands = useApi<Entity[]>("brands"),
    labs = useApi<Entity[]>("laboratories"),
    attributes = useApi<Attribute[]>("attributes");
  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    router.push(`/catalogo?${next}`, { scroll: false });
  }
  const filterContent = (
    <>
      <div className="filter-section">
        <h3>Categorías</h3>
        {categories.data?.map((c) => (
          <label className="filter-option" key={c.id}>
            <input
              type="radio"
              name="categoryId"
              checked={params.get("categoryId") === c.id}
              onChange={() => set("categoryId", c.id)}
            />
            {c.name}
          </label>
        ))}
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
            {[
              "search",
              "categoryId",
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
                      : key === "attributeValueIds"
                        ? "Atributos"
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
                  {Math.max(1, Math.ceil(products.data.meta.total / 12))}
                </span>
                <button
                  className="button secondary small"
                  disabled={
                    products.data.meta.page * 12 >= products.data.meta.total
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
        min={variant.minimumOrderQuantity}
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
  if (
    (product.requiresMedicationPermission &&
      !can(user, "CAN_BUY_MEDICATIONS")) ||
    !can(user, "CAN_PLACE_ORDERS")
  )
    return (
      <div className="detail-buy">
        <LockKeyhole size={20} />
        <p>Tu cuenta no está habilitada para comprar este producto.</p>
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
  const [image, setImage] = useState(
    product.media.find((m) => m.type === "IMAGE")?.url,
  );
  const variant = product.variants.find((v) => v.id === variantId);
  const images = product.media.filter((m) => m.type === "IMAGE");
  return (
    <div className="detail-grid">
      <div>
        <div className="detail-image">
          <Picture
            src={image ?? "/images/placeholder.svg"}
            alt={product.name}
          />
        </div>
        <div className="thumbs">
          {images.map((m) => (
            <button
              key={m.id}
              aria-label={`Ver imagen ${m.alt ?? product.name}`}
              onClick={() => setImage(m.url)}
            >
              <Picture src={m.url} alt="" />
            </button>
          ))}
        </div>
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
              <span className="status-pill">
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
                onChange={(e) => setVariantId(e.target.value)}
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
