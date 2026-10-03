"use client";

import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { request, useApi, useSession } from "./providers";
import { ErrorBox } from "./ui";
import { invalidateAdminMutation } from "@/lib/admin-query-invalidation";
import { scopedPromotionPayload, type PromotionBenefit, type PromotionScope } from "@/lib/promotion-scope";
import type { Entity, Product, ProductList, Rule } from "@/lib/types";

const scopes: { value: PromotionScope; label: string }[] = [
  { value: "PRODUCT", label: "Productos" },
  { value: "BRAND", label: "Marcas" },
  { value: "CATEGORY", label: "Categorías" },
];

export function AdminPromotionForm({ rule, onDone }: { rule?: Rule; onDone: () => void }) {
  const initialReward = rule?.rewards?.[0];
  const initialScope = (initialReward?.targetType ?? "PRODUCT") as PromotionScope;
  const [scope, setScope] = useState<PromotionScope>(initialScope);
  const [selections, setSelections] = useState<Record<PromotionScope, string[]>>({
    PRODUCT: initialScope === "PRODUCT" ? rule?.rewards?.map((reward) => reward.targetId!).filter(Boolean) ?? [] : [],
    BRAND: initialScope === "BRAND" ? rule?.rewards?.map((reward) => reward.targetId!).filter(Boolean) ?? [] : [],
    CATEGORY: initialScope === "CATEGORY" ? rule?.rewards?.map((reward) => reward.targetId!).filter(Boolean) ?? [] : [],
  });
  const [name, setName] = useState(rule?.name ?? "");
  const [description, setDescription] = useState(rule?.description ?? "");
  const [benefit, setBenefit] = useState<PromotionBenefit>((initialReward?.rewardType ?? "PERCENTAGE") as PromotionBenefit);
  const [value, setValue] = useState(String(initialReward?.rewardType === "PERCENTAGE" ? initialReward.percentage ?? "" : initialReward?.amount ?? ""));
  const [startsAt, setStartsAt] = useState(rule?.startsAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [endsAt, setEndsAt] = useState(rule?.endsAt?.slice(0, 10) ?? "");
  const [priority, setPriority] = useState(String(rule?.priority ?? 0));
  const [combinable, setCombinable] = useState(rule?.combinable ?? false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const { notify } = useSession();
  const client = useQueryClient();
  const products = useApi<ProductList>(`products?limit=100&search=${encodeURIComponent(debouncedSearch)}`, scope === "PRODUCT");
  const brands = useApi<Entity[]>("brands", scope === "BRAND");
  const categories = useApi<Entity[]>("categories/catalog", scope === "CATEGORY");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const ids = selections.PRODUCT;
    if (!ids.length) return;
    let cancelled = false;
    void Promise.all(ids.map(async (id) => {
      try { return [id, (await request<Product>(`products/${id}`)).name] as const; }
      catch { return [id, id] as const; }
    })).then((pairs) => { if (!cancelled) setProductNames(Object.fromEntries(pairs)); });
    return () => { cancelled = true; };
  // Resolve the saved product names once when opening an existing promotion.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rule?.id]);

  const selected = selections[scope];
  const categoryNames = new Map(categories.data?.map((item) => [item.id, item]) ?? []);
  const categoryLabel = (item: Entity) => {
    const parent = item.parentId ? categoryNames.get(item.parentId) : undefined;
    return parent ? `${parent.name} / ${item.name}` : item.name;
  };
  const options = scope === "PRODUCT"
    ? (products.data?.items ?? []).map((item) => ({ id: item.id, name: item.name }))
    : (scope === "BRAND" ? brands.data ?? [] : categories.data ?? [])
      .map((item) => ({ id: item.id, name: scope === "CATEGORY" ? categoryLabel(item) : item.name }))
      .filter((item) => item.name.toLocaleLowerCase("es-UY").includes(search.toLocaleLowerCase("es-UY")));
  const names = new Map(options.map((item) => [item.id, item.name]));
  const selectedName = (id: string) => scope === "PRODUCT" ? productNames[id] ?? names.get(id) ?? id :
    scope === "CATEGORY" ? categoryLabel(categoryNames.get(id) ?? { id, name: id }) :
    brands.data?.find((item) => item.id === id)?.name ?? id;
  function toggle(id: string) {
    setSelections((current) => ({ ...current, [scope]: current[scope].includes(id)
      ? current[scope].filter((selectedId) => selectedId !== id)
      : [...current[scope], id] }));
    if (scope === "PRODUCT") {
      const name = names.get(id);
      if (name) setProductNames((current) => ({ ...current, [id]: name }));
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    try {
      const payload = scopedPromotionPayload({ name, description, scope, targetIds: selected, benefit,
        value: Number(value), startsAt, endsAt, priority: Number(priority), combinable });
      setBusy(true);
      const path = rule ? `promotions/${rule.id}` : "promotions";
      await request(path, rule ? "PATCH" : "POST", payload);
      await invalidateAdminMutation(client, path);
      notify(rule ? "Promoción actualizada." : "Promoción creada.");
      onDone();
    } catch (cause) { setError(cause); }
    finally { setBusy(false); }
  }

  return <form className="promotion-form" onSubmit={(event) => void submit(event)}>
    <div className="form-grid">
      <label className="field">Nombre *<input value={name} onChange={(event) => setName(event.target.value)} required /></label>
      <label className="field span-2">Descripción<textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label>
    </div>
    <fieldset className="promotion-scope-field">
      <legend>Aplicar promoción a</legend>
      <div className="promotion-scope-modes">
        {scopes.map((option) => <label key={option.value} className={scope === option.value ? "active" : ""}>
          <input type="radio" name="promotion-scope" value={option.value} checked={scope === option.value} onChange={() => { setScope(option.value); setSearch(""); }} />
          {option.label}
        </label>)}
      </div>
    </fieldset>
    <div className="promotion-target-picker">
      <label className="field">Buscar {scope === "PRODUCT" ? "productos" : scope === "BRAND" ? "marcas" : "categorías"}
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre" />
      </label>
      {selected.length > 0 && <div className="promotion-selected" aria-label="Selección actual">
        {selected.map((id) => <span key={id}>{selectedName(id)}<button type="button" title={`Quitar ${selectedName(id)}`} aria-label={`Quitar ${selectedName(id)}`} onClick={() => toggle(id)}><X size={14} /></button></span>)}
      </div>}
      <div className="promotion-options" role="group" aria-label={`Elegir ${scopes.find((item) => item.value === scope)?.label}`}>
        {(scope === "PRODUCT" ? products.isPending : scope === "BRAND" ? brands.isPending : categories.isPending) ? <p className="muted small-copy">Cargando…</p> : options.length ? options.map((option) => <label key={option.id}>
          <input type="checkbox" checked={selected.includes(option.id)} onChange={() => toggle(option.id)} />
          <span>{option.name}</span>
        </label>) : <p className="muted small-copy">No hay resultados.</p>}
      </div>
      {scope === "PRODUCT" && (products.data?.meta.total ?? 0) > options.length && <p className="muted small-copy">Mostrando los primeros {options.length} resultados. Refiná la búsqueda para encontrar otros.</p>}
      {(scope === "PRODUCT" ? products.error : scope === "BRAND" ? brands.error : categories.error) && <p className="error" role="alert">No se pudieron cargar las opciones.</p>}
    </div>
    <div className="form-grid">
      <label className="field">Beneficio<select value={benefit} onChange={(event) => setBenefit(event.target.value as PromotionBenefit)}>
        <option value="PERCENTAGE">Descuento porcentual</option>
        <option value="FIXED_AMOUNT">Importe fijo por línea</option>
        <option value="PROMOTIONAL_PRICE">Precio promocional por unidad</option>
      </select></label>
      <label className="field">{benefit === "PERCENTAGE" ? "Porcentaje" : "Importe"} *<input type="number" min="0.01" max={benefit === "PERCENTAGE" ? 100 : undefined} step="any" value={value} onChange={(event) => setValue(event.target.value)} required /></label>
      <label className="field">Comienza *<input type="date" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required /></label>
      <label className="field">Finaliza<input type="date" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></label>
      <label className="field">Prioridad<input type="number" min="0" step="1" value={priority} onChange={(event) => setPriority(event.target.value)} /></label>
      <label className="check-field"> <input type="checkbox" checked={combinable} onChange={(event) => setCombinable(event.target.checked)} /> Combinable con otras promociones</label>
    </div>
    {error !== undefined && <ErrorBox error={error} />}
    <div className="actions"><button className="button" disabled={busy}>{busy ? "Guardando…" : "Guardar promoción"}</button><button className="button secondary" type="button" disabled={busy} onClick={onDone}>Cancelar</button></div>
  </form>;
}
