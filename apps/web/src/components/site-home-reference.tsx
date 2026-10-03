"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, ArrowUpRight, Mail } from "lucide-react";
import { Picture } from "./ui";
import { storeRoutes } from "@/lib/store-routes";

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
