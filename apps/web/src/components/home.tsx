"use client";
import Link from "next/link";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  apiQueryKey,
  request,
  useApi,
  usePublicApi,
  useSession,
} from "./providers";
import type { Entity, ProductCardData, ProductCardList } from "@/lib/types";
import { Picture, ActionLink, ErrorBox, Loading } from "./ui";
import { ProductCard } from "./catalog";
import { HomeCarousel } from "./home-carousel";
import { useQueryClient } from "@tanstack/react-query";
import { catalogCardsPath } from "@/lib/catalog-query";
import { catalogCategoryKind } from "@/lib/catalog-navigation";
import { storeRoutes, withSearch } from "@/lib/store-routes";
import { mappedNeeds } from "@/lib/needs";
import {
  SpeciesArt,
  TileArt,
  TypeIcon,
  productTypeLinks,
  type SpeciesKind,
  type TileKind,
} from "./store-art";

// Color de fondo de la mitad clara (--lime-soft) para los cortes del dibujo.
const LIME_SOFT = "#f1f5d1";

// La API no tiene subcategorías por especie: los accesos filtran la categoría
// raíz por tipo de producto (`productType`) o por búsqueda en el nombre.
const speciesCards: {
  kind: string;
  main: SpeciesKind;
  sub: SpeciesKind;
  subName: string;
  subSearch: string;
}[] = [
  { kind: "perros", main: "dog", sub: "puppy", subName: "Cachorros", subSearch: "cachorro" },
  { kind: "gatos", main: "cat", sub: "kitten", subName: "Gatitos", subSearch: "gatito" },
];
const speciesTypes = ["FOOD", "SUPPLEMENT", "HYGIENE", "ACCESSORY"];

const categoryTiles: { kind: string; species?: SpeciesKind; tile?: TileKind }[] = [
  { kind: "pequenos animales", species: "rabbit" },
  { kind: "ganaderia", species: "cow" },
  { kind: "farmacia", tile: "pharmacy" },
  { kind: "consumo humano", tile: "human" },
];

export function Home() {
  const { user, loading } = useSession();
  const client = useQueryClient();
  const prefetch = (params: URLSearchParams) => {
    if (loading) return;
    const path = catalogCardsPath(params);
    void client.prefetchQuery({
      queryKey: apiQueryKey(path, user?.id),
      queryFn: () => request<ProductCardList>(path),
      staleTime: 20_000,
    });
  };
  const categories = usePublicApi<Entity[]>("categories/catalog"),
    featured = useApi<ProductCardList>("products/cards?featured=true&limit=10"),
    brands = usePublicApi<Entity[]>("brands");
  // Mismas categorías raíz activas que la navegación del catálogo.
  const roots = mappedNeeds(categories.data);
  const root = (kind: string) =>
    roots.find((c) => catalogCategoryKind(c.name) === kind);
  const categoryLink = (id: string, extra?: Record<string, string>) => {
    const params = new URLSearchParams({ categoryId: id, ...extra });
    return {
      href: extra
        ? withSearch(storeRoutes.products, params)
        : storeRoutes.category(id),
      onMouseEnter: () => prefetch(params),
      onFocus: () => prefetch(params),
    };
  };
  const brandHref = (kind: string) => {
    const brand = brands.data?.find((b) => catalogCategoryKind(b.name) === kind);
    return brand
      ? withSearch(storeRoutes.products, new URLSearchParams({ brandId: brand.id }))
      : storeRoutes.brands;
  };
  return (
    <div className="container home-container">
      <HomeCarousel brands={brands.data} />
      {categories.error ? (
        <ErrorBox
          error={categories.error}
          retry={() => void categories.refetch()}
        />
      ) : (
        <section
          className="species-shortcuts"
          aria-label="Comprar por especie"
          aria-busy={categories.isPending}
        >
          <div className="species-grid">
            {speciesCards.map((s) => {
              if (categories.isPending)
                return (
                  <div
                    className="species-card species-skeleton"
                    key={s.kind}
                    aria-hidden="true"
                  />
                );
              const category = root(s.kind);
              if (!category) return null;
              return (
                <div className="species-card" key={s.kind}>
                  <div className="species-head">
                    <Link className="species-main" {...categoryLink(category.id)}>
                      <SpeciesArt kind={s.main} />
                      {category.name}
                    </Link>
                    <Link
                      className="species-sub"
                      {...categoryLink(category.id, { search: s.subSearch })}
                    >
                      <SpeciesArt kind={s.sub} ground={LIME_SOFT} />
                      {s.subName}
                    </Link>
                  </div>
                  <ul className="species-types">
                    {speciesTypes.map((type) => (
                      <li key={type}>
                        <Link {...categoryLink(category.id, { productType: type })}>
                          <TypeIcon type={type} />
                          {productTypeLinks.find((t) => t.type === type)?.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <div className="category-tiles">
            <Link
              className="category-tile"
              href={withSearch(
                storeRoutes.products,
                new URLSearchParams({ featured: "true" }),
              )}
            >
              <span className="category-tile-art is-ink">
                <TileArt kind="featured" />
              </span>
              <span className="category-tile-name">Destacados</span>
            </Link>
            {categoryTiles.map((t) => {
              const category = root(t.kind);
              if (!category) return null;
              return (
                <Link
                  className="category-tile"
                  key={t.kind}
                  {...categoryLink(category.id)}
                >
                  <span className="category-tile-art">
                    {t.species ? (
                      <SpeciesArt kind={t.species} className="" />
                    ) : (
                      <TileArt kind={t.tile!} />
                    )}
                  </span>
                  <span className="category-tile-name">{category.name}</span>
                </Link>
              );
            })}
            <Link className="category-tile" href={storeRoutes.brands}>
              <span className="category-tile-art">
                <TileArt kind="brands" />
              </span>
              <span className="category-tile-name">Todas las marcas</span>
            </Link>
          </div>
        </section>
      )}
      <section className="brand-promos" aria-label="Marcas insignia">
        <Link className="brand-promo is-biofresh" href={brandHref("biofresh")}>
          <div className="brand-promo-copy">
            <Picture
              className="brand-promo-logo"
              src="/images/brands/biofresh.png"
              alt="Biofresh"
              sizes="120px"
            />
            <h2>
              Ingredientes <span>frescos</span> de verdad
            </h2>
            <p>
              Súper premium natural para perros y gatos, por etapa de vida y
              tamaño de raza.
            </p>
            <span className="brand-promo-pill">Ver productos</span>
          </div>
          <div className="brand-promo-art" aria-hidden="true">
            <div className="brand-promo-packs">
              <Picture src="/images/product-0-3.png" alt="" sizes="160px" loading="lazy" />
              <Picture src="/images/hero-biofresh-castrados.png" alt="" sizes="180px" loading="lazy" />
            </div>
          </div>
        </Link>
        <Link className="brand-promo is-granplus" href={brandHref("gran plus")}>
          <div className="brand-promo-copy">
            <Picture
              className="brand-promo-logo"
              src="/images/brands/gran-plus.png"
              alt="Gran Plus"
              sizes="80px"
            />
            <span className="brand-promo-tag">Gourmet</span>
            <h2>
              <span>Húmedo</span> para cachorros
            </h2>
            <p>
              Pouch sabor pollo, 100 g. También en línea seca para perros y
              gatos.
            </p>
            <span className="brand-promo-pill">Ver productos</span>
          </div>
          <div className="brand-promo-art" aria-hidden="true">
            <Picture
              className="brand-promo-circle"
              src="/images/brand-panels/granplus.jpg"
              alt=""
              sizes="200px"
              loading="lazy"
            />
            <Picture
              className="brand-promo-pouch"
              src="/images/landing-lines/products/alimento-5.webp"
              alt=""
              sizes="180px"
              loading="lazy"
            />
          </div>
        </Link>
        <Link className="brand-promo-wide" href={brandHref("three dogs")}>
          <Picture
            className="brand-promo-photo"
            src="/images/brand-panels/three-dogs.jpg"
            alt=""
            sizes="(max-width: 899px) 100vw, 640px"
            loading="lazy"
          />
          <div className="brand-promo-side">
            <div className="brand-promo-box">
              <Picture
                src="/images/brands/three-dogs.png"
                alt="Three Dogs"
                sizes="80px"
              />
              <strong>Super Premium y Original</strong>
              <span>Dos líneas de alimento para perros, de cachorro a senior.</span>
            </div>
            <span className="brand-promo-big-pill">Ver productos</span>
          </div>
        </Link>
      </section>
      <section className="section featured-section" aria-labelledby="featured-title">
        {featured.isPending ? (
          <Loading />
        ) : featured.error ? (
          <ErrorBox
            error={featured.error}
            retry={() => void featured.refetch()}
          />
        ) : featured.data.items.length ? (
          <FeaturedCarousel products={featured.data.items} />
        ) : (
          <>
            <h2 id="featured-title">Productos destacados</h2>
            <p className="muted">Todavía no hay productos destacados.</p>
          </>
        )}
      </section>
      {!user && (
        <section className="cta-band" style={{ marginBottom: 64 }}>
          <div>
            <h2>¿Todavía no tenés cuenta?</h2>
            <p>
              Con una cuenta aprobada ves precios y stock, y hacés tus pedidos
              desde acá.
            </p>
          </div>
          <ActionLink href={storeRoutes.requestAccount} secondary>
            Quiero ser cliente
          </ActionLink>
        </section>
      )}
    </div>
  );
}

function FeaturedCarousel({ products }: { products: ProductCardData[] }) {
  const track = useRef<HTMLDivElement>(null);
  const move = (direction: number) => {
    const el = track.current;
    if (!el) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({
      left: direction * el.clientWidth * 0.8,
      behavior: reduce ? "auto" : "smooth",
    });
  };
  return (
    <>
      <div className="section-title">
        <div>
          <h2 id="featured-title">Productos destacados</h2>
        </div>
        <div className="featured-tools">
          <Link className="text-link" href={storeRoutes.products}>
            Ver catálogo
          </Link>
          <button
            type="button"
            className="icon-button featured-nav"
            aria-label="Productos anteriores"
            onClick={() => move(-1)}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="icon-button featured-nav"
            aria-label="Productos siguientes"
            onClick={() => move(1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="featured-track" ref={track}>
        {products.map((p) => (
          <ProductCard product={p} key={p.id} />
        ))}
      </div>
    </>
  );
}
