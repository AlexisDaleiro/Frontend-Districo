import { PageHeading } from "@/components/ui";
import { MapPin, Phone, Mail } from "lucide-react";
export const metadata = { title: "Contacto" };
export default function Page() {
  return (
    <div className="container section">
      <PageHeading eyebrow="Estamos cerca" title="Hablemos de tu negocio.">
        Nuestro equipo está para acompañarte y ayudarte a encontrar lo que
        necesitás.
      </PageHeading>
      <div className="split-content">
        <section className="card stack">
          <MapPin />
          <h2>Casa central</h2>
          <p>
            César Mayo Gutiérrez 3024 bis,
            <br />
            esquina Camino Uruguay.
          </p>
          <a className="text-link" href="tel:08001004">
            <Phone size={16} />
            0800 1004 · Línea gratuita
          </a>
          <a href="tel:+59823201381">(+598) 2320 1381</a>
          <a className="text-link" href="mailto:contacto@districo.com.uy">
            <Mail size={16} />
            contacto@districo.com.uy
          </a>
        </section>
        <section className="card stack">
          <MapPin />
          <h2>Maldonado</h2>
          <p>
            A. Antonio Lussich,
            <br />
            esquina Vicenza.
          </p>
          <a className="text-link" href="tel:+59842252155">
            <Phone size={16} />
            (+598) 4225 2155
          </a>
          <p className="muted">
            Para consultas sobre productos, cuentas mayoristas o pedidos,
            comunicate con nuestro equipo.
          </p>
        </section>
      </div>
    </div>
  );
}
