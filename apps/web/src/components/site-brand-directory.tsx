"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Picture } from "./ui";
import { brandLogoSrc } from "@/lib/brand-logos";
import { brandCatalogHref, brandLines, lineLabel, siteBrands, type BrandLine, type SiteBrand } from "@/lib/site-brands";

const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const species = [
  ["", "Todas"],
  ["perros", "Perros"],
  ["gatos", "Gatos"],
  ["otras", "Otras"],
] as const;

function matchesSpecies(brand: SiteBrand, value: string) {
  const text = fold(brand.species);
  if (value === "perros") return text.includes("perros") || text === "mascotas";
  if (value === "gatos") return text.includes("gatos") || text === "mascotas";
  if (value === "otras") return !text.includes("perros") && !text.includes("gatos") && text !== "mascotas";
  return true;
}

const isLine = (value: string | null): value is BrandLine => brandLines.some(([id]) => id === value);

export function SiteBrandDirectory() {
  const params = useSearchParams();
  const initialLine = params.get("linea");
  const [line, setLine] = useState<BrandLine | "">(isLine(initialLine) ? initialLine : "");
  const [query, setQuery] = useState("");
  const [animal, setAnimal] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const detailRef = useRef<HTMLElement>(null);

  const search = fold(query.trim());
  const shown = siteBrands.filter(
    (brand) => (!line || brand.line === line) && matchesSpecies(brand, animal) && (!search || fold(brand.name).includes(search)),
  );
  const current = siteBrands.find((brand) => brand.name === selected);

  const select = (name: string) => {
    setSelected(name);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }));
  };

  return (
    <>
      <div className="brands-toolbar">
        <label className="brands-search">
          <Search size={20} aria-hidden="true" />
          <span className="visually-hidden">Buscar marca</span>
          <input type="search" placeholder="Buscar una marca, por ejemplo Pipicat" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label className="brands-species">
          Especie
          <select value={animal} onChange={(event) => setAnimal(event.target.value)}>
            {species.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
      </div>
      <div className="site-brand-filters" role="group" aria-label="Filtrar por línea de producto">
        {[["", "Todas"] as const, ...brandLines].map(([id, label]) => (
          <button key={id || "todas"} type="button" aria-pressed={line === id} onClick={() => setLine(id)}>
            {label} <small>{id ? siteBrands.filter((brand) => brand.line === id).length : siteBrands.length}</small>
          </button>
        ))}
      </div>
      <p className="brands-result" aria-live="polite">{shown.length === 1 ? "1 marca" : `${shown.length} marcas`}</p>

      {current && (
        <section ref={detailRef} className="brands-detail" aria-labelledby="brands-detail-title">
          <div className="brands-detail-logo">
            <BrandMark brand={current} large />
          </div>
          <div className="brands-detail-body">
            <h2 id="brands-detail-title">{current.name}</h2>
            <div className="home-chips">
              <span>{lineLabel(current.line)}</span>
              <span>{current.species}</span>
              <span>{current.relation}</span>
            </div>
            <p>{current.description}</p>
            {current.products?.length ? (
              <ul className="home-shelf">
                {current.products.map((product) => (
                  <li key={product.image}>
                    <span className="home-shelf-img"><Picture src={product.image} alt="" sizes="150px" loading="lazy" /></span>
                    <span>{product.name}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <Link className="home-text-link" href={brandCatalogHref(current)}>Ver productos de {current.name} en el catálogo</Link>
          </div>
          <button className="brands-close" type="button" onClick={() => setSelected(null)}>Cerrar</button>
        </section>
      )}

      <div className="brands-grid">
        {shown.map((brand) => (
          <button
            key={brand.name}
            type="button"
            className="brands-card"
            aria-pressed={brand.name === selected}
            onClick={() => select(brand.name)}
          >
            <span className="brands-card-logo"><BrandMark brand={brand} /></span>
            <span className="brands-card-name">{brand.name}</span>
            <span className="brands-card-meta">{lineLabel(brand.line)} · {brand.species}</span>
          </button>
        ))}
        {shown.length === 0 && (
          <div className="site-empty brands-empty">
            <p>No hay marcas que coincidan con la búsqueda.</p>
            <button className="button" type="button" onClick={() => { setLine(""); setQuery(""); setAnimal(""); }}>Limpiar filtros</button>
          </div>
        )}
      </div>
    </>
  );
}

function BrandMark({ brand, large = false }: { brand: SiteBrand; large?: boolean }) {
  const logo = brandLogoSrc(brand.logo);
  return logo
    ? <Picture src={logo} alt={large ? brand.name : ""} sizes={large ? "220px" : "180px"} />
    : <span className="brands-wordmark">{brand.name}</span>;
}
