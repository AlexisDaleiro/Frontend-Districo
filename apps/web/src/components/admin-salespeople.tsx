"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, Plus, Save, UserMinus } from "lucide-react";
import { AdminNav } from "./admin";
import { AccessGate } from "./auth";
import { request, useApi, useSession } from "./providers";
import { Empty, ErrorBox, Loading, Modal, PageHeading } from "./ui";
import { invalidateAdminMutation } from "@/lib/admin-query-invalidation";
import { label } from "@/lib/commerce";
import { canEditAdminFeature, canSeeAdminSection } from "@/lib/staff-access";
import { storeRoutes } from "@/lib/store-routes";
import type { Customer, SalespersonDetail, SalespersonSummary } from "@/lib/types";

type Page<T> = { items: T[]; meta: { total: number; page: number; limit: number } };

export function AdminSalespeople() {
  const { user, notify } = useSession();
  const canEdit = canEditAdminFeature(user, "vendedores");
  const canInvite = canEdit && canEditAdminFeature(user, "personal");
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [invitation, setInvitation] = useState<{ token: string; email: string; expiresAt: string } | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const q = useApi<Page<SalespersonSummary>>(`admin/salespeople?page=${page}&limit=20&search=${encodeURIComponent(debounced)}`);
  const invitationUrl = invitation && typeof window !== "undefined" ? `${window.location.origin}${storeRoutes.staffInvitation}#token=${encodeURIComponent(invitation.token)}` : "";
  function closeInvite() { setInviteOpen(false); setInvitation(null); setInviteError(""); setInviteEmail(""); setInviteName(""); setInvitePhone(""); }
  async function invite(event: React.FormEvent) {
    event.preventDefault();
    setInviteBusy(true);
    setInviteError("");
    try {
      const created = await request<{ id: string; token: string; email: string; expiresAt: string }>("admin/staff/invitations", "POST", { email: inviteEmail.trim(), role: "SALES" });
      setInvitation(created);
      await request(`admin/salespeople/${created.id}`, "PATCH", { name: inviteName.trim(), phone: invitePhone.trim() });
      await invalidateAdminMutation(client, "admin/salespeople");
      notify("Vendedor invitado. Compartí el enlace por privado.");
    } catch (cause) {
      setInviteError(cause instanceof Error ? cause.message : "No se pudo invitar al vendedor.");
      await invalidateAdminMutation(client, "admin/salespeople");
    } finally { setInviteBusy(false); }
  }
  if (q.isPending) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} retry={() => void q.refetch()} />;
  return <section>
    <div className="admin-toolbar">
      <h2>Vendedores</h2>
      <span className="muted small-copy">{q.data.meta.total} {q.data.meta.total === 1 ? "vendedor" : "vendedores"}</span>
      <input className="form-input" type="search" aria-label="Buscar vendedores" placeholder="Nombre, correo o teléfono" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
      {canInvite && <button className="button small" type="button" onClick={() => setInviteOpen(true)}><Plus size={16} /> Invitar vendedor</button>}
    </div>
    {q.data.items.length ? <div className="table-wrap"><table className="admin-salespeople-table"><thead><tr><th>VENDEDOR</th><th>CONTACTO</th><th>CLIENTES</th><th>ACCESO</th><th>ACCIÓN</th></tr></thead><tbody>
      {q.data.items.map((seller) => <tr key={seller.id}>
        <td><strong>{seller.profile?.name || "Ficha pendiente"}</strong><br /><span className="muted">{seller.email}</span></td>
        <td>{seller.profile?.phone || "Sin teléfono"}</td>
        <td>{seller.profile?.customerCount ?? 0}</td>
        <td><span className="status-pill">{seller.active ? "Activo" : seller.emailVerified ? "Desactivado" : "Invitación pendiente"}</span></td>
        <td><Link className="button small secondary" href={storeRoutes.adminSalesperson(seller.id)}>Ver ficha</Link></td>
      </tr>)}
    </tbody></table></div> : <Empty title={debounced ? "No hay vendedores con esa búsqueda" : "Todavía no hay vendedores"} />}
    {q.data.meta.total > q.data.meta.limit && <div className="admin-pagination">
      <button className="button small secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
      <span>Página {page} de {Math.ceil(q.data.meta.total / q.data.meta.limit)}</span>
      <button className="button small secondary" disabled={page * q.data.meta.limit >= q.data.meta.total} onClick={() => setPage(page + 1)}>Siguiente</button>
    </div>}
    <Modal open={inviteOpen} onClose={closeInvite} title={invitation ? "Compartir invitación" : "Invitar vendedor"}>
      {invitation ? <div className="stack">
        <p>Compartí este enlace con <strong>{invitation.email}</strong> por un canal privado. Vence el {new Date(invitation.expiresAt).toLocaleString("es-UY")}; sólo se puede usar una vez.</p>
        <label className="field">Enlace de activación<input className="form-input" readOnly value={invitationUrl} onFocus={(event) => event.target.select()} /></label>
        <div className="actions"><button className="button" type="button" onClick={async () => {
          try { await navigator.clipboard.writeText(invitationUrl); notify("Enlace copiado."); }
          catch { setInviteError("No se pudo copiar automáticamente. Seleccioná y copiá el enlace."); }
        }}><Copy size={16} /> Copiar enlace</button><button className="button secondary" type="button" onClick={closeInvite}>Cerrar</button></div>
      </div> : <form className="stack" onSubmit={(event) => void invite(event)}>
        <label className="field">Nombre del vendedor<input className="form-input" required minLength={2} maxLength={100} value={inviteName} disabled={inviteBusy} onChange={(event) => setInviteName(event.target.value)} /></label>
        <label className="field">Correo electrónico<input className="form-input" type="email" required autoComplete="off" value={inviteEmail} disabled={inviteBusy} onChange={(event) => setInviteEmail(event.target.value)} /></label>
        <label className="field">Número de contacto<input className="form-input" type="tel" required pattern="(?=(?:[^0-9]*[0-9]){6})[+]?[0-9 ().-]{6,30}" value={invitePhone} disabled={inviteBusy} onChange={(event) => setInvitePhone(event.target.value)} /></label>
        <div className="actions"><button className="button" disabled={inviteBusy}>{inviteBusy ? "Generando…" : "Generar enlace"}</button><button className="button secondary" type="button" onClick={closeInvite}>Cancelar</button></div>
      </form>}
      {inviteError && <p className="error" role="alert">{inviteError}</p>}
    </Modal>
  </section>;
}

function ProfileForm({ seller, onSaved, canEdit }: { seller: SalespersonDetail; onSaved: () => Promise<void>; canEdit: boolean }) {
  const [name, setName] = useState(seller.profile?.name ?? "");
  const [phone, setPhone] = useState(seller.profile?.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const { notify } = useSession();
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await request(`admin/salespeople/${seller.id}`, "PATCH", { name: name.trim(), phone: phone.trim() });
      await onSaved();
      notify("Ficha del vendedor guardada.");
    } catch (cause) { setError(cause); }
    finally { setBusy(false); }
  }
  return <form data-admin-save={canEdit ? "true" : undefined} aria-busy={busy} className="admin-salesperson-profile" onSubmit={(event) => void save(event)}>
    <label className="field">Nombre del vendedor<input className="form-input" required minLength={2} maxLength={100} value={name} readOnly={!canEdit} onChange={(event) => setName(event.target.value)} /></label>
    <label className="field">Número de contacto<input className="form-input" type="tel" required pattern="(?=(?:[^0-9]*[0-9]){6})[+]?[0-9 ().-]{6,30}" value={phone} readOnly={!canEdit} onChange={(event) => setPhone(event.target.value)} /></label>
    <label className="field">Correo de acceso<input className="form-input" type="email" readOnly value={seller.email} /></label>
    {canEdit && <div className="actions"><button className="button small" disabled={busy || (name.trim() === (seller.profile?.name ?? "") && phone.trim() === (seller.profile?.phone ?? ""))}><Save size={16} /> {busy ? "Guardando…" : "Guardar ficha"}</button></div>}
    {error !== undefined && <ErrorBox error={error} />}
  </form>;
}

function CustomerPicker({ seller, onClose, onSaved }: { seller: SalespersonDetail; onClose: () => void; onSaved: () => Promise<void> }) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const { notify } = useSession();
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const q = useApi<Page<Customer>>(`admin/customers/page?page=${page}&limit=10&search=${encodeURIComponent(debounced)}`);
  async function assign() {
    if (!selected) return;
    setBusy(true);
    setError(undefined);
    try {
      await request(`admin/salespeople/${seller.id}/customers`, "POST", { customerId: selected.id });
      await onSaved();
      notify(selected.salesperson ? "Cliente reasignado." : "Cliente asignado.");
      onClose();
    } catch (cause) { setError(cause); }
    finally { setBusy(false); }
  }
  return <div className="stack">
    <label className="field">Buscar cliente<input className="form-input" type="search" placeholder="Comercio, RUT o correo" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); setSelected(null); }} /></label>
    {q.isPending ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={() => void q.refetch()} /> : <>
      <div className="admin-salesperson-picker">
        {q.data.items.filter((customer) => customer.salesperson?.userId !== seller.id).map((customer) => <button key={customer.id} type="button" className={selected?.id === customer.id ? "selected" : ""} onClick={() => setSelected(customer)}>
          <strong>{customer.businessName}</strong><span>{customer.rut} · {customer.users?.[0]?.email ?? "Sin correo"}</span>
          <span className="muted">{customer.salesperson ? `Actual: ${customer.salesperson.name}` : "Sin vendedor"}</span>
        </button>)}
        {!q.data.items.some((customer) => customer.salesperson?.userId !== seller.id) && <p className="muted">No hay clientes disponibles en esta página.</p>}
      </div>
      {q.data.meta.total > q.data.meta.limit && <div className="admin-pagination"><button className="button small secondary" disabled={page <= 1} onClick={() => { setPage(page - 1); setSelected(null); }}>Anterior</button><span>Página {page}</span><button className="button small secondary" disabled={page * q.data.meta.limit >= q.data.meta.total} onClick={() => { setPage(page + 1); setSelected(null); }}>Siguiente</button></div>}
    </>}
    {selected && <p className="small-copy">{selected.salesperson ? `${selected.businessName} dejará de estar asignado a ${selected.salesperson.name}.` : `${selected.businessName} quedará a cargo de ${seller.profile?.name}.`}</p>}
    <div className="actions"><button className="button small" type="button" disabled={!selected || busy} onClick={() => void assign()}>{busy ? "Asignando…" : selected?.salesperson ? "Confirmar reasignación" : "Asignar cliente"}</button><button className="button small secondary" type="button" onClick={onClose}>Cancelar</button></div>
    {error !== undefined && <ErrorBox error={error} />}
  </div>;
}

export function AdminSalespersonPage({ id }: { id: string }) {
  const { user, notify } = useSession();
  const client = useQueryClient();
  const canView = canSeeAdminSection(user, "vendedores");
  const canEdit = canEditAdminFeature(user, "vendedores");
  const q = useApi<SalespersonDetail>(`admin/salespeople/${id}`, canView);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [removing, setRemoving] = useState<SalespersonDetail["customers"][number] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const refresh = async () => { await invalidateAdminMutation(client, `admin/salespeople/${id}`); };
  async function unassign() {
    if (!removing) return;
    setBusy(true);
    setError(undefined);
    try {
      await request(`admin/salespeople/${id}/customers/${removing.id}`, "DELETE");
      await refresh();
      setRemoving(null);
      notify("Cliente desvinculado del vendedor.");
    } catch (cause) { setError(cause); }
    finally { setBusy(false); }
  }
  const seller = q.data;
  return <div className="container admin-page section"><AccessGate admin><div className="admin-shell">
    <AdminNav section="vendedores" email={user?.email} />
    <main className="admin-main admin-record-page">
      {!canView ? <Empty title="No tenés acceso a esta sección" /> : q.isPending ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={() => void q.refetch()} /> : seller ? <>
        <Link className="text-link admin-product-back" href={storeRoutes.adminSection("vendedores")}><ArrowLeft size={17} /> Volver a vendedores</Link>
        <PageHeading eyebrow="DISTRICO · Administración" title={seller.profile?.name || "Ficha del vendedor"}>{seller.email}</PageHeading>
        <div className="admin-record-summary">
          <div><span>Cuenta</span><strong>{seller.active ? "Activa" : seller.emailVerified ? "Desactivada" : "Invitación pendiente"}</strong></div>
          <div><span>Teléfono</span><strong>{seller.profile?.phone || "Sin registrar"}</strong></div>
          <div><span>Clientes</span><strong>{seller.customers.length}</strong></div>
        </div>
        <section className="admin-record-section"><h2>Datos del vendedor</h2><ProfileForm key={`${seller.id}-${seller.profile?.name}-${seller.profile?.phone}`} seller={seller} canEdit={canEdit} onSaved={refresh} /></section>
        <section className="admin-record-section"><div className="admin-toolbar"><h2>Clientes gestionados</h2>
          {canEdit && <button className="button small" type="button" disabled={!seller.profile || !seller.active || !seller.emailVerified} onClick={() => setPickerOpen(true)}><Plus size={16} /> Asignar cliente</button>}
        </div>
        {!seller.profile && <p className="muted">Completá nombre y teléfono para asignar clientes.</p>}
        {seller.profile && !seller.active && <p className="muted">La cuenta debe estar activa para recibir clientes.</p>}
        {seller.customers.length ? <div className="table-wrap"><table><thead><tr><th>CLIENTE</th><th>CORREO</th><th>CUENTA</th><th>ACCIÓN</th></tr></thead><tbody>{seller.customers.map((customer) => <tr key={customer.id}>
          <td><Link className="text-link" href={storeRoutes.adminCustomer(customer.id)}>{customer.businessName}</Link><br /><span className="muted">{customer.rut}</span></td>
          <td>{customer.users[0]?.email ?? "Sin correo"}</td><td>{label(customer.accountStatus)}</td>
          <td>{canEdit && <button className="icon-button" type="button" title="Quitar asignación" aria-label={`Quitar ${customer.businessName}`} onClick={() => setRemoving(customer)}><UserMinus size={17} /></button>}</td>
        </tr>)}</tbody></table></div> : <p className="muted">Todavía no tiene clientes asignados.</p>}
        </section>
        <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Asignar cliente">{pickerOpen && seller.profile && <CustomerPicker seller={seller} onClose={() => setPickerOpen(false)} onSaved={refresh} />}</Modal>
        <Modal open={!!removing} onClose={() => setRemoving(null)} title="Quitar asignación"><p>¿Dejar a {removing?.businessName} sin vendedor responsable?</p><div className="actions"><button className="button small" disabled={busy} onClick={() => void unassign()}>{busy ? "Quitando…" : "Quitar asignación"}</button><button className="button small secondary" onClick={() => setRemoving(null)}>Cancelar</button></div>{error !== undefined && <ErrorBox error={error} />}</Modal>
      </> : <Empty title="Vendedor no encontrado" />}
    </main>
  </div></AccessGate></div>;
}
