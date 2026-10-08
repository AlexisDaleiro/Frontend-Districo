"use client";

import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { request, useSession } from "./providers";
import { ErrorBox } from "./ui";
import { AdminScopePicker, type ScopeSelection } from "./admin-scope-picker";
import { invalidateAdminMutation } from "@/lib/admin-query-invalidation";
import { promotionDay, promotionScopes, promotionTriggerIds, scopedPromotionPayload, type PromotionBenefit, type PromotionScope } from "@/lib/promotion-scope";
import type { Rule } from "@/lib/types";

export function AdminPromotionForm({ rule, onDone, onBusy }: { rule?: Rule; onDone: () => void; onBusy: (busy: boolean) => void }) {
  const initialReward = rule?.rewards?.[0], condition = rule?.conditions?.[0];
  const [conditional, setConditional] = useState(rule ? !!condition : true);
  const [trigger, setTrigger] = useState<ScopeSelection<PromotionScope>>({ type: (condition?.targetType ?? "PRODUCT") as PromotionScope, ids: promotionTriggerIds(condition) });
  const [target, setTarget] = useState<ScopeSelection<PromotionScope>>({ type: (initialReward?.targetType ?? "PRODUCT") as PromotionScope, ids: rule?.rewards?.map((reward) => reward.targetId!).filter(Boolean) ?? [] });
  const [metric, setMetric] = useState<"MIN_QUANTITY" | "MIN_AMOUNT">(condition?.metric === "MIN_AMOUNT" ? "MIN_AMOUNT" : "MIN_QUANTITY");
  const [minimumQuantity, setMinimumQuantity] = useState(String(condition?.minQuantity ?? 1));
  const [minimumAmount, setMinimumAmount] = useState(String(condition?.minAmount ?? ""));
  const [name, setName] = useState(rule?.name ?? "");
  const [description, setDescription] = useState(rule?.description ?? "");
  const [benefit, setBenefit] = useState<PromotionBenefit>((initialReward?.rewardType ?? "PERCENTAGE") as PromotionBenefit);
  const [value, setValue] = useState(String(initialReward?.rewardType === "PERCENTAGE" ? initialReward.percentage ?? "" : initialReward?.amount ?? ""));
  const [startsAt, setStartsAt] = useState(promotionDay(rule?.startsAt ?? new Date().toISOString()));
  const [endsAt, setEndsAt] = useState(promotionDay(rule?.endsAt));
  const [priority, setPriority] = useState(String(rule?.priority ?? 0));
  const [combinable, setCombinable] = useState(rule?.combinable ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const { notify } = useSession(), client = useQueryClient();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(undefined);
    try {
      const payload = scopedPromotionPayload({ name, description, scope: target.type, targetIds: target.ids, benefit,
        value: Number(value), startsAt, endsAt, priority: Number(priority), combinable,
        trigger: conditional ? { scope: trigger.type, ids: trigger.ids, metric, minimum: Number(metric === "MIN_AMOUNT" ? minimumAmount : minimumQuantity) } : undefined });
      setBusy(true); onBusy(true);
      const path = rule ? `promotions/${rule.id}` : "promotions";
      await request(path, rule ? "PATCH" : "POST", payload);
      await invalidateAdminMutation(client, path);
      notify(rule ? "Promoción actualizada." : "Promoción creada.");
      onDone();
    } catch (cause) { setError(cause); }
    finally { setBusy(false); onBusy(false); }
  }
  return <form data-admin-save="true" aria-busy={busy} className="promotion-form" onSubmit={(event) => void submit(event)}>
    <div className="form-grid">
      <label className="field">Nombre *<input value={name} disabled={busy} onChange={(event) => setName(event.target.value)} required /></label>
      <label className="field span-2">Descripción<textarea value={description} disabled={busy} onChange={(event) => setDescription(event.target.value)} /></label>
    </div>
    <label className="check-field"><input type="checkbox" checked={conditional} disabled={busy} onChange={(event) => setConditional(event.target.checked)} />Requiere compra para activar</label>
    <div className="recommendation-scopes">
      {conditional && <AdminScopePicker legend="Se activa al comprar *" name="promotion-trigger-scope" scopes={promotionScopes} selection={trigger} onChange={setTrigger} savedNames={rule?.triggerTargets} disabled={busy} />}
      <AdminScopePicker legend="Aplicar promoción a *" name="promotion-target-scope" scopes={promotionScopes} selection={target} onChange={setTarget} savedNames={rule?.targetTargets} disabled={busy} />
    </div>
    {conditional && <fieldset className="recommendation-conditions form-grid" disabled={busy}>
      <label className="field">Condición de activación<select value={metric} onChange={(event) => setMetric(event.target.value as typeof metric)}><option value="MIN_QUANTITY">Cantidad mínima</option><option value="MIN_AMOUNT">Importe mínimo</option></select></label>
      {metric === "MIN_QUANTITY" ? <label className="field">Cantidad mínima *<input type="number" min="1" step="1" required value={minimumQuantity} onChange={(event) => setMinimumQuantity(event.target.value)} /></label>
        : <label className="field">Importe mínimo de la selección *<input type="number" min="0.01" step="any" required value={minimumAmount} onChange={(event) => setMinimumAmount(event.target.value)} /></label>}
    </fieldset>}
    <fieldset className="recommendation-conditions form-grid" disabled={busy}>
      <label className="field">Beneficio<select value={benefit} onChange={(event) => setBenefit(event.target.value as PromotionBenefit)}>
        <option value="PERCENTAGE">Descuento porcentual</option><option value="FIXED_AMOUNT">Importe fijo por línea</option><option value="PROMOTIONAL_PRICE">Precio promocional por unidad</option>
      </select></label>
      <label className="field">{benefit === "PERCENTAGE" ? "Porcentaje" : "Importe"} *<input type="number" min="0.01" max={benefit === "PERCENTAGE" ? 100 : undefined} step="any" value={value} onChange={(event) => setValue(event.target.value)} required /></label>
      <label className="field">Comienza *<input type="date" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required /></label>
      <label className="field">Finaliza<input type="date" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></label>
      <label className="field">Prioridad<input type="number" min="0" step="1" value={priority} onChange={(event) => setPriority(event.target.value)} /></label>
      <label className="check-field"><input type="checkbox" checked={combinable} onChange={(event) => setCombinable(event.target.checked)} />Combinable con otras promociones</label>
    </fieldset>
    {error !== undefined && <ErrorBox error={error} />}
    <div className="actions"><button className="button" disabled={busy}>{busy ? "Guardando..." : "Guardar promoción"}</button><button className="button secondary" type="button" disabled={busy} onClick={onDone}>Cancelar</button></div>
  </form>;
}
