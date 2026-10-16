"use client";

import { useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, UserCheck, UserX, X } from "lucide-react";
import { canEditAdminFeature } from "@/lib/staff-access";
import { invalidateAdminMutation } from "@/lib/admin-query-invalidation";
import type { SalespersonSummary } from "@/lib/types";
import { refreshSalespeopleSelection } from "@/lib/salespeople-selection";
import { request, useSession } from "./providers";
import { Modal } from "./ui";

type Review = { active: boolean; sellers: SalespersonSummary[]; issues: Issue[] };
type Issue = { id: string; name: string; reason: string };
const name = (seller: SalespersonSummary) => seller.profile?.name || seller.email;
const refresh = (sellers: SalespersonSummary[]) => refreshSalespeopleSelection(sellers, (id) => request(`admin/salespeople/${id}`));

function unchangedReason(seller: SalespersonSummary, active: boolean, ownId?: string) {
  if (seller.active === active) return active ? "Ya está activo." : "Ya está desactivado.";
  if (active && !seller.emailVerified) return "Debe aceptar su invitación antes de activarse.";
  if (!active && seller.id === ownId) return "No podés desactivar tu propia cuenta.";
  if (!active && seller.profile?.customerCount) return "Reasigná sus clientes antes de desactivarlo.";
  return "";
}

export function SalespeopleActions({ sellers, clear, remove, pageSelection }: {
  sellers: SalespersonSummary[]; clear: () => void; remove: (ids: string[]) => void; pageSelection: ReactNode;
}) {
  const { user, notify } = useSession();
  const client = useQueryClient();
  const canChange = canEditAdminFeature(user, "vendedores") && canEditAdminFeature(user, "personal");
  const [review, setReview] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);
  const applying = useRef(false);
  const [progress, setProgress] = useState(0);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [copyFallback, setCopyFallback] = useState("");
  const [notice, setNotice] = useState("");
  const reason = (seller: SalespersonSummary, current: Review) => current.issues.find((issue) => issue.id === seller.id)?.reason || unchangedReason(seller, current.active, user?.id);
  const eligible = review?.sellers.filter((seller) => !reason(seller, review)) ?? [];
  async function begin(active: boolean) {
    if (!canChange || applying.current || !sellers.length) return;
    applying.current = true;
    setBusy(true); setIssues([]); setNotice(""); setReview({ active, sellers: [...sellers], issues: [] });
    try { setReview({ active, ...await refresh(sellers) }); }
    finally { applying.current = false; setBusy(false); }
  }
  async function apply() {
    if (!review || !canChange || applying.current || !eligible.length) return;
    applying.current = true;
    setBusy(true); setProgress(0);
    const saved: string[] = [], failed: Issue[] = [];
    try {
      const current = { active: review.active, ...await refresh(review.sellers) };
      if (current.sellers.some((seller, index) => reason(seller, current) !== reason(review.sellers[index], review))) {
        setReview(current);
        setNotice("Los estados cambiaron desde la revisión. Revisá el detalle y confirmá nuevamente.");
        return;
      }
      const verified = current.sellers.filter((seller) => !reason(seller, current));
      for (const [index, seller] of verified.entries()) {
        try {
          await request(`admin/staff/${seller.id}/active`, "PATCH", { active: review.active });
          saved.push(seller.id);
        } catch (cause) {
          failed.push({ id: seller.id, name: name(seller), reason: cause instanceof Error ? cause.message : "No se pudo actualizar la cuenta." });
        }
        setProgress(index + 1);
      }
      remove(saved);
      setIssues(failed);
      setReview(null);
      notify(`${saved.length} ${saved.length === 1 ? "cuenta actualizada" : "cuentas actualizadas"}.${failed.length ? ` ${failed.length} sin actualizar; revisá el detalle.` : ""}`);
      if (saved.length) {
        try { await invalidateAdminMutation(client, "admin/staff"); }
        catch { notify("Los cambios se guardaron. Recargá el listado para ver los estados actualizados."); }
      }
    } finally { applying.current = false; setBusy(false); }
  }
  return <>
    <div className="admin-bulk-toolbar admin-salespeople-bulk" aria-label="Acciones para vendedores seleccionados" data-empty={!sellers.length || undefined}>
      <div><div className="admin-salespeople-selection-summary">{pageSelection}<strong role="status">{sellers.length} {sellers.length === 1 ? "seleccionado" : "seleccionados"}</strong></div><span className="admin-list-sub">Entre páginas y filtros · máximo 100</span></div>
      <div className="actions">
        <button className="button small secondary" type="button" disabled={!sellers.length || busy} onClick={async () => {
          const emails = [...new Set(sellers.map((seller) => seller.email))].join("; ");
          try { await navigator.clipboard.writeText(emails); notify(`${sellers.length} correos copiados.`); }
          catch { setCopyFallback(emails); }
        }}><Copy size={16} aria-hidden="true" />Copiar correos</button>
        {canChange && <>
          <button className="button small secondary" type="button" disabled={!sellers.length || busy} onClick={() => begin(true)}><UserCheck size={16} aria-hidden="true" />Activar</button>
          <button className="button small secondary" type="button" disabled={!sellers.length || busy} onClick={() => begin(false)}><UserX size={16} aria-hidden="true" />Desactivar</button>
        </>}
        <button className="icon-button" type="button" title="Limpiar selección" aria-label="Limpiar selección" disabled={!sellers.length || busy} onClick={clear}><X size={17} aria-hidden="true" /></button>
      </div>
    </div>
    {issues.length > 0 && <div className="admin-salespeople-issues" role="alert"><strong>No se pudieron actualizar estas cuentas:</strong><ul>{issues.map((issue) => <li key={issue.id}>{issue.name}: {issue.reason}</li>)}</ul><p>Siguen seleccionadas para que puedas reintentar.</p></div>}
    <Modal open={!!review} onClose={() => { if (!busy) setReview(null); }} title={review?.active ? "Activar vendedores" : "Desactivar vendedores"}>
      {review && <div className="stack" aria-busy={busy}>
        <p>{review.active ? "Las cuentas activadas podrán volver a ingresar." : "Los vendedores desactivados perderán el acceso y se cerrarán sus sesiones."}</p>
        <ul className="admin-salespeople-review">{review.sellers.map((seller) => {
          const explanation = reason(seller, review);
          return <li key={seller.id}><strong>{name(seller)}</strong><span className="admin-list-sub">{seller.email}</span><span className="admin-list-sub">{explanation || (review.active ? "Se activará la cuenta." : "Se desactivará la cuenta.")}</span></li>;
        })}</ul>
        {notice && <p role="alert">{notice}</p>}
        <p className="small-copy">Se cambiarán {eligible.length} de {review.sellers.length} cuentas. Las demás conservarán su estado.</p>
        <div className="actions"><button className="button" type="button" disabled={busy || !eligible.length} onClick={() => void apply()}>{busy ? `Procesando ${progress} de ${eligible.length}…` : `Confirmar ${review.active ? "activación" : "desactivación"}`}</button><button className="button secondary" type="button" disabled={busy} onClick={() => setReview(null)}>Cancelar</button></div>
      </div>}
    </Modal>
    <Modal open={!!copyFallback} onClose={() => setCopyFallback("")} title="Copiar correos"><p>No se pudo copiar automáticamente. Seleccioná y copiá los correos:</p><label className="field">Correos seleccionados<textarea className="form-input" readOnly value={copyFallback} onFocus={(event) => event.target.select()} /></label></Modal>
  </>;
}
