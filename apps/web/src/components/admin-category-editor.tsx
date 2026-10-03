"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { request, useApi, useSession } from "./providers";
import { Empty, ErrorBox, Loading } from "./ui";
import { invalidateAdminMutation } from "@/lib/admin-query-invalidation";
import type { Entity } from "@/lib/types";

type CategoryProduct = { id: string; name: string; slug: string; active: boolean; brand?: { name: string } | null };
type ProductPage = { items: CategoryProduct[]; meta: { total: number; page: number; limit: number } };

export function AdminCategoryEditor({ category, parentOptions, onClose, onRenamed }: {
  category: Entity; parentOptions: Entity[]; onClose: () => void; onRenamed: (name: string) => void;
}) {
  const [name, setName] = useState(category.name);
  const [slug, setSlug] = useState(category.slug ?? "");
  const [parentId, setParentId] = useState(category.parentId ?? "");
  const [active, setActive] = useState(category.active !== false);
  const [linkedSearch, setLinkedSearch] = useState("");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [linkedTerm, setLinkedTerm] = useState("");
  const [candidateTerm, setCandidateTerm] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const client = useQueryClient();
  const { notify } = useSession();

  useEffect(() => {
    const timer = setTimeout(() => setLinkedTerm(linkedSearch.trim()), 250);
    return () => clearTimeout(timer);
  }, [linkedSearch]);
  useEffect(() => {
    const timer = setTimeout(() => setCandidateTerm(candidateSearch.trim()), 250);
    return () => clearTimeout(timer);
  }, [candidateSearch]);
  const linked = useApi<ProductPage>(`categories/admin/${category.id}/products?page=${page}&limit=10&search=${encodeURIComponent(linkedTerm)}`);
  const candidates = useApi<ProductPage>(`categories/admin/${category.id}/candidates?limit=20&search=${encodeURIComponent(candidateTerm)}`, candidateTerm.length >= 2);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) { setError(new Error("Ingresá el nombre de la categoría.")); return; }
    setBusy(true);
    setError(undefined);
    try {
      await request(`categories/${category.id}`, "PATCH", { name: name.trim(), slug: slug.trim() || undefined, parentId: parentId || null, active });
      await invalidateAdminMutation(client, `categories/${category.id}`);
      onRenamed(name.trim());
      notify("Categoría actualizada.");
    } catch (cause) { setError(cause); }
    finally { setBusy(false); }
  }

  async function changeProduct(product: CategoryProduct, add: boolean) {
    if (!add && !window.confirm(`¿Quitar ${product.name} de ${name}? El producto seguirá en el catálogo.`)) return;
    setBusy(true);
    setError(undefined);
    try {
      const path = `categories/${category.id}/products`;
      await request(add ? path : `${path}/${product.id}`, add ? "POST" : "DELETE", add ? { productId: product.id } : undefined);
      if (!add && linked.data?.items.length === 1 && page > 1) setPage(page - 1);
      await invalidateAdminMutation(client, path);
      notify(add ? "Producto agregado a la categoría." : "Producto quitado de la categoría.");
    } catch (cause) { setError(cause); }
    finally { setBusy(false); }
  }

  return <div className="admin-category-editor">
    <form onSubmit={(event) => void save(event)} className="form-grid">
      <label className="field">Nombre *<input value={name} onChange={(event) => setName(event.target.value)} required /></label>
      <label className="field">Identificador en la URL<input value={slug} onChange={(event) => setSlug(event.target.value)} /></label>
      <label className="field">Categoría superior<select value={parentId} onChange={(event) => setParentId(event.target.value)}>
        <option value="">Sin categoría superior</option>
        {parentOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
      <label className="check-field"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /> Visible en la tienda</label>
      <div className="actions span-2"><button className="button small" disabled={busy}>{busy ? "Guardando…" : "Guardar categoría"}</button><button className="button small secondary" type="button" onClick={onClose}>Cerrar</button></div>
    </form>
    <section className="admin-category-products">
      <div className="admin-toolbar"><h3>Productos asignados</h3><span className="muted small-copy">{linkedTerm ? `${linked.data?.meta.total ?? 0} resultados` : `${linked.data?.meta.total ?? 0} productos`}</span></div>
      <input className="form-input" type="search" aria-label="Buscar productos asignados" placeholder="Buscar por nombre o SKU" value={linkedSearch} onChange={(event) => { setLinkedSearch(event.target.value); setPage(1); }} />
      {linked.isPending ? <Loading /> : linked.error ? <ErrorBox error={linked.error} retry={() => void linked.refetch()} /> : linked.data.items.length ? <>
        <ul className="admin-category-product-list">{linked.data.items.map((product) => <li key={product.id}>
          <span><strong>{product.name}</strong>{product.brand?.name && <small>{product.brand.name}</small>}{!product.active && <small>Inactivo</small>}</span>
          <button className="icon-button" type="button" title={`Quitar ${product.name} de la categoría`} aria-label={`Quitar ${product.name} de la categoría`} disabled={busy} onClick={() => void changeProduct(product, false)}><Trash2 size={16} /></button>
        </li>)}</ul>
        {linked.data.meta.total > linked.data.meta.limit && <div className="actions admin-category-pagination">
          <button className="button small secondary" type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
          <span className="small-copy">Página {page} de {Math.ceil(linked.data.meta.total / linked.data.meta.limit)}</span>
          <button className="button small secondary" type="button" disabled={page * linked.data.meta.limit >= linked.data.meta.total} onClick={() => setPage(page + 1)}>Siguiente</button>
        </div>}
      </> : <Empty title="No hay productos asignados" />}
    </section>
    <section className="admin-category-products">
      <h3>Agregar productos</h3>
      <input className="form-input" type="search" aria-label="Buscar productos para agregar" placeholder="Buscar por nombre o SKU" value={candidateSearch} onChange={(event) => setCandidateSearch(event.target.value)} />
      {candidateTerm.length < 2 ? null : candidates.isPending ? <Loading /> : candidates.error ? <ErrorBox error={candidates.error} retry={() => void candidates.refetch()} /> : candidates.data?.items.length ? <>
        <ul className="admin-category-product-list">{candidates.data.items.map((product) => <li key={product.id}>
          <span><strong>{product.name}</strong>{product.brand?.name && <small>{product.brand.name}</small>}{!product.active && <small>Inactivo</small>}</span>
          <button className="icon-button" type="button" title={`Agregar ${product.name} a la categoría`} aria-label={`Agregar ${product.name} a la categoría`} disabled={busy} onClick={() => void changeProduct(product, true)}><Plus size={16} /></button>
        </li>)}</ul>
        {candidates.data.meta.total > candidates.data.meta.limit && <p className="muted small-copy">Mostrando los primeros {candidates.data.meta.limit} resultados. Refiná la búsqueda.</p>}
      </> : <Empty title="No hay productos para agregar" />}
    </section>
    {error !== undefined && <ErrorBox error={error} />}
  </div>;
}
