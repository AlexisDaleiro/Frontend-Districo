import { CompanyCatalogMetric } from "@/components/company-catalog-metric";
import { ActionLink, PageHeading, Picture } from "@/components/ui";
import { storeRoutes } from "@/lib/store-routes";
import { Dumbbell, Mail, UtensilsCrossed, WashingMachine } from "lucide-react";

export const metadata = { title: "Nuestra empresa" };

const values = [
  {
    title: "Confianza",
    description:
      "Es la base de cada vínculo que construimos con clientes, proveedores y colaboradores.",
  },
  {
    title: "Honestidad e integridad",
    description:
      "Cumplimos los compromisos asumidos y trabajamos con responsabilidad en cada relación.",
  },
  {
    title: "Mejora continua",
    description:
      "Aprendemos, revisamos y evolucionamos para brindar un servicio cada vez mejor.",
  },
  {
    title: "Trabajo en equipo",
    description:
      "Creemos que el mejor resultado aparece cuando el conocimiento y el esfuerzo se comparten.",
  },
];

const operation = [
  {
    eyebrow: "10.000 m²",
    title: "Casa Matriz",
    description:
      "Predio propio en Montevideo, con 1.600 m² de depósito y certificación ISO 9001 desde 2019.",
  },
  {
    eyebrow: "700 m²",
    title: "Sucursal Maldonado",
    description:
      "Una sede propia desde la que acompañamos a los comercios del este del país.",
  },
  {
    eyebrow: "Energía responsable",
    title: "Energía solar",
    description:
      "Tres plantas fotovoltaicas propias aportan energía a nuestra operación cotidiana.",
  },
  {
    eyebrow: "Desde 2021",
    title: "Flota eléctrica",
    description:
      "Incorporamos vehículos 100% eléctricos y estaciones de carga propias.",
  },
];

export default function Page() {
  return (
    <div className="company-page">
      <section className="container section company-hero">
        <div className="company-hero-copy">
          <PageHeading
            eyebrow="Somos DISTRICO"
            title="Una empresa uruguaya con más de 30 años de ruta"
          />
          <p>
            Districo S.A. nació en 1995 como Distribuidora Colón, sobre el
            camino iniciado en 1960 por Agropecuaria Colón. Desde entonces,
            crecimos junto a clientes, proveedores y colaboradores de todo el
            país.
          </p>
          <p>
            Hoy distribuimos alimento para mascotas, arenas sanitarias,
            soluciones para el cuidado animal y snacks, con la cercanía de
            siempre y una operación preparada para seguir avanzando.
          </p>
        </div>
        <div className="company-hero-visual">
          <Picture
            src="/images/hero-raicor.jpg"
            alt="Atención veterinaria de un cachorro"
          />
        </div>
      </section>

      <section
        className="container company-facts"
        aria-label="DISTRICO en cifras"
      >
        <dl>
          <div>
            <dt>Desde</dt>
            <dd>1995</dd>
          </div>
          <div>
            <dt>Presencia propia</dt>
            <dd>2 sedes</dd>
          </div>
          <div>
            <dt>Casa Matriz</dt>
            <dd>10.000 m²</dd>
          </div>
          <div>
            <dt>Gestión certificada</dt>
            <dd>ISO 9001</dd>
          </div>
        </dl>
      </section>

      <section className="container company-section company-story">
        <div>
          <p className="eyebrow">Nuestra historia</p>
          <h2>De una casa agropecuaria a una red de distribución nacional.</h2>
        </div>
        <div className="company-story-copy">
          <p>
            El recorrido comenzó en 1960, cuando el Ing. Montiel Graviz fundó
            Agropecuaria Colón para comercializar productos agroveterinarios y
            fitosanitarios. En 1995, Fernando Graviz dio un nuevo impulso a ese
            legado con la creación de Distribuidora Colón, hoy Districo S.A.
          </p>
          <p>
            A lo largo de los años ampliamos líneas, infraestructura y alcance.
            Esa evolución nos permite atender desde Montevideo y Maldonado a
            comercios de todo Uruguay, sin perder el trato cercano que nos
            identifica.
          </p>
        </div>
      </section>

      <section className="company-culture" aria-labelledby="culture-title">
        <div className="container">
          <p className="eyebrow">Nuestra cultura</p>
          <h2 id="culture-title">
            Nadie es más importante que todos nosotros juntos.
          </h2>
          <p>
            Una idea que resume cómo elegimos trabajar, aprender y crecer cada
            día.
          </p>
        </div>
      </section>

      <section
        className="container company-section"
        aria-labelledby="purpose-title"
      >
        <div className="company-section-heading">
          <p className="eyebrow">Nuestro propósito</p>
          <h2 id="purpose-title">
            Crecer generando valor para quienes nos rodean.
          </h2>
        </div>
        <div className="company-card-grid company-card-grid-two">
          <article className="company-card">
            <p className="eyebrow">Nuestra misión</p>
            <h3>Desarrollar negocios sustentables.</h3>
            <p>
              Comercializamos productos de distribución masiva con excelencia
              en el servicio, comprometidos con el desarrollo de nuestros
              colaboradores y con la calidad de vida de las personas con las
              que nos relacionamos.
            </p>
          </article>
          <article className="company-card company-card-accent">
            <p className="eyebrow">Nuestra visión</p>
            <h3>Ser referentes por una gestión íntegra e innovadora.</h3>
            <p>
              Buscamos transformar cada acción en valor para clientes,
              proveedores, colaboradores y comunidades vinculadas a DISTRICO.
            </p>
          </article>
        </div>
      </section>

      <section
        className="container company-section"
        aria-labelledby="values-title"
      >
        <div className="company-section-heading">
          <p className="eyebrow">Nuestros valores</p>
          <h2 id="values-title">Acuerdos que se convierten en acciones.</h2>
        </div>
        <div className="company-card-grid company-card-grid-four">
          {values.map((value, index) => (
            <article className="company-value" key={value.title}>
              <span aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{value.title}</h3>
              <p>{value.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="company-operation" aria-labelledby="operation-title">
        <div className="container company-section">
          <div className="company-section-heading">
            <p className="eyebrow">Nuestra operación</p>
            <h2 id="operation-title">Infraestructura para llegar más lejos.</h2>
            <p>
              Dos sedes propias y decisiones que acompañan una distribución más
              eficiente y responsable en todo Uruguay.
            </p>
          </div>
          <div className="company-card-grid company-card-grid-four">
            {operation.map((item) => (
              <article className="company-operation-card" key={item.title}>
                <p className="eyebrow">{item.eyebrow}</p>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="container company-section company-team"
        aria-labelledby="team-title"
      >
        <div className="company-team-intro">
          <p className="eyebrow">Trabajá con nosotros</p>
          <h2 id="team-title">
            Ninguna empresa puede ser mejor que las personas que trabajan en
            ella.
          </h2>
          <p>
            Promovemos el cuidado de la salud, la actividad física, la
            alimentación saludable y la formación continua de quienes forman
            parte de DISTRICO.
          </p>
        </div>

        <div className="company-benefit-grid">
          <article className="company-benefit">
            <span className="company-benefit-icon" aria-hidden="true">
              <Dumbbell />
            </span>
            <h3>Gimnasio</h3>
            <p>
              Un espacio equipado y de acceso gratuito para todos nuestros
              colaboradores.
            </p>
          </article>
          <article className="company-benefit">
            <span className="company-benefit-icon" aria-hidden="true">
              <UtensilsCrossed />
            </span>
            <h3>Comedor</h3>
            <p>
              Menús diferentes cada día, preparados con especial atención a su
              valor nutricional.
            </p>
          </article>
          <article className="company-benefit">
            <span className="company-benefit-icon" aria-hidden="true">
              <WashingMachine />
            </span>
            <h3>Lavandería</h3>
            <p>
              Servicio de lavado y secado de uniformes de trabajo y ropa
              deportiva.
            </p>
          </article>
        </div>

        <div className="company-team-action">
          <p>
            ¿Querés ser parte? Enviá tu currículum a nuestro equipo y contanos
            cómo te gustaría aportar.
          </p>
          <a
            className="button"
            href="mailto:contacto@districo.com.uy?subject=Postulaci%C3%B3n%20%E2%80%94%20DISTRICO"
          >
            <Mail size={17} />
            Enviar mi CV
          </a>
        </div>
      </section>

      <section className="container section">
        <div className="company-cta">
          <div>
            <p className="eyebrow">Una cuenta, muchas posibilidades</p>
            <h2>Sumá nuestras líneas a tu comercio.</h2>
            <CompanyCatalogMetric />
          </div>
          <div className="actions">
            <ActionLink href={storeRoutes.requestAccount}>
              Solicitar cuenta mayorista
            </ActionLink>
            <ActionLink href={storeRoutes.contact} secondary>
              Contactar al equipo
            </ActionLink>
          </div>
        </div>
      </section>
    </div>
  );
}
