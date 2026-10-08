"use client";

import { useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, History, RefreshCw, X } from "lucide-react";
import { request, useApi, useSession } from "./providers";
import { ErrorBox, Modal } from "./ui";
import { invalidateAdminMutation } from "@/lib/admin-query-invalidation";
import type { BulkHistoryRecord, BulkPreview, BulkResult } from "@/lib/admin-tools";

export function useAdminSelection() {
  const [selected, setSelected] = useState<Record<string, string>>({});
  const ids = Object.keys(selected);
  const toggle = (id: string, name: string) => setSelected((current) => {
    if (id in current) { const next = { ...current }; delete next[id]; return next; }
    return Object.keys(current).length < 100 ? { ...current, [id]: name } : current;
  });
  const togglePage = (rows: { id: string; name: string }[]) => setSelected((current) => {
    const next = { ...current };
    if (rows.every((row) => row.id in current)) for (const row of rows) delete next[row.id];
    else for (const row of rows) { if (Object.keys(next).length >= 100) break; next[row.id] = row.name; }
    return next;
  });
  return { selected, ids, toggle, togglePage, clear: () => setSelected({}) };
}
export type AdminSelection = ReturnType<typeof useAdminSelection>;

export function PageSelection({ selection, rows }: { selection: AdminSelection; rows: { id: string; name: string }[] }) {
  const ref = useRef<HTMLInputElement>(null);
  const count = rows.filter((row) => row.id in selection.selected).length;
  return <input ref={(element) => { ref.current = element; if (element) element.indeterminate = count > 0 && count < rows.length; }} type="checkbox"
    aria-label="Seleccionar esta página" checked={rows.length > 0 && count === rows.length} disabled={!rows.length || (selection.ids.length >= 100 && count === 0)}
    onChange={() => selection.togglePage(rows)} />;
}
export function RowSelection({ selection, id, name }: { selection: AdminSelection; id: string; name: string }) {
  return <input type="checkbox" aria-label={`Seleccionar ${name}`} checked={id in selection.selected} disabled={selection.ids.length >= 100 && !(id in selection.selected)} onChange={() => selection.toggle(id, name)} />;
}

type Seller = { id: string; email: string; active: boolean; emailVerified: boolean; profile: { name: string } | null };
function SellerPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useApi<{ items: Seller[]; meta: { total: number; limit: number } }>(`admin/salespeople?limit=20&page=${page}&search=${encodeURIComponent(search)}`);
  return <div className="stack">
    <label className="field">Buscar vendedor<input className="form-input" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
    {q.isPending ? <p role="status">Cargando vendedores…</p> : q.error ? <ErrorBox error={q.error} retry={() => void q.refetch()} /> : <>
      <div className="admin-seller-options">{q.data.items.filter((item) => item.active && item.emailVerified && item.profile).map((item) => <label key={item.id} className="check-field">
        <input type="radio" name="bulk-salesperson" value={item.id} checked={value === item.id} onChange={() => onChange(item.id)} />{item.profile!.name} · {item.email}
      </label>)}</div>
      {!q.data.items.some((item) => item.active && item.emailVerified && item.profile) && <p className="muted">No hay vendedores activos en esta página.</p>}
      {q.data.meta.total > q.data.meta.limit && <div className="actions"><button className="button small secondary" type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {page}</span><button className="button small secondary" type="button" disabled={page * q.data.meta.limit >= q.data.meta.total} onClick={() => setPage(page + 1)}>Siguiente</button></div>}
    </>}
  </div>;
}

export function BulkHistory({ feature }: { feature: "catalogo" | "vendedores" }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const q = useApi<{ items: BulkHistoryRecord[]; meta: { total: number; limit: number } }>(`admin/bulk/history?feature=${feature}&page=${page}&limit=10`, open);
  const titles: Record<string, string> = { ADMIN_BULK_PRODUCTS_ACTIVE: "Estado de productos", ADMIN_BULK_PRODUCTS_PRICES: "Precios", ADMIN_BULK_CUSTOMERS_SALESPERSON: "Asignación de clientes" };
  return <>
    <button className="button small secondary" type="button" onClick={() => setOpen(true)}><History size={16} />Historial de lotes</button>
    <Modal open={open} onClose={() => setOpen(false)} title="Historial de acciones por lote" className="admin-bulk-dialog">
      {q.isPending ? <p role="status">Cargando historial…</p> : q.error ? <ErrorBox error={q.error} retry={() => void q.refetch()} /> : q.data.items.length ? <>
        {q.data.items.map((item) => <details className="admin-bulk-history" key={item.id}><summary><strong>{titles[item.action] ?? item.action}</strong> · {item.metadata.changed} cambios · {new Date(item.createdAt).toLocaleString("es-UY")}</summary>
          <p className="small-copy">{item.user?.email ?? "Sin responsable"} · {item.metadata.reason}</p><PreviewTable preview={item.metadata} />
        </details>)}
        <div className="actions"><button className="button small secondary" type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {page}</span><button className="button small secondary" type="button" disabled={page * q.data.meta.limit >= q.data.meta.total} onClick={() => setPage(page + 1)}>Siguiente</button></div>
      </> : <p className="muted">Todavía no hay acciones por lote.</p>}
    </Modal>
  </>;
}

function PreviewTable({ preview }: { preview: Pick<BulkPreview, "entries"> }) {
  return <div className="table-wrap admin-bulk-preview"><table><thead><tr><th>REGISTRO</th><th>ANTES</th><th>DESPUÉS</th></tr></thead><tbody>
    {preview.entries.map((entry) => <tr data-bulk-entry="true" key={entry.id}><td>{entry.name}{!entry.changed && <small className="muted"> · Sin cambio</small>}</td><td>{entry.before}</td><td>{entry.after}</td></tr>)}
  </tbody></table></div>;
}

export function AdminBulkActions({ kind, selection }: { kind: "products" | "customers"; selection: AdminSelection }) {
  const [operation, setOperation] = useState<"active" | "inactive" | "prices" | "salesperson" | null>(null);
  const [mode, setMode] = useState("PERCENTAGE");
  const [value, setValue] = useState("");
  const [seller, setSeller] = useState("");
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<BulkPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const requestId = useRef("");
  const client = useQueryClient();
  const { notify } = useSession();
  const path = operation === "salesperson" ? "admin/bulk/customers/salesperson" : operation === "prices" ? "admin/bulk/products/prices" : "admin/bulk/products/active";
  const titles = { active: "Activar productos", inactive: "Desactivar productos", prices: "Actualizar precios", salesperson: "Reasignar clientes" };
  function begin(next: typeof operation) { setOperation(next); setPreview(null); setError(undefined); setReason(""); setValue(""); setSeller(""); requestId.current = crypto.randomUUID(); }
  function close() { if (!busy) setOperation(null); }
  function changed() { setPreview(null); setError(undefined); requestId.current = crypto.randomUUID(); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(undefined); setBusy(true);
    const body = { ids: selection.ids, reason: reason.trim(), requestId: requestId.current,
      ...(operation === "salesperson" ? { salespersonUserId: seller } : operation === "prices" ? { mode, value: Number(value) } : { active: operation === "active" }) };
    let applied = false;
    try {
      if (!preview) { setPreview(await request<BulkPreview>(`${path}/preview`, "POST", body)); return; }
      const result = await request<BulkResult>(path, "POST", { ...body, previewToken: preview.token });
      applied = true;
      setOperation(null); selection.clear();
      notify(`Lote guardado: ${result.changed} cambios.`);
      await invalidateAdminMutation(client, path);
    } catch (cause) {
      if (applied) notify("Lote guardado. Actualizá el listado para ver los cambios.");
      else setError(cause);
    } finally { setBusy(false); }
  }
  return <>
    <div className="admin-bulk-toolbar" aria-label="Acciones por lote">
      <strong>{selection.ids.length} seleccionados</strong>
      <div className="actions">
        {kind === "products" ? <>
          <button className="button small secondary" type="button" disabled={!selection.ids.length} onClick={() => begin("active")}><Check size={16} />Activar</button>
          <button className="button small secondary" type="button" disabled={!selection.ids.length} onClick={() => begin("inactive")}><X size={16} />Desactivar</button>
          <button className="button small secondary" type="button" disabled={!selection.ids.length} onClick={() => begin("prices")}><RefreshCw size={16} />Actualizar precios</button>
        </> : <button className="button small secondary" type="button" disabled={!selection.ids.length} onClick={() => begin("salesperson")}><RefreshCw size={16} />Reasignar vendedor</button>}
        <button className="icon-button" type="button" title="Limpiar selección" aria-label="Limpiar selección" disabled={!selection.ids.length} onClick={selection.clear}><X size={16} /></button>
      </div>
    </div>
    <Modal open={operation !== null} onClose={close} title={operation ? titles[operation] : "Acción por lote"} className="admin-bulk-dialog">
      {operation && <form className="stack" onSubmit={(event) => void submit(event)}>
        <p><strong>{selection.ids.length} {kind === "products" ? "productos" : "clientes"}</strong> seleccionados.</p>
        <fieldset disabled={busy || !!preview} className="admin-bulk-fields">
          {operation === "prices" && <div className="form-grid">
            <label className="field">Tipo de ajuste<select value={mode} onChange={(event) => { setMode(event.target.value); changed(); }}><option value="PERCENTAGE">Variación porcentual</option><option value="FIXED">Precio fijo por presentación (UYU)</option></select></label>
            <label className="field">{mode === "PERCENTAGE" ? "Porcentaje (+ aumento / - descuento)" : "Nuevo precio para cada presentación"}<input type="number" required min={mode === "PERCENTAGE" ? "-99.99" : "0.01"} max={mode === "PERCENTAGE" ? "1000" : "9999999999.99"} step="0.01" value={value} onChange={(event) => { setValue(event.target.value); changed(); }} /></label>
            <p className="small-copy span-2">Lista Mayorista Districo · UYU · Presentaciones activas</p>
          </div>}
          {operation === "salesperson" && <SellerPicker value={seller} onChange={(id) => { setSeller(id); changed(); }} />}
          <label className="field">Motivo del cambio<textarea required minLength={3} maxLength={500} value={reason} onChange={(event) => { setReason(event.target.value); changed(); }} /></label>
        </fieldset>
        {preview ? <><p><strong>{preview.changed} cambios</strong> para confirmar.</p><PreviewTable preview={preview} /></> : <div className="admin-bulk-names">{selection.ids.map((id) => <span key={id}>{selection.selected[id]}</span>)}</div>}
        {error !== undefined && <ErrorBox error={error} />}
        <div className="actions">
          <button className="button" type="submit" disabled={busy || !selection.ids.length || (operation === "salesperson" && !seller) || (!!preview && preview.changed === 0)}>
            {busy ? "Procesando…" : preview ? "Confirmar cambios" : "Revisar cambios"}
          </button>
          {preview && <button className="button secondary" type="button" disabled={busy} onClick={changed}>Volver a revisar</button>}
          <button className="button secondary" type="button" disabled={busy} onClick={close}>Cancelar</button>
        </div>
      </form>}
    </Modal>
  </>;
}
