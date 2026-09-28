"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Send } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { request } from "./providers";
import { ErrorBox } from "./ui";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Ingresá tu nombre.").max(120),
  businessName: z.string().trim().max(160).optional(),
  email: z.email("Ingresá un correo válido.").max(254),
  phone: z.string().trim().max(40).optional(),
  locality: z.string().trim().max(120).optional(),
  message: z.string().trim().min(10, "Contanos un poco más sobre tu consulta.").max(2000, "La consulta puede tener hasta 2.000 caracteres."),
  website: z.string().max(200).optional(),
});

type ContactValues = z.infer<typeof contactSchema>;

export function ContactForm() {
  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", businessName: "", email: "", phone: "", locality: "", message: "", website: "" },
  });
  const [error, setError] = useState<unknown>();
  const [sent, setSent] = useState(false);
  const fieldError = (key: keyof ContactValues) => form.formState.errors[key]?.message;

  async function submit(values: ContactValues) {
    setError(undefined);
    setSent(false);
    try {
      await request("contact-inquiries", "POST", values);
      setSent(true);
      form.reset();
    } catch (cause) {
      setError(cause);
    }
  }

  return (
    <form className="contact-form" onSubmit={form.handleSubmit(submit)} noValidate>
      <div className="contact-form-grid">
        <label className="field">Nombre y apellido *<input autoComplete="name" aria-invalid={!!fieldError("name")} {...form.register("name")} /><span className="field-error">{fieldError("name")}</span></label>
        <label className="field">Comercio<input autoComplete="organization" {...form.register("businessName")} /><span className="field-error">{fieldError("businessName")}</span></label>
        <label className="field">Email *<input type="email" autoComplete="email" aria-invalid={!!fieldError("email")} {...form.register("email")} /><span className="field-error">{fieldError("email")}</span></label>
        <label className="field">Teléfono<input type="tel" autoComplete="tel" {...form.register("phone")} /><span className="field-error">{fieldError("phone")}</span></label>
        <label className="field span-2">Localidad<input autoComplete="address-level2" {...form.register("locality")} /><span className="field-error">{fieldError("locality")}</span></label>
        <label className="field span-2">Consulta *<textarea rows={6} aria-invalid={!!fieldError("message")} {...form.register("message")} /><span className="field-error">{fieldError("message")}</span></label>
        <label className="contact-honeypot" aria-hidden="true">Sitio web<input tabIndex={-1} autoComplete="off" {...form.register("website")} /></label>
      </div>
      {error !== undefined && <ErrorBox error={error} />}
      {sent && <p className="contact-success" role="status"><CheckCircle2 size={20} /> Recibimos tu consulta. Nuestro equipo la revisará a la brevedad.</p>}
      <div className="contact-submit-row">
        <button className="button" disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? "Enviando…" : "Enviar consulta"}<Send size={17} /></button>
        <p>Te respondemos por correo a la brevedad.</p>
      </div>
    </form>
  );
}
