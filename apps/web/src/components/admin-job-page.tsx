"use client";
import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, ExternalLink, Search } from "lucide-react";
import { candidateStatuses, jobPage, type CandidateList, type JobCandidate, type JobOpening } from "@/data/job-openings";
import { adminListPath } from "@/lib/admin-list-filters";
import { canEditAdminFeature, canSeeAdminSection } from "@/lib/staff-access";
import { downloadPrivateFile } from "@/lib/http";
import { invalidateAdminMutation } from "@/lib/admin-query-invalidation";
import { request, useApi, useSession, DEMO } from "./providers";
import { useAdminReturnHref } from "./admin-list-navigation";
import { ListPagination } from "./admin-list-filters";
import { JobForm } from "./job-form";
import { Empty, ErrorBox, Loading, PageHeading, Modal } from "./ui";
import { CandidateWorkspace } from "./candidate-workspace";

function Candidates({ id, editable }: { id: string; editable: boolean }) {
  const [selected, setSelected] = useState<JobCandidate | null>(null);
  const [search, setSearch] = useState(""), [term, setTerm] = useState(""), [status, setStatus] = useState(""), [page, setPage] = useState(1);
  const [error, setError] = useState<unknown>(), [busy, setBusy] = useState<string | null>(null);
  const q = useApi<CandidateList>(adminListPath(`admin/jobs/${id}/applications`, { search: term, candidateStatus: status, page, limit: 20 }));
  const client = useQueryClient();
  async function update(candidate: JobCandidate, state: string) {
    setBusy(candidate.id); setError(undefined);
    try { await request(`admin/jobs/${id}/applications/${candidate.id}`, "PATCH", { status: state }); await invalidateAdminMutation(client, "admin/jobs"); }
    catch (cause) { setError(cause); } finally { setBusy(null); }
  }
  async function download(candidate: JobCandidate) {
    setBusy(candidate.id); setError(undefined);
    try {
      const path = `admin/jobs/${id}/applications/${candidate.id}/cv`;
      if (DEMO) {
        const file = await request<{ base64: string }>(path);
        const url = URL.createObjectURL(new Blob([Uint8Array.from(atob(file.base64), (c) => c.charCodeAt(0))], { type: "application/pdf" }));
        const anchor = document.createElement("a"); anchor.href = url; anchor.download = candidate.cvFilename; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else await downloadPrivateFile(path, candidate.cvFilename);
    } catch (cause) { setError(cause); } finally { setBusy(null); }
  }
  return <section className="admin-record-section"><h2>Candidatos</h2>
    <form className="admin-toolbar" role="search" onSubmit={(e) => { e.preventDefault(); setTerm(search.trim()); setPage(1); }}>
      <label className="field">Buscar candidatos<input className="form-input" type="search" maxLength={150} placeholder="Nombre, correo o teléfono" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
      <label className="field">Estado del candidato<select className="form-input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">Todos</option>{Object.entries(candidateStatuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <button className="icon-button" title="Buscar candidatos" aria-label="Buscar candidatos" type="submit"><Search size={18} /></button>
    </form>
    {error !== undefined && <ErrorBox error={error} />}
    {q.isPending ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={() => void q.refetch()} /> : <>
      {q.data.items.length ? <div className="table-wrap"><table><thead><tr><th>CANDIDATO</th><th>CONTACTO</th><th>POSTULACIÓN</th><th>ESTADO</th><th>CV</th></tr></thead><tbody>{q.data.items.map((candidate) => <tr key={candidate.id}>
        <td><button className="text-link" onClick={() => setSelected(candidate)}>{candidate.name}</button>{candidate.message && <details><summary>Mensaje</summary><p className="small-copy">{candidate.message}</p></details>}</td>
        <td><a className="text-link" href={`mailto:${candidate.email}`}>{candidate.email}</a><p>{candidate.phone}</p></td>
        <td>{new Date(candidate.createdAt).toLocaleDateString("es-UY")}</td>
        <td>{editable ? <select aria-label={`Estado de ${candidate.name}`} value={candidate.status} disabled={!!busy} onChange={(e) => void update(candidate, e.target.value)}>{Object.entries(candidateStatuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select> : candidateStatuses[candidate.status]}</td>
        <td>{candidate.cvDeletedAt ? <span>CV eliminado</span> : <button className="icon-button" title="Descargar CV PDF" aria-label={`Descargar CV de ${candidate.name}`} disabled={!!busy} onClick={() => void download(candidate)}><Download size={17} /></button>}</td>
      </tr>)}</tbody></table></div> : <Empty title="Sin candidatos con estos filtros" />}
      <ListPagination meta={q.data.meta} onPage={setPage} />
    </>}
    <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? "Candidato"}>{selected && <CandidateWorkspace id={selected.id} editable={editable} />}</Modal>
  </section>;
}

function Content({ id }: { id: string }) {
  const { user } = useSession(), back = useAdminReturnHref("ofertas-laborales");
  const canView = canSeeAdminSection(user, "ofertas-laborales"), editable = canEditAdminFeature(user, "ofertas-laborales");
  const q = useApi<JobOpening>(`admin/jobs/${id}`, canView);
  return <div className="admin-record-page">
    {!canView ? <Empty title="No tenés acceso a esta sección" /> : q.isPending ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={() => void q.refetch()} /> : <>
      <Link className="text-link" href={back} scroll={false}><ArrowLeft size={17} /> Volver a ofertas laborales</Link>
      <PageHeading eyebrow="Administración" title={q.data.title} />
      {q.data.active && <Link className="text-link" href={jobPage(id)} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> Ver oferta pública</Link>}
      <section className="admin-record-section"><h2>{q.data.retired ? "Oferta retirada" : "Oferta"}</h2><JobForm initial={q.data} editable={editable && !q.data.retired} /></section>
      <Candidates id={id} editable={editable} />
    </>}
  </div>;
}
export function AdminJobPage({ id }: { id: string }) { return <Content id={id} />; }
