"use client";

import { useState } from "react";
import { SiteBrandCard } from "./site-brand-card";
import { brandLines, siteBrands, type BrandLine } from "@/lib/site-brands";

const lines = brandLines.filter(([id]) => siteBrands.some((brand) => brand.line === id));

export function SiteBrandDirectory() {
  const [line, setLine] = useState<BrandLine | "">("");
  const shown = line ? siteBrands.filter((brand) => brand.line === line) : siteBrands;
  return (
    <>
      <div className="site-brand-filters" role="group" aria-label="Filtrar por línea de negocio">
        {[["", "Todas"] as const, ...lines].map(([id, label]) => (
          <button key={id || "todas"} type="button" aria-pressed={line === id} onClick={() => setLine(id)}>
            {label}
          </button>
        ))}
      </div>
      <p className="visually-hidden" aria-live="polite">{shown.length} marcas</p>
      <div className="site-brand-grid">
        {shown.map((brand) => (
          <SiteBrandCard key={brand.name} brand={brand} index={siteBrands.indexOf(brand)} sizes="(max-width: 767px) 45vw, 20vw" />
        ))}
      </div>
    </>
  );
}
