"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ZoomIn,
} from "lucide-react";
import { usePublicApi } from "./providers";
import { CatalogPagination } from "./catalog-pagination";
import {
  BenefitList,
  ProductSections,
  technicalSections,
  type ProductSection,
} from "./product-sheet";
import { ErrorBox, Picture } from "./ui";
import { brandLogoSrc } from "@/lib/brand-logos";
import { catalogCardsPath } from "@/lib/catalog-query";
import { storeRoutes, withSearch } from "@/lib/store-routes";
import { salesLineLabel } from "@/lib/sales-line";
import type {
  Entity,
  Product,
  ProductCardData,
  ProductCardList,
} from "@/lib/types";

export function PublicProductCard({ product }: { product: ProductCardData }) {
  const image = product.media.find((item) => item.type === "IMAGE");
  return (
    <article className="site-product-card">
      <Link
        href={`/productos/${encodeURIComponent(product.slug)}`}
        className="site-product-image"
        aria-label={`Conocer ${product.name}`}
      >
        <Picture
          src={image?.url ?? "/images/placeholder.svg"}
          alt={image?.alt || product.name}
          loading="lazy"
          sizes="(max-width: 640px) 70vw, (max-width: 1024px) 40vw, 24vw"
        />
        {product.featured && (
          <span className="site-product-badge">Destacado</span>
        )}
      </Link>
      <div className="site-product-copy">
        <p className="eyebrow">
          {product.brand?.name ?? product.laboratory?.name ?? "DISTRICO"}
        </p>
        <h3>
          <Link href={`/productos/${encodeURIComponent(product.slug)}`}>
            {product.name}
          </Link>
        </h3>
        <Link
          className="text-link"
          href={`/productos/${encodeURIComponent(product.slug)}`}
        >
          Conocer producto
        </Link>
      </div>
    </article>
  );
}

export function PublicProductSkeletons({ count = 4 }: { count?: number }) {
  return (
    <div
      className="site-product-grid"
      aria-busy="true"
      aria-label="Cargando productos"
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          className="site-product-card site-product-skeleton"
          key={index}
          aria-hidden="true"
        >
          <div className="site-product-image" />
          <div className="site-product-copy">
            <span />
            <span />
            <span />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FeaturedProducts() {
  const featured = usePublicApi<ProductCardList>(
    "products/cards?featured=true&limit=4",
  );
  return (
    <section
      className="site-featured site-section"
      aria-labelledby="featured-title"
    >
      <div className="container">
        <div className="site-section-heading">
          <div>
            <p className="eyebrow">Selección DISTRICO</p>
            <h2 id="featured-title">Productos destacados.</h2>
            <p>
              Conocé algunas de las marcas que acompañan a nuestros clientes.
            </p>
          </div>
          <Link className="button secondary" href="/productos">
            Más productos
          </Link>
        </div>
        {featured.isPending ? (
          <PublicProductSkeletons />
        ) : featured.error ? (
          <ErrorBox
            error={featured.error}
            retry={() => void featured.refetch()}
          />
        ) : featured.data.items.length ? (
          <div className="site-product-grid">
            {featured.data.items.map((product) => (
              <PublicProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="site-empty">
            <p>Estamos preparando nuestra selección destacada.</p>
            <Link className="text-link" href="/productos">
              Explorá todos los productos
            </Link>
          </div>
        )}
        <div className="site-featured-cta">
          <p>Los precios y pedidos están disponibles para cuentas aprobadas.</p>
          <Link href={storeRoutes.login} className="text-link">
            Ingresá para comprar
          </Link>
        </div>
      </div>
    </section>
  );
}

export function PublicCatalog() {
  const router = useRouter();
  const params = useSearchParams();
  const products = usePublicApi<ProductCardList>(catalogCardsPath(params));
  const categories = usePublicApi<Entity[]>("categories/catalog");
  const brands = usePublicApi<Entity[]>("brands");
  const currentPage = Number(params.get("page") ?? 1);
  const page =
    Number.isInteger(currentPage) && currentPage > 0 ? currentPage : 1;
  const pageCount = products.data
    ? Math.max(
        1,
        Math.ceil(products.data.meta.total / products.data.meta.limit),
      )
    : 1;
  const change = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    router.push(withSearch("/productos", next));
  };

  return (
    <div className="site-catalog-page">
      <section className="site-catalog-intro">
        <div className="container">
          <h1>Marcas y productos para cada negocio.</h1>
          <p>
            Explorá el catálogo público. Una cuenta aprobada te permite
            consultar precios y gestionar pedidos.
          </p>
          <Link className="button lime" href={storeRoutes.requestAccount}>
            Solicitar cuenta
          </Link>
        </div>
      </section>
      <div className="container site-catalog-body">
        <form className="site-search" action="/productos">
          <Search size={20} />
          <input
            type="search"
            name="search"
            defaultValue={params.get("search") ?? ""}
            placeholder="Buscar productos"
            aria-label="Buscar productos"
          />
          <button className="button" type="submit">
            Buscar
          </button>
        </form>
        <div className="site-catalog-filters">
          <label>
            Categoría
            <select
              value={params.get("categoryId") ?? ""}
              onChange={(event) => change("categoryId", event.target.value)}
            >
              <option value="">Todas</option>
              {categories.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label id="marcas">
            Marca
            <select
              value={params.get("brandId") ?? ""}
              onChange={(event) => change("brandId", event.target.value)}
            >
              <option value="">Todas</option>
              {brands.data?.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </label>
          {(params.get("categoryId") ||
            params.get("brandId") ||
            params.get("search")) && (
            <Link className="text-link" href="/productos">
              Limpiar filtros
            </Link>
          )}
        </div>
        {(categories.error || brands.error) && (
          <p className="site-data-note">
            Algunos filtros no están disponibles ahora.
          </p>
        )}
        <div className="site-catalog-result">
          <p aria-live="polite">
            {products.data
              ? `${products.data.meta.total} productos`
              : "Explorando el catálogo…"}
          </p>
          <span>Sin precios para visitantes</span>
        </div>
        {products.isPending ? (
          <PublicProductSkeletons count={8} />
        ) : products.error ? (
          <ErrorBox
            error={products.error}
            retry={() => void products.refetch()}
          />
        ) : products.data.items.length ? (
          <div className="site-product-grid">
            {products.data.items.map((product) => (
              <PublicProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="site-empty">
            <p>No encontramos productos con esos filtros.</p>
            <Link className="text-link" href="/productos">
              Ver todo el catálogo
            </Link>
          </div>
        )}
        <CatalogPagination
          page={page}
          totalPages={pageCount}
          onPageChange={(target) => change("page", String(target))}
        />
      </div>
    </div>
  );
}

export function PublicProductDetail({ slug }: { slug: string }) {
  const product = usePublicApi<Product>(`products/${encodeURIComponent(slug)}`);
  const [imageId, setImageId] = useState<string>();
  const sheet = product.data?.technicalSheet ?? {};
  if (product.isPending)
    return (
      <div className="container site-detail-loading">
        <div className="site-detail-image" />
        <div className="site-detail-copy" />
      </div>
    );
  if (product.error)
    return (
      <div className="container site-detail-error">
        <ErrorBox error={product.error} retry={() => void product.refetch()} />
        <Link href="/productos" className="text-link">
          Volver a productos
        </Link>
      </div>
    );
  const item = product.data;
  const images = item.media.filter((media) => media.type === "IMAGE");
  const image = images.find((media) => media.id === imageId) ?? images[0];
  const category = item.categories.at(-1)?.category;
  const owner = item.brand ?? item.laboratory;
  const ownerFilter = owner
    ? `${item.brand ? "brandId" : "laboratoryId"}=${encodeURIComponent(owner.id)}`
    : "";
  const ownerLogo = owner?.imageUrl || brandLogoSrc(item.brand?.slug);
  const presentations = [
    ...new Set(
      item.variants
        .filter((variant) => variant.active !== false)
        .map((variant) => variant.presentation || variant.name),
    ),
  ];
  // Categorías, atributos y línea de venta como etiquetas, sin repetir.
  const tags = [
    ...new Set(
      [
        ...item.categories.map((c) => c.category?.name),
        ...(item.attributes ?? []).map(({ attributeValue }) => attributeValue.value),
        salesLineLabel(item.brand?.salesLine) &&
          `Línea de venta: ${salesLineLabel(item.brand?.salesLine)}`,
      ].filter((tag): tag is string => !!tag),
    ),
  ];
  const description = item.description?.replace(/<[^>]+>/g, " ").trim();
  const sections: ProductSection[] = [
    ...(description
      ? [{
          id: "sobre",
          title: "Sobre el producto",
          body: <p className="product-section-text">{description}</p>,
        }]
      : []),
    ...technicalSections(sheet.technical ?? []),
  ];
  const relatedFilter =
    ownerFilter ||
    (category ? `categoryId=${encodeURIComponent(category.id)}` : "");
  return (
    <>
      <div className="container site-sheet-page">
        <nav className="breadcrumbs" aria-label="Ruta de navegación">
          <Link href="/productos">Productos</Link>
          {category && (
            <>
              <ChevronRight size={13} />
              <Link
                href={`/productos?categoryId=${encodeURIComponent(category.id)}`}
              >
                {category.name}
              </Link>
            </>
          )}
          <ChevronRight size={13} />
          <span aria-current="page">{item.name}</span>
        </nav>
        <article className="site-sheet">
          <div className="site-sheet-media">
            <div
              className="site-sheet-zoom"
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
                alt={image?.alt || item.name}
                sizes="(max-width: 940px) 80vw, 560px"
                fetchPriority="high"
              />
              <span className="site-sheet-zoom-badge" aria-hidden="true">
                <ZoomIn size={20} />
              </span>
            </div>
            {images.length > 1 && (
              <ul className="site-sheet-thumbs">
                {images.map((media, index) => (
                  <li key={media.id}>
                    <button
                      type="button"
                      aria-label={`Ver imagen ${index + 1} de ${images.length}`}
                      aria-pressed={media.id === image?.id}
                      onClick={() => setImageId(media.id)}
                    >
                      <Picture src={media.url} alt="" sizes="72px" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="site-sheet-info">
            {owner && (
              <div className="site-sheet-brand">
                {ownerLogo ? (
                  <Picture src={ownerLogo} alt={owner.name} sizes="160px" />
                ) : (
                  <strong>{owner.name}</strong>
                )}
                <Link href={`/productos?${ownerFilter}`}>
                  Ver toda la línea {owner.name}
                </Link>
              </div>
            )}
            <h1>{item.name}</h1>
            {item.shortDescription &&
              item.shortDescription.trim().toLocaleLowerCase() !==
                item.name.trim().toLocaleLowerCase() && (
                <p className="site-sheet-lead">{item.shortDescription}</p>
              )}
            {tags.length > 0 && (
              <ul className="site-sheet-tags" aria-label="Clasificación">
                {tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            )}
            {sheet.benefits?.length ? (
              <div>
                <p className="site-sheet-label">Beneficios</p>
                <BenefitList benefits={sheet.benefits} className="site-sheet-benefits" />
              </div>
            ) : null}
            {presentations.length > 0 && (
              <div>
                <p className="site-sheet-label">Presentaciones</p>
                <ul className="site-sheet-chips">
                  {presentations.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </div>
            )}
            <section className="site-sheet-cta" aria-labelledby="site-sheet-cta-title">
              <h2 id="site-sheet-cta-title">¿Tenés un comercio? Pedilo a DISTRICO</h2>
              <p className="site-sheet-note">
                Precios mayoristas, stock y pedidos online para comercios con
                cuenta aprobada.
              </p>
              <div className="site-sheet-cta-actions">
                <Link className="button lime" href={storeRoutes.requestAccount}>
                  Solicitar cuenta
                </Link>
                <Link className="button site-sheet-ghost" href={storeRoutes.login}>
                  Ya soy cliente: ingresar
                </Link>
              </div>
              <p className="site-sheet-cta-help">
                ¿Buscás dónde comprarlo? <Link href="/contacto">Escribinos</Link>
              </p>
            </section>
          </div>
        </article>
        {sections.length > 0 && (
          <section className="site-sheet-detail" aria-labelledby="site-sheet-detail-title">
            <h2 id="site-sheet-detail-title">Información del producto</h2>
            <ProductSections sections={sections} />
          </section>
        )}
      </div>
      {relatedFilter && (
        <PublicRelatedProducts
          title={owner ? `Más de ${owner.name}` : "Productos recomendados"}
          filter={relatedFilter}
          exclude={item.id}
        />
      )}
    </>
  );
}

function PublicRelatedProducts({
  title,
  filter,
  exclude,
}: {
  title: string;
  filter: string;
  exclude: string;
}) {
  const related = usePublicApi<ProductCardList>(
    `products/cards?${filter}&limit=12`,
  );
  const track = useRef<HTMLUListElement>(null);
  const items = related.data?.items.filter((p) => p.id !== exclude) ?? [];
  // Complementaria: sin datos, con error o sin otros productos no se muestra.
  if (!items.length) return null;
  const step = (direction: number) => {
    const card = track.current?.firstElementChild as HTMLElement | null;
    if (card)
      track.current?.scrollBy({ left: direction * (card.offsetWidth + 16) });
  };
  return (
    <section className="site-related" aria-labelledby="related-title">
      <div className="container">
        <div className="site-related-head">
          <h2 id="related-title">{title}</h2>
          {items.length > 1 && (
            <div className="site-related-controls">
              <button
                type="button"
                aria-label="Productos anteriores"
                aria-controls="related-track"
                onClick={() => step(-1)}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                aria-label="Productos siguientes"
                aria-controls="related-track"
                onClick={() => step(1)}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
        <ul
          className="site-related-track"
          id="related-track"
          ref={track}
          tabIndex={0}
          aria-label={title}
        >
          {items.map((p) => (
            <li key={p.id}>
              <PublicProductCard product={p} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
