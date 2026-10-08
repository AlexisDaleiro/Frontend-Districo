"use client";

import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { request, useSession } from "./providers";
import { ErrorBox } from "./ui";
import { AdminScopePicker, type ScopeSelection } from "./admin-scope-picker";
import { invalidateAdminMutation } from "@/lib/admin-query-invalidation";
import { recommendationIds, recommendationPayload, recommendationScopes, type RecommendationScope } from "@/lib/recommendation-scope";
import type { Rule } from "@/lib/types";

export function AdminRecommendationForm({ rule, onDone, onBusy }: { rule?: Rule; onDone: () => void; onBusy: (busy: boolean) => void }) {
  const [trigger, setTrigger] = useState<ScopeSelection<RecommendationScope>>({ type: (rule?.triggerType ?? "PRODUCT") as RecommendationScope, ids: rule ? recommendationIds(rule, "trigger") : [] });
  const [target, setTarget] = useState<ScopeSelection<RecommendationScope>>({ type: (rule?.targetType ?? "PRODUCT") as RecommendationScope, ids: rule ? recommendationIds(rule, "target") : [] });
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
      <AdminScopePicker legend="Se activa al comprar *" name="recommendation-trigger-scope" scopes={recommendationScopes} selection={trigger} onChange={setTrigger} savedNames={rule?.triggerTargets} disabled={busy} />
      <AdminScopePicker legend="Recomendar *" name="recommendation-target-scope" scopes={recommendationScopes} selection={target} onChange={setTarget} savedNames={rule?.targetTargets} disabled={busy} />
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
