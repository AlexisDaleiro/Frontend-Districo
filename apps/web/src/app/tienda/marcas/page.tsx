"use client";

import { useState } from "react";
import Link from "next/link";
import { useApi } from "@/components/providers";
import { PageHeading, Loading, ErrorBox } from "@/components/ui";
import { BrandLogo } from "@/components/brand-logo";
import { brandLogoSrc } from "@/lib/brand-logos";
import type { Entity } from "@/lib/types";
import { storeRoutes, withSearch } from "@/lib/store-routes";
import { salesLineLabel } from "@/lib/sales-line";

const searchText = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-UY");
const logoSrc = (item: Entity) => item.imageUrl || brandLogoSrc(item.slug) || brandLogoSrc(searchText(item.name).replace(/[^a-z0-9]+/g, "-"));

export default function Page() {
  const brands = useApi<Entity[]>("brands");
  const labs = useApi<Entity[]>("laboratories");
  const [group, setGroup] = useState("all");
  const directories = [
    { query: brands, title: "Marcas", key: "brandId" },
    { query: labs, title: "Laboratorios", key: "laboratoryId" },
  ];

  return (
    <div className="section brand-directory">
      <div className="container">
        <PageHeading eyebrow="Catálogo mayorista" title="Marcas y laboratorios">
          Elegí una marca para consultar sus productos.
        </PageHeading>
        <div className="brand-directory-toolbar">
          <div className="brand-directory-filters" role="group" aria-label="Mostrar marcas o laboratorios">
            {[["all", "Todas"], ["brandId", "Marcas"], ["laboratoryId", "Laboratorios"]].map(([value, label]) => (
              <button key={value} type="button" aria-pressed={group === value} onClick={() => setGroup(value)}>{label}</button>
            ))}
          </div>
        </div>
        {directories.filter(({ key }) => group === "all" || group === key).map(({ query, title, key }) => {
          const items = query.data ?? [];
          return (
            <section className="brand-directory-section" key={key} aria-labelledby={`directory-${key}`}>
              <h2 id={`directory-${key}`}>{title}</h2>
              {query.isPending ? <Loading /> : query.error ? (
                <ErrorBox error={query.error} retry={() => void query.refetch()} />
              ) : items.length ? (
                <div className="brand-gallery">
                  {items.map((item) => (
                    <Link className="brand-gallery-card" key={item.id} aria-label={`Ver productos de ${item.name}`} href={withSearch(storeRoutes.products, new URLSearchParams({ [key]: item.id }))}>
                      <div className="brand-gallery-logo">
                        {logoSrc(item) ? <BrandLogo brand={{ ...item, imageUrl: logoSrc(item) }} /> : (
                          <span className="brand-gallery-initials" aria-hidden="true">{item.name.split(/\s+/).map((word) => word[0]).slice(0, 2).join("")}</span>
                        )}
                      </div>
                      <h3>{item.name}</h3>
                      {key === "brandId" && salesLineLabel(item.salesLine) && <span className="status-pill">{salesLineLabel(item.salesLine)}</span>}
                    </Link>
                  ))}
                </div>
              ) : <p className="brand-directory-empty" role="status">Se mostrarán aquí cuando estén cargados en el catálogo.</p>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
