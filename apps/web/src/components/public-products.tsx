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
import { TechnicalAccordions } from "./product-sheet";
import { ErrorBox, Picture } from "./ui";
import { benefitIcons } from "@/lib/benefit-icons";
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
  const presentations = [
    ...new Set(
      item.variants
        .filter((variant) => variant.active !== false)
        .map((variant) => variant.presentation || variant.name),
    ),
  ];
  const attributes = item.attributes ?? [];
  const description = item.description?.replace(/<[^>]+>/g, " ").trim();
  const technical = sheet.technical ?? [];
  const benefits = (sheet.benefits ?? []).filter((b) => benefitIcons[b.icon]);
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
          <span>{item.name}</span>
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
                sizes="(max-width: 940px) 92vw, 500px"
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
            {category && <p className="eyebrow">{category.name}</p>}
            <h1>{item.name}</h1>
            {owner && (
              <p className="site-sheet-brand">
                {item.brand ? "Marca" : "Laboratorio"}{" "}
                <Link href={`/productos?${ownerFilter}`}>{owner.name}</Link>
              </p>
            )}
            {item.shortDescription && (
              <p className="site-sheet-lead">{item.shortDescription}</p>
            )}
            {salesLineLabel(item.brand?.salesLine) && (
              <p className="site-sheet-brand">Línea de venta: {salesLineLabel(item.brand?.salesLine)}</p>
            )}
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
            {(benefits.length > 0 || attributes.length > 0) && (
              <div className="site-sheet-features">
                <p className="site-sheet-label">Características principales</p>
                {benefits.length > 0 && (
                  <ul className="site-sheet-benefits">
                    {benefits.map((benefit) => (
                      <li key={benefit.label}>
                        <svg
                          viewBox="0 0 64 64"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                          focusable="false"
                          // Trazos fijos de src/lib/benefit-icons.ts, no datos externos.
                          dangerouslySetInnerHTML={{
                            __html: benefitIcons[benefit.icon],
                          }}
                        />
                        <span>{benefit.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {attributes.length > 0 && (
                  <dl>
                    {attributes.map(({ attributeValue }) => (
                      <div key={attributeValue.id}>
                        <dt>{attributeValue.attribute.name}</dt>
                        <dd>{attributeValue.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            )}
            <div className="actions site-sheet-cta">
              <Link className="button lime" href={storeRoutes.login}>
                Ingresar para ver precios
              </Link>
              <Link
                className="button secondary"
                href={storeRoutes.requestAccount}
              >
                Solicitar cuenta
              </Link>
            </div>
            <p className="site-sheet-note">
              DISTRICO distribuye a comercios: precios y pedidos solo con una
              cuenta aprobada.
            </p>
          </div>
        </article>
        {(description || technical.length > 0) && (
          <section
            className={`site-sheet-detail${description && technical.length ? " is-split" : ""}`}
          >
            {description && (
              <div>
                <h2>Sobre el producto</h2>
                <p>{description}</p>
              </div>
            )}
            {technical.length > 0 && (
              <div>
                <h2>Información técnica</h2>
                <TechnicalAccordions blocks={technical} />
              </div>
            )}
          </section>
        )}
      </div>
      {(category || owner) && (
        <PublicRelatedProducts
          filter={
            category
              ? `categoryId=${encodeURIComponent(category.id)}`
              : ownerFilter
          }
          exclude={item.id}
        />
      )}
    </>
  );
}

function PublicRelatedProducts({
  filter,
  exclude,
}: {
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
          <h2 id="related-title">Productos recomendados</h2>
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
          aria-label="Productos recomendados"
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
