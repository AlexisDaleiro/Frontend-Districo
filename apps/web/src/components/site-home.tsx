"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useSession } from "./providers";
import { Picture } from "./ui";
import { storeRoutes } from "@/lib/store-routes";
import { brandLogoSrc } from "@/lib/brand-logos";
import { brandCatalogHref, featuredBrandNames, siteBrands, type BrandLine } from "@/lib/site-brands";

export function SiteHome() {
  const router = useRouter();
  const { user, loading } = useSession();
  useEffect(() => {
    if (!loading && user) router.replace(storeRoutes.home);
  }, [loading, user, router]);
  return (
    <>
      <HomeHero />
      <HomeStats />
      <HomeLines />
      <HomeFeaturedBrands />
      <HomeExplore />
      <HomeAbout />
      <HomeJobs />
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

const slides = [
  {
    title: "Alimento, cuidado y bienestar para las mascotas de Uruguay",
    lead: `Distribuimos ${siteBrands.length} marcas de alimento, arenas sanitarias, higiene, snacks y accesorios a comercios de todo el país.`,
    image: "/images/brand-panels/biofresh.jpg",
    alt: "Perro descansando sobre un piso de madera con luz de tarde",
    position: "60% 50%",
    actions: [["/marcas", "Conocé nuestras marcas"], [storeRoutes.requestAccount, "Solicitar cuenta"]],
  },
  {
    title: "Representantes exclusivos de Hercosul desde 2004",
    lead: "Primocão, Primogato y Biofresh llegan desde Brasil a cada punto de venta del país.",
    image: "/images/brand-panels/primocao.jpg",
    alt: "Perro caminando sobre pedregullo",
    position: "70% 50%",
    actions: [["/marcas?linea=alimento", "Ver marcas de alimento"]],
  },
  {
    title: "De Montevideo a todo el país, con logística propia",
    lead: "Casa Matriz certificada ISO 9001, sucursal en Maldonado, distribuidores aliados en el interior y flota eléctrica.",
    image: "/images/operacion-carga-camion.webp",
    alt: "Camión con la marca Primocão cargando mercadería en la Casa Matriz",
    position: "50% 45%",
    actions: [["/nosotros", "Conocé la empresa"]],
  },
] as const;

const SLIDE_DURATION = 7000;

function HomeHero() {
  const heroRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [visible, setVisible] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const [focused, setFocused] = useState(false);
  const rotating = !paused && !reducedMotion && visible && tabVisible && !focused;

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
    const timer = window.setTimeout(() => setActive((current) => (current + 1) % slides.length), SLIDE_DURATION);
    return () => window.clearTimeout(timer);
  }, [active, rotating]);

  const go = (index: number) => setActive((index + slides.length) % slides.length);

  return (
    <section
      ref={heroRef}
      className="home-hero"
      aria-roledescription="carrusel"
      aria-label="Destacados"
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      {slides.map((slide, index) => {
        const on = index === active;
        const Heading = index === 0 ? "h1" : "h2";
        return (
          <div
            key={slide.title}
            className={`home-slide${on ? " is-on" : ""}`}
            aria-roledescription="diapositiva"
            aria-label={`${index + 1} de ${slides.length}`}
            aria-hidden={!on}
            inert={!on}
          >
            <Picture
              src={slide.image}
              alt={slide.alt}
              sizes="100vw"
              style={{ objectPosition: slide.position }}
              loading={index === 0 ? "eager" : "lazy"}
              fetchPriority={index === 0 ? "high" : undefined}
            />
            <div className="home-slide-copy">
              <div className="container">
                <Heading>{slide.title}</Heading>
                <p>{slide.lead}</p>
                <div className="home-actions">
                  {slide.actions.map(([href, label], actionIndex) => (
                    <Link key={href} className={actionIndex === 0 ? "home-button home-button--lime" : "home-button home-button--ghost"} href={href}>
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div className="home-hero-controls">
        <div className="container">
          <div className="home-dots">
            {slides.map((slide, index) => (
              <button
                key={slide.title}
                type="button"
                className={index === active ? "is-on" : undefined}
                aria-label={`Ver destacado ${index + 1}`}
                aria-current={index === active}
                onClick={() => go(index)}
              />
            ))}
          </div>
          <button className="home-round" type="button" aria-label={paused ? "Reanudar destacados" : "Pausar destacados"} onClick={() => setPaused((value) => !value)}>
            {paused ? <Play size={18} /> : <Pause size={18} />}
          </button>
          <div className="home-arrows">
            <button className="home-round" type="button" aria-label="Destacado anterior" onClick={() => go(active - 1)}>
              <ChevronLeft size={20} />
            </button>
            <button className="home-round" type="button" aria-label="Destacado siguiente" onClick={() => go(active + 1)}>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function HomeStats() {
  const stats = [
    ["Desde 1995", "Empresa uruguaya, de Distribuidora Colón a DISTRICO."],
    [`${siteBrands.length} marcas`, "Alimento, arenas, higiene, snacks, accesorios y farmacia."],
    ["10.000 m²", "Casa Matriz en Montevideo y sucursal propia en Maldonado."],
    ["ISO 9001", "Calidad certificada en la Casa Matriz desde 2019."],
  ];
  return (
    <section className="home-stats" aria-label="DISTRICO en números">
      <div className="container home-stats-grid">
        {stats.map(([value, label]) => (
          <div key={value} className="home-stat">
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

const countBrands = (line: BrandLine) => siteBrands.filter((brand) => brand.line === line).length;

const lineCards: readonly { line: BrandLine; title: string; text: string; images: readonly string[]; wide?: boolean; dark?: boolean; note?: string }[] = [
  { line: "alimento", title: "Alimento para mascotas", text: "Seco y húmedo para perros, gatos y pequeños mamíferos, de línea económica a súper premium.",
    images: ["/images/hero-biofresh-castrados.png", "/images/landing-lines/products/alimento-3.webp", "/images/landing-lines/products/alimento-5.webp"], wide: true,
    note: "Biofresh, Primocão, Three Dogs, Gran Plus y más" },
  { line: "arenas", title: "Arenas sanitarias", text: "Para gatos, en variantes clásicas y perfumadas.", images: ["/images/landing-lines/arenas.webp"] },
  { line: "cuidado", title: "Higiene y cuidado", text: "Colonias, shampoos y tapetes higiénicos.", images: ["/images/landing-lines/cuidado.webp"] },
  { line: "snacks-mascotas", title: "Snacks para mascotas", text: "Snacks lácteos y cremosos de YowUp! y LoPets.", images: ["/images/landing-lines/snacks-mascotas.webp"] },
  { line: "accesorios", title: "Accesorios", text: "Pecheras, correas y collares TOH.", images: ["/images/landing-lines/accesorios.webp"] },
  { line: "farmacia", title: "Farmacia veterinaria", text: "Antiparasitarios NexGard para perros y gatos.", images: [], dark: true },
  { line: "snacks-consumo", title: "Snacks para personas", text: "Stack, nuestra marca propia de snacks.", images: ["/images/landing-lines/snacks-humanos.webp"], note: "Marca propia" },
];

function HomeLines() {
  return (
    <section className="home-section" id="lineas" aria-labelledby="home-lines-title">
      <div className="container">
        <div className="home-head">
          <h2 id="home-lines-title">Qué distribuimos</h2>
          <p>Siete líneas de producto, con marcas propias, representadas y distribuidas en todo Uruguay.</p>
        </div>
        <div className="home-lines">
          {lineCards.map((card) => {
            const count = countBrands(card.line);
            const countLabel = `${count} ${count === 1 ? "marca" : "marcas"}`;
            return (
              <Link
                key={card.line}
                href={`/marcas?linea=${card.line}`}
                className={`home-line${card.wide ? " home-line--wide" : ""}${card.dark ? " home-line--dark" : ""}`}
              >
                <h3>{card.title}</h3>
                <p>{card.text}</p>
                <span className="home-line-count">{card.note && card.wide ? `${countLabel} · ${card.note}` : card.note ?? countLabel}</span>
                {card.images.length > 0 && (
                  <span className={card.images.length > 1 ? "home-line-trio" : "home-line-pic"} aria-hidden="true">
                    {card.images.map((image) => (
                      <Picture key={image} src={image} alt="" sizes="220px" loading="lazy" />
                    ))}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const featured = featuredBrandNames.map((name) => siteBrands.find((brand) => brand.name === name)!);

function HomeFeaturedBrands() {
  const [index, setIndex] = useState(0);
  const brand = featured[index];
  const logo = brandLogoSrc(brand.logo);
  return (
    <section className="home-section home-section--paper" id="destacadas" aria-labelledby="home-featured-title">
      <div className="container">
        <div className="home-head">
          <h2 id="home-featured-title">Marcas destacadas</h2>
          <p>Elegí una marca para ver sus presentaciones.</p>
        </div>
        <div className="home-tabs" role="group" aria-label="Marcas destacadas">
          {featured.map((item, itemIndex) => (
            <button
              key={item.name}
              type="button"
              className={itemIndex === index ? "is-on" : undefined}
              aria-pressed={itemIndex === index}
              aria-label={item.name}
              onClick={() => setIndex(itemIndex)}
            >
              <Picture src={brandLogoSrc(item.logo) ?? ""} alt="" sizes="200px" />
            </button>
          ))}
        </div>
        <div key={brand.name} className="home-panel" aria-live="polite">
          <div className="home-panel-photo">
            <Picture src={`/images/brand-panels/${brand.photo}`} alt="" sizes="(max-width: 1023px) 100vw, 40vw" loading="lazy" />
          </div>
          <div className="home-panel-body">
            {logo && <Picture className="home-panel-logo" src={logo} alt={brand.name} sizes="260px" />}
            <div className="home-chips">
              <span>{brand.relation}</span>
              <span>{brand.species}</span>
            </div>
            <p className="home-panel-text">{brand.description}</p>
            <ul className="home-shelf">
              {brand.products?.map((product) => (
                <li key={product.image}>
                  <span className="home-shelf-img">
                    <Picture src={product.image} alt="" sizes="170px" loading="lazy" />
                  </span>
                  <span>{product.name}</span>
                </li>
              ))}
            </ul>
            <Link className="home-text-link" href={brandCatalogHref(brand)}>
              Ver productos de {brand.name} en el catálogo
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

const collage = [
  ["/images/hero-biofresh-castrados.png", 0, 74],
  ["/images/landing-lines/products/arenas-2.webp", 13, 62],
  ["/images/landing-lines/products/arenas-4.webp", 25, 84],
  ["/images/landing-lines/products/snacks-humanos-3.webp", 41, 50],
  ["/images/landing-lines/cuidado.webp", 52, 46],
  ["/images/landing-lines/snacks-mascotas.webp", 59, 58],
  ["/images/landing-lines/products/alimento-3.webp", 70, 80],
  ["/images/landing-lines/accesorios.webp", 80, 36],
  ["/images/landing-lines/products/snacks-humanos-4.webp", 89, 56],
] as const;

function HomeExplore() {
  return (
    <section className="home-section" aria-label="Explorá nuestras marcas">
      <div className="container">
        <Link className="home-explore" href="/marcas">
          <Picture className="home-explore-bg" src="/images/deposito-estanterias.webp" alt="" sizes="100vw" loading="lazy" />
          <span className="home-explore-copy">
            <span className="home-explore-title">Explorá nuestras marcas</span>
            <span className="home-explore-text">
              {siteBrands.length} marcas de alimento, arenas, cuidado, snacks y accesorios, con sus presentaciones.
            </span>
            <span className="home-button home-button--ghost">Ver todas las marcas</span>
          </span>
          <span className="home-collage" aria-hidden="true">
            {collage.map(([src, left, height], order) => (
              <Picture key={src} src={src} alt="" sizes="200px" loading="lazy" style={{ left: `${left}%`, height: `${height}%`, zIndex: order % 3 + 1 }} />
            ))}
          </span>
        </Link>
      </div>
    </section>
  );
}

function HomeAbout() {
  return (
    <section className="home-section home-section--paper" id="nosotros" aria-labelledby="home-about-title">
      <div className="container home-about">
        <div>
          <h2 id="home-about-title">Una empresa uruguaya con 30 años de ruta</h2>
          <p className="home-about-text">
            DISTRICO nace en 1995 como Distribuidora Colón. Hoy abastece de alimento para mascotas, arenas, cuidado animal y snacks a todo el país desde su Casa Matriz en Montevideo y su sucursal en Maldonado.
          </p>
          <dl className="home-facts">
            <div><dt>10.000 m²</dt><dd>Casa Matriz con 1.600 m² de depósito, certificada ISO 9001 desde 2019.</dd></div>
            <div><dt>700 m²</dt><dd>Sucursal propia en Maldonado, que atiende el este del país.</dd></div>
            <div><dt>120 kWh</dt><dd>Tres plantas fotovoltaicas propias y flota eléctrica desde 2021.</dd></div>
          </dl>
          <Link className="home-button home-button--ink" href="/nosotros">Conocé nuestra historia</Link>
        </div>
        <div className="home-mosaic">
          <Picture className="home-mosaic-big" src="/images/casa-matriz-fachada.webp" alt="Fachada de la Casa Matriz de DISTRICO" sizes="(max-width: 1023px) 100vw, 50vw" loading="lazy" />
          <Picture src="/images/deposito-estanterias.webp" alt="Estanterías del depósito" sizes="(max-width: 1023px) 50vw, 25vw" loading="lazy" />
          <Picture src="/images/vehiculo-electrico-carga.webp" alt="Vehículo eléctrico de reparto cargando" sizes="(max-width: 1023px) 50vw, 25vw" loading="lazy" />
        </div>
      </div>
    </section>
  );
}

function HomeJobs() {
  return (
    <section className="home-jobs" aria-labelledby="home-jobs-title">
      <div className="container home-jobs-grid">
        <div>
          <h2 id="home-jobs-title">Trabajá con nosotros</h2>
          <p>Sumate al equipo de logística, ventas y administración que abastece a todo el país.</p>
          <ul className="home-perks">
            <li>Gimnasio</li>
            <li>Comedor</li>
            <li>Lavandería</li>
            <li>Sala de capacitación</li>
          </ul>
          <Link className="home-button home-button--lime" href="/trabajo">Ver puestos disponibles</Link>
        </div>
        <div className="home-jobs-photo">
          <Picture src="/images/beneficio-gimnasio.webp" alt="Gimnasio para colaboradores de DISTRICO" sizes="(max-width: 1023px) 100vw, 40vw" loading="lazy" />
        </div>
      </div>
    </section>
  );
}
