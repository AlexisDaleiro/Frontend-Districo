import Link from "next/link";
import { SiteBrandDirectory } from "@/components/site-brand-directory";
import { siteBrands } from "@/lib/site-brands";
import { storeRoutes } from "@/lib/store-routes";

export const metadata = {
  title: "Marcas que distribuimos",
  description: `DISTRICO representa ${siteBrands.length} marcas de alimento para mascotas, arenas sanitarias, cuidado animal y snacks para comercios de todo Uruguay.`,
};

export default function Page() {
  return (
    <>
      <section className="site-catalog-intro">
        <div className="container">
          <h1>Las {siteBrands.length} marcas que distribuimos.</h1>
          <p>Alimento balanceado, arenas sanitarias, cuidado animal y snacks de fábricas de la región. Filtrá por línea de negocio y entrá al catálogo de cada marca.</p>
        </div>
      </section>

      <section className="site-section site-brand-directory" aria-label="Marcas que distribuye DISTRICO">
        <div className="container">
          <SiteBrandDirectory />
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
