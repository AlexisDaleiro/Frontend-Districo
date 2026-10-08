import { Picture } from "@/components/ui";
import { SiteJobs } from "@/components/site-jobs";
import { benefits, values } from "../nosotros/content";

export const metadata = {
  title: "Trabajá con nosotros",
  description: "Búsquedas laborales de DISTRICO en Montevideo y Maldonado: logística, ventas, administración y marketing. Postulate o enviá tu CV.",
};

const cvHref = "mailto:contacto@districo.com.uy?subject=CV%20espont%C3%A1neo%20%E2%80%94%20DISTRICO";

export default function Page() {
  return (
    <>
      <section className="jobs-intro">
        <Picture className="jobs-intro-bg" src="/images/vehiculo-electrico-carga.webp" alt="" sizes="100vw" />
        <div className="container">
          <h1>Trabajá en DISTRICO</h1>
          <p>Buscamos personas para logística, ventas, administración y marketing. Encontrá tu puesto o dejanos tu CV.</p>
        </div>
      </section>

      <section className="site-section jobs-section" aria-label="Búsquedas abiertas">
        <div className="container">
          <SiteJobs />
        </div>
      </section>

      <section className="jobs-cv" aria-labelledby="jobs-cv-title">
        <div className="container jobs-cv-inner">
          <div>
            <h2 id="jobs-cv-title">¿No encontrás el puesto que buscás?</h2>
            <p>Dejanos tu CV y te contactamos cuando se abra una vacante para tu perfil.</p>
          </div>
          <a className="button lime" href={cvHref}>Enviar mi CV</a>
        </div>
      </section>

      <section className="site-section site-about-team" aria-labelledby="jobs-why-title">
        <div className="container">
          <h2 id="jobs-why-title">Por qué trabajar en DISTRICO</h2>
          <p>Una empresa familiar uruguaya que creció con su gente: de 400 m² en el Prado a una Casa Matriz de 10.000 m².</p>
          <ul>
            {benefits.map(([title, text, image, alt, position]) => (
              <li key={title}>
                <Picture src={"/images/" + image + ".webp"} alt={alt} loading="lazy" sizes="(max-width: 767px) 100vw, 33vw" style={{ objectPosition: position }} />
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ul>
          <dl className="jobs-values">
            {values.slice(0, 4).map(([name, text]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
