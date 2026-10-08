import Link from "next/link";
import { Suspense } from "react";
import { SiteBrandDirectory } from "@/components/site-brand-directory";
import { siteBrands } from "@/lib/site-brands";
import { storeRoutes } from "@/lib/store-routes";

export const metadata = {
  title: "Nuestras marcas",
  description: `DISTRICO trabaja ${siteBrands.length} marcas de alimento para mascotas, arenas sanitarias, higiene, snacks, accesorios y farmacia veterinaria para comercios de todo Uruguay.`,
};

export default function Page() {
  return (
    <>
      <section className="site-catalog-intro brands-intro">
        <div className="container">
          <h1>Nuestras marcas</h1>
          <p>{siteBrands.length} marcas de alimento, arenas sanitarias, higiene, snacks, accesorios y farmacia veterinaria: propias, representadas y distribuidas por DISTRICO.</p>
        </div>
      </section>

      <section className="site-section site-brand-directory" aria-label="Marcas que trabaja DISTRICO">
        <div className="container">
          <Suspense>
            <SiteBrandDirectory />
          </Suspense>
        </div>
      </section>

      <section className="reference-contact reference-contact-centered">
        <div className="container reference-contact-grid">
          <div>
            <h2>Sumá nuestras marcas a tu comercio.</h2>
            <p>Una sola cuenta, un solo reparto: pedí precios y stock de todas las marcas.</p>
          </div>
          <div className="reference-contact-actions">
            <Link className="reference-contact-primary" href={storeRoutes.requestAccount}>Solicitar cuenta</Link>
            <Link className="reference-contact-secondary" href="/productos">Ver el catálogo</Link>
          </div>
        </div>
      </section>
    </>
  );
}
