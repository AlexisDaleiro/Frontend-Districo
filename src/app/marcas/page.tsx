"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useApi } from "@/components/providers";
import { PageHeading, Loading, ErrorBox } from "@/components/ui";
import type { Entity } from "@/lib/types";
export default function Page() {
  const brands = useApi<Entity[]>("brands"),
    labs = useApi<Entity[]>("laboratories");
  return (
    <div className="container section">
      <PageHeading
        eyebrow="Calidad y respaldo"
        title="Marcas que hacen la diferencia."
      >
        Encontrá productos por marca o laboratorio. Cada uno tiene su lugar en
        nuestro catálogo.
      </PageHeading>
      {[
        [brands, "Marcas", "brandId"],
        [labs, "Laboratorios", "laboratoryId"],
      ].map(([q, title, key]) => {
        const query = q as typeof brands;
        return (
          <section key={String(key)} style={{ marginBottom: 40 }}>
            <h2 style={{ marginBottom: 20 }}>{String(title)}</h2>
            {query.isPending ? (
              <Loading />
            ) : query.error ? (
              <ErrorBox
                error={query.error}
                retry={() => void query.refetch()}
              />
            ) : query.data.length ? (
              <div className="directory-grid">
                {query.data.map((item) => (
                  <Link
                    className="card"
                    href={`/catalogo?${key}=${item.id}`}
                    key={item.id}
                  >
                    <h3>{item.name}</h3>
                    <span className="text-link">
                      Ver productos <ArrowUpRight size={16} />
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="muted">
                Se mostrarán aquí cuando estén cargados en el catálogo.
              </p>
            )}
          </section>
        );
      })}
      <div className="panel">
        <h3>Una selección que sigue creciendo</h3>
        <p className="muted" style={{ marginTop: 10 }}>
          Además de las líneas de DISTRICO, esta propuesta incorpora productos
          de Raicor y Magnis. Son proveedores de catálogo, no marcas ni
          laboratorios.
        </p>
      </div>
    </div>
  );
}
