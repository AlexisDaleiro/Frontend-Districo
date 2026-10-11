"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, ChevronRight, History, PawPrint, Warehouse } from "lucide-react";
import { usePublicApi, useSession } from "./providers";
import { Picture } from "./ui";
import { storeRoutes } from "@/lib/store-routes";
import { brandLogoSrc } from "@/lib/brand-logos";
import { brandCatalogHref, featuredBrandNames, siteBrands, type BrandLine } from "@/lib/site-brands";
import type { StoreBanner } from "@/lib/banners";

export function SiteHome() {
  const router = useRouter();
  const { user, loading } = useSession();
  useEffect(() => {
    if (!loading && user) router.replace(storeRoutes.home);
  }, [loading, user, router]);
  return (
    <>
      <h1 className="site-home-title">Distribución mayorista de marcas para mascotas en Uruguay</h1>
      <HomeHero />
      <HomeStats />
      <HomeLines />
      <HomeFeaturedBrands />
      <HomeJobs />
      <HomeJoin />
      {/* Only an active session redirects; anonymous visitors never see the curtain. */}
      {!loading && user && (
        <div className="site-session-check" role="status">
          Preparando DISTRICO…
        </div>
      )}
    </>
  );
}

type HeroSlide = { id?: string; title: string; lead: string; image: string; mobileImage?: string | null; alt: string; position: string; mobilePosition?: string; actions: readonly (readonly [string, string])[] };
const fallbackSlides: HeroSlide[] = [
  {
    title: "Marcas para mascotas, al por mayor para tu comercio",
    lead: `Distribuimos ${siteBrands.length} marcas de alimento, arenas sanitarias, higiene, snacks y accesorios a comercios de todo el país.`,
    image: "/images/brand-panels/biofresh.jpg",
    alt: "Perro descansando sobre un piso de madera con luz de tarde",
    position: "60% 50%",
    mobilePosition: "58% 50%",
    actions: [[storeRoutes.requestAccount, "Solicitar cuenta"], ["/marcas", "Conocé nuestras marcas"]],
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
];

const SLIDE_DURATION = 7000;

function HomeHero() {
  const managed = usePublicApi<StoreBanner[]>("banners?placement=INSTITUTIONAL");
  const slides: HeroSlide[] = managed.data?.length ? managed.data.map((banner) => ({
    id: banner.id, title: banner.title, lead: banner.subtitle ?? "", image: banner.imageUrl,
    mobileImage: banner.mobileImageUrl, alt: banner.alt, position: "50% 50%", actions: [[banner.href, banner.actionLabel]],
  })) : fallbackSlides;
  const heroRef = useRef<HTMLElement>(null);
  const gesture = useRef<{ pointerId: number; x: number; y: number; horizontal: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [active, setActive] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [visible, setVisible] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const [focused, setFocused] = useState(false);
  const shownIndex = Math.min(active, slides.length - 1);
  const rotating = slides.length > 1 && !reducedMotion && visible && tabVisible && !focused && !dragging;

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
  }, [active, rotating, slides.length]);

  return (
    <section
      ref={heroRef}
      className={`home-hero${dragging ? " is-dragging" : ""}`}
      aria-roledescription="carrusel"
      aria-label="Destacados"
      onDragStart={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0 || slides.length < 2) return;
        suppressClick.current = false;
        gesture.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, horizontal: false };
        setDragging(true);
      }}
      onPointerMove={(event) => {
        const start = gesture.current;
        if (!start || start.pointerId !== event.pointerId) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (!start.horizontal && Math.max(Math.abs(dx), Math.abs(dy)) > 8) {
          if (Math.abs(dy) >= Math.abs(dx)) {
            gesture.current = null;
            setDragging(false);
            return;
          }
          start.horizontal = true;
          suppressClick.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        if (start.horizontal) event.preventDefault();
      }}
      onPointerUp={(event) => {
        const start = gesture.current;
        if (!start || start.pointerId !== event.pointerId) return;
        const dx = event.clientX - start.x;
        const threshold = Math.min(96, Math.max(48, event.currentTarget.clientWidth * .1));
        if (start.horizontal && Math.abs(dx) >= threshold) {
          setActive((shownIndex + (dx < 0 ? 1 : -1) + slides.length) % slides.length);
        }
        gesture.current = null;
        setDragging(false);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => { gesture.current = null; setDragging(false); }}
      onPointerLeave={() => {
        if (gesture.current && !gesture.current.horizontal) { gesture.current = null; setDragging(false); }
      }}
      onLostPointerCapture={(event) => {
        if (event.target === event.currentTarget) { gesture.current = null; setDragging(false); }
      }}
      onClickCapture={(event) => {
        if (suppressClick.current && event.detail !== 0) {
          event.preventDefault();
          event.stopPropagation();
          suppressClick.current = false;
        }
      }}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      {slides.map((slide, index) => {
        const on = index === shownIndex;
        return (
          <div
            key={slide.id ?? slide.title}
            className={`home-slide${on ? " is-on" : ""}${slide.id ? " home-slide--managed" : ""}`}
            style={{ "--hero-position": slide.position, "--hero-mobile-position": slide.mobilePosition ?? slide.position } as CSSProperties}
            aria-roledescription="diapositiva"
            aria-label={`${index + 1} de ${slides.length}`}
            aria-hidden={!on}
            inert={!on}
          >
            {slide.mobileImage ? <picture>
              <source media="(max-width: 700px)" srcSet={slide.mobileImage} />
              {/* Uploaded banners have a separately authored mobile composition. */}
              <img src={slide.image} alt={slide.alt} loading={index === 0 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : undefined} />
            </picture> : <Picture
              src={slide.image}
              alt={slide.alt}
              sizes="100vw"
              loading={index === 0 ? "eager" : "lazy"}
              fetchPriority={index === 0 ? "high" : undefined}
            />}
            <div className="home-slide-copy">
              <div className="container">
                <h2>{slide.title}</h2>
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
    </section>
  );
}

function HomeStats() {
  const stats = [
    { value: "Desde 1995", label: "Empresa uruguaya, de Distribuidora Colón a DISTRICO.", Icon: History },
    { value: `${siteBrands.length} marcas`, label: "Alimento, arenas, higiene, snacks, accesorios y farmacia.", Icon: PawPrint },
    { value: "10.000 m²", label: "Casa Matriz en Montevideo y sucursal propia en Maldonado.", Icon: Warehouse },
    { value: "ISO 9001", label: "Calidad certificada en la Casa Matriz desde 2019.", Icon: BadgeCheck },
  ];
  return (
    <section className="home-stats" aria-label="DISTRICO en números">
      <div className="container">
        <div className="home-stats-grid">
        {stats.map(({ value, label, Icon }) => (
          <div key={value} className="home-stat">
            <span className="home-stat-icon"><Icon size={28} strokeWidth={1.7} aria-hidden="true" /></span>
            <strong>{value}</strong>
            <span className="home-stat-description">{label}</span>
          </div>
        ))}
        </div>
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

const featured = featuredBrandNames.map((name) => siteBrands.find((brand) => brand.name === name)).filter((brand): brand is NonNullable<typeof brand> => !!brand);

function HomeFeaturedBrands() {
  const [index, setIndex] = useState(0);
  const brand = featured[index] ?? featured[0];
  if (!brand) return null;
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
              className={item.name === brand.name ? "is-on" : undefined}
              aria-pressed={item.name === brand.name}
              aria-label={item.name}
              onClick={(event) => {
                setIndex(itemIndex);
                const button = event.currentTarget;
                const rail = button.parentElement;
                if (rail && rail.scrollWidth > rail.clientWidth) {
                  rail.scrollTo({ left: button.offsetLeft - rail.offsetLeft - (rail.clientWidth - button.offsetWidth) / 2, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
                }
              }}
            >
              <Picture src={brandLogoSrc(item.logo) ?? ""} alt="" sizes="200px" />
            </button>
          ))}
        </div>
        <p className="home-tabs-hint">Deslizá para ver más marcas <ChevronRight size={16} aria-hidden="true" /></p>
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

function HomeJobs() {
  return (
    <section className="home-jobs" aria-labelledby="home-jobs-title">
      <div className="container home-jobs-row">
        <div>
          <h2 id="home-jobs-title">Trabajá con nosotros</h2>
          <p>Sumate al equipo de logística, ventas y administración. Gimnasio, comedor, lavandería y sala de capacitación.</p>
        </div>
        <Link className="home-button home-button--outline" href="/trabajo">Ver puestos disponibles</Link>
      </div>
    </section>
  );
}

const joinSteps = [
  ["Solicitá tu cuenta", "Completá el formulario con los datos de tu comercio."],
  ["Revisamos tu solicitud", "Nuestro equipo la revisa y te avisa cuando esté aprobada."],
  ["Hacé tus pedidos", "Con la cuenta aprobada ves los precios mayoristas y pedís desde la tienda."],
] as const;

function HomeJoin() {
  return (
    <section className="home-join" aria-labelledby="home-join-title">
      <div className="container home-join-grid">
        <div className="home-join-copy">
          <h2 id="home-join-title">Cómo ser cliente</h2>
          <p>Vendemos a comercios de todo el país. Abrí tu cuenta y comprá al por mayor.</p>
        </div>
        <ol className="home-join-steps">
          {joinSteps.map(([title, text]) => (
            <li key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
        <div className="home-join-actions">
          <Link className="home-button home-button--lime" href={storeRoutes.requestAccount}>Solicitar cuenta</Link>
          <p>¿Ya sos cliente? <Link href={storeRoutes.login}>Ingresá</Link></p>
        </div>
      </div>
    </section>
  );
}
