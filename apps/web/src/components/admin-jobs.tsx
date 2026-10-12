"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Eye, Plus, Trash2 } from "lucide-react";
import { jobsPage, jobToday, type JobList, type JobOpening } from "@/data/job-openings";
import { canEditAdminFeature } from "@/lib/staff-access";
import { invalidateAdminMutation } from "@/lib/admin-query-invalidation";
import { adminListPath } from "@/lib/admin-list-filters";
import { storeRoutes, withSearch } from "@/lib/store-routes";
import { request, useApi, useSession } from "./providers";
import { AdminListFilters, ListPagination } from "./admin-list-filters";
import { AdminRecordLink, ShareAdminList, useAdminListField, useAdminListScroll } from "./admin-list-navigation";
import { JobForm } from "./job-form";
import { InterviewAgenda } from "./interview-agenda";
import { Empty, ErrorBox, Loading, Modal } from "./ui";

export function AdminJobs() {
  const [search, setSearch] = useAdminListField("search", ""), [status, setStatus] = useAdminListField("status", "", ["", "active", "inactive", "retired"]), [page, setPage] = useAdminListField("page", 1);
  const [term, setTerm] = useState(search.trim());
  useEffect(() => { const timer = setTimeout(() => setTerm(search.trim()), 250); return () => clearTimeout(timer); }, [search]);
  const q = useApi<JobList>(adminListPath("admin/jobs", { page, limit: 20, search: term, status }));
  useAdminListScroll(!q.isPending && !q.error && term === search.trim());
  const { user, notify } = useSession(), client = useQueryClient();
  const canEdit = canEditAdminFeature(user, "ofertas-laborales");
  const [creating, setCreating] = useState(false), [deleting, setDeleting] = useState<JobOpening | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState<unknown>();
  function clearFilters() {
    const params = new URLSearchParams(window.location.search);
    for (const key of ["search", "status", "page"]) params.delete(key);
    window.history.replaceState(null, "", withSearch(window.location.pathname, params));
  }
  async function remove() {
    if (!deleting || !canEdit || busy) return;
    setError(undefined); setBusy(true);
    try { await request(`admin/jobs/${deleting.id}`, "DELETE"); await invalidateAdminMutation(client, "admin/jobs"); setDeleting(null); setPage(1); notify("Oferta laboral eliminada."); }
    catch (cause) { setError(cause); } finally { setBusy(false); }
  }
  return <>
    <div className="admin-toolbar"><ShareAdminList /><Link className="button small secondary" href={jobsPage} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> Ver empleos</Link>{canEdit && <button className="button small" onClick={() => setCreating(true)}><Plus size={16} /> Nueva oferta</button>}</div>
    <InterviewAgenda />
    <AdminListFilters active={!!search || !!status} onClear={clearFilters}>
      <label className="field">Buscar ofertas<input className="form-input" type="search" maxLength={120} placeholder="Puesto, área o sede" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <label className="field">Estado<select className="form-input" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos</option><option value="active">Activas</option><option value="inactive">Inactivas</option><option value="retired">Retiradas</option></select></label>
    </AdminListFilters>
    {q.isPending ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={() => void q.refetch()} /> : <>
      {q.data.items.length ? <div className="table-wrap"><table><thead><tr><th>PUESTO</th><th>SEDE</th><th>JORNADA</th><th>PUBLICACIÓN</th><th>ESTADO</th><th>ACCIONES</th></tr></thead><tbody>{q.data.items.map((job) => <tr key={job.id}>
        <td><AdminRecordLink className="text-link" href={storeRoutes.adminJob(job.id)}><strong>{job.title}</strong></AdminRecordLink><p className="small-copy muted">{job.area}{job.isExample ? " · Ejemplo" : ""}</p></td><td>{job.location}</td><td>{job.schedule}</td><td>{new Date(job.published + "T12:00:00Z").toLocaleDateString("es-UY", { timeZone: "UTC" })}</td><td><span className="status-pill">{job.retired ? "Retirada" : !job.active ? "Inactiva" : job.published > jobToday() ? "Programada" : "Activa"}</span></td>
        <td><div className="actions"><AdminRecordLink className="icon-button" title="Abrir oferta y candidatos" aria-label={`Abrir ${job.title}`} href={storeRoutes.adminJob(job.id)}><Eye size={17} /></AdminRecordLink>{canEdit && !job.retired && <button className="icon-button" title="Eliminar oferta" aria-label={`Eliminar ${job.title}`} onClick={() => { setDeleting(job); setError(undefined); }}><Trash2 size={17} /></button>}</div></td>
      </tr>)}</tbody></table></div> : <Empty title="No hay ofertas con estos filtros" />}
      <ListPagination meta={q.data.meta} onPage={setPage} />
    </>}
    <Modal open={creating} onClose={() => setCreating(false)} title="Nueva oferta laboral">{creating && <JobForm onSaved={() => setCreating(false)} onCancel={() => setCreating(false)} />}</Modal>
    <Modal open={!!deleting} onClose={() => { if (!busy) setDeleting(null); }} title="Eliminar oferta laboral"><p>¿Eliminar {deleting?.title}? Dejará de aparecer en Trabajá con nosotros. Las postulaciones existentes se conservan en el historial.</p>{error !== undefined && <ErrorBox error={error} />}<div className="actions"><button className="button small danger" disabled={busy} onClick={() => void remove()}>Eliminar</button><button className="button small secondary" disabled={busy} onClick={() => setDeleting(null)}>Cancelar</button></div></Modal>
  </>;
}
