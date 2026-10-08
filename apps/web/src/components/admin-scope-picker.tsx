"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useApi } from "./providers";
import { ErrorBox } from "./ui";
import type { Entity, ProductList } from "@/lib/types";

export type ScopeSelection<T extends string> = { type: T; ids: string[] };

export function AdminScopePicker<T extends string>({ legend, name, scopes, selection, onChange, savedNames, disabled }: {
  legend: string; name: string; scopes: { value: T; label: string }[]; selection: ScopeSelection<T>;
  onChange: (next: ScopeSelection<T>) => void; savedNames?: Entity[]; disabled: boolean;
}) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [names, setNames] = useState<Record<string, string>>(() => Object.fromEntries(savedNames?.map((item) => [item.id, item.name]) ?? []));
  const products = useApi<ProductList>(`products?limit=20&page=${page}&search=${encodeURIComponent(query)}`, selection.type === "PRODUCT");
  const entities = useApi<Entity[]>(selection.type === "BRAND" ? "brands" : selection.type === "CATEGORY" ? "categories/catalog" : "laboratories", selection.type !== "PRODUCT");
  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  const byId = new Map(entities.data?.map((item) => [item.id, item]) ?? []);
  function categoryName(item: Entity) {
    const parts = [item.name], visited = new Set([item.id]);
    let parent = item.parentId ? byId.get(item.parentId) : undefined;
    while (parent && !visited.has(parent.id)) { parts.unshift(parent.name); visited.add(parent.id); parent = parent.parentId ? byId.get(parent.parentId) : undefined; }
    return parts.join(" / ");
  }
  const options = selection.type === "PRODUCT" ? products.data?.items ?? [] : (entities.data ?? [])
    .map((item) => ({ ...item, name: selection.type === "CATEGORY" ? categoryName(item) : item.name }))
    .filter((item) => item.name.toLocaleLowerCase("es-UY").includes(search.toLocaleLowerCase("es-UY")));
  const label = (id: string) => options.find((item) => item.id === id)?.name ?? names[id] ?? id;
  function toggle(id: string) {
    const chosen = selection.ids.includes(id);
    onChange({ ...selection, ids: chosen ? selection.ids.filter((item) => item !== id) : [...selection.ids, id] });
    setNames((current) => ({ ...current, [id]: label(id) }));
  }
  const loading = selection.type === "PRODUCT" ? products.isPending : entities.isPending;
  const error = selection.type === "PRODUCT" ? products.error : entities.error;
  const totalPages = Math.max(1, Math.ceil((products.data?.meta.total ?? 0) / 20));
  return <fieldset className="promotion-scope-field" disabled={disabled}>
    <legend>{legend}</legend>
    <div className="promotion-scope-modes">{scopes.map((scope) => <label key={scope.value} className={selection.type === scope.value ? "active" : ""}>
      <input type="radio" name={name} checked={selection.type === scope.value} onChange={() => { onChange({ type: scope.value, ids: [] }); setSearch(""); setQuery(""); setPage(1); setNames({}); }} />{scope.label}
    </label>)}</div>
    <label className="field">Buscar {scopes.find((scope) => scope.value === selection.type)?.label.toLocaleLowerCase("es-UY")}
      <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
    </label>
    <div className="promotion-selected" aria-label="Selección actual">{selection.ids.map((id) => <span key={id}>{label(id)}<button type="button" title={`Quitar ${label(id)}`} aria-label={`Quitar ${label(id)}`} onClick={() => toggle(id)}><X size={14} /></button></span>)}</div>
    <p className="small-copy muted">{selection.ids.length} seleccionados</p>
    {error ? <ErrorBox error={error} retry={() => void (selection.type === "PRODUCT" ? products.refetch() : entities.refetch())} /> : <div className="promotion-options">
      {loading ? <p className="small-copy muted">Cargando...</p> : options.length ? options.map((item) => <label key={item.id}>
        <input type="checkbox" checked={selection.ids.includes(item.id)} disabled={!selection.ids.includes(item.id) && selection.ids.length >= 100} onChange={() => toggle(item.id)} /><span>{item.name}</span>
      </label>) : <p className="small-copy muted">No hay resultados.</p>}
    </div>}
    {selection.type === "PRODUCT" && totalPages > 1 && <div className="actions">
      <button type="button" className="icon-button" title="Página anterior" aria-label="Página anterior" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}><ChevronLeft size={18} /></button>
      <span className="small-copy">{page} / {totalPages}</span>
      <button type="button" className="icon-button" title="Página siguiente" aria-label="Página siguiente" disabled={page >= totalPages || loading} onClick={() => setPage(page + 1)}><ChevronRight size={18} /></button>
    </div>}
  </fieldset>;
}
