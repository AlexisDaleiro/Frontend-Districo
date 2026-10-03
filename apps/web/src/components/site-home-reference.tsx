"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, Mail } from "lucide-react";
import { Picture } from "./ui";
import { storeRoutes } from "@/lib/store-routes";

const brands = [
  { name: "Gran Plus", logo: "gran-plus.png", color: "#84152a" },
  { name: "Biofresh", logo: "biofresh.png", color: "#5b8474" },
  { name: "Three Dogs", logo: "three-dogs.png", color: "#6d82aa" },
  { name: "TOH", color: "#b96b4d" },
  { name: "Procão", logo: "procao.png", color: "#a5ad59" },
  { name: "Three Cats", logo: "three-cats.png", color: "#a07652" },
  { name: "Stack", logo: "stack.png", color: "#bb777e" },
  { name: "Guabi Natural", color: "#81a166" },
  { name: "Primocão", logo: "primocao.png", color: "#9b7657" },
  { name: "Primogato", logo: "primogato.png", color: "#808aa2" },
  { name: "YowUp", color: "#5e96b2" },
  { name: "LoPets", color: "#ab7777" },
  { name: "Pipicat", logo: "pipicat.png", color: "#6c9ca0" },
  { name: "Beny", logo: "beny.png", color: "#aa8c51" },
  { name: "4 Pets", logo: "4pets.png", color: "#7a9262" },
] as const;

const petPhotos = [3, 2, 1, 5, 6, 7, 4, 8].map(
  (number) => `/images/brand-pets-${String(number).padStart(2, "0")}.webp`,
);

const lines = [
  {
    title: "Alimento para mascotas",
    description: "Somos representantes en Uruguay de Hercosul Brasil, empresa líder de la categoría en el sur de Brasil e integrante del grupo BRF Foods. La calidad y excelencia de sus productos nos ha permitido un destacado posicionamiento de las marcas en plaza.",
    tags: ["Perros", "Gatos"],
    image: "/images/landing-lines/alimento.webp",
    alt: "BIOFRESH para perros, adultos de razas grandes y gigantes",
    brand: "Biofresh",
    href: "/productos?categoryId=alimentacion",
    accent: "#c6df23",
    contrast: "light",
  },
  {
    title: "Arenas sanitarias",
    description: "Comercializamos distintas marcas de arenas sanitarias de excelente calidad que se adaptan a las necesidades de cada mascota.",
    tags: ["Arenas para gatos"],
    image: "/images/landing-lines/arenas.webp",
    alt: "Arena sanitaria Pipicat Classic",
    brand: "Pipicat",
    href: "/productos?categoryId=arenas",
    accent: "#d4e681",
    contrast: "light",
  },
  {
    title: "Cuidado de la mascota",
    description: "Somos distribuidores de productos de cuidado animal, con opciones para la higiene y el bienestar cotidiano de las mascotas.",
    tags: ["Higiene", "Bienestar"],
    image: "/images/landing-lines/cuidado.webp",
    alt: "Shampoo neutro Procão",
    brand: "Procão",
    href: "/productos?categoryId=higiene",
    accent: "#9fe0be",
    contrast: "light",
  },
  {
    title: "Snacks para consumo humano",
    description: "Nuestra marca Stack cuenta con varios años en el mercado. La amplitud de la línea nos permitió lograr un buen posicionamiento.",
    tags: ["Papas", "Palitos", "Maníes"],
    image: "/images/landing-lines/snacks-humanos.webp",
    alt: "Mega Pack de snacks Stack",
    brand: "Stack",
    href: "/productos?categoryId=snacks",
    accent: "#fff0a5",
    contrast: "dark",
  },
  {
    title: "Accesorios",
    description: "Pecheras, correas, collares y accesorios de paseo y viaje para perros y gatos, pensados para el uso diario.",
    tags: ["Paseo", "Viaje"],
    image: "/images/landing-lines/accesorios.webp",
    alt: "Pechera Mesh H con correa de TOH",
    brand: "TOH",
    href: "/productos",
    accent: "#ffad55",
    contrast: "light",
  },
  {
    title: "Snacks para mascotas",
    description: "Snacks líquidos funcionales para perros y gatos: yogures, kéfir, leche y caldo de huesos, sin lactosa ni azúcar añadido.",
    tags: ["Perros", "Gatos"],
    image: "/images/landing-lines/snacks-mascotas.webp",
    alt: "YOWUP Yogur Digestive natural para perros",
    brand: "YowUp",
    href: "/productos",
    accent: "#9bdeef",
    contrast: "light",
  },
] as const;

export function SiteHomeReference() {
  const brandRail = useRef<HTMLDivElement>(null);
  const [brandPosition, setBrandPosition] = useState({ back: false, next: true });

  useEffect(() => {
    const rail = brandRail.current;
    if (!rail) return;
    const update = () => setBrandPosition({
      back: rail.scrollLeft > 2,
      next: rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 2,
    });
    update();
    rail.addEventListener("scroll", update, { passive: true });
    const resize = new ResizeObserver(update);
    resize.observe(rail);
    return () => { rail.removeEventListener("scroll", update); resize.disconnect(); };
  }, []);

  const moveBrands = (direction: -1 | 1) => {
    const rail = brandRail.current;
    if (!rail) return;
    rail.scrollBy({
      left: direction * Math.max(rail.clientWidth * .8, 180),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  };

  return (
    <>
      <div id="lineas" className="reference-lines">
        {lines.map((line, index) => (
          <section
            className={`reference-line reference-line--${line.contrast}`}
            key={line.title}
            style={{
              "--line-accent": line.accent,
              "--line-glow-x": index % 2 ? "25%" : "75%",
            } as CSSProperties}
            aria-labelledby={`reference-line-${index}`}
          >
            <div className={`container reference-line-grid${index % 2 ? " is-reversed" : ""}`}>
              <div className="reference-line-copy">
                <p className="reference-kicker">Nuestras líneas / 0{index + 1}</p>
                <h2 id={`reference-line-${index}`}>{line.title}</h2>
                <p>{line.description}</p>
                <ul className="reference-line-tags" aria-label="Categorías">
                  {line.tags.map((tag) => <li key={tag}>{tag}</li>)}
                </ul>
                <Link href={line.href} className="reference-line-cta">
                  Ver productos <ArrowUpRight size={18} aria-hidden="true" />
                </Link>
              </div>
              <div className="reference-line-visual">
                <span className="reference-line-ring" aria-hidden="true" />
                <Picture src={line.image} alt={line.alt} loading="lazy" sizes="(max-width: 767px) 75vw, 38vw" />
                <span className="reference-line-brand">Distribuimos {line.brand}</span>
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className="reference-brands site-section" id="marcas" aria-labelledby="brands-title">
        <div className="container">
          <p className="reference-kicker">Representaciones</p>
          <div className="reference-brands-heading">
            <h2 id="brands-title">Las 15 marcas que distribuimos.</h2>
            <p>Alimento balanceado, arenas sanitarias, cuidado animal y snacks de fábricas de la región.</p>
          </div>
          <div className="reference-brands-stage">
            <div className="reference-brands-rail" ref={brandRail} aria-label="Marcas que distribuye Districo" tabIndex={0}>
              {brands.map((brand, index) => (
                <Link className="reference-brand-card" key={brand.name} href={`/productos?search=${encodeURIComponent(brand.name)}`} aria-label={`Ver productos de ${brand.name}`} style={{ backgroundColor: brand.color }}>
                  <Picture className="reference-brand-photo" src={petPhotos[index % petPhotos.length]} alt="" loading="lazy" sizes="(max-width: 767px) 45vw, 16vw" />
                  <span className="reference-brand-shade" aria-hidden="true" />
                  <span className="reference-brand-mark">
                    {"logo" in brand && brand.logo ? (
                      <Picture src={`/images/brands/${brand.logo}`} alt="" loading="lazy" sizes="140px" />
                    ) : (
                      <span className="reference-brand-wordmark">{brand.name}</span>
                    )}
                  </span>
                  <span className="reference-brand-name">{brand.name}<ArrowUpRight size={15} aria-hidden="true" /></span>
                </Link>
              ))}
            </div>
            <button className="reference-brand-arrow reference-brand-arrow--back" type="button" onClick={() => moveBrands(-1)} disabled={!brandPosition.back} aria-label="Marcas anteriores"><ChevronLeft size={22} /></button>
            <button className="reference-brand-arrow reference-brand-arrow--next" type="button" onClick={() => moveBrands(1)} disabled={!brandPosition.next} aria-label="Marcas siguientes"><ChevronRight size={22} /></button>
          </div>
          <div className="reference-brands-actions">
            <Link href="/productos" className="reference-brands-button">Ver el catálogo completo <ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <section className="reference-about" id="nosotros" aria-labelledby="reference-about-title">
        <div className="container reference-about-grid">
          <div className="reference-about-photo">
            <Picture
              src="/images/deposito-estanterias.webp"
              alt="Depósito de DISTRICO con estanterías de mercadería"
              loading="lazy"
              sizes="(max-width: 767px) 100vw, 50vw"
            />
          </div>
          <div className="reference-about-copy">
            <p className="reference-kicker">Quiénes somos</p>
            <h2 id="reference-about-title">Distribuyendo en Uruguay desde 1995.</h2>
            <p>Districo S.A. nació como Distribuidora Colón, fundada por Fernando Graviz sobre la experiencia agroveterinaria familiar. Hoy distribuimos alimento para mascotas, arenas sanitarias, cuidado animal y snacks en todo el país.</p>
            <ul>
              <li><Check size={18} aria-hidden="true" /><span><strong>Casa Matriz de 10.000 m²</strong> en Montevideo, con 1.600 m² de depósito.</span></li>
              <li><Check size={18} aria-hidden="true" /><span><strong>Sucursal Maldonado</strong> con sede propia de 700 m² para atender el este.</span></li>
              <li><Check size={18} aria-hidden="true" /><span><strong>Energía y flota propias</strong> con plantas fotovoltaicas y vehículos eléctricos.</span></li>
            </ul>
            <Link className="reference-about-link" href="/#contacto">Hablemos de tu comercio <ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <section className="reference-contact" id="contacto" aria-labelledby="reference-contact-title">
        <div className="container reference-contact-grid">
          <div>
            <p className="reference-kicker">Cuenta comercial</p>
            <h2 id="reference-contact-title">Sumá nuestras líneas a tu comercio.</h2>
            <p>Alimento para mascotas, arenas sanitarias, cuidado animal y snacks de consumo masivo. Una sola cuenta, un solo reparto.</p>
          </div>
          <div className="reference-contact-actions">
            <a className="reference-contact-primary" href="https://wa.me/59895673109?text=Hola%2C%20quisiera%20abrir%20una%20cuenta%20mayorista%20con%20Districo." target="_blank" rel="noopener noreferrer">Escribir por WhatsApp <ArrowUpRight size={18} aria-hidden="true" /></a>
            <Link className="reference-contact-secondary" href={storeRoutes.requestAccount}>Solicitar cuenta <ArrowRight size={18} aria-hidden="true" /></Link>
            <a className="reference-contact-email" href="mailto:contacto@districo.com.uy"><Mail size={17} aria-hidden="true" /> contacto@districo.com.uy</a>
          </div>
        </div>
      </section>
    </>
  );
}
