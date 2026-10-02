"use client";

import { useState } from "react";
import { Copy, Plus, Save, UserCheck, UserX } from "lucide-react";
import { request, useApi, useSession } from "./providers";
import { Empty, ErrorBox, Loading, Modal } from "./ui";
import { storeRoutes } from "@/lib/store-routes";
import type { StaffRole } from "@/lib/staff-access";
import type { User } from "@/lib/types";

type StaffMember = { id: string; email: string; role: User["role"]; active: boolean; emailVerified: boolean; invitationPending: boolean };
type Invitation = { token: string; email: string; expiresAt: string };
const roles: { value: StaffRole; label: string }[] = [
  { value: "ADMIN", label: "Administrador" },
  { value: "SALES", label: "Ventas" },
  { value: "CATALOG", label: "Catálogo" },
  { value: "FINANCE", label: "Finanzas" },
];

function StaffRow({ member, onUpdated, ownId, onReinvite }: {
  member: StaffMember; onUpdated: () => Promise<unknown>; ownId?: string; onReinvite: (member: StaffMember) => void;
}) {
  const [role, setRole] = useState(member.role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { notify } = useSession();
  async function save() {
    setBusy(true);
    setError("");
    try {
      await request(`admin/staff/${member.id}/role`, "PATCH", { role });
      await onUpdated();
      notify("Rol actualizado.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar el rol.");
    } finally { setBusy(false); }
  }
  async function changeActive() {
    const active = !member.active;
    if (!active && !window.confirm(`¿Desactivar a ${member.email}? Perderá el acceso inmediatamente.`)) return;
    setBusy(true);
    setError("");
    try {
      await request(`admin/staff/${member.id}/active`, "PATCH", { active });
      await onUpdated();
      notify(active ? "Cuenta activada." : "Cuenta desactivada.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cambiar el acceso.");
    } finally { setBusy(false); }
  }
  return <tr>
    <td><strong>{member.email}</strong>{error && <p className="error" role="alert">{error}</p>}</td>
    <td><span className="status-pill">{member.active ? "Activo" : member.invitationPending ? "Invitación pendiente" : member.emailVerified ? "Desactivado" : "Sin activar"}</span></td>
    <td><select className="form-input" aria-label={`Rol de ${member.email}`} value={role} disabled={busy || member.id === ownId} onChange={(event) => setRole(event.target.value as StaffRole)}>
      {member.role === "CLIENT" && <option value="CLIENT" disabled>Sin rol interno</option>}
      {roles.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
    </select></td>
    <td><div className="actions admin-staff-actions">
      <button className="icon-button" type="button" title="Guardar rol" aria-label={`Guardar rol de ${member.email}`} disabled={busy || role === "CLIENT" || role === member.role || member.id === ownId} onClick={() => void save()}><Save size={17} /></button>
      {!member.emailVerified ? <button className="button small secondary" type="button" disabled={busy} onClick={() => onReinvite(member)}>Nuevo enlace</button> :
        <button className="button small secondary" type="button" disabled={busy || member.id === ownId} onClick={() => void changeActive()}>
          {member.active ? <UserX size={16} /> : <UserCheck size={16} />}{member.active ? "Desactivar" : "Activar"}
        </button>}
    </div></td>
  </tr>;
}

export function AdminStaff() {
  const { user, notify } = useSession();
  const q = useApi<StaffMember[]>("admin/staff");
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("SALES");
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const invitationUrl = invitation && typeof window !== "undefined" ? `${window.location.origin}${storeRoutes.staffInvitation}#token=${encodeURIComponent(invitation.token)}` : "";
  function close() { setOpen(false); setInvitation(null); setError(""); setEmail(""); }
  async function invite() {
    setBusy(true);
    setError("");
    try {
      const created = await request<Invitation>("admin/staff/invitations", "POST", { email: email.trim(), role });
      setInvitation(created);
      await q.refetch();
      notify("Enlace de invitación generado.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear la invitación.");
      void q.refetch();
    } finally { setBusy(false); }
  }
  if (q.isPending) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} retry={() => void q.refetch()} />;
  return <section>
    <div className="admin-toolbar"><h2>Equipo</h2><button className="button small" onClick={() => setOpen(true)}><Plus size={16} /> Invitar persona</button></div>
    {q.data.length ? <div className="table-wrap"><table className="admin-staff-table"><thead><tr><th>CORREO</th><th>ACCESO</th><th>ROL</th><th>ACCIONES</th></tr></thead>
      <tbody>{q.data.map((member) => <StaffRow key={`${member.id}-${member.role}-${member.active}-${member.invitationPending}`} member={member} ownId={user?.id} onUpdated={() => q.refetch()} onReinvite={(item) => {
        setEmail(item.email); setRole(item.role === "CLIENT" ? "SALES" : item.role); setInvitation(null); setOpen(true);
      }} />)}</tbody></table></div> : <Empty title="Todavía no hay personal" />}
    <Modal open={open} onClose={close} title={invitation ? "Compartir invitación" : "Invitar personal"}>
      {invitation ? <div className="stack">
        <p>Compartí este enlace con <strong>{invitation.email}</strong> por un canal privado. Vence el {new Date(invitation.expiresAt).toLocaleString("es-UY")}; sólo se puede usar una vez.</p>
        <label className="field">Enlace de activación<input className="form-input" readOnly value={invitationUrl} onFocus={(event) => event.target.select()} /></label>
        <div className="actions"><button className="button" onClick={async () => {
          try { await navigator.clipboard.writeText(invitationUrl); notify("Enlace copiado."); }
          catch { setError("No se pudo copiar automáticamente. Seleccioná y copiá el enlace."); }
        }}><Copy size={16} /> Copiar enlace</button><button className="button secondary" onClick={close}>Cerrar</button></div>
      </div> : <form className="stack" onSubmit={(event) => { event.preventDefault(); void invite(); }}>
        <label className="field">Correo electrónico<input className="form-input" type="email" autoComplete="off" required value={email} disabled={busy} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="field">Rol<select className="form-input" value={role} disabled={busy} onChange={(event) => setRole(event.target.value as StaffRole)}>{roles.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
        <div className="actions"><button className="button" disabled={busy}>{busy ? "Generando…" : "Generar enlace"}</button><button className="button secondary" type="button" onClick={close}>Cancelar</button></div>
      </form>}
      {error && <p className="error" role="alert">{error}</p>}
    </Modal>
  </section>;
}
