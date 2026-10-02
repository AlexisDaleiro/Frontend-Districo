"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { usePublicApi } from "./providers";
import { ErrorBox, Picture } from "./ui";
import { catalogCardsPath } from "@/lib/catalog-query";
import { storeRoutes, withSearch } from "@/lib/store-routes";
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
          Conocer producto <ArrowUpRight size={16} />
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
            Más productos <ArrowRight size={17} />
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
              Explorá todos los productos <ArrowRight size={16} />
            </Link>
          </div>
        )}
        <div className="site-featured-cta">
          <p>Los precios y pedidos están disponibles para cuentas aprobadas.</p>
          <Link href={storeRoutes.login} className="text-link">
            Ingresá para comprar <ArrowUpRight size={16} />
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
          <p className="eyebrow">Nuestras líneas</p>
          <h1>Marcas y productos para cada negocio.</h1>
          <p>
            Explorá el catálogo público. Una cuenta aprobada te permite
            consultar precios y gestionar pedidos.
          </p>
          <Link className="button lime" href={storeRoutes.requestAccount}>
            Solicitar cuenta <ArrowRight size={17} />
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
              Ver todo el catálogo <ArrowRight size={16} />
            </Link>
          </div>
        )}
        {pageCount > 1 && (
          <nav className="site-pagination" aria-label="Páginas del catálogo">
            <button
              className="button secondary"
              disabled={page <= 1}
              onClick={() => change("page", String(page - 1))}
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <span>
              Página {page} de {pageCount}
            </span>
            <button
              className="button secondary"
              disabled={page >= pageCount}
              onClick={() => change("page", String(page + 1))}
            >
              Siguiente <ChevronRight size={16} />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}

export function PublicProductDetail({ slug }: { slug: string }) {
  const product = usePublicApi<Product>(`products/${encodeURIComponent(slug)}`);
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
  const image = item.media.find((media) => media.type === "IMAGE");
  return (
    <div className="container site-detail-page">
      <nav className="breadcrumbs" aria-label="Ruta de navegación">
        <Link href="/">Inicio</Link>
        <ChevronRight size={13} />
        <Link href="/productos">Productos</Link>
        <ChevronRight size={13} />
        <span>{item.name}</span>
      </nav>
      <div className="site-detail-grid">
        <div className="site-detail-image">
          <Picture
            src={image?.url ?? "/images/placeholder.svg"}
            alt={image?.alt || item.name}
            sizes="(max-width: 800px) 100vw, 50vw"
          />
        </div>
        <div className="site-detail-copy">
          <p className="eyebrow">
            {item.brand?.name ?? item.laboratory?.name ?? "DISTRICO"}
          </p>
          <h1>{item.name}</h1>
          {item.shortDescription && (
            <p className="site-detail-lead">{item.shortDescription}</p>
          )}
          {item.description && (
            <p>{item.description.replace(/<[^>]+>/g, " ")}</p>
          )}
          <div className="site-detail-access">
            <p>
              Ingresá con una cuenta aprobada para consultar precios,
              presentaciones y hacer pedidos.
            </p>
            <div className="actions">
              <Link className="button lime" href={storeRoutes.login}>
                Ingresar <ArrowRight size={17} />
              </Link>
              <Link
                className="button secondary"
                href={storeRoutes.requestAccount}
              >
                Solicitar cuenta
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
