import { ContactForm } from "@/components/contact-form";
import { StoreLocator } from "@/components/store-locator";
import { PageHeading } from "@/components/ui";
import { whatsappUrl } from "@/lib/contact";
import { ArrowUpRight, Building2, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

export const metadata = { title: "Contacto" };


export default function Page() {
  return (
    <div className="contact-page">
      <header className="contact-hero">
        <div className="container">
          <PageHeading eyebrow="Contacto" title="Hablemos de tu comercio">
            Atendemos veterinarias, pet shops, agropecuarias y grandes
            superficies de todo el país. Escribinos y un vendedor de tu zona se
            pone en contacto.
          </PageHeading>
        </div>
      </header>

      <section
        className="container contact-form-section"
        aria-labelledby="contact-form-title"
      >
        <div>
          <p className="eyebrow">Escribinos</p>
          <h2 id="contact-form-title">¿Cómo podemos ayudarte?</h2>
          <ContactForm />
        </div>
        <aside className="contact-direct-card" aria-label="Contacto directo">
          <p className="eyebrow">Directo</p>
          <a className="contact-direct-main" href="tel:08001004">
            0800 1004
          </a>
          <a href="tel:+59823201381">
            <Phone size={18} /> (+598) 2320 1381
          </a>
          <a href="mailto:contacto@districo.com.uy">
            <Mail size={18} /> contacto@districo.com.uy
          </a>
          <a
            className="button contact-whatsapp"
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={18} /> WhatsApp
          </a>
          <p className="contact-direct-note">
            Para productos, cuentas mayoristas, pedidos o cualquier otra
            consulta comercial.
          </p>
        </aside>
      </section>

      <section className="contact-branches" aria-labelledby="branches-title">
        <div className="container">
          <div className="contact-section-heading">
            <p className="eyebrow">Estamos cerca</p>
            <h2 id="branches-title">Dos sedes para acompañarte.</h2>
          </div>
          <div className="contact-branch-grid">
            <article className="contact-branch-card">
              <Building2 aria-hidden="true" />
              <div>
                <p className="eyebrow">Casa Matriz</p>
                <h3>Montevideo</h3>
                <p>César Mayo Gutiérrez 3024 bis, esquina Camino Uruguay.</p>
                <a href="tel:+59823201381">(+598) 2320 1381</a>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=C%C3%A9sar+Mayo+Guti%C3%A9rrez+3024+bis+Montevideo"
                  target="_blank"
                  rel="noreferrer"
                >
                  Cómo llegar <ArrowUpRight size={15} />
                </a>
              </div>
            </article>
            <article className="contact-branch-card">
              <MapPin aria-hidden="true" />
              <div>
                <p className="eyebrow">Sucursal</p>
                <h3>Maldonado</h3>
                <p>A. Antonio Lussich, esquina Vicenza.</p>
                <a href="tel:+59842252155">(+598) 4225 2155</a>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Avenida+Antonio+Lussich+y+Vicenza+Maldonado"
                  target="_blank"
                  rel="noreferrer"
                >
                  Cómo llegar <ArrowUpRight size={15} />
                </a>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section
        className="container contact-locator-section"
        aria-labelledby="locator-title"
      >
        <div className="contact-section-heading">
          <p className="eyebrow">Dónde comprar</p>
          <h2 id="locator-title">Puntos de venta</h2>
          <p>
            Explorá una demostración del localizador de comercios que trabajan
            con las marcas distribuidas por DISTRICO.
          </p>
        </div>
        <StoreLocator />
      </section>
    </div>
  );
}
