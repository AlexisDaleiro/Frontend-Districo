import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Picture } from "@/components/ui";
import { storeRoutes } from "@/lib/store-routes";
import { benefits, gallery, infrastructure, milestones, values } from "./content";

export const metadata = {
  title: "Quiénes somos",
  description: "Historia, misión, valores e infraestructura de Districo S.A., distribuidora uruguaya de alimento y cuidado para mascotas: Casa Matriz de 10.000 m² en Montevideo, certificada ISO 9001, y sucursal propia en Maldonado.",
};

export default function Page() {
  return (
    <>
      <section className="site-catalog-intro">
        <div className="container site-about-hero">
          <div>
            <p className="eyebrow">Nosotros</p>
            <h1>Una empresa uruguaya con 30 años de ruta.</h1>
            <p>Districo S.A. nace en 1995 como Distribuidora Colón, fundada por Fernando Graviz sobre el antecedente de la Agropecuaria Colón que el Ing. Montiel Graviz había iniciado en 1960. De la venta de productos agroveterinarios a la distribución nacional de alimento para mascotas, arenas sanitarias, cuidado animal y snacks.</p>
          </div>
          <div className="site-about-hero-photo">
            <Picture src="/images/casa-matriz-fachada.webp" alt="Fachada de la Casa Matriz de Districo S.A." loading="eager" sizes="(max-width: 767px) 100vw, 45vw" />
          </div>
        </div>
      </section>

      <section className="site-section site-about-history" aria-labelledby="history-title">
        <div className="container">
          <p className="reference-kicker">Historia</p>
          <h2 id="history-title">Los hitos de la empresa</h2>
          <ol>
            {milestones.map(([year, title, text]) => (
              <li key={year}>
                <strong>{year}</strong>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="site-about-culture" aria-labelledby="culture-title">
        <div className="container">
          <p className="reference-kicker">Nuestra cultura</p>
          <h2 id="culture-title">Nadie es más importante que <em>todos nosotros juntos.</em></h2>
          <p>Una idea que representa cómo elegimos trabajar y crecer cada día.</p>
        </div>
      </section>

      <section className="site-about-purpose" aria-label="Misión y visión">
        <div className="container">
          <div>
            <p className="reference-kicker">Nuestra misión</p>
            <p>Desarrollar negocios sustentables comercializando productos de distribución masiva, trascendiendo y accionando a través de nuestros valores, comprometidos con el crecimiento individual y profesional de nuestros colaboradores, buscando la excelencia en el servicio a nuestros clientes y procurando mejorar la calidad de vida de todos con quienes nos relacionamos.</p>
          </div>
          <div>
            <p className="reference-kicker">Nuestra visión</p>
            <p>Ser referentes por nuestro modelo de gestión íntegro e innovador, que transforme nuestras acciones en valor para todos con quienes nos vinculamos.</p>
          </div>
        </div>
      </section>

      <section className="site-section site-about-values" aria-labelledby="values-title">
        <div className="container">
          <p className="reference-kicker">Nuestros valores</p>
          <h2 id="values-title">Nueve acuerdos sobre cómo trabajamos</h2>
          <dl>
            {values.map(([name, text]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="site-section site-about-team" aria-labelledby="team-title">
        <div className="container">
          <p className="reference-kicker">Trabajá con nosotros</p>
          <h2 id="team-title">Ninguna empresa puede ser mejor que las personas que trabajan en ella.</h2>
          <p>Promovemos el cuidado de la salud, la actividad física, la alimentación saludable y la formación continua de quienes trabajan acá.</p>
          <ul>
            {benefits.map(([title, text, image, alt, position]) => (
              <li key={title}>
                <Picture src={"/images/" + image + ".webp"} alt={alt} loading="lazy" sizes="(max-width: 767px) 100vw, 33vw" style={{ objectPosition: position }} />
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ul>
          <a className="button lime" href="mailto:contacto@districo.com.uy?subject=Postulaci%C3%B3n%20%E2%80%94%20DISTRICO">Enviar mi CV <ArrowUpRight size={17} aria-hidden="true" /></a>
        </div>
      </section>

      <section className="site-section site-about-infra" aria-labelledby="infra-title">
        <div className="container">
          <p className="reference-kicker">Infraestructura</p>
          <h2 id="infra-title">La operación</h2>
          <ul className="site-about-facts">
            {infrastructure.map(([figure, title, text]) => (
              <li key={title}>
                <strong>{figure}</strong>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ul>
          <p className="site-about-infra-foot">2 sedes físicas: Casa Matriz en Montevideo y sucursal en Maldonado. La distribución alcanza todo Uruguay.</p>
          <ul className="site-about-gallery">
            {gallery.map(([image, alt]) => (
              <li key={image}><Picture src={"/images/" + image + ".webp"} alt={alt} loading="lazy" sizes="(max-width: 767px) 100vw, 33vw" /></li>
            ))}
          </ul>
        </div>
      </section>

      <section className="reference-contact">
        <div className="container reference-contact-grid">
          <div>
            <p className="reference-kicker">Cuenta comercial</p>
            <h2>Sumá nuestras líneas a tu comercio.</h2>
            <p>Atendemos veterinarias, pet shops, agropecuarias y grandes superficies de todo el país.</p>
          </div>
          <div className="reference-contact-actions">
            <Link className="reference-contact-primary" href={storeRoutes.requestAccount}>Solicitar cuenta <ArrowRight size={18} aria-hidden="true" /></Link>
            <Link className="reference-contact-secondary" href="/marcas">Conocer las marcas <ArrowUpRight size={18} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>
    </>
  );
}
