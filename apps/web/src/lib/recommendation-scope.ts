import type { Rule } from "./types";

export type RecommendationScope = "PRODUCT" | "BRAND" | "CATEGORY" | "LABORATORY";
export const recommendationScopes: { value: RecommendationScope; label: string }[] = [
  { value: "PRODUCT", label: "Productos" }, { value: "BRAND", label: "Marcas" },
  { value: "CATEGORY", label: "Categorías" }, { value: "LABORATORY", label: "Laboratorios" },
];
export function recommendationIds(rule: Rule, side: "trigger" | "target") {
  return side === "trigger" ? rule.triggerIds?.length ? rule.triggerIds : rule.triggerId ? [rule.triggerId] : []
    : rule.targetIds?.length ? rule.targetIds : [...new Set(rule.products?.map((item) => item.productId) ?? [])];
}
export function recommendationPayload(rule: Partial<Rule>) {
  const triggerIds = recommendationIds(rule as Rule, "trigger"), targetIds = recommendationIds(rule as Rule, "target");
  const triggerType = rule.triggerType ?? "PRODUCT", targetType = rule.targetType ?? "PRODUCT";
  if (![triggerType, targetType].every((type) => recommendationScopes.some((scope) => scope.value === type))) throw new Error("Tipo de selección inválido.");
  for (const ids of [triggerIds, targetIds]) if (!ids.length || ids.length > 100 || new Set(ids).size !== ids.length || ids.some((id) => typeof id !== "string" || !id.trim())) throw new Error("Elegí entre uno y cien elementos distintos en cada selección.");
  const name = rule.name?.trim() ?? "";
  if (name.length < 2 || name.length > 120) throw new Error("El nombre debe tener entre 2 y 120 caracteres.");
  if (rule.minimumQuantity != null && (!Number.isInteger(rule.minimumQuantity) || rule.minimumQuantity < 1)) throw new Error("La cantidad mínima debe ser un entero mayor a cero.");
  if (rule.minimumCartAmount != null && (!Number.isFinite(Number(rule.minimumCartAmount)) || Number(rule.minimumCartAmount) < 0)) throw new Error("El importe mínimo no puede ser negativo.");
  if (!Number.isInteger(rule.priority ?? 0) || (rule.priority ?? 0) < 0) throw new Error("La prioridad debe ser un entero no negativo.");
  if ([rule.startsAt, rule.endsAt].some((date) => date && !Number.isFinite(Date.parse(date)))) throw new Error("Fecha inválida.");
  if (rule.startsAt && rule.endsAt && new Date(rule.endsAt) < new Date(rule.startsAt)) throw new Error("La fecha final debe ser posterior al inicio.");
  if (targetType !== "PRODUCT" && rule.products?.length) throw new Error("No se pueden mezclar productos manuales con marcas o categorías.");
  if (rule.products?.some((item) => !targetIds.includes(item.productId))) throw new Error("Los productos recomendados no coinciden con la selección.");
  if (rule.products && (rule.products.length > 100 || new Set(rule.products.map((item) => `${item.productId}:${item.variantId ?? ""}`)).size !== rule.products.length)) throw new Error("Hay demasiados productos o presentaciones repetidas.");
  return { name, triggerType, triggerId: triggerIds[0], triggerIds, targetType, targetIds,
    products: targetType === "PRODUCT" ? targetIds.flatMap((productId, position) => {
      const refs = rule.products?.filter((item) => item.productId === productId);
      return refs?.length ? refs.map((item) => ({ productId, variantId: item.variantId, position: item.position ?? position })) : [{ productId, variantId: undefined, position }];
    }) : [],
    minimumQuantity: rule.minimumQuantity ?? 1, minimumCartAmount: rule.minimumCartAmount ?? undefined,
    priority: rule.priority ?? 0, startsAt: rule.startsAt || undefined, endsAt: rule.endsAt || undefined,
    ...(rule.active == null ? {} : { active: rule.active }),
  };
}
