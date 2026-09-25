"use client";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  PackageCheck,
  Handshake,
  ShieldCheck,
} from "lucide-react";
import { useApi } from "./providers";
import type { Entity, ProductList } from "@/lib/types";
import { Picture, ActionLink, ErrorBox, Loading } from "./ui";
import { ProductGrid } from "./catalog";
const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
const needs = [
  {
    name: "Alimentación",
    match: ["alimentacion", "alimentos", "alimento para mascotas"],
    image: "/images/product-0-0.jpg",
  },
  {
    name: "Higiene y cuidado",
    match: [
      "higiene",
      "higiene y cuidado",
      "cuidado de la mascota",
      "cuidado mascotas",
    ],
    image: "/images/product-2-1.png",
  },
  {
    name: "Arenas sanitarias",
    match: ["arenas", "arenas sanitarias"],
    image: "/images/product-1-0.jpg",
  },
  {
    name: "Veterinaria",
    match: ["veterinaria", "animales de compania"],
    image: "/images/raicor-animales-de-compania-0.png",
  },
  {
    name: "Ganadería",
    match: ["ganaderia"],
    image: "/images/raicor-ganaderia-0.png",
  },
  {
    name: "Aves y cerdos",
    match: ["aves y cerdos"],
    image: "/images/magnis-aves-y-cerdos-0.jpg",
  },
  {
    name: "Snacks",
    match: ["snacks", "snacks para personas", "snacks para consumo humano"],
    image: "/images/product-3-0.png",
  },
  {
    name: "Control de plagas",
    match: ["control de plagas", "raticidas"],
    image: "/images/magnis-raticidas-0.png",
  },
];
export function Home() {
  const categories = useApi<Entity[]>("categories"),
    featured = useApi<ProductList>("products?featured=true&limit=4"),
    brands = useApi<Entity[]>("brands");
  const mapped = needs.flatMap((n) => {
    const category = categories.data?.find(
      (c) =>
        n.match.includes(normalize(c.name)) ||
        n.match.includes(normalize(c.slug ?? "").replaceAll("-", " ")),
    );
    return category ? [{ ...n, id: category.id }] : [];
  });
  return (
    <>
      <div className="container">
        <section className="needs" aria-label="Comprar por necesidad">
          <div className="needs-intro">
            <strong>¿Qué estás buscando?</strong>
            <p>Una solución para cada necesidad.</p>
          </div>
          {categories.error ? (
            <ErrorBox
              error={categories.error}
              retry={() => void categories.refetch()}
            />
          ) : categories.isPending ? (
            <Loading />
          ) : (
            <div className="need-list">
              {mapped.map((n) => (
                <Link
                  href={`/catalogo?categoryId=${n.id}`}
                  className="need"
                  key={n.id}
                >
                  <span className="need-circle">
                    <Picture src={n.image} alt="" />
                  </span>
                  {n.name}
                </Link>
              ))}
            </div>
          )}
        </section>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Cerca de tu negocio. Todos los días.</p>
            <h1>
              Lo que necesitan.
              <br />
              <em>
                El respaldo
                <br />
                que buscás.
              </em>
            </h1>
            <p>
              Marcas de confianza y soluciones que acompañan el crecimiento de
              tu negocio.
            </p>
            <div className="actions">
              <Link className="button" href="/catalogo">
                Explorar catálogo <ArrowRight size={17} />
              </Link>
            </div>
          </div>
          <div className="hero-visual">
            <Picture
              src="/images/hero-raicor.jpg"
              alt="Cuidado y bienestar animal, selección de Raicor"
              fetchPriority="high"
            />
            <div className="hero-caption">
              <span>Una selección con propósito</span>
              <strong>Calidad que se nota.</strong>
            </div>
          </div>
        </section>
        <div className="benefits">
          <div>
            <PackageCheck size={24} />
            <span>
              <strong>Selección mayorista</strong>Productos para tu negocio
            </span>
          </div>
          <div>
            <ShieldCheck size={24} />
            <span>
              <strong>Marcas de confianza</strong>Calidad y respaldo
            </span>
          </div>
          <div>
            <Handshake size={24} />
            <span>
              <strong>Atención cercana</strong>Te acompañamos a crecer
            </span>
          </div>
        </div>
        <section className="section">
          <div className="section-title">
            <div>
              <p className="eyebrow">Un catálogo, muchas posibilidades</p>
              <h2>Encontrá tu próxima solución.</h2>
            </div>
            <Link className="text-link" href="/catalogo">
              Ver todo <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="line-grid">
            {mapped
              .filter((n) =>
                ["Alimentación", "Veterinaria", "Snacks"].includes(n.name),
              )
              .map((n, i) => (
                <Link
                  className="line-card"
                  key={n.id}
                  href={`/catalogo?categoryId=${n.id}`}
                >
                  <Picture src={n.image} alt="" loading="lazy" />
                  <p className="eyebrow">0{i + 1} / Nuestras líneas</p>
                  <h3>
                    {n.name === "Alimentación"
                      ? "Bienestar animal"
                      : n.name === "Veterinaria"
                        ? "Cuidado profesional"
                        : "Pequeños gustos"}
                  </h3>
                  <p>
                    {n.name === "Alimentación"
                      ? "Nutrición para cada etapa."
                      : n.name === "Veterinaria"
                        ? "Soluciones para el cuidado animal."
                        : "Snacks para disfrutar y compartir."}
                  </p>
                  <span className="round-arrow">
                    <ArrowUpRight size={18} />
                  </span>
                </Link>
              ))}
          </div>
        </section>
      </div>
      <section className="brand-strip">
        <div className="container">
          <p
            className="eyebrow"
            style={{ textAlign: "center", marginBottom: 28 }}
          >
            Marcas que forman parte de cada día
          </p>
          <div className="brand-list">
            {brands.data?.slice(0, 6).map((b) => (
              <Link
                className="brand-word"
                key={b.id}
                href={`/catalogo?brandId=${b.id}`}
              >
                {b.name}
              </Link>
            ))}
            <Link className="text-link" href="/marcas">
              Conocé todas <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>
      <div className="container">
        <section className="section">
          <div className="section-title">
            <div>
              <p className="eyebrow">Para tener en cuenta</p>
              <h2>Una selección para tu negocio.</h2>
              <p className="muted">
                Explorá las presentaciones y encontrá lo que necesitás.
              </p>
            </div>
            <Link className="text-link" href="/catalogo">
              Ver catálogo <ArrowUpRight size={16} />
            </Link>
          </div>
          {featured.isPending ? (
            <Loading />
          ) : featured.error ? (
            <ErrorBox
              error={featured.error}
              retry={() => void featured.refetch()}
            />
          ) : featured.data.items.length ? (
            <ProductGrid products={featured.data.items} />
          ) : (
            <p className="muted">
              Estamos preparando nuestra selección. Explorá el catálogo
              completo.
            </p>
          )}
        </section>
        <section className="cta-band" style={{ marginBottom: 64 }}>
          <div>
            <p className="eyebrow">Tu negocio, nuestro compromiso</p>
            <h2>El próximo paso lo damos juntos.</h2>
            <p>
              Accedé al catálogo mayorista y gestioná tus pedidos en un solo
              lugar.
            </p>
          </div>
          <ActionLink href="/solicitar-cuenta" secondary>
            Quiero ser cliente
          </ActionLink>
        </section>
      </div>
    </>
  );
}
