"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "lucide-react";
import type { Entity } from "@/lib/types";
import { storeRoutes, withSearch } from "@/lib/store-routes";
import { Picture } from "./ui";

const slides = [
  {
    id: "biofresh",
    brandSlug: "biofresh",
    name: "Biofresh",
    eyebrow: "Marca destacada · Biofresh",
    title: "Biofresh para tu negocio.",
    description: "Explorá su selección dentro del catálogo de DISTRICO.",
    action: "Ver Biofresh",
    image: "/images/banner-bio.png",
    imageWidth: 1950,
    imageHeight: 500,
    mobileImage: "/images/banner-bio-mobile.png",
    mobileWidth: 768,
    mobileHeight: 1024,
    imageAlt: "Pieza de Biofresh con salmón y productos de la marca",
  },
  {
    id: "gran-plus",
    brandSlug: "gran-plus",
    name: "Gran Plus",
    eyebrow: "Marca destacada · Gran Plus",
    title: "Gran Plus en DISTRICO.",
    description: "Conocé los productos de la marca para tu negocio.",
    action: "Ver Gran Plus",
    image: "/images/banner-granplus.png",
    imageWidth: 1950,
    imageHeight: 500,
    imageAlt: "Pieza de Gran Plus con su línea de productos",
  },
  {
    id: "districo",
    name: "DISTRICO",
    eyebrow: "Cerca de tu negocio. Todos los días.",
    title: "Marcas que acompañan tu negocio.",
    description:
      "Marcas de confianza y soluciones que acompañan el crecimiento de tu negocio.",
    action: "Explorar catálogo",
    image: "/images/hero-raicor.jpg",
    imageWidth: 2328,
    imageHeight: 1554,
    imageAlt: "Profesional veterinaria atendiendo a un cachorro",
  },
] as const;

const brandKey = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const media = window.matchMedia(reducedQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};

type Direction = "first" | "forward" | "back";

export function HomeCarousel({ brands }: { brands?: Entity[] }) {
  const [{ active, direction }, setSlide] = useState<{
    active: number;
    direction: Direction;
  }>({ active: 0, direction: "first" });
  const [playing, setPlaying] = useState(true);
  // En el servidor se asume movimiento reducido: el autoplay arranca al hidratar.
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(reducedQuery).matches,
    () => true,
  );
  const rotating = playing && !reduced;
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const slide = slides[active];
  const layout = slide.imageWidth / slide.imageHeight >= 2 ? "art" : "photo";
  const brand =
    "brandSlug" in slide
      ? brands?.find(
          (item) =>
            brandKey(item.slug ?? item.name) === brandKey(slide.brandSlug),
        )
      : undefined;
  const href =
    "brandSlug" in slide
      ? withSearch(
          storeRoutes.products,
          new URLSearchParams(
            brand ? { brandId: brand.id } : { search: slide.name },
          ),
        )
      : storeRoutes.products;
  const show = (index: number) =>
    setSlide((current) => ({
      active: index,
      direction: index < current.active ? "back" : "forward",
    }));
  const step = (delta: 1 | -1) =>
    setSlide((current) => ({
      active: (current.active + delta + slides.length) % slides.length,
      direction: delta > 0 ? "forward" : "back",
    }));

  return (
    <section
      className="home-carousel"
      aria-label="Marcas destacadas de DISTRICO"
      aria-roledescription="carrusel"
      data-autoplay={!reduced}
      data-paused={!playing}
    >
      <div
        className="home-carousel-stage"
        onTouchStart={(event) => {
          const touch = event.touches[0];
          touchStart.current = touch
            ? { x: touch.clientX, y: touch.clientY }
            : null;
        }}
        onTouchEnd={(event) => {
          const start = touchStart.current;
          const touch = event.changedTouches[0];
          touchStart.current = null;
          if (!start || !touch) return;
          const dx = touch.clientX - start.x;
          const dy = touch.clientY - start.y;
          if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.2)
            step(dx < 0 ? 1 : -1);
        }}
        onTouchCancel={() => {
          touchStart.current = null;
        }}
      >
        <article
          className={`hero home-carousel-slide home-carousel-slide-${slide.id} home-carousel-slide-${layout}${"mobileImage" in slide ? " home-carousel-has-mobile-art" : ""} is-${direction}`}
          key={slide.id}
          id="home-carousel-slide"
          role="group"
          aria-roledescription="diapositiva"
          aria-label={`${active + 1} de ${slides.length}: ${slide.name}`}
        >
          <div className="hero-copy">
            <p className="eyebrow">{slide.eyebrow}</p>
            <h1>{slide.title}</h1>
            <p>{slide.description}</p>
            <div className="actions">
              <Link className="button" href={href}>
                {slide.action} <ArrowRight size={17} />
              </Link>
            </div>
          </div>
          <div className="hero-visual">
            <picture>
              {"mobileImage" in slide && (
                <source
                  media="(max-width: 900px)"
                  srcSet={slide.mobileImage}
                  width={slide.mobileWidth}
                  height={slide.mobileHeight}
                />
              )}
              <Picture
                src={slide.image}
                alt={slide.imageAlt}
                width={slide.imageWidth}
                height={slide.imageHeight}
                fetchPriority={active === 0 ? "high" : undefined}
                sizes={
                  layout === "photo"
                    ? "(min-width: 768px) 50vw, 100vw"
                    : "100vw"
                }
              />
            </picture>
          </div>
        </article>
        <div className="home-carousel-nav">
          <button
            className="home-carousel-arrow home-carousel-arrow-prev"
            type="button"
            aria-label="Banner anterior"
            aria-controls="home-carousel-slide"
            onClick={() => step(-1)}
          >
            <ChevronLeft size={21} />
          </button>
          <button
            className="home-carousel-arrow home-carousel-arrow-next"
            type="button"
            aria-label="Banner siguiente"
            aria-controls="home-carousel-slide"
            onClick={() => step(1)}
          >
            <ChevronRight size={21} />
          </button>
        </div>
      </div>
      <div className="home-carousel-pagination">
        {/* Mientras rota solo no se anuncia cada cambio (WCAG 4.1.3). */}
        <span
          className="home-carousel-count"
          aria-live={rotating ? "off" : "polite"}
          aria-atomic="true"
        >
          {String(active + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
          <span aria-hidden="true"> · </span>
          {slide.name}
        </span>
        <div className="home-carousel-controls">
          {!reduced && (
            <button
              className="home-carousel-toggle"
              type="button"
              aria-label={playing ? "Pausar carrusel" : "Reanudar carrusel"}
              aria-controls="home-carousel-slide"
              onClick={() => setPlaying((value) => !value)}
            >
              {playing ? <Pause size={15} /> : <Play size={15} />}
            </button>
          )}
          <div className="home-carousel-dots" aria-label="Elegir banner">
            {slides.map((item, index) => (
              <button
                className={`home-carousel-dot${index === active ? " is-active" : ""}`}
                type="button"
                key={item.id}
                aria-label={`Mostrar ${item.name}`}
                aria-controls="home-carousel-slide"
                aria-current={index === active ? "true" : undefined}
                onClick={() => show(index)}
                // La barra de progreso del punto activo (motion.css) marca el
                // tiempo: al terminar pasa al siguiente banner.
                onAnimationEnd={(event) => {
                  if (event.animationName === "motion-progress")
                    step(1);
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
