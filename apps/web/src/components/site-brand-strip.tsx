"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SiteBrandCard } from "./site-brand-card";
import { siteBrands } from "@/lib/site-brands";

export function SiteBrandStrip() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const sync = () => {
      if (!track.clientWidth) return;
      const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
      const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
      const total = Math.max(1, Math.ceil(Math.max(0, maxScroll - gap) / track.clientWidth) + 1);
      const current = maxScroll - track.scrollLeft < 2
        ? total - 1
        : Math.min(total - 1, Math.round(track.scrollLeft / track.clientWidth));
      setPages(total);
      setPage(current);
    };

    const observer = new ResizeObserver(sync);
    observer.observe(track);
    track.addEventListener("scroll", sync, { passive: true });
    sync();
    return () => {
      observer.disconnect();
      track.removeEventListener("scroll", sync);
    };
  }, []);

  const goTo = (target: number) => {
    const track = trackRef.current;
    if (!track) return;
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    track.scrollTo({
      left: Math.min(maxScroll, Math.max(0, target) * track.clientWidth),
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  return (
    <section className="site-brand-strip" aria-labelledby="site-brand-strip-title">
      <div className="container site-brand-strip-heading">
        <div>
          <h2 id="site-brand-strip-title">Las marcas que distribuimos</h2>
        </div>
        <p>Marcas para mascotas, snacks y cuidado veterinario que llegan a comercios de todo Uruguay.</p>
      </div>
      <div className="site-brand-strip-stage">
        <div ref={trackRef} className="site-brand-strip-track" role="region" aria-label="Marcas que distribuye DISTRICO" tabIndex={0}>
          {siteBrands.map((brand) => (
            <SiteBrandCard
              key={brand.name}
              brand={brand}
              sizes="(min-width: 1240px) 13vw, (min-width: 640px) 24vw, 42vw"
            />
          ))}
        </div>
        <button
          type="button"
          className="site-brand-strip-arrow site-brand-strip-arrow--previous"
          aria-label="Marcas anteriores"
          disabled={page === 0}
          onClick={() => goTo(page - 1)}
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="site-brand-strip-arrow site-brand-strip-arrow--next"
          aria-label="Marcas siguientes"
          disabled={page === pages - 1}
          onClick={() => goTo(page + 1)}
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="site-brand-strip-footer container">
        <div className="site-brand-strip-dots" role="group" aria-label="Elegir página de marcas">
          {Array.from({ length: pages }, (_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Página ${index + 1} de ${pages}`}
              aria-current={index === page ? "true" : undefined}
              onClick={() => goTo(index)}
            ><span /></button>
          ))}
        </div>
        <Link href="/marcas" className="button lime">Ver todas las marcas</Link>
      </div>
    </section>
  );
}
