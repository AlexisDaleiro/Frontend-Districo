"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  PackageCheck,
  Handshake,
  ShieldCheck,
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
            <p>Una solución para cada necesidad.</p>
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
              Explorá el catálogo completo <ArrowUpRight size={16} />
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
        <div className="benefits">
          <div>
            <PackageCheck size={24} />
            <span>
              <strong>Selección mayorista</strong>Productos para tu negocio
            </span>
          </div>
          <div>
            <ShieldCheck size={24} />
            <span>
              <strong>Marcas de confianza</strong>Calidad y respaldo
            </span>
          </div>
          <div>
            <Handshake size={24} />
            <span>
              <strong>Atención cercana</strong>Te acompañamos a crecer
            </span>
          </div>
        </div>
        {lines.length > 0 && (
          <section className="section">
            <div className="section-title">
              <div>
                <p className="eyebrow">Un catálogo, muchas posibilidades</p>
                <h2>Encontrá tu próxima solución.</h2>
              </div>
              <Link className="text-link" href={storeRoutes.products}>
                Ver todo <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="line-grid">
              {lines.map((n, i) => (
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
                  <p className="eyebrow">0{i + 1} / Nuestras líneas</p>
                  <h3>
                    {n.name === "Alimentación"
                      ? "Bienestar animal"
                      : n.name === "Veterinaria"
                        ? "Cuidado profesional"
                        : "Pequeños gustos"}
                  </h3>
                  <p>
                    {n.name === "Alimentación"
                      ? "Nutrición para cada etapa."
                      : n.name === "Veterinaria"
                        ? "Soluciones para el cuidado animal."
                        : "Snacks para disfrutar y compartir."}
                  </p>
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
              Marcas que forman parte de cada día
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
                Conocé todas <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      )}
      <div className="container">
        <section className="section">
          <div className="section-title">
            <div>
              <p className="eyebrow">Para tener en cuenta</p>
              <h2>Una selección para tu negocio.</h2>
              <p className="muted">
                Explorá las presentaciones y encontrá lo que necesitás.
              </p>
            </div>
            <Link className="text-link" href={storeRoutes.products}>
              Ver catálogo <ArrowUpRight size={16} />
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
              Estamos preparando nuestra selección. Explorá el catálogo
              completo.
            </p>
          )}
        </section>
        {!user && (
          <section className="cta-band" style={{ marginBottom: 64 }}>
            <div>
              <p className="eyebrow">Tu negocio, nuestro compromiso</p>
              <h2>El próximo paso lo damos juntos.</h2>
              <p>
                Accedé al catálogo mayorista y gestioná tus pedidos en un solo
                lugar.
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
