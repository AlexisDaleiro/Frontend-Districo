"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import { SiteLineShowcase } from "./site-line-showcase";

const lines = [
  {
    title: "Alimento para mascotas",
    description: "Somos representantes en Uruguay de Hercosul Brasil, empresa líder de la categoría en el sur de Brasil e integrante del grupo BRF Foods. La calidad y excelencia de sus productos nos ha permitido un destacado posicionamiento de las marcas en plaza.",
    tags: ["Perros", "Gatos"],
    products: [
      { src: "/images/landing-lines/alimento.webp", alt: "BIOFRESH para perros, adultos de razas grandes y gigantes", brand: "Biofresh" },
      { src: "/images/landing-lines/products/alimento-1.webp", alt: "BENY para gatos – Adultos de todas las razas", brand: "Beny" },
      { src: "/images/landing-lines/products/alimento-2.webp", alt: "BIOFRESH para cachorros – Razas grandes y gigantes", brand: "Biofresh" },
      { src: "/images/landing-lines/products/alimento-3.webp", alt: "PRIMOCAO para perros – Cachorros", brand: "Primocão" },
      { src: "/images/landing-lines/products/alimento-4.webp", alt: "PRIMOGATO para gatos – Cachorros", brand: "Primogato" },
    ],
    href: "/productos?categoryId=alimentacion",
    accent: "#c6df23",
    contrast: "light",
  },
  {
    title: "Arenas sanitarias",
    description: "Comercializamos distintas marcas de arenas sanitarias de excelente calidad que se adaptan a las necesidades de cada mascota.",
    tags: ["Arenas para gatos"],
    products: [
      { src: "/images/landing-lines/arenas.webp", alt: "Arena sanitaria Pipicat Classic", brand: "Pipicat" },
      { src: "/images/landing-lines/products/arenas-1.webp", alt: "4PETS – Arena sanitaria para gatos", brand: "4 Pets" },
      { src: "/images/landing-lines/products/arenas-2.webp", alt: "PIPICAT Campestre", brand: "Pipicat" },
      { src: "/images/landing-lines/products/arenas-4.webp", alt: "PIPICAT Floral", brand: "Pipicat" },
    ],
    href: "/productos?categoryId=arenas",
    accent: "#d4e681",
    contrast: "light",
  },
  {
    title: "Cuidado de la mascota",
    description: "Somos distribuidores de productos de cuidado animal, con opciones para la higiene y el bienestar cotidiano de las mascotas.",
    tags: ["Higiene", "Bienestar"],
    products: [
      { src: "/images/landing-lines/cuidado.webp", alt: "Shampoo neutro Procão", brand: "Procão" },
      { src: "/images/landing-lines/products/cuidado-1.webp", alt: "Colonia Cachorros Procão", brand: "Procão" },
      { src: "/images/landing-lines/products/cuidado-2.webp", alt: "Colonia Hembra Procão", brand: "Procão" },
      { src: "/images/landing-lines/products/cuidado-3.webp", alt: "Colonia Macho Procão", brand: "Procão" },
      { src: "/images/landing-lines/products/cuidado-4.webp", alt: "Shampoo Cachorros Procão", brand: "Procão" },
    ],
    href: "/productos?categoryId=higiene",
    accent: "#9fe0be",
    contrast: "light",
  },
  {
    title: "Snacks para consumo humano",
    description: "Nuestra marca Stack cuenta con varios años en el mercado. La amplitud de la línea nos permitió lograr un buen posicionamiento.",
    tags: ["Papas", "Palitos", "Maníes"],
    products: [
      { src: "/images/landing-lines/snacks-humanos.webp", alt: "Mega Pack de snacks Stack", brand: "Stack" },
      { src: "/images/landing-lines/products/snacks-humanos-2.webp", alt: "Palito sabor cebolla", brand: "Stack" },
      { src: "/images/landing-lines/products/snacks-humanos-3.webp", alt: "Papa Acanalada", brand: "Stack" },
      { src: "/images/landing-lines/products/snacks-humanos-4.webp", alt: "Papas sabor barbacoa", brand: "Stack" },
      { src: "/images/landing-lines/products/snacks-humanos-5.webp", alt: "Papas sabor cebolla", brand: "Stack" },
    ],
    href: "/productos?categoryId=snacks",
    accent: "#fff0a5",
    contrast: "dark",
  },
  {
    title: "Accesorios",
    description: "Pecheras, correas, collares y accesorios de paseo y viaje para perros y gatos, pensados para el uso diario.",
    tags: ["Paseo", "Viaje"],
    products: [
      { src: "/images/landing-lines/accesorios.webp", alt: "Pechera Mesh H con correa de TOH", brand: "TOH" },
      { src: "/images/landing-lines/products/accesorios-1.webp", alt: "TOH Collar Breakaway para gatos", brand: "TOH" },
      { src: "/images/landing-lines/products/accesorios-2.webp", alt: "TOH Correa de soga 1,20 m", brand: "TOH" },
      { src: "/images/landing-lines/products/accesorios-3.webp", alt: "TOH Pechera antitirones + correa", brand: "TOH" },
    ],
    href: "/productos",
    accent: "#ffad55",
    contrast: "light",
  },
  {
    title: "Snacks para mascotas",
    description: "Snacks líquidos funcionales para perros y gatos: yogures, kéfir, leche y caldo de huesos, sin lactosa ni azúcar añadido.",
    tags: ["Perros", "Gatos"],
    products: [
      { src: "/images/landing-lines/snacks-mascotas.webp", alt: "YOWUP Yogur Digestive natural para perros", brand: "YowUp" },
      { src: "/images/landing-lines/products/snacks-mascotas-1.webp", alt: "LoPets Creamy Snack de atún bonito para gatos", brand: "LoPets" },
      { src: "/images/landing-lines/products/snacks-mascotas-2.webp", alt: "YOWUP Bone Broth de vacuno, verduras y jengibre para perros", brand: "YowUp" },
      { src: "/images/landing-lines/products/snacks-mascotas-3.webp", alt: "LoPets Creamy Snack de katsuobushi y atún para gatos", brand: "LoPets" },
      { src: "/images/landing-lines/products/snacks-mascotas-4.webp", alt: "YOWUP Flora Plus de pato y calabaza para perros", brand: "YowUp" },
    ],
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
                <SiteLineShowcase products={line.products} offset={index * 650} />
              </div>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
