"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { request, useApi, useSession } from "./providers";
import { ErrorBox } from "./ui";
import { invalidateAdminMutation } from "@/lib/admin-query-invalidation";
import { recommendationIds, recommendationPayload, recommendationScopes, type RecommendationScope } from "@/lib/recommendation-scope";
import type { Entity, ProductList, Rule } from "@/lib/types";

type Selection = { type: RecommendationScope; ids: string[] };
function ScopePicker({ side, selection, onChange, savedNames, disabled }: {
  side: "trigger" | "target"; selection: Selection; onChange: (next: Selection) => void;
  savedNames?: Entity[]; disabled: boolean;
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
    const name = label(id);
    setNames((current) => ({ ...current, [id]: name }));
  }
  const loading = selection.type === "PRODUCT" ? products.isPending : entities.isPending;
  const error = selection.type === "PRODUCT" ? products.error : entities.error;
  const totalPages = Math.max(1, Math.ceil((products.data?.meta.total ?? 0) / 20));
  return <fieldset className="promotion-scope-field" disabled={disabled}>
    <legend>{side === "trigger" ? "Se activa al comprar *" : "Recomendar *"}</legend>
    <div className="promotion-scope-modes">{recommendationScopes.map((scope) => <label key={scope.value} className={selection.type === scope.value ? "active" : ""}>
      <input type="radio" name={`recommendation-${side}-scope`} checked={selection.type === scope.value} onChange={() => { onChange({ type: scope.value, ids: [] }); setSearch(""); setQuery(""); setPage(1); setNames({}); }} />{scope.label}
    </label>)}</div>
    <label className="field">Buscar {recommendationScopes.find((scope) => scope.value === selection.type)?.label.toLocaleLowerCase("es-UY")}
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

export function AdminRecommendationForm({ rule, onDone, onBusy }: { rule?: Rule; onDone: () => void; onBusy: (busy: boolean) => void }) {
  const [trigger, setTrigger] = useState<Selection>({ type: (rule?.triggerType ?? "PRODUCT") as RecommendationScope, ids: rule ? recommendationIds(rule, "trigger") : [] });
  const [target, setTarget] = useState<Selection>({ type: (rule?.targetType ?? "PRODUCT") as RecommendationScope, ids: rule ? recommendationIds(rule, "target") : [] });
  const [name, setName] = useState(rule?.name ?? "");
  const [minimumQuantity, setMinimumQuantity] = useState(String(rule?.minimumQuantity ?? 1));
  const [minimumCartAmount, setMinimumCartAmount] = useState(String(rule?.minimumCartAmount ?? ""));
  const [priority, setPriority] = useState(String(rule?.priority ?? 0));
  const [startsAt, setStartsAt] = useState(rule?.startsAt?.slice(0, 10) ?? "");
  const [endsAt, setEndsAt] = useState(rule?.endsAt?.slice(0, 10) ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const client = useQueryClient(), { notify } = useSession();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(undefined);
    try {
      const payload = recommendationPayload({ name, triggerType: trigger.type, triggerIds: trigger.ids, targetType: target.type, targetIds: target.ids,
        products: target.type === "PRODUCT" ? rule?.products?.filter((item) => target.ids.includes(item.productId)) : undefined,
        minimumQuantity: Number(minimumQuantity), minimumCartAmount: minimumCartAmount ? Number(minimumCartAmount) : undefined,
        priority: Number(priority), startsAt: startsAt ? new Date(startsAt).toISOString() : undefined, endsAt: endsAt ? new Date(`${endsAt}T23:59:59.999Z`).toISOString() : undefined });
      setBusy(true); onBusy(true);
      const path = rule ? `recommendations/${rule.id}` : "recommendations";
      await request(path, rule ? "PATCH" : "POST", payload);
      await invalidateAdminMutation(client, path);
      notify(rule ? "Recomendación actualizada." : "Recomendación creada.");
      onDone();
    } catch (cause) { setError(cause); }
    finally { setBusy(false); onBusy(false); }
  }
  return <form className="promotion-form" data-admin-save="true" aria-busy={busy} onSubmit={(event) => void submit(event)}>
    <label className="field">Nombre *<input required minLength={2} maxLength={120} value={name} disabled={busy} onChange={(event) => setName(event.target.value)} /></label>
    <div className="recommendation-scopes">
      <ScopePicker side="trigger" selection={trigger} onChange={setTrigger} savedNames={rule?.triggerTargets} disabled={busy} />
      <ScopePicker side="target" selection={target} onChange={setTarget} savedNames={rule?.targetTargets} disabled={busy} />
    </div>
    <fieldset disabled={busy} className="recommendation-conditions form-grid">
      <label className="field">Cantidad mínima *<input required type="number" min="1" step="1" value={minimumQuantity} onChange={(event) => setMinimumQuantity(event.target.value)} /></label>
      <label className="field">Importe mínimo del carrito<input type="number" min="0" step="any" value={minimumCartAmount} onChange={(event) => setMinimumCartAmount(event.target.value)} /></label>
      <label className="field">Comienza<input type="date" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></label>
      <label className="field">Finaliza<input type="date" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></label>
      <label className="field">Prioridad<input type="number" min="0" step="1" value={priority} onChange={(event) => setPriority(event.target.value)} /></label>
    </fieldset>
    {error !== undefined && <ErrorBox error={error} />}
    <div className="actions"><button className="button" disabled={busy}>{busy ? "Guardando..." : "Guardar recomendación"}</button><button type="button" className="button secondary" disabled={busy} onClick={onDone}>Cancelar</button></div>
  </form>;
}
