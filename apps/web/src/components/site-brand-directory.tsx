"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Picture } from "./ui";
import { brandLogoSrc } from "@/lib/brand-logos";
import { usePublicApi } from "./providers";
import type { Entity, ProductCardList } from "@/lib/types";
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const detailRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const originRef = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const search = fold(query.trim());
  const shown = siteBrands.filter(
    (brand) => (!line || brand.line === line) && matchesSpecies(brand, animal) && (!search || fold(brand.name).includes(search)),
  );
  const current = siteBrands.find((brand) => brand.name === selected);
  const selectedIndex = shown.findIndex((brand) => brand.name === selected);
  const profileRow = selectedIndex < 0 ? 1 : Math.floor(selectedIndex / 2) + 2;

  const focusDetail = useCallback(() => {
    titleRef.current?.focus({ preventScroll: true });
    if (window.matchMedia("(max-width: 1023px)").matches) {
      detailRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "nearest",
      });
    }
  }, []);

  useEffect(() => {
    if (!selected) return;
    focusDetail();
  }, [selected, focusDetail]);

  const select = (name: string, origin: HTMLButtonElement) => {
    originRef.current = origin;
    if (name === selected) {
      focusDetail();
    }
    setSelected(name);
  };

  return (
    <>
      <div className="brands-toolbar">
        <label className="brands-search">
          <Search size={20} aria-hidden="true" />
          <span className="visually-hidden">Buscar marca</span>
          <input ref={searchRef} type="search" placeholder="Buscar una marca, por ejemplo Pipicat" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label className="brands-species">
          Especie
          <select value={animal} onChange={(event) => setAnimal(event.target.value)}>
            {species.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
      </div>
      <button className="public-filter-toggle" type="button" aria-expanded={filtersOpen} aria-controls="brand-line-filters" onClick={() => setFiltersOpen(!filtersOpen)}>
        Líneas de producto{line ? ` · ${lineLabel(line)}` : " · Todas"}
      </button>
      <div id="brand-line-filters" className={`site-brand-filters public-filter-panel${filtersOpen ? " is-open" : ""}`} role="group" aria-label="Filtrar por línea de producto">
        {[["", "Todas"] as const, ...brandLines].map(([id, label]) => (
          <button key={id || "todas"} type="button" aria-pressed={line === id} onClick={() => setLine(id)}>
            {label} <small>{id ? siteBrands.filter((brand) => brand.line === id).length : siteBrands.length}</small>
          </button>
        ))}
      </div>
      <p className="brands-result" aria-live="polite">{shown.length === 1 ? "1 marca" : `${shown.length} marcas`}</p>

      <div className="brands-browser" style={{ "--profile-row": profileRow } as CSSProperties}>
      <div className="brands-grid">
        {shown.map((brand) => (
          <button
            key={brand.name}
            type="button"
            className="brands-card"
            aria-pressed={brand.name === selected}
            aria-controls={current ? "brand-profile" : undefined}
            onClick={(event) => select(brand.name, event.currentTarget)}
          >
            <span className="brands-card-logo"><BrandMark brand={brand} /></span>
            <span className="brands-card-name">{brand.name}</span>
            <span className="brands-card-meta">{lineLabel(brand.line)} · {brand.species}</span>
          </button>
        ))}
        {shown.length === 0 && (
          <div className="site-empty brands-empty">
            <p>No hay marcas que coincidan con tu búsqueda y filtros. Limpiá los filtros para ver todas.</p>
            <button className="button" type="button" onClick={() => { setLine(""); setQuery(""); setAnimal(""); }}>Limpiar filtros</button>
          </div>
        )}
      </div>
      <aside className={`brands-detail-slot${current ? " has-selection" : ""}`} aria-label="Detalle de marca">
      {current && (
        <section id="brand-profile" ref={detailRef} className="brands-detail" aria-labelledby="brands-detail-title">
          <div className="brands-detail-logo">
            <BrandMark brand={current} large />
          </div>
          <div className="brands-detail-body">
            <h2 ref={titleRef} id="brands-detail-title" tabIndex={-1}>{current.name}</h2>
            <div className="home-chips">
              <span>{lineLabel(current.line)}</span>
              <span>{current.species}</span>
              <span>{current.relation}</span>
            </div>
            <p>{current.description}</p>
            <BrandCatalogProducts key={current.name} brand={current} />
            <Link className="home-text-link" href={brandCatalogHref(current)}>Ver productos de {current.name} en el catálogo</Link>
          </div>
          <button className="brands-close" type="button" aria-label="Cerrar" onClick={() => { setSelected(null); (originRef.current?.isConnected ? originRef.current : searchRef.current)?.focus({ preventScroll: true }); }}><X size={22} aria-hidden="true" /></button>
        </section>
      )}
        {!current && <p className="brands-detail-hint">Seleccioná una marca para ver sus detalles y productos.</p>}
      </aside>
      </div>
    </>
  );
}

const brandKey = (value: string) => fold(value).replace(/[^a-z0-9]/g, "");

function BrandCatalogProducts({ brand }: { brand: SiteBrand }) {
  const brands = usePublicApi<Entity[]>("brands");
  if (brands.isPending) return <p className="brands-products-state" role="status">Cargando productos…</p>;
  if (brands.isError) return <BrandProductsError retry={() => void brands.refetch()} />;
  const key = brandKey(brand.name);
  const entity = brands.data.find((item) => brandKey(item.name) === key || (item.slug && brandKey(item.slug) === key));
  if (!entity) return <p className="brands-products-state">No hay productos publicados de esta marca.</p>;
  return <BrandProductList key={entity.id} brandId={entity.id} />;
}

function BrandProductList({ brandId }: { brandId: string }) {
  const products = usePublicApi<ProductCardList>(`products/cards?brandId=${encodeURIComponent(brandId)}&limit=4`);
  if (products.isPending) return <p className="brands-products-state" role="status">Cargando productos…</p>;
  if (products.isError) return <BrandProductsError retry={() => void products.refetch()} />;
  if (!products.data.items.length) return <p className="brands-products-state">No hay productos publicados de esta marca.</p>;
  return (
    <ul className="home-shelf" aria-label="Productos de la marca">
      {products.data.items.map((product) => (
        <li key={product.id}>
          <Link href={`/productos/${encodeURIComponent(product.slug)}`}>
            <span className="home-shelf-img"><Picture src={product.media.find((media) => media.type === "IMAGE")?.url ?? "/images/placeholder.svg"} alt="" sizes="150px" loading="lazy" /></span>
            <span>{product.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function BrandProductsError({ retry }: { retry: () => void }) {
  return <div className="brands-products-state" role="alert"><p>No pudimos cargar los productos.</p><button className="button small secondary" type="button" onClick={retry}>Reintentar</button></div>;
}

function BrandMark({ brand, large = false }: { brand: SiteBrand; large?: boolean }) {
  const logo = brandLogoSrc(brand.logo);
  return logo
    ? <Picture src={logo} alt={large ? brand.name : ""} sizes={large ? "220px" : "180px"} />
    : <span className="brands-wordmark">{brand.name}</span>;
}
