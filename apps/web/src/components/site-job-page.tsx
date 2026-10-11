"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { jobsPage, type JobOpening } from "@/data/job-openings";
import { useUnsavedChanges } from "@/lib/unsaved-changes";
import { request, usePublicApi } from "./providers";
import { ErrorBox, Loading } from "./ui";

function ApplicationForm({ id }: { id: string }) {
  const [busy, setBusy] = useState(false), [done, setDone] = useState(false), [dirty, setDirty] = useState(false), [error, setError] = useState<unknown>();
  const submission = useRef<string | null>(null);
  useUnsavedChanges(dirty && !done);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const data = new FormData(event.currentTarget), cv = data.get("cv");
    if (!(cv instanceof File) || cv.type !== "application/pdf" || !cv.size || cv.size > 5 * 1024 * 1024) { setError(new Error("Adjuntá un CV en PDF de hasta 5 MB.")); return; }
    submission.current ??= crypto.randomUUID();
    data.set("submissionId", submission.current);
    setBusy(true); setError(undefined);
    try { await request(`jobs/${id}/applications`, "POST", data); setDone(true); setDirty(false); }
    catch (cause) { setError(cause); } finally { setBusy(false); }
  }
  if (done) return <div role="status"><h2>Recibimos tu postulación</h2><p>Gracias por tu interés. El equipo de DISTRICO revisará tu perfil.</p></div>;
  return <form className="stack job-application-form" onSubmit={(e) => void submit(e)} onChange={() => setDirty(true)} aria-busy={busy}>
    <h2>Postularme</h2>
    <fieldset disabled={busy} className="admin-job-fields">
      <label className="field">Nombre completo<input className="form-input" name="name" required minLength={2} maxLength={120} autoComplete="name" /></label>
      <div className="form-grid"><label className="field">Correo electrónico<input className="form-input" type="email" name="email" required maxLength={254} autoComplete="email" /></label><label className="field">Teléfono<input className="form-input" type="tel" name="phone" required minLength={6} maxLength={30} autoComplete="tel" /></label></div>
      <label className="field">Mensaje<textarea className="form-input" name="message" maxLength={2000} rows={3} /></label>
      <label className="field">CV en PDF (hasta 5 MB)<input type="file" name="cv" accept="application/pdf,.pdf" required /></label>
      <label className="check-field"><input type="checkbox" name="consent" value="true" required /> Autorizo a DISTRICO a usar mis datos y mi CV para evaluar esta postulación y contactarme.</label>
    </fieldset>
    {error !== undefined && <ErrorBox error={error} />}
    <button className="button lime" type="submit" disabled={busy}><Send size={17} />{busy ? "Enviando…" : "Enviar postulación"}</button>
  </form>;
}

export function SiteJobPage({ id }: { id: string }) {
  const q = usePublicApi<JobOpening>(`jobs/${id}`);
  return <section className="site-section job-detail"><div className="container">
    <Link className="text-link" href={jobsPage}><ArrowLeft size={17} /> Volver a empleos</Link>
    {q.isPending ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={() => void q.refetch()} /> : <>
      <h1>{q.data.title}</h1><p>{q.data.location} · {q.data.area} · {q.data.schedule}</p>
      <div className="job-detail-layout"><article><p className="job-description">{q.data.description}</p><h2>Qué buscamos</h2><ul>{q.data.requirements.map((line, index) => <li key={index}>{line}</li>)}</ul>{q.data.benefits.length > 0 && <><h2>Qué ofrecemos</h2><ul>{q.data.benefits.map((line, index) => <li key={index}>{line}</li>)}</ul></>}</article>
        {q.data.isExample ? <p className="jobs-note">Esta oferta es de ejemplo y no recibe postulaciones.</p> : <ApplicationForm id={id} />}
      </div>
    </>}
  </div></section>;
}
