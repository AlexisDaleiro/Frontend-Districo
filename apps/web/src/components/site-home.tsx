"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import { useSession } from "./providers";
import { Picture } from "./ui";
import { SiteHomeReference } from "./site-home-reference";
import { storeRoutes } from "@/lib/store-routes";
export function SiteHome() {
  const router = useRouter();
  const { user, loading } = useSession();
  useEffect(() => {
    if (!loading && user) router.replace(storeRoutes.home);
  }, [loading, user, router]);
  return (
    <>
      <SiteHomeContent />
      {(loading || user) && (
        <div className="site-session-check" role="status">
          Preparando DISTRICO…
        </div>
      )}
      <noscript>
        <style>{`.site-session-check { display: none !important; }`}</style>
      </noscript>
    </>
  );
}

function SiteHomeContent() {
  return (
    <>
      <section className="site-hero" aria-labelledby="site-title">
        <div className="site-hero-grain" aria-hidden="true" />
        <div className="container site-hero-grid">
          <div className="site-hero-copy">
            <p className="eyebrow">Distribución en todo Uruguay · Desde 1995</p>
            <h1
              id="site-title"
              aria-label="Marcas que acompañan. Un socio que responde."
            >
              <span aria-hidden="true">Marcas que</span>
              <span aria-hidden="true">acompañan.</span>
              <span className="site-hero-highlight" aria-hidden="true">
                Un socio que responde.
              </span>
            </h1>
            <p className="site-hero-lead">
              Distribuimos alimento para mascotas, arenas sanitarias, cuidado
              animal y snacks en todo Uruguay.
            </p>
            <div className="actions">
              <Link className="button lime site-button-large" href="/productos">
                Explorar productos <ArrowUpRight size={18} />
              </Link>
              <Link
                className="button site-button-large site-button-outline"
                href={storeRoutes.requestAccount}
              >
                Solicitar cuenta <ArrowRight size={18} />
              </Link>
            </div>
            <a className="site-scroll-cue" href="#lineas">
              Descubrí DISTRICO <ArrowDown size={17} />
            </a>
          </div>
          <div
            className="site-hero-visual"
            aria-label="Casa Matriz de DISTRICO en Montevideo"
          >
            <div className="site-hero-orbit" aria-hidden="true" />
            <div className="site-hero-photo">
              <Picture
                src="/images/casa-matriz-fachada.webp"
                alt="Fachada de la Casa Matriz de DISTRICO en Montevideo"
                width={588}
                height={441}
                sizes="(max-width: 767px) 90vw, 48vw"
                loading="eager"
                fetchPriority="high"
              />
            </div>
            <div className="site-hero-product" aria-hidden="true">
              <Picture
                src="/images/product-0-0.jpg"
                alt=""
                width={450}
                height={450}
                sizes="180px"
              />
            </div>
            <span className="site-hero-stamp">
              ISO 9001
              <br />
              <strong>desde 2019</strong>
            </span>
          </div>
        </div>
        <div className="site-hero-bottom" aria-hidden="true">
          <span>01 / DISTRICO</span>
          <span>Montevideo · Maldonado</span>
        </div>
      </section>

      <SiteHomeReference />
    </>
  );
}
