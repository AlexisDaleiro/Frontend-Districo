"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { ArrowUpRight, Mail, Phone } from "lucide-react";
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
            <span>Comercio (opcional)</span>
            <input name="comercio" autoComplete="organization" />
          </label>
          <label>
            <span>Localidad (opcional)</span>
            <input name="localidad" autoComplete="address-level2" />
          </label>
          <label className="is-wide">
            <span>Consulta *</span>
            <textarea name="mensaje" rows={4} required />
          </label>
          <p className="reference-contact-note is-wide">Elegí dónde abrir tu consulta. Revisá el mensaje y envialo desde WhatsApp o tu correo.</p>
          <div className="reference-contact-submit is-wide">
            <button className="reference-contact-primary" type="submit" value="whatsapp">Abrir WhatsApp <ArrowUpRight size={18} aria-hidden="true" /></button>
            <button className="reference-contact-secondary" type="submit" value="email">Abrir correo <Mail size={17} aria-hidden="true" /></button>
          </div>
        </form>
        <aside className="reference-contact-direct" aria-label="Contacto directo">
          <h3>Contacto directo</h3>
          <a className="reference-contact-big" href="tel:08001004"><Phone size={20} aria-hidden="true" /> 0800 1004</a>
          <a href="tel:+59823201381">(+598) 2320 1381</a>
          <a href="mailto:contacto@districo.com.uy">contacto@districo.com.uy</a>
          <p>César Mayo Gutiérrez 3024 bis, Montevideo. Sucursal en Maldonado.</p>
          <Link className="reference-contact-secondary" href={storeRoutes.requestAccount}>Solicitar cuenta mayorista</Link>
        </aside>
      </div>
    </section>
  );
}
