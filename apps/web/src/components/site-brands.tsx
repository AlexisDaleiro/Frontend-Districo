"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { apiQueryKey, request, usePublicApi } from "./providers";
import { BrandLogo } from "./brand-logo";
import { ErrorBox, Picture } from "./ui";
import { withSearch } from "@/lib/store-routes";
import type { Entity, ProductCardList } from "@/lib/types";

const tones = ["ink", "moss", "slate", "clay", "lime", "earth", "rose", "leaf"];
// Fotos editoriales decorativas: no son fotografías de una marca en particular.
const petPhotos = [3, 2, 1, 5, 6, 7, 4, 8].map(
  (number) => `/images/brand-pets-${String(number).padStart(2, "0")}.webp`,
);

function BrandCard({ brand, index }: { brand: Entity; index: number }) {
  const card = useRef<HTMLAnchorElement>(null);
  const [nearby, setNearby] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const path = `products/cards?brandId=${encodeURIComponent(brand.id)}&limit=1`;
  const products = useQuery<ProductCardList>({
    queryKey: apiQueryKey(path),
    queryFn: () => request<ProductCardList>(path),
    enabled: nearby,
    staleTime: 60_000,
  });

  useEffect(() => {
    const node = card.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      const timer = window.setTimeout(() => setNearby(true), 0);
      return () => window.clearTimeout(timer);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNearby(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 320px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Link
      ref={card}
      className={`site-brand-card site-brand-card--${tones[index % tones.length]}`}
      href={withSearch(
        "/productos",
        new URLSearchParams({ brandId: brand.id }),
      )}
      aria-label={`Ver productos de ${brand.name}`}
    >
      <span
        className={`site-brand-art${imageReady ? " is-loaded" : ""}`}
        aria-hidden="true"
      >
        <BrandLogo brand={brand} />
        <Picture
          src={petPhotos[index % petPhotos.length]}
          alt=""
          loading="lazy"
          sizes="(max-width: 767px) 62vw, (max-width: 1100px) 28vw, 15vw"
          onLoad={() => setImageReady(true)}
        />
      </span>
      <span className="site-brand-card-copy">
        <strong>{brand.name}</strong>
        <small>
          {products.data ? (
            <>
              {products.data.meta.total}{" "}
              {products.data.meta.total === 1 ? "producto" : "productos"}
            </>
          ) : (
            "\u00a0"
          )}
        </small>
      </span>
      <span className="site-brand-card-corner" aria-hidden="true">
        <ArrowRight size={17} />
      </span>
    </Link>
  );
}

export function SiteBrands() {
  const brands = usePublicApi<Entity[]>("brands");
  const rail = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const node = rail.current;
    if (!node || !brands.data?.length) return;
    const measure = () => {
      const count = Math.max(1, Math.ceil(node.scrollWidth / node.clientWidth));
      setPages(count);
      const atEnd = node.scrollLeft >= node.scrollWidth - node.clientWidth - 2;
      setPage(
        atEnd
          ? count - 1
          : Math.min(count - 1, Math.round(node.scrollLeft / node.clientWidth)),
      );
    };
    const resize = new ResizeObserver(measure);
    resize.observe(node);
    measure();
    node.addEventListener("scroll", measure, { passive: true });
    return () => {
      resize.disconnect();
      node.removeEventListener("scroll", measure);
    };
  }, [brands.data]);

  const goTo = (index: number) => {
    const node = rail.current;
    if (!node) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    node.scrollTo({
      left: index * node.clientWidth,
      behavior: reduce ? "instant" : "smooth",
    });
  };

  return (
    <section
      className="site-brands site-section"
      id="marcas"
      aria-labelledby="brands-title"
    >
      <div className="container site-brands-intro">
        <div>
          <p className="eyebrow">Representaciones</p>
          <h2 id="brands-title">
            {brands.data?.length
              ? `Las ${brands.data.length} marcas que distribuimos.`
              : "Las marcas que distribuimos."}
          </h2>
        </div>
        <p>
          Alimento para mascotas, arenas sanitarias, cuidado animal y snacks.
          Explorá las marcas disponibles en nuestro catálogo público.
        </p>
      </div>
      {brands.isPending ? (
        <>
          <div
            className="site-brands-rail site-brands-loading"
            aria-busy="true"
            aria-label="Cargando marcas"
          >
            {Array.from({ length: 7 }, (_, index) => (
              <span key={index} />
            ))}
          </div>
          <div
            className="site-brands-footer site-brands-footer-loading container"
            aria-hidden="true"
          >
            <span />
            <div>
              <span />
              <span />
            </div>
          </div>
        </>
      ) : brands.error ? (
        <div className="container">
          <ErrorBox error={brands.error} retry={() => void brands.refetch()} />
        </div>
      ) : brands.data.length ? (
        <>
          <div className="site-brands-stage">
            <div
              className="site-brands-rail"
              ref={rail}
              aria-label="Marcas de DISTRICO"
            >
              {brands.data.map((brand, index) => (
                <BrandCard brand={brand} index={index} key={brand.id} />
              ))}
            </div>
            {pages > 1 && (
              <>
                <button
                  className="site-brands-arrow site-brands-arrow--previous"
                  type="button"
                  onClick={() => goTo(Math.max(0, page - 1))}
                  disabled={page === 0}
                  aria-label="Marcas anteriores"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  className="site-brands-arrow site-brands-arrow--next"
                  type="button"
                  onClick={() => goTo(Math.min(pages - 1, page + 1))}
                  disabled={page === pages - 1}
                  aria-label="Marcas siguientes"
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}
          </div>
          <div className="site-brands-footer container">
            {pages <= 8 ? (
              <div className="site-brands-dots" aria-label="Páginas de marcas">
                {Array.from({ length: pages }, (_, index) => (
                  <button
                    type="button"
                    key={index}
                    className={page === index ? "is-active" : ""}
                    aria-label={`Ir a la página ${index + 1} de marcas`}
                    aria-current={page === index ? "page" : undefined}
                    onClick={() => goTo(index)}
                  />
                ))}
              </div>
            ) : (
              <p className="site-brands-page" aria-live="polite">
                {page + 1} / {pages}
              </p>
            )}
            <div className="site-brands-actions">
              <Link className="button" href="/productos#marcas">
                Ver las {brands.data.length} marcas
              </Link>
              <Link className="button secondary" href="/productos">
                Ver el catálogo completo <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </>
      ) : (
        <div className="container site-empty">
          <p>
            Las marcas estarán disponibles cuando se carguen en el catálogo.
          </p>
        </div>
      )}
    </section>
  );
}
