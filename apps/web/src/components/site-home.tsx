"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  Facebook,
  Leaf,
  Linkedin,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  ShieldCheck,
  TruckElectric,
  UtensilsCrossed,
  WashingMachine,
} from "lucide-react";
import { useSession } from "./providers";
import { ActionLink, Picture } from "./ui";
import { SiteBrands } from "./site-brands";
import { CountUp } from "./count-up";
import { FeaturedProducts } from "./public-products";
import { SiteTimelineMotion } from "./site-timeline-motion";
import { storeRoutes } from "@/lib/store-routes";
import { siteNews } from "@/data/site-news";

const steps = [
  {
    title: "Solicitás tu cuenta",
    body: "Nos contás sobre tu comercio y el equipo recibe tu solicitud.",
    icon: ClipboardList,
  },
  {
    title: "La administración la revisa",
    body: "La solicitud requiere aprobación. Te confirmamos el estado del acceso.",
    icon: ShieldCheck,
  },
  {
    title: "Conocés tus precios",
    body: "Una vez aprobada tu cuenta, ves precios según tus permisos.",
    icon: CheckCircle2,
  },
  {
    title: "Armás tu pedido",
    body: "Elegís presentaciones y cantidades desde el portal mayorista.",
    icon: PackageCheck,
  },
  {
    title: "Seguís su estado",
    body: "Consultás el avance de cada pedido desde tu cuenta.",
    icon: TruckElectric,
  },
] as const;

export function SiteHome() {
  const router = useRouter();
  const { user, loading } = useSession();
  useEffect(() => {
    if (!loading && user) router.replace(storeRoutes.home);
  }, [loading, user, router]);
  return (
    <>
      <SiteHomeContent />
      {(loading || user) && (
        <div className="site-session-check" role="status">
          Preparando DISTRICO…
        </div>
      )}
      <noscript>
        <style>{`.site-session-check { display: none !important; }`}</style>
      </noscript>
    </>
  );
}

function SiteHomeContent() {
  return (
    <>
      <SiteTimelineMotion />
      <section className="site-hero" aria-labelledby="site-title">
        <div className="site-hero-grain" aria-hidden="true" />
        <div className="container site-hero-grid">
          <div className="site-hero-copy">
            <p className="eyebrow">Distribución en todo Uruguay · Desde 1995</p>
            <h1
              id="site-title"
              aria-label="Marcas que acompañan. Un socio que responde."
            >
              <span aria-hidden="true">Marcas que</span>
              <span aria-hidden="true">acompañan.</span>
              <span className="site-hero-highlight" aria-hidden="true">
                Un socio que responde.
              </span>
            </h1>
            <p className="site-hero-lead">
              Distribuimos alimento para mascotas, arenas sanitarias, cuidado
              animal y snacks en todo Uruguay.
            </p>
            <div className="actions">
              <Link className="button lime site-button-large" href="/productos">
                Explorar productos <ArrowUpRight size={18} />
              </Link>
              <Link
                className="button site-button-large site-button-outline"
                href={storeRoutes.requestAccount}
              >
                Solicitar cuenta <ArrowRight size={18} />
              </Link>
            </div>
            <a className="site-scroll-cue" href="#nosotros">
              Descubrí DISTRICO <ArrowDown size={17} />
            </a>
          </div>
          <div
            className="site-hero-visual"
            aria-label="Casa Matriz de DISTRICO en Montevideo"
          >
            <div className="site-hero-orbit" aria-hidden="true" />
            <div className="site-hero-photo">
              <Picture
                src="/images/casa-matriz-fachada.webp"
                alt="Fachada de la Casa Matriz de DISTRICO en Montevideo"
                width={588}
                height={441}
                sizes="(max-width: 767px) 90vw, 48vw"
                loading="eager"
                fetchPriority="high"
              />
            </div>
            <div className="site-hero-product" aria-hidden="true">
              <Picture
                src="/images/product-0-0.jpg"
                alt=""
                width={450}
                height={450}
                sizes="180px"
              />
            </div>
            <span className="site-hero-stamp">
              ISO 9001
              <br />
              <strong>desde 2019</strong>
            </span>
          </div>
        </div>
        <div className="site-hero-bottom" aria-hidden="true">
          <span>01 / DISTRICO</span>
          <span>Montevideo · Maldonado</span>
        </div>
      </section>

      <section
        className="site-story site-section"
        id="nosotros"
        aria-labelledby="story-title"
      >
        <div className="container site-story-grid">
          <div>
            <p className="eyebrow">Somos DISTRICO</p>
            <h2 id="story-title">
              Una historia de trabajo que sigue en movimiento.
            </h2>
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
          <div className="site-story-media">
            <Picture
              src="/images/deposito-estanterias.webp"
              alt="Depósito de DISTRICO con estanterías de mercadería"
              width={1000}
              height={750}
              loading="lazy"
              sizes="(max-width: 767px) 100vw, 48vw"
            />
            <span>
              Desde 1995
              <br />
              <strong>junto a tu negocio.</strong>
            </span>
          </div>
        </div>
        <div className="container site-facts" aria-label="DISTRICO en cifras">
          <div>
            <span>Desde</span>
            <strong>
              <CountUp value={1995} from={1960} grouping={false} />
            </strong>
          </div>
          <div>
            <span>Presencia propia</span>
            <strong>
              <CountUp value={2} suffix=" sedes" />
            </strong>
          </div>
          <div>
            <span>Casa Matriz</span>
            <strong>
              <CountUp value={10000} suffix=" m²" />
            </strong>
          </div>
          <div>
            <span>Gestión certificada</span>
            <strong>ISO 9001</strong>
          </div>
        </div>
      </section>

      <section
        className="site-purpose"
        aria-label="Visión, misión y valores de DISTRICO"
      >
        <article className="site-purpose-row">
          <div className="site-purpose-image">
            <Picture
              src="/images/hero-raicor.jpg"
              alt="Profesional veterinaria atendiendo a un cachorro"
              loading="lazy"
              sizes="(max-width: 767px) 100vw, 50vw"
            />
          </div>
          <div className="site-purpose-copy">
            <p className="eyebrow">01 / Visión</p>
            <h2>Nuestra visión</h2>
            <p>
              <strong>
                Ser referentes por una gestión íntegra e innovadora.
              </strong>{" "}
              Buscamos transformar cada acción en valor para clientes,
              proveedores, colaboradores y comunidades vinculadas a DISTRICO.
            </p>
          </div>
        </article>
        <article className="site-purpose-row is-reversed">
          <div className="site-purpose-image">
            <Picture
              src="/images/banner-mascotas.jpg"
              alt="Perros y gatos que forman parte de las líneas de cuidado animal"
              loading="lazy"
              sizes="(max-width: 767px) 100vw, 50vw"
            />
          </div>
          <div className="site-purpose-copy">
            <p className="eyebrow">02 / Misión</p>
            <h2>Nuestra misión</h2>
            <p>
              <strong>Desarrollar negocios sustentables.</strong>{" "}
              Comercializamos productos de distribución masiva con excelencia en
              el servicio, comprometidos con el desarrollo de nuestros
              colaboradores y con la calidad de vida de las personas con las que
              nos relacionamos.
            </p>
          </div>
        </article>
        <article className="site-purpose-row">
          <div className="site-purpose-image">
            <Picture
              src="/images/linea-ganaderia.jpg"
              alt="Animales de una de las líneas que distribuimos"
              loading="lazy"
              sizes="(max-width: 767px) 100vw, 50vw"
            />
          </div>
          <div className="site-purpose-copy">
            <p className="eyebrow">03 / Valores</p>
            <h2>Acuerdos que se convierten en acciones.</h2>
            <div className="site-values" aria-label="Nuestros valores">
              <span>Confianza</span>
              <span>Honestidad e integridad</span>
              <span>Mejora continua</span>
              <span>Trabajo en equipo</span>
            </div>
          </div>
        </article>
      </section>

      <SiteBrands />

      <FeaturedProducts />

      <section
        className="site-process site-section"
        id="como-trabajamos"
        aria-labelledby="process-title"
      >
        <div className="container">
          <div className="site-section-heading">
            <div>
              <p className="eyebrow">Una relación que crece</p>
              <h2 id="process-title">Así trabajamos con tu comercio.</h2>
              <p>
                Un recorrido claro, desde la solicitud de cuenta hasta el
                seguimiento de tus pedidos.
              </p>
            </div>
          </div>
          <ol className="site-steps">
            {steps.map((step, index) => (
              <li key={step.title}>
                <span className="site-step-number">0{index + 1}</span>
                <step.icon size={26} aria-hidden="true" />
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
          <Link className="button lime" href={storeRoutes.requestAccount}>
            Solicitar cuenta mayorista <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <section
        className="site-operation site-section"
        aria-labelledby="operation-title"
      >
        <div className="container">
          <div className="site-section-heading">
            <div>
              <p className="eyebrow">Nuestra operación</p>
              <h2 id="operation-title">
                Infraestructura para llegar más lejos.
              </h2>
              <p>
                Dos sedes propias y decisiones que acompañan una distribución
                más eficiente y responsable en todo Uruguay.
              </p>
            </div>
          </div>
          <div className="site-operation-grid">
            <article className="site-operation-photo">
              <Picture
                src="/images/casa-matriz-fachada.webp"
                alt="Fachada de la Casa Matriz en Montevideo"
                loading="lazy"
                sizes="(max-width: 767px) 100vw, 55vw"
              />
              <div>
                <MapPin size={22} />
                <strong>Casa Matriz · Montevideo</strong>
                <span>
                  Predio propio de 10.000 m², con 1.600 m² de depósito y
                  certificación ISO 9001 desde 2019.
                </span>
              </div>
            </article>
            <div className="site-operation-cards">
              <article>
                <MapPin size={24} />
                <h3>Maldonado</h3>
                <p>
                  Sucursal propia de 700 m² para acompañar a los comercios del
                  este del país.
                </p>
              </article>
              <article>
                <Leaf size={24} />
                <h3>Energía solar</h3>
                <p>
                  Tres plantas fotovoltaicas propias aportan energía a nuestra
                  operación cotidiana.
                </p>
              </article>
              <article>
                <TruckElectric size={24} />
                <h3>Flota eléctrica</h3>
                <p>
                  Desde 2021 incorporamos vehículos 100% eléctricos y estaciones
                  de carga propias.
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section
        className="site-timeline-section site-section"
        aria-labelledby="timeline-title"
      >
        <div className="container">
          <p className="eyebrow">Nuestra historia</p>
          <h2 id="timeline-title">
            De un camino iniciado en 1960 a lo que viene.
          </h2>
          <ol className="site-timeline">
            <li>
              <strong>1960</strong>
              <span>El Ing. Montiel Graviz funda Agropecuaria Colón.</span>
            </li>
            <li>
              <strong>1995</strong>
              <span>
                Fernando Graviz crea Distribuidora Colón, hoy DISTRICO S.A.
              </span>
            </li>
            <li>
              <strong>2019</strong>
              <span>Certificación ISO 9001 en Casa Matriz.</span>
            </li>
            <li>
              <strong>2021</strong>
              <span>
                Se incorporan vehículos eléctricos y estaciones de carga
                propias.
              </span>
            </li>
            <li>
              <strong>Hoy</strong>
              <span>Seguimos creciendo junto a comercios de todo Uruguay.</span>
            </li>
          </ol>
        </div>
      </section>

      <section
        className="site-news site-section"
        id="novedades"
        aria-labelledby="news-title"
      >
        <div className="container">
          <div className="site-section-heading">
            <div>
              <p className="eyebrow">
                Contenido de muestra · Pendiente de confirmar
              </p>
              <h2 id="news-title">Novedades.</h2>
              <p>
                Este espacio está preparado para noticias reales de DISTRICO.
                Las tarjetas actuales son ejemplos de diseño.
              </p>
            </div>
          </div>
          <div className="site-news-grid">
            {siteNews.map((news) => (
              <article className="site-news-card" key={news.title}>
                <div className="site-news-image">
                  <Picture
                    src={news.image}
                    alt={news.alt}
                    loading="lazy"
                    sizes="(max-width: 767px) 86vw, 32vw"
                  />
                  <span
                    className="site-news-date"
                    aria-label={`Fecha de ejemplo ${news.day} de octubre`}
                  >
                    <strong>{news.day}</strong>
                    {news.month}
                  </span>
                </div>
                <div className="site-news-copy">
                  <p className="eyebrow">Ejemplo · No publicado</p>
                  <h3>{news.title}</h3>
                  <p>{news.excerpt}</p>
                  <details>
                    <summary>
                      Leer más <ArrowUpRight size={15} />
                    </summary>
                    <p>{news.detail}</p>
                  </details>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="site-team site-section" aria-labelledby="team-title">
        <div className="container site-team-grid">
          <div>
            <p className="eyebrow">Trabajá con nosotros</p>
            <h2 id="team-title">
              Nadie es más importante que todos nosotros juntos.
            </h2>
            <p>
              Promovemos el cuidado de la salud, la actividad física, la
              alimentación saludable y la formación continua de quienes forman
              parte de DISTRICO.
            </p>
            <a
              className="button"
              href="mailto:contacto@districo.com.uy?subject=Postulaci%C3%B3n%20%E2%80%94%20DISTRICO"
            >
              <Mail size={17} /> Enviar mi CV
            </a>
          </div>
          <div className="site-benefits">
            <article>
              <Dumbbell />
              <h3>Gimnasio</h3>
              <p>
                Un espacio equipado y de acceso gratuito para todos nuestros
                colaboradores.
              </p>
            </article>
            <article>
              <UtensilsCrossed />
              <h3>Comedor</h3>
              <p>
                Menús diferentes cada día, preparados con especial atención a su
                valor nutricional.
              </p>
            </article>
            <article>
              <WashingMachine />
              <h3>Lavandería</h3>
              <p>
                Servicio de lavado y secado de uniformes de trabajo y ropa
                deportiva.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section
        className="site-contact site-section"
        id="contacto"
        aria-labelledby="contact-title"
      >
        <div className="container site-contact-grid">
          <div>
            <p className="eyebrow">Estamos cerca</p>
            <h2 id="contact-title">Hablemos de tu próximo paso.</h2>
            <p>
              Si querés conocer nuestras líneas o saber cómo abrir una cuenta
              mayorista, estamos para ayudarte.
            </p>
            <a className="site-contact-phone" href="tel:08001004">
              <Phone size={25} /> 0800 1004
            </a>
            <a
              className="site-contact-mail"
              href="mailto:contacto@districo.com.uy"
            >
              contacto@districo.com.uy
            </a>
          </div>
          <div className="site-contact-side">
            <p>Seguinos en nuestras redes</p>
            <div className="site-socials">
              <a
                href="https://www.facebook.com/districosa/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="DISTRICO en Facebook"
              >
                <Facebook />
              </a>
              <a
                href="https://uy.linkedin.com/company/districouy"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="DISTRICO en LinkedIn"
              >
                <Linkedin />
              </a>
            </div>
            <p>Casa Matriz en Montevideo. Sucursal en Maldonado.</p>
          </div>
        </div>
      </section>

      <div className="container site-final-wrap">
        <section className="cta-band site-final-cta">
          <div>
            <p className="eyebrow">Tu negocio, nuestro compromiso</p>
            <h2>Sumá nuestras líneas a tu comercio.</h2>
            <p>
              Solicitá una cuenta. Nuestro equipo revisará tu solicitud para
              habilitar el acceso mayorista.
            </p>
          </div>
          <div className="actions">
            <ActionLink href={storeRoutes.requestAccount} secondary>
              Solicitar cuenta
            </ActionLink>
            <Link className="site-final-login" href={storeRoutes.login}>
              Ya tengo cuenta <ArrowUpRight size={16} />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
