"use client";
import Link from "next/link";
import {
  ArrowUpRight,
} from "lucide-react";
import {
  apiQueryKey,
  request,
  useApi,
  usePublicApi,
  useSession,
} from "./providers";
import type { Entity, ProductCardList } from "@/lib/types";
import { Picture, ActionLink, ErrorBox, Loading } from "./ui";
import { ProductGrid } from "./catalog";
import { BrandLogo } from "./brand-logo";
import { HomeCarousel } from "./home-carousel";
import { useQueryClient } from "@tanstack/react-query";
import { catalogCardsPath } from "@/lib/catalog-query";
import { storeRoutes, withSearch } from "@/lib/store-routes";
import { needs, mappedNeeds } from "@/lib/needs";
export function Home() {
  const { user, loading } = useSession();
  const client = useQueryClient();
  const prefetchCategory = (id: string) => {
    if (loading) return;
    const path = catalogCardsPath(new URLSearchParams({ categoryId: id }));
    void client.prefetchQuery({
      queryKey: apiQueryKey(path, user?.id),
      queryFn: () => request<ProductCardList>(path),
      staleTime: 20_000,
    });
  };
  const categories = usePublicApi<Entity[]>("categories/catalog"),
    featured = useApi<ProductCardList>("products/cards?featured=true&limit=4"),
    brands = usePublicApi<Entity[]>("brands");
  // Solo se muestran necesidades que coinciden con una categoría existente.
  const mapped = mappedNeeds(categories.data);
  const lines = mapped.filter((n) =>
    ["Alimentación", "Veterinaria", "Snacks"].includes(n.name),
  );
  return (
    <>
      <div className="container home-container">
        <section className="needs" aria-label="Comprar por necesidad">
          <div className="needs-intro">
            <strong>¿Qué estás buscando?</strong>
          </div>
          {categories.error ? (
            <ErrorBox
              error={categories.error}
              retry={() => void categories.refetch()}
            />
          ) : categories.isPending ? (
            // Misma forma que la lista real: evita que el banner se desplace
            // cuando llegan las categorías.
            <div className="need-list" aria-busy="true" aria-label="Cargando">
              {needs.map((n) => (
                <span className="need" key={n.name} aria-hidden="true">
                  <span className="need-circle" />
                  <span className="need-skeleton" />
                </span>
              ))}
            </div>
          ) : !mapped.length ? (
            <Link className="text-link" href={storeRoutes.products}>
              Explorá el catálogo completo
            </Link>
          ) : (
            <div className="need-list">
              {mapped.map((n) => (
                <Link
                  href={storeRoutes.category(n.id)}
                  className="need"
                  key={n.id}
                  onMouseEnter={() => prefetchCategory(n.id)}
                  onFocus={() => prefetchCategory(n.id)}
                >
                  <span className="need-circle">
                    <Picture src={n.image} alt="" sizes="120px" />
                  </span>
                  {n.name}
                </Link>
              ))}
            </div>
          )}
        </section>
        <HomeCarousel brands={brands.data} />
        {lines.length > 0 && (
          <section className="section">
            <div className="section-title">
              <div>
                <h2>Líneas de producto</h2>
              </div>
              <Link className="text-link" href={storeRoutes.products}>
                Ver todo
              </Link>
            </div>
            <div className="line-grid">
              {lines.map((n) => (
                <Link
                  className="line-card"
                  key={n.id}
                  href={storeRoutes.category(n.id)}
                  onMouseEnter={() => prefetchCategory(n.id)}
                  onFocus={() => prefetchCategory(n.id)}
                >
                  <Picture
                    src={n.image}
                    alt=""
                    loading="lazy"
                    sizes="(max-width: 767px) 100vw, 33vw"
                  />
                  <h3>{n.name}</h3>
                  <span className="round-arrow">
                    <ArrowUpRight size={18} />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
      {!!brands.data?.length && (
        <section className="brand-strip">
          <div className="container">
            <p
              className="eyebrow"
              style={{ textAlign: "center", marginBottom: 28 }}
            >
              Marcas que distribuimos
            </p>
            <div className="brand-list">
              {brands.data.slice(0, 6).map((b) => (
                <Link
                  className="brand-word"
                  key={b.id}
                  href={withSearch(storeRoutes.products, new URLSearchParams({ brandId: b.id }))}
                >
                  <BrandLogo brand={b} />
                </Link>
              ))}
              <Link className="text-link" href={storeRoutes.brands}>
                Conocé todas
              </Link>
            </div>
          </div>
        </section>
      )}
      <div className="container">
        <section className="section">
          <div className="section-title">
            <div>
              <h2>Productos destacados</h2>
            </div>
            <Link className="text-link" href={storeRoutes.products}>
              Ver catálogo
            </Link>
          </div>
          {featured.isPending ? (
            <Loading />
          ) : featured.error ? (
            <ErrorBox
              error={featured.error}
              retry={() => void featured.refetch()}
            />
          ) : featured.data.items.length ? (
            <ProductGrid products={featured.data.items} />
          ) : (
            <p className="muted">
              Todavía no hay productos destacados.
            </p>
          )}
        </section>
        {!user && (
          <section className="cta-band" style={{ marginBottom: 64 }}>
            <div>
              <h2>¿Todavía no tenés cuenta?</h2>
              <p>
                Con una cuenta aprobada ves precios y stock, y hacés tus
                pedidos desde acá.
              </p>
            </div>
            <ActionLink href={storeRoutes.requestAccount} secondary>
              Quiero ser cliente
            </ActionLink>
          </section>
        )}
      </div>
    </>
  );
}
