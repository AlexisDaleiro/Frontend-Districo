"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { ArrowRight, ArrowUpRight, Mail, Phone } from "lucide-react";
import { storeRoutes } from "@/lib/store-routes";

// Sin backend de mensajes: el formulario solo arma el texto y abre WhatsApp o el correo del visitante.
function sendContact(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const field = (name: string) => String(data.get(name) ?? "").trim();
  const text = [
    `Hola, soy ${field("nombre")}${field("comercio") ? ` de ${field("comercio")}` : ""}${field("localidad") ? ` (${field("localidad")})` : ""}.`,
    field("mensaje"),
  ].join("\n\n");
  const channel = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value");
  if (channel === "email") {
    window.location.href = `mailto:contacto@districo.com.uy?subject=${encodeURIComponent("Consulta desde el sitio web")}&body=${encodeURIComponent(text)}`;
  } else {
    window.open(`https://wa.me/59895673109?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }
}

export function SiteContact() {
  return (
    <section className="reference-contact site-contact-light" aria-label="Formulario y contacto directo">
      <div className="container reference-contact-grid">
        <form className="reference-contact-form" aria-label="Formulario de consulta" onSubmit={sendContact}>
          <label>
            <span>Nombre y apellido *</span>
            <input name="nombre" required autoComplete="name" />
          </label>
          <label>
            <span>Comercio</span>
            <input name="comercio" autoComplete="organization" />
          </label>
          <label>
            <span>Localidad</span>
            <input name="localidad" autoComplete="address-level2" />
          </label>
          <label className="is-wide">
            <span>Consulta *</span>
            <textarea name="mensaje" rows={4} required />
          </label>
          <div className="reference-contact-submit is-wide">
            <button className="reference-contact-primary" type="submit" value="whatsapp">Enviar por WhatsApp <ArrowUpRight size={18} aria-hidden="true" /></button>
            <button className="reference-contact-secondary" type="submit" value="email">Enviar por correo <Mail size={17} aria-hidden="true" /></button>
          </div>
          <p className="reference-contact-note is-wide">Se abre WhatsApp o tu correo con el mensaje armado. Esta página no guarda ni envía datos.</p>
        </form>
        <aside className="reference-contact-direct" aria-label="Contacto directo">
          <h3>Directo</h3>
          <a className="reference-contact-big" href="tel:08001004"><Phone size={20} aria-hidden="true" /> 0800 1004</a>
          <a href="tel:+59823201381">(+598) 2320 1381</a>
          <a href="mailto:contacto@districo.com.uy">contacto@districo.com.uy</a>
          <p>César Mayo Gutiérrez 3024 bis, Montevideo · Sucursal Maldonado</p>
          <Link className="reference-contact-secondary" href={storeRoutes.requestAccount}>Solicitar cuenta mayorista <ArrowRight size={18} aria-hidden="true" /></Link>
        </aside>
      </div>
    </section>
  );
}
