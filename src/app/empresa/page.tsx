import { ActionLink, PageHeading, Picture } from "@/components/ui";
export const metadata = { title: "Nuestra empresa" };
export default function Page() {
  return (
    <div className="container section">
      <div className="split-content">
        <div className="prose">
          <PageHeading
            eyebrow="Somos DISTRICO"
            title="Marcas que acompañan. Un socio que responde."
          />
          <p>
            Acercamos a los comercios de Uruguay una selección de productos para
            el cuidado y la alimentación de las mascotas, junto a nuestra línea
            de snacks para consumo humano.
          </p>
          <p>
            Trabajamos con marcas como Biofresh, Three Dogs, Three Cats,
            Primocão, Pipicat, Procão, Amazonia y Stack. Nuestra propuesta reúne
            distintas líneas para acompañar las necesidades de cada negocio.
          </p>
          <p>
            Ampliamos la selección de esta demostración con productos de los
            catálogos de Raicor y Magnis, diferenciando sus marcas y
            laboratorios.
          </p>
          <div className="actions">
            <ActionLink href="/contacto">Conversemos</ActionLink>
          </div>
        </div>
        <div className="panel">
          <Picture
            src="/images/banner-bio-mobile.png"
            alt="Biofresh, una de las marcas de DISTRICO"
            style={{
              width: "100%",
              maxHeight: 500,
              objectFit: "cover",
              borderRadius: 10,
            }}
          />
        </div>
      </div>
    </div>
  );
}
