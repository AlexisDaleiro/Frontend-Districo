"use client";
import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { jobAreas, jobDraftSchema, jobLocations, jobSchedules, jobToday, type JobDraft, type JobOpening } from "@/data/job-openings";
import { invalidateAdminMutation } from "@/lib/admin-query-invalidation";
import { confirmDiscardChanges, useUnsavedChanges } from "@/lib/unsaved-changes";
import { request, useSession } from "./providers";
import { ErrorBox } from "./ui";

const blank: JobDraft = { title: "", area: "Ventas", location: "Montevideo", schedule: "Jornada completa", published: "", description: "", requirements: [], benefits: [], contactEmail: "contacto@districo.com.uy", active: false, isExample: false };
const draftOf = (job?: JobDraft) => ({ ...(job ?? { ...blank, published: jobToday() }), requirements: job?.requirements.join("\n") ?? "", benefits: job?.benefits.join("\n") ?? "" });
const lines = (value: string) => value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

export function JobForm({ initial, editable = true, onSaved, onCancel }: { initial?: JobOpening; editable?: boolean; onSaved?: (job: JobOpening) => void; onCancel?: () => void }) {
  const [draft, setDraft] = useState(() => draftOf(initial));
  const [original, setOriginal] = useState(() => draftOf(initial));
  const [busy, setBusy] = useState(false), [error, setError] = useState<unknown>();
  const { notify } = useSession(), client = useQueryClient();
  const dirty = JSON.stringify(draft) !== JSON.stringify(original);
  useUnsavedChanges(dirty);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editable || busy) return;
    const parsed = jobDraftSchema.safeParse({ ...draft, requirements: lines(draft.requirements), benefits: lines(draft.benefits) });
    if (!parsed.success) { setError(new Error("Revisá los campos y agregá al menos un requisito (máximo 30 líneas de 300 caracteres por listado).")); return; }
    setBusy(true); setError(undefined);
    try {
      const result = await request<JobOpening>(initial ? `admin/jobs/${initial.id}` : "admin/jobs", initial ? "PATCH" : "POST", parsed.data);
      setDraft(draftOf(result)); setOriginal(draftOf(result));
      await invalidateAdminMutation(client, "admin/jobs");
      notify("Oferta laboral guardada."); onSaved?.(result);
    } catch (cause) { setError(cause); } finally { setBusy(false); }
  }
  return <form className="stack" data-admin-save="true" data-unsaved-changes={dirty} aria-busy={busy} onSubmit={(event) => void save(event)}>
    <fieldset className="admin-job-fields" disabled={busy || !editable}>
      <label className="field">Puesto<input className="form-input" required minLength={2} maxLength={120} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
      <div className="form-grid">
        {([['area', 'Área', jobAreas], ['location', 'Sede', jobLocations], ['schedule', 'Jornada', jobSchedules]] as const).map(([key, label, options]) => <label className="field" key={key}>{label}<select className="form-input" value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}>{options.map((value) => <option key={value}>{value}</option>)}</select></label>)}
        <label className="field">Fecha de publicación<input className="form-input" type="date" required value={draft.published} onChange={(event) => setDraft({ ...draft, published: event.target.value })} /></label>
      </div>
      {([['description', 'Descripción', 6000], ['requirements', 'Requisitos', 9030], ['benefits', 'Beneficios', 9030]] as const).map(([key, label, limit]) => <label className="field" key={key}>{label}<textarea className="form-input" rows={4} maxLength={limit} required={key !== 'benefits'} value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} /></label>)}
      <label className="field">Correo de postulaciones<input className="form-input" type="email" required maxLength={254} value={draft.contactEmail} onChange={(event) => setDraft({ ...draft, contactEmail: event.target.value })} /></label>
      <label className="check-field"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} /> Activa</label>
      <label className="check-field"><input type="checkbox" checked={draft.isExample} onChange={(event) => setDraft({ ...draft, isExample: event.target.checked })} /> Oferta de ejemplo (sin postulaciones)</label>
    </fieldset>
    {error !== undefined && <ErrorBox error={error} />}
    <div className="actions">{editable && <button className="button small" type="submit" disabled={busy}><Save size={16} />{busy ? "Guardando…" : "Guardar"}</button>}{onCancel && <button className="button small secondary" type="button" disabled={busy} onClick={() => { if (!dirty || confirmDiscardChanges()) onCancel(); }}>Cancelar</button>}</div>
  </form>;
}
