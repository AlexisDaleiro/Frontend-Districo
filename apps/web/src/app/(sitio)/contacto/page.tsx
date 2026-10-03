import "leaflet/dist/leaflet.css";
import { SiteContact } from "@/components/site-contact";
import { StoreLocator } from "@/components/store-locator";

export const metadata = {
  title: "Contacto",
  description: "Escribinos para abrir una cuenta mayorista con DISTRICO o hacer una consulta sobre nuestras marcas.",
};

export default function Page() {
  return (
    <>
      <section className="site-catalog-intro">
        <div className="container">
          <p className="eyebrow">Contacto</p>
          <h1>Hablemos de tu comercio.</h1>
          <p>Atendemos veterinarias, pet shops, agropecuarias y grandes superficies de todo el país. Contanos qué necesitás y un vendedor de tu zona se pone en contacto.</p>
        </div>
      </section>
      <SiteContact />
      <section className="site-locator" aria-labelledby="locator-title">
        <div className="container">
          <div className="site-section-heading">
            <div>
              <p className="eyebrow">Dónde comprar</p>
              <h2 id="locator-title">Puntos de venta</h2>
            </div>
            <p>Encontrá comercios que trabajan con las marcas distribuidas por DISTRICO.</p>
          </div>
          <StoreLocator />
        </div>
      </section>
    </>
  );
}
