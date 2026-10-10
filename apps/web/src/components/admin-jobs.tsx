"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { jobAreas, jobDraftSchema, jobLocations, jobsPage, jobSchedules, jobToday, type JobDraft, type JobList, type JobOpening } from "@/data/job-openings";
import { canEditAdminFeature } from "@/lib/staff-access";
import { invalidateAdminMutation } from "@/lib/admin-query-invalidation";
import { adminListPath } from "@/lib/admin-list-filters";
import { withSearch } from "@/lib/store-routes";
import { request, useApi, useSession } from "./providers";
import { AdminListFilters, ListPagination } from "./admin-list-filters";
import { ShareAdminList, useAdminListField, useAdminListScroll } from "./admin-list-navigation";
import { Empty, ErrorBox, Loading, Modal } from "./ui";

type Draft = Omit<JobDraft, "requirements" | "benefits"> & { requirements: string; benefits: string };
const blank = (): Draft => ({ title: "", area: "Ventas", location: "Montevideo", schedule: "Jornada completa", published: jobToday(), description: "", requirements: "", benefits: "", contactEmail: "contacto@districo.com.uy", active: false, isExample: false });
const lines = (text: string) => text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

export function AdminJobs() {
  const [search, setSearch] = useAdminListField("search", "");
  const [status, setStatus] = useAdminListField("status", "", ["", "active", "inactive"]);
  const [page, setPage] = useAdminListField("page", 1);
  const [term, setTerm] = useState(search.trim());
  useEffect(() => { const timer = setTimeout(() => setTerm(search.trim()), 250); return () => clearTimeout(timer); }, [search]);
  const q = useApi<JobList>(adminListPath("admin/jobs", { page, limit: 20, search: term, status }));
  useAdminListScroll(!q.isPending && !q.error && term === search.trim());
  const { user, notify } = useSession();
  const client = useQueryClient();
  const canEdit = canEditAdminFeature(user, "ofertas-laborales");
  const [editing, setEditing] = useState<JobOpening | "new" | null>(null);
  const [deleting, setDeleting] = useState<JobOpening | null>(null);
  const [draft, setDraft] = useState<Draft>(blank);
  const [original, setOriginal] = useState<Draft>(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const dirty = editing !== null && JSON.stringify(draft) !== JSON.stringify(original);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function open(job?: JobOpening) {
    const value = job ? { ...job, requirements: job.requirements.join("\n"), benefits: job.benefits.join("\n") } : blank();
    setEditing(job ?? "new"); setDraft(value); setOriginal(value); setError(undefined);
  }
  function close() {
    if (!busy && (!dirty || window.confirm("¿Descartar los cambios sin guardar?"))) setEditing(null);
  }
  function clearFilters() {
    const params = new URLSearchParams(window.location.search);
    for (const key of ["search", "status", "page"]) params.delete(key);
    window.history.replaceState(null, "", withSearch(window.location.pathname, params));
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || !canEdit || busy) return;
    const parsed = jobDraftSchema.safeParse({ ...draft, requirements: lines(draft.requirements), benefits: lines(draft.benefits) });
    if (!parsed.success) { setError(new Error("Revisá los campos: agregá al menos un requisito y respetá el máximo de 30 líneas de 300 caracteres por listado.")); return; }
    setError(undefined); setBusy(true);
    try {
      await request(editing === "new" ? "admin/jobs" : `admin/jobs/${editing.id}`, editing === "new" ? "POST" : "PATCH", parsed.data);
      await invalidateAdminMutation(client, "admin/jobs");
      setEditing(null); notify("Oferta laboral guardada.");
    } catch (cause) { setError(cause); } finally { setBusy(false); }
  }
  async function remove() {
    if (!deleting || !canEdit || busy) return;
    setError(undefined); setBusy(true);
    try {
      await request(`admin/jobs/${deleting.id}`, "DELETE");
      await invalidateAdminMutation(client, "admin/jobs");
      setDeleting(null); setPage(1); notify("Oferta laboral eliminada.");
    } catch (cause) { setError(cause); } finally { setBusy(false); }
  }

  return <>
    <div className="admin-toolbar">
      <ShareAdminList />
      <Link className="button small secondary" href={jobsPage} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> Ver empleos</Link>
      {canEdit && <button className="button small" onClick={() => open()}><Plus size={16} /> Nueva oferta</button>}
    </div>
    <AdminListFilters active={!!search || !!status} onClear={clearFilters}>
      <label className="field">Buscar ofertas<input className="form-input" type="search" maxLength={120} placeholder="Puesto, área o sede" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <label className="field">Estado<select className="form-input" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos</option><option value="active">Activas</option><option value="inactive">Inactivas</option></select></label>
    </AdminListFilters>
    {q.isPending ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={() => void q.refetch()} /> : <>
      {q.data.items.length ? <div className="table-wrap"><table><thead><tr><th>PUESTO</th><th>SEDE</th><th>JORNADA</th><th>PUBLICACIÓN</th><th>ESTADO</th><th>ACCIONES</th></tr></thead><tbody>
        {q.data.items.map((job) => <tr key={job.id}>
          <td><strong>{job.title}</strong><p className="small-copy muted">{job.area}{job.isExample ? " · Ejemplo" : ""}</p></td>
          <td>{job.location}</td><td>{job.schedule}</td><td>{new Date(job.published + "T12:00:00Z").toLocaleDateString("es-UY", { timeZone: "UTC" })}</td>
          <td><span className="status-pill">{!job.active ? "Inactiva" : job.published > jobToday() ? "Programada" : "Activa"}</span></td>
          <td>{canEdit && <div className="actions">
            <button className="icon-button" title="Editar oferta" aria-label={`Editar ${job.title}`} onClick={() => open(job)}><Pencil size={17} /></button>
            <button className="icon-button" title="Eliminar oferta" aria-label={`Eliminar ${job.title}`} onClick={() => { setDeleting(job); setError(undefined); }}><Trash2 size={17} /></button>
          </div>}</td>
        </tr>)}
      </tbody></table></div> : <Empty title="No hay ofertas con estos filtros" />}
      <ListPagination meta={q.data.meta} onPage={setPage} />
    </>}
    <Modal open={!!editing} onClose={close} title={editing === "new" ? "Nueva oferta laboral" : "Editar oferta laboral"}>
      <form className="stack" data-admin-save="true" onSubmit={(event) => void save(event)}>
        <fieldset className="admin-job-fields" disabled={busy || !canEdit}>
          <label className="field">Puesto<input className="form-input" required minLength={2} maxLength={120} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
          <div className="form-grid">
            <label className="field">Área<select className="form-input" value={draft.area} onChange={(event) => setDraft({ ...draft, area: event.target.value as Draft["area"] })}>{jobAreas.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="field">Sede<select className="form-input" value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value as Draft["location"] })}>{jobLocations.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="field">Jornada<select className="form-input" value={draft.schedule} onChange={(event) => setDraft({ ...draft, schedule: event.target.value as Draft["schedule"] })}>{jobSchedules.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="field">Fecha de publicación<input className="form-input" type="date" required value={draft.published} onChange={(event) => setDraft({ ...draft, published: event.target.value })} /></label>
          </div>
          <label className="field">Descripción<textarea className="form-input" rows={4} required minLength={10} maxLength={6000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
          <label className="field">Requisitos<textarea className="form-input" rows={4} required maxLength={9030} value={draft.requirements} onChange={(event) => setDraft({ ...draft, requirements: event.target.value })} /></label>
          <label className="field">Beneficios<textarea className="form-input" rows={3} maxLength={9030} value={draft.benefits} onChange={(event) => setDraft({ ...draft, benefits: event.target.value })} /></label>
          <label className="field">Correo de postulaciones<input className="form-input" type="email" required maxLength={254} value={draft.contactEmail} onChange={(event) => setDraft({ ...draft, contactEmail: event.target.value })} /></label>
          <label className="check-field"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} /> Activa</label>
          <label className="check-field"><input type="checkbox" checked={draft.isExample} onChange={(event) => setDraft({ ...draft, isExample: event.target.checked })} /> Oferta de ejemplo (sin postulaciones)</label>
        </fieldset>
        {error !== undefined && <ErrorBox error={error} />}
        <div className="actions"><button className="button small" type="submit" disabled={busy || !canEdit}><Save size={16} /> Guardar</button><button className="button small secondary" type="button" disabled={busy} onClick={close}>Cancelar</button></div>
      </form>
    </Modal>
    <Modal open={!!deleting} onClose={() => { if (!busy) setDeleting(null); }} title="Eliminar oferta laboral">
      <p>¿Eliminar {deleting?.title}? Dejará de aparecer en Trabajá con nosotros.</p>
      {error !== undefined && <ErrorBox error={error} />}
      <div className="actions"><button className="button small danger" disabled={busy} onClick={() => void remove()}>Eliminar</button><button className="button small secondary" disabled={busy} onClick={() => setDeleting(null)}>Cancelar</button></div>
    </Modal>
  </>;
}
