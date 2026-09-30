"use client";

import { useApi } from "@/components/providers";
import { CountUp } from "@/components/count-up";
import type { ProductList } from "@/lib/types";

export function CompanyCatalogMetric() {
  const products = useApi<ProductList>("products?limit=1");
  const total = products.data?.meta.total;

  return (
    <p className="company-catalog-metric" aria-live="polite">
      {typeof total === "number" ? (
        <>
          <CountUp value={total} /> productos disponibles en nuestro catálogo
          activo.
        </>
      ) : (
        "Catálogo mayorista para acompañar las necesidades de tu negocio."
      )}
    </p>
  );
}
