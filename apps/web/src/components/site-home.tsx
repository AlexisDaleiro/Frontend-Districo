"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight } from "lucide-react";
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

const heroChapters = [
  {
    eyebrow: "01 / Marcas",
    firstLine: "Marcas que",
    highlight: "acompañan.",
    lead: "Productos que tus clientes buscan, respaldados por un distribuidor que conoce tu negocio.",
    image: "/images/hero-biofresh-castrados.png",
    imageAlt: "Alimento Biofresh para gatos castrados distribuido por DISTRICO",
    imageWidth: 356,
    imageHeight: 587,
    caption: "Marcas para crecer",
    kind: "product",
  },
  {
    eyebrow: "02 / Cobertura",
    firstLine: "Llegamos a",
    highlight: "todo Uruguay.",
    lead: "Una red logística que conecta nuestras marcas con comercios de todo el país.",
    image: "/images/deposito-estanterias.webp",
    imageAlt: "Depósito de distribución de DISTRICO",
    imageWidth: 2000,
    imageHeight: 1339,
    caption: "Logística en marcha",
    kind: "photo",
  },
  {
    eyebrow: "03 / Respuesta",
    firstLine: "Un socio que",
    highlight: "responde.",
    lead: "Atención cercana y experiencia para acompañarte en cada pedido.",
    image: "/images/casa-matriz-fachada.webp",
    imageAlt: "Fachada de la Casa Matriz de DISTRICO en Montevideo",
    imageWidth: 588,
    imageHeight: 441,
    caption: "Cerca de tu negocio",
    kind: "photo",
  },
] as const;

const CHAPTER_DURATION = 5200;

function SiteHomeContent() {
  const heroRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [visible, setVisible] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const [focused, setFocused] = useState(false);
  const chapter = heroChapters[active];
  const rotating = !reducedMotion && visible && tabVisible && !focused;

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);
    const updateVisibility = () => setTabVisible(!document.hidden);
    updatePreference();
    updateVisibility();
    preference.addEventListener("change", updatePreference);
    document.addEventListener("visibilitychange", updateVisibility);

    const observer = "IntersectionObserver" in window && heroRef.current
      ? new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.3 })
      : null;
    if (heroRef.current) observer?.observe(heroRef.current);
    return () => {
      observer?.disconnect();
      preference.removeEventListener("change", updatePreference);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setTimeout(() => {
      setActive((current) => (current + 1) % heroChapters.length);
    }, CHAPTER_DURATION);
    return () => window.clearTimeout(timer);
  }, [active, rotating]);

  return (
    <>
      <section
        ref={heroRef}
        className="site-hero site-hero--story"
        aria-labelledby="site-title"
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
        }}
      >
        <div className="site-hero-grain" aria-hidden="true" />
        <div className="container site-hero-grid">
          <div className="site-hero-copy">
            <div key={active} className="site-hero-chapter-copy">
              <p className="eyebrow">{chapter.eyebrow} · DISTRICO desde 1995</p>
              <h1 id="site-title"><span>{chapter.firstLine}</span>{" "}<span className="site-hero-highlight">{chapter.highlight}</span></h1>
              <p className="site-hero-lead">{chapter.lead}</p>
            </div>
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
          </div>
          <div className={`site-hero-visual site-hero-story-visual site-hero-story-visual--${chapter.kind}`}>
            <div className="site-hero-orbit" aria-hidden="true" />
            <div key={active} className="site-hero-story-media">
              <Picture
                src={chapter.image}
                alt={chapter.imageAlt}
                width={chapter.imageWidth}
                height={chapter.imageHeight}
                sizes="(max-width: 767px) 86vw, 46vw"
                loading={active === 0 ? "eager" : "lazy"}
                fetchPriority={active === 0 ? "high" : undefined}
              />
            </div>
            <span className="site-hero-story-caption" aria-hidden="true">{chapter.caption}</span>
          </div>
        </div>
      </section>

      <SiteHomeReference />
    </>
  );
}
