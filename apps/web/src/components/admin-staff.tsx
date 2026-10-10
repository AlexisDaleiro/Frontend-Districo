"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Archive, Copy, CopyPlus, Pencil, Plus, Save, UserCheck, UserX } from "lucide-react";
import { request, useApi, useSession } from "./providers";
import { Empty, ErrorBox, Loading, Modal } from "./ui";
import { storeRoutes } from "@/lib/store-routes";
import { canEditAdminFeature, canViewAdminFeature, staffFeatures, type BuiltInStaffRole, type StaffFeature, type StaffRole } from "@/lib/staff-access";
import type { User } from "@/lib/types";
import { invalidateAdminMutation } from "@/lib/admin-query-invalidation";
import { AdminListFilters, ListPagination, StaffStatusFilter } from "./admin-list-filters";
import { adminListPath } from "@/lib/admin-list-filters";
import { ShareAdminList, useAdminListField, useAdminListScroll } from "./admin-list-navigation";

type StaffMember = { id: string; email: string; role: User["role"]; customRoleId?: string | null; customRole?: { id: string; name: string } | null; active: boolean; emailVerified: boolean; invitationPending: boolean };
type Invitation = { token: string; email: string; expiresAt: string };
type RoleAccess = { role: StaffRole; id: string | null; name: string | null; assignedUsers?: number; access: Record<StaffFeature, { canView: boolean; canEdit: boolean }> };
const builtInRoles: { value: BuiltInStaffRole; label: string }[] = [
  { value: "ADMIN", label: "Administrador" },
  { value: "SALES", label: "Ventas" },
  { value: "CATALOG", label: "Catálogo" },
  { value: "FINANCE", label: "Finanzas" },
];
const roleValue = (item: { role: User["role"]; customRoleId?: string | null }) =>
  item.role === "CUSTOM" ? `custom:${item.customRoleId ?? ""}` : item.role;
const rolePayload = (value: string) => value.startsWith("custom:")
  ? { role: "CUSTOM" as const, customRoleId: value.slice(7) }
  : { role: value as BuiltInStaffRole };
const roleOptions = (access: RoleAccess[] = []) => [
  ...builtInRoles,
  ...access.filter((item) => item.role === "CUSTOM" && item.id).map((item) => ({ value: `custom:${item.id}`, label: item.name ?? "Rol sin nombre" })),
];

function StaffRow({ member, options, onUpdated, ownId, onReinvite, canEdit }: {
  member: StaffMember; options: { value: string; label: string }[]; onUpdated: () => Promise<unknown>; ownId?: string; onReinvite: (member: StaffMember) => void; canEdit: boolean;
}) {
  const [role, setRole] = useState(roleValue(member));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { notify } = useSession();
  async function save() {
    setBusy(true);
    setError("");
    try {
      await request(`admin/staff/${member.id}/role`, "PATCH", rolePayload(role));
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
    <td><select className="form-input" aria-label={`Rol de ${member.email}`} value={role} disabled={!canEdit || busy || member.id === ownId} onChange={(event) => setRole(event.target.value)}>
      {member.role === "CLIENT" && <option value="CLIENT" disabled>Sin rol interno</option>}
      {options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
    </select></td>
    <td><div className="actions admin-staff-actions">{canEdit && <>
      <button className="icon-button" type="button" title="Guardar rol" aria-label={`Guardar rol de ${member.email}`} disabled={busy || role === "CLIENT" || role === roleValue(member) || member.id === ownId} onClick={() => void save()}><Save size={17} /></button>
      {!member.emailVerified ? <button className="button small secondary" type="button" disabled={busy} onClick={() => onReinvite(member)}>Nuevo enlace</button> :
        <button className="button small secondary" type="button" disabled={busy || member.id === ownId} onClick={() => void changeActive()}>
          {member.active ? <UserX size={16} /> : <UserCheck size={16} />}{member.active ? "Desactivar" : "Activar"}
        </button>}
    </>}</div></td>
  </tr>;
}

function RoleAccessEditor({ item, onSaved, canEdit }: { item: RoleAccess; onSaved: () => Promise<unknown>; canEdit: boolean }) {
  const client = useQueryClient();
  const [draft, setDraft] = useState(item.access);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { notify } = useSession();
  const locked = item.role === "ADMIN" || !canEdit;
  const dirty = staffFeatures.some(([feature]) =>
    draft[feature].canView !== item.access[feature].canView || draft[feature].canEdit !== item.access[feature].canEdit);
  function toggle(feature: StaffFeature, key: "canView" | "canEdit", value: boolean) {
    setDraft((current) => {
      const next = {
        ...current,
        [feature]: {
          ...current[feature],
          [key]: value,
          ...(key === "canView" && !value ? { canEdit: false } : {}),
          ...(key === "canEdit" && value ? { canView: true } : {}),
        },
      };
      if (feature === "pedidos" && key === "canEdit" && value)
        next.facturacion = { ...next.facturacion, canView: true };
      if (feature === "pedidos" && key === "canView" && !value)
        next.facturacion = { canView: false, canEdit: false };
      if (feature === "facturacion" && key === "canView" && !value)
        next.pedidos = { ...next.pedidos, canEdit: false };
      if (feature === "facturacion" && (key === "canView" || key === "canEdit") && value)
        next.pedidos = { ...next.pedidos, canView: true };
      if (feature === "ventas" && key === "canView" && value)
        next.resumen = { ...next.resumen, canView: true };
      if (feature === "resumen" && key === "canView" && !value)
        next.ventas = { ...next.ventas, canView: false };
      return next;
    });
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      await request(item.role === "CUSTOM" ? `admin/staff/roles/${item.id}/access` : `admin/staff/access/${item.role}`, "PATCH", {
        entries: staffFeatures.map(([feature]) => ({ feature, ...draft[feature] })),
      });
      await onSaved();
      await client.invalidateQueries({ queryKey: ["session"] });
      notify(`Permisos de ${item.name ?? builtInRoles.find((entry) => entry.value === item.role)?.label} actualizados.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron guardar los permisos.");
    } finally { setBusy(false); }
  }
  return <form data-admin-save={!locked ? "true" : undefined} aria-busy={busy} className="staff-role-access" onSubmit={(event) => { event.preventDefault(); if (!locked && dirty && !busy) void save(); }}>
    <div className="table-wrap"><table className="admin-staff-table"><thead><tr><th>FUNCIONALIDAD</th><th>VER</th><th>EDITAR</th></tr></thead>
      <tbody>{staffFeatures.map(([feature, title]) => <tr key={feature}>
        <td>{title}</td>
        <td><input type="checkbox" aria-label={`Ver ${title}`} checked={draft[feature].canView} disabled={locked || busy} onChange={(event) => toggle(feature, "canView", event.target.checked)} /></td>
        <td><input type="checkbox" aria-label={`Editar ${title}`} checked={draft[feature].canEdit} disabled={locked || busy || feature === "resumen" || feature === "ventas" || feature === "integraciones"} onChange={(event) => toggle(feature, "canEdit", event.target.checked)} /></td>
      </tr>)}</tbody></table></div>
    {error && <p className="error" role="alert">{error}</p>}
    {!locked && <div className="actions"><button className="button small" type="submit" disabled={!dirty || busy}><Save size={16} />{busy ? "Guardando…" : "Guardar permisos"}</button>
      <button className="button small secondary" type="button" disabled={!dirty || busy} onClick={() => setDraft(item.access)}>Descartar</button></div>}
  </form>;
}

export function AdminStaff() {
  const { user, notify } = useSession();
  const client = useQueryClient();
  const canEdit = canEditAdminFeature(user, "personal");
  const [search, setSearch] = useAdminListField("search", "");
  const [debounced, setDebounced] = useState(search.trim());
  const [page, setPage] = useAdminListField("page", 1);
  const [roleFilter, setRoleFilter] = useAdminListField("role", "");
  const [status, setStatus] = useAdminListField("status", "", ["", "ACTIVE", "INACTIVE", "PENDING", "UNVERIFIED"]);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const q = useApi<{ items: StaffMember[]; meta: { total: number; page: number; limit: number } }>(adminListPath("admin/staff/page", { page, limit: 20, search: debounced, status, ...(roleFilter ? rolePayload(roleFilter) : {}) }));
  useAdminListScroll(!q.isPending && !q.error && debounced === search.trim());
  const filterRoles = useApi<{ id: string; name: string; retiredAt?: string | null }[]>("admin/staff/page/options");
  const canViewRoles = canViewAdminFeature(user, "roles");
  const access = useApi<RoleAccess[]>("admin/staff/access", canViewRoles);
  const options = roleOptions(access.data);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("SALES");
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const invitationUrl = invitation && typeof window !== "undefined" ? `${window.location.origin}${storeRoutes.staffInvitation}#token=${encodeURIComponent(invitation.token)}` : "";
  function close() { setOpen(false); setInvitation(null); setError(""); setEmail(""); }
  async function invite() {
    setBusy(true);
    setError("");
    try {
      const created = await request<Invitation>("admin/staff/invitations", "POST", { email: email.trim(), ...rolePayload(role) });
      setInvitation(created);
      await invalidateAdminMutation(client, "admin/staff/invitations");
      notify("Enlace de invitación generado.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear la invitación.");
      void q.refetch();
    } finally { setBusy(false); }
  }
  return <section>
    <div className="admin-toolbar"><h2>Equipo</h2><ShareAdminList />{canEdit && <button className="button small" onClick={() => setOpen(true)}><Plus size={16} /> Invitar persona</button>}</div>
    <AdminListFilters active={!!(search || roleFilter || status)} onClear={() => { setSearch(""); setDebounced(""); setRoleFilter(""); setStatus(""); setPage(1); }}>
      <label className="field">Buscar personal<input className="form-input" type="search" placeholder="Correo o nombre del rol" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
      <label className="field">Rol<select className="form-input" aria-label="Filtrar por rol" value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setPage(1); }}>
        <option value="">Todos los roles</option>{builtInRoles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        <option value="CUSTOM">Todos los personalizados</option>
        {filterRoles.data?.map((item) => <option key={item.id} value={`custom:${item.id}`}>{item.name}{item.retiredAt ? " (retirado)" : ""}</option>)}
      </select></label>
      <StaffStatusFilter value={status} onChange={(value) => { setStatus(value); setPage(1); }} />
    </AdminListFilters>
    {filterRoles.error && <ErrorBox error={filterRoles.error} retry={() => void filterRoles.refetch()} />}
    {canViewRoles && access.error && <ErrorBox error={access.error} retry={() => void access.refetch()} />}
    {q.isPending ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={() => void q.refetch()} /> : q.data && <>
    {q.data.items.length ? <div className="table-wrap"><table className="admin-staff-table"><thead><tr><th>CORREO</th><th>ACCESO</th><th>ROL</th><th>ACCIONES</th></tr></thead>
      <tbody>{q.data.items.map((member) => <StaffRow key={`${member.id}-${member.role}-${member.customRoleId}-${member.active}-${member.invitationPending}`} member={member} options={member.role === "CUSTOM" && member.customRoleId && !options.some((option) => option.value === roleValue(member)) ? [...options, { value: roleValue(member), label: member.customRole?.name ?? "Rol personalizado" }] : options} ownId={user?.id} canEdit={canEdit && (!canViewRoles || !access.isPending && !access.error)} onUpdated={() => invalidateAdminMutation(client, `admin/staff/${member.id}/role`)} onReinvite={(item) => {
        setEmail(item.email); setRole(item.role === "CLIENT" ? "SALES" : roleValue(item)); setInvitation(null); setOpen(true);
      }} />)}</tbody></table></div> : <Empty title="No encontramos personal con esos filtros" />}
      <ListPagination meta={q.data.meta} onPage={setPage} />
    </>}
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
        <label className="field">Rol<select className="form-input" value={role} disabled={busy} onChange={(event) => setRole(event.target.value)}>{options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
        <div className="actions"><button className="button" disabled={busy}>{busy ? "Generando…" : "Generar enlace"}</button><button className="button secondary" type="button" onClick={close}>Cancelar</button></div>
      </form>}
      {error && <p className="error" role="alert">{error}</p>}
    </Modal>
  </section>;
}

export function AdminRoles() {
  const { user, notify } = useSession();
  const client = useQueryClient();
  const canEdit = canEditAdminFeature(user, "roles");
  const access = useApi<RoleAccess[]>("admin/staff/access");
  const [selectedRole, setSelectedRole] = useState("SALES");
  const [action, setAction] = useState<{ kind: "create" | "rename" | "duplicate" | "retire"; id?: string; name?: string } | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selectedAccess = access.data?.find((item) => roleValue({ role: item.role, customRoleId: item.id }) === selectedRole);
  const titles = { create: "Crear rol", rename: "Renombrar rol", duplicate: "Duplicar rol", retire: "Retirar rol" };
  function begin(kind: "create" | "rename" | "duplicate" | "retire") {
    setAction({ kind, id: selectedAccess?.id ?? undefined, name: selectedAccess?.name ?? undefined });
    setName(kind === "create" ? "" : kind === "duplicate" ? `${selectedAccess?.name ?? "Rol"} (copia)`.slice(0, 60) : selectedAccess?.name ?? "");
    setError("");
  }
  function close() { if (!busy) { setAction(null); setError(""); } }
  async function saveRole() {
    if (!action || busy) return;
    setBusy(true);
    setError("");
    try {
      const path = action.kind === "create" ? "admin/staff/roles" : `admin/staff/roles/${action.id}${action.kind === "duplicate" ? "/duplicate" : ""}`;
      const saved = await request<{ id: string; name: string }>(path, action.kind === "retire" ? "DELETE" : action.kind === "rename" ? "PATCH" : "POST", action.kind === "retire" ? undefined : { name: name.trim() });
      await access.refetch();
      await invalidateAdminMutation(client, "admin/staff/roles");
      await client.invalidateQueries({ queryKey: ["session"] });
      setSelectedRole(action.kind === "retire" ? "SALES" : `custom:${saved.id}`);
      setName("");
      setAction(null);
      notify(action.kind === "create" ? "Rol creado. Configurá sus permisos antes de asignarlo." : action.kind === "duplicate" ? "Rol duplicado con sus permisos." : action.kind === "retire" ? "Rol retirado. Su historial se conserva." : "Nombre del rol actualizado.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar el rol.");
    } finally { setBusy(false); }
  }
  return <section>
    <div className="admin-toolbar staff-access-toolbar"><h2>Permisos por rol</h2><div className="actions">
      <select className="form-input" aria-label="Rol a configurar" value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)}>
        {roleOptions(access.data).map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
      </select>
      {canEdit && <>
        {selectedAccess?.role === "CUSTOM" && <>
          <button className="icon-button" type="button" title="Renombrar rol" aria-label="Renombrar rol" onClick={() => begin("rename")}><Pencil size={17} /></button>
          <button className="icon-button" type="button" title="Duplicar rol" aria-label="Duplicar rol" onClick={() => begin("duplicate")}><CopyPlus size={17} /></button>
          <button className="icon-button" type="button" title={selectedAccess.assignedUsers ? "Reasigná sus usuarios antes de retirar el rol" : "Retirar rol"} aria-label="Retirar rol" disabled={!!selectedAccess.assignedUsers} onClick={() => begin("retire")}><Archive size={17} /></button>
        </>}
        <button className="button small" type="button" onClick={() => begin("create")}><Plus size={16} /> Crear rol</button>
      </>}
    </div></div>
    {selectedAccess?.role === "CUSTOM" && <p className="muted small-copy">{selectedAccess.assignedUsers ?? 0} usuarios asignados{selectedAccess.assignedUsers ? " · Reasignación requerida para retirar este rol" : ""}</p>}
    {access.isPending ? <Loading /> : access.error ? <ErrorBox error={access.error} retry={() => void access.refetch()} /> : selectedAccess ? (
      <RoleAccessEditor key={`${selectedRole}-${JSON.stringify(selectedAccess.access)}`} item={selectedAccess} canEdit={canEdit} onSaved={() => access.refetch()} />
    ) : <Empty title="No hay permisos configurados para este rol" />}
    <Modal open={!!action} onClose={close} title={action ? titles[action.kind] : "Rol"}>
      <form data-admin-save={action?.kind !== "retire" ? "true" : undefined} aria-busy={busy} className="stack" onSubmit={(event) => { event.preventDefault(); void saveRole(); }}>
        {action?.kind === "retire" ? <p>¿Retirar <strong>{action.name}</strong>? No podrá asignarse a nuevas cuentas. El historial y sus permisos originales se conservarán.</p> : <label className="field">Nombre del rol<input className="form-input" minLength={2} maxLength={60} required autoFocus value={name} disabled={busy} onChange={(event) => setName(event.target.value)} /></label>}
        {error && <p className="error" role="alert">{error}</p>}
        <div className="actions"><button type="submit" className="button" disabled={busy}>{busy ? "Guardando…" : action ? titles[action.kind] : "Guardar"}</button><button className="button secondary" type="button" disabled={busy} onClick={close}>Cancelar</button></div>
      </form>
    </Modal>
  </section>;
}
