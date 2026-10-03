"use client";

import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { request, useApi, useSession } from "./providers";
import { invalidateAdminMutation } from "@/lib/admin-query-invalidation";
import { ErrorBox, Loading, Modal, Picture } from "./ui";
import { canEditAdminFeature } from "@/lib/staff-access";

export type StoreBanner = {
  id: string;
  title: string;
  subtitle?: string | null;
  actionLabel: string;
  href: string;
  alt: string;
  imageUrl: string;
  mobileImageUrl?: string | null;
  position: number;
  active: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
};

type Draft = {
  title: string; subtitle: string; actionLabel: string; href: string; alt: string;
  position: number; active: boolean; startsAt: string; endsAt: string;
};
const blank: Draft = { title: "", subtitle: "", actionLabel: "Ver productos", href: "/tienda/productos", alt: "", position: 0, active: true, startsAt: "", endsAt: "" };
const localDate = (value?: string | null) => value
  ? new Date(value).toLocaleString("sv-SE", { timeZone: "America/Montevideo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(" ", "T")
  : "";

export function AdminBanners() {
  const q = useApi<StoreBanner[]>("admin/banners");
  const client = useQueryClient();
  const { notify, user } = useSession();
  const canEdit = canEditAdminFeature(user, "banners");
  const [editing, setEditing] = useState<StoreBanner | "new" | null>(null);
  const [deleting, setDeleting] = useState<StoreBanner | null>(null);
  const [draft, setDraft] = useState<Draft>(blank);
  const [desktop, setDesktop] = useState<File | null>(null);
  const [mobile, setMobile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();

  function open(banner?: StoreBanner) {
    setEditing(banner ?? "new");
    setDraft(banner ? {
      title: banner.title, subtitle: banner.subtitle ?? "", actionLabel: banner.actionLabel,
      href: banner.href, alt: banner.alt, position: banner.position, active: banner.active,
      startsAt: localDate(banner.startsAt), endsAt: localDate(banner.endsAt),
    } : blank);
    setDesktop(null);
    setMobile(null);
    setError(undefined);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setError(undefined);
    if (editing === "new" && !desktop) {
      setError(new Error("Adjuntá una imagen de escritorio."));
      return;
    }
    if ([desktop, mobile].some((file) => file && (file.size === 0 || file.size > 5_000_000))) {
      setError(new Error("Cada imagen debe pesar menos de 5 MB."));
      return;
    }
    const form = new FormData();
    form.set("title", draft.title.trim());
    form.set("subtitle", draft.subtitle.trim());
    form.set("actionLabel", draft.actionLabel.trim());
    form.set("href", draft.href.trim());
    form.set("alt", draft.alt.trim());
    form.set("position", String(draft.position));
    form.set("active", String(draft.active));
    form.set("startsAt", draft.startsAt ? new Date(draft.startsAt).toISOString() : "");
    form.set("endsAt", draft.endsAt ? new Date(draft.endsAt).toISOString() : "");
    if (desktop) form.set("desktop", desktop);
    if (mobile) form.set("mobile", mobile);
    setBusy(true);
    try {
      await request(editing === "new" ? "admin/banners" : `admin/banners/${editing.id}`, editing === "new" ? "POST" : "PATCH", form);
      await invalidateAdminMutation(client, "admin/banners");
      setEditing(null);
      notify("Banner guardado.");
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setError(undefined);
    try {
      await request(`admin/banners/${deleting.id}`, "DELETE");
      await invalidateAdminMutation(client, "admin/banners");
      setDeleting(null);
      notify("Banner eliminado.");
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }

  if (q.isPending) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} retry={() => void q.refetch()} />;
  return <>
    <div className="admin-toolbar">
      <h2>Banners de la tienda</h2>
      {canEdit && <button className="button small" onClick={() => open()}><Plus size={16} /> Nuevo banner</button>}
    </div>
    {q.data.length ? <div className="table-wrap"><table><thead><tr><th>IMAGEN</th><th>CONTENIDO</th><th>DESTINO</th><th>ESTADO</th><th>ACCIONES</th></tr></thead><tbody>
      {q.data.map((banner) => <tr key={banner.id}>
        <td><Picture src={banner.imageUrl} alt={banner.alt} className="admin-banner-thumb" sizes="180px" /></td>
        <td><strong>{banner.title}</strong><p className="small-copy muted">Orden {banner.position}{banner.mobileImageUrl ? " · Móvil" : ""}</p></td>
        <td><span className="small-copy">{banner.href}</span></td>
        <td><span className="status-pill">{banner.active ? "Activo" : "Inactivo"}</span></td>
        <td>{canEdit && <div className="actions">
          <button className="icon-button" title="Editar banner" aria-label={`Editar ${banner.title}`} onClick={() => open(banner)}><Pencil size={17} /></button>
          <button className="icon-button" title="Eliminar banner" aria-label={`Eliminar ${banner.title}`} onClick={() => { setError(undefined); setDeleting(banner); }}><Trash2 size={17} /></button>
        </div>}</td>
      </tr>)}
    </tbody></table></div> : <p className="muted">Todavía no hay banners cargados. La tienda muestra los actuales hasta que publiques el primero.</p>}
    <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Nuevo banner" : "Editar banner"}>
      <form className="stack admin-banner-form" onSubmit={(event) => void save(event)}>
        <label className="field">Título<input className="form-input" required maxLength={120} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
        <label className="field">Texto secundario<input className="form-input" maxLength={240} value={draft.subtitle} onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })} /></label>
        <div className="form-grid">
          <label className="field">Texto del botón<input className="form-input" required maxLength={50} value={draft.actionLabel} onChange={(event) => setDraft({ ...draft, actionLabel: event.target.value })} /></label>
          <label className="field">Destino en la tienda<input className="form-input" required pattern="/tienda(/.*)?" value={draft.href} onChange={(event) => setDraft({ ...draft, href: event.target.value })} /></label>
        </div>
        <label className="field">Descripción de la imagen<input className="form-input" required maxLength={200} value={draft.alt} onChange={(event) => setDraft({ ...draft, alt: event.target.value })} /></label>
        <div className="form-grid">
          <label className="field"><ImagePlus size={16} /> Imagen de escritorio {editing === "new" ? "*" : ""}<input className="form-input" type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" required={editing === "new"} onChange={(event) => setDesktop(event.target.files?.[0] ?? null)} /></label>
          <label className="field"><ImagePlus size={16} /> Imagen para móvil<input className="form-input" type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" onChange={(event) => setMobile(event.target.files?.[0] ?? null)} /></label>
        </div>
        <div className="form-grid">
          <label className="field">Orden<input className="form-input" type="number" min={0} max={1000} value={draft.position} onChange={(event) => setDraft({ ...draft, position: Number(event.target.value) })} /></label>
          <label className="check-field"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} /> Activo</label>
          <label className="field">Publicar desde<input className="form-input" type="datetime-local" value={draft.startsAt} onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })} /></label>
          <label className="field">Publicar hasta<input className="form-input" type="datetime-local" value={draft.endsAt} onChange={(event) => setDraft({ ...draft, endsAt: event.target.value })} /></label>
        </div>
        {error !== undefined && <ErrorBox error={error} />}
        <div className="actions"><button className="button small" type="submit" disabled={busy}><Save size={16} /> Guardar</button><button className="button small secondary" type="button" onClick={() => setEditing(null)}>Cancelar</button></div>
      </form>
    </Modal>
    <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Eliminar banner">
      <p>Se quitará {deleting?.title} de la tienda.</p>
      {error !== undefined && <ErrorBox error={error} />}
      <div className="actions"><button className="button danger small" disabled={busy} onClick={() => void remove()}>Eliminar</button><button className="button secondary small" onClick={() => setDeleting(null)}>Cancelar</button></div>
    </Modal>
  </>;
}
