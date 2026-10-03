"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Mail } from "lucide-react";
import { Picture } from "./ui";
import { storeRoutes } from "@/lib/store-routes";

const brands = [
  { name: "Gran Plus", logo: "gran-plus.png" },
  { name: "Biofresh", logo: "biofresh.png" },
  { name: "Three Dogs", logo: "three-dogs.png" },
  { name: "TOH" },
  { name: "Procão", logo: "procao.png" },
  { name: "Three Cats", logo: "three-cats.png" },
  { name: "Stack", logo: "stack.png" },
  { name: "Guabi Natural" },
  { name: "Primocão", logo: "primocao.png" },
  { name: "Primogato", logo: "primogato.png" },
  { name: "YowUp" },
  { name: "LoPets" },
  { name: "Pipicat", logo: "pipicat.png" },
  { name: "Beny", logo: "beny.png" },
  { name: "4 Pets", logo: "4pets.png" },
] as const;

const lines = [
  {
    title: "Alimento para mascotas",
    description: "Alimento balanceado para perros y gatos de las marcas que acompañan a los comercios de todo Uruguay.",
    tags: ["Perros", "Gatos"],
    image: "/images/landing-lines/alimento.webp",
    alt: "BIOFRESH para perros, adultos de razas grandes y gigantes",
    brand: "Biofresh",
    href: "/productos?categoryId=alimentacion",
    color: "#003647",
    contrast: "light",
  },
  {
    title: "Arenas sanitarias",
    description: "Opciones de arena sanitaria para distintas necesidades de los gatos y de quienes los cuidan.",
    tags: ["Arenas para gatos"],
    image: "/images/landing-lines/arenas.webp",
    alt: "Arena sanitaria Pipicat Classic",
    brand: "Pipicat",
    href: "/productos?categoryId=arenas",
    color: "#55684d",
    contrast: "light",
  },
  {
    title: "Cuidado de la mascota",
    description: "Higiene y bienestar para el día a día: shampoo, acondicionadores y otros productos de cuidado animal.",
    tags: ["Higiene", "Bienestar"],
    image: "/images/landing-lines/cuidado.webp",
    alt: "Shampoo neutro Procão",
    brand: "Procão",
    href: "/productos?categoryId=higiene",
    color: "#3f6759",
    contrast: "light",
  },
  {
    title: "Snacks para consumo humano",
    description: "La línea Stack suma papas, palitos, maníes y packs a la oferta de tu comercio.",
    tags: ["Papas", "Palitos", "Maníes"],
    image: "/images/landing-lines/snacks-humanos.webp",
    alt: "Mega Pack de snacks Stack",
    brand: "Stack",
    href: "/productos?categoryId=snacks",
    color: "#fac541",
    contrast: "dark",
  },
  {
    title: "Accesorios",
    description: "Pecheras, correas, collares y accesorios de paseo y viaje pensados para el uso diario.",
    tags: ["Paseo", "Viaje"],
    image: "/images/landing-lines/accesorios.webp",
    alt: "Pechera Mesh H con correa de TOH",
    brand: "TOH",
    href: "/productos",
    color: "#a8410b",
    contrast: "light",
  },
  {
    title: "Snacks para mascotas",
    description: "Premios y complementos para perros y gatos, con opciones funcionales para cada momento.",
    tags: ["Perros", "Gatos"],
    image: "/images/landing-lines/snacks-mascotas.webp",
    alt: "YOWUP Yogur Digestive natural para perros",
    brand: "YowUp",
    href: "/productos",
    color: "#2e5e7e",
    contrast: "light",
  },
] as const;

export function SiteHomeReference() {
  return (
    <>
      <section className="reference-stats" aria-label="Districo en cifras">
        <div className="container reference-stats-grid">
          <div><strong>Desde 1995</strong><span>distribuyendo en Uruguay</span></div>
          <div><strong>Todo el país</strong><span>alcance de nuestra distribución</span></div>
          <div><strong>10.000 m²</strong><span>Casa Matriz en Montevideo</span></div>
          <div><strong>ISO 9001</strong><span>certificación desde 2019</span></div>
        </div>
      </section>

      <div id="lineas" className="reference-lines">
        {lines.map((line, index) => (
          <section
            className={`reference-line reference-line--${line.contrast}`}
            key={line.title}
            style={{ backgroundColor: line.color }}
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
          <div className="reference-brands-rail" aria-label="Marcas que distribuye Districo">
            {brands.map((brand) => (
              <Link className="reference-brand-card" key={brand.name} href={`/productos?search=${encodeURIComponent(brand.name)}`} aria-label={`Ver productos de ${brand.name}`}>
                {"logo" in brand && brand.logo ? (
                  <Picture src={`/images/brands/${brand.logo}`} alt="" loading="lazy" sizes="160px" />
                ) : (
                  <span className="reference-brand-wordmark">{brand.name}</span>
                )}
                <span className="reference-brand-name">{brand.name}<ArrowUpRight size={15} aria-hidden="true" /></span>
              </Link>
            ))}
          </div>
          <div className="reference-brands-actions">
            <Link href="/productos" className="reference-brands-button">Ver el catálogo completo <ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <section className="reference-about" id="nosotros" aria-labelledby="reference-about-title">
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
