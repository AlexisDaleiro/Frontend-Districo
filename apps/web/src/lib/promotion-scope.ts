import type { Rule } from "./types";

export type PromotionScope = "PRODUCT" | "BRAND" | "CATEGORY";
export type PromotionBenefit = "PERCENTAGE" | "FIXED_AMOUNT" | "PROMOTIONAL_PRICE";
export const promotionScopes: { value: PromotionScope; label: string }[] = [
  { value: "PRODUCT", label: "Productos" }, { value: "BRAND", label: "Marcas" }, { value: "CATEGORY", label: "Categorías" },
];

export function promotionDay(value?: string) {
  return value ? new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Montevideo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value)) : "";
}

export function promotionTriggerIds(condition?: NonNullable<Rule["conditions"]>[number]) {
  return condition?.targetIds?.length ? condition.targetIds : condition?.targetId ? [condition.targetId] : [];
}

export function scopedPromotion(rule: Rule): rule is Rule & { rewards: NonNullable<Rule["rewards"]> } {
  const rewards = rule.rewards;
  if (!rewards?.length) return false;
  const first = rewards[0];
  if (!["PRODUCT", "BRAND", "CATEGORY"].includes(first.targetType) || !first.targetId) return false;
  if (!rewards.every((reward) => reward.targetType === first.targetType && reward.targetId &&
    reward.rewardType === first.rewardType && reward.percentage === first.percentage && reward.amount === first.amount)) return false;
  const conditions = rule.conditions ?? [];
  if (!conditions.length) return rule.type !== "CROSS_DISCOUNT";
  return conditions.length === 1 && promotionScopes.some((scope) => scope.value === conditions[0].targetType) &&
    promotionTriggerIds(conditions[0]).length > 0 && ["MIN_QUANTITY", "MIN_AMOUNT"].includes(conditions[0].metric);
}

export function scopedPromotionPayload(input: {
  name: string;
  description: string;
  scope: PromotionScope;
  targetIds: string[];
  benefit: PromotionBenefit;
  value: number;
  startsAt: string;
  endsAt: string;
  priority: number;
  combinable: boolean;
  trigger?: { scope: PromotionScope; ids: string[]; metric: "MIN_QUANTITY" | "MIN_AMOUNT"; minimum: number };
}) {
  if (!input.name.trim()) throw new Error("Ingresá un nombre para la promoción.");
  const targetIds = [...new Set(input.targetIds.filter(Boolean))];
  if (!targetIds.length || targetIds.length > 100) throw new Error("Elegí entre uno y cien productos, marcas o categorías.");
  if (!promotionScopes.some((scope) => scope.value === input.scope)) throw new Error("Selección inválida.");
  const triggerIds = [...new Set(input.trigger?.ids.filter(Boolean) ?? [])];
  if (input.trigger) {
    if (!promotionScopes.some((scope) => scope.value === input.trigger!.scope) || !triggerIds.length || triggerIds.length > 100)
      throw new Error("Elegí entre uno y cien elementos para activar la promoción.");
    if (!Number.isFinite(input.trigger.minimum) || input.trigger.minimum <= 0 ||
      (input.trigger.metric === "MIN_QUANTITY" && !Number.isInteger(input.trigger.minimum)))
      throw new Error("Ingresá un mínimo válido para activar la promoción.");
  }
  if (!Number.isFinite(input.value) || input.value <= 0 || (input.benefit === "PERCENTAGE" && input.value > 100))
    throw new Error("Ingresá un beneficio válido. El porcentaje no puede superar 100.");
  if (!input.startsAt || (input.endsAt && input.endsAt < input.startsAt))
    throw new Error("Revisá las fechas de inicio y fin.");
  if (!Number.isInteger(input.priority) || input.priority < 0) throw new Error("Ingresá una prioridad válida.");
  const atTime = (day: string, end = false) => new Date(`${day}T${end ? "23:59:59.999" : "00:00:00"}-03:00`).toISOString();
  return {
    name: input.name.trim(),
    description: input.description.trim(),
    type: input.trigger ? "CROSS_DISCOUNT" : input.benefit === "PERCENTAGE" ? "PERCENTAGE" : "FIXED_AMOUNT",
    startsAt: atTime(input.startsAt),
    endsAt: input.endsAt ? atTime(input.endsAt, true) : undefined,
    priority: input.priority,
    combinable: input.combinable,
    conditions: input.trigger ? [{
      targetType: input.trigger.scope, targetIds: triggerIds, metric: input.trigger.metric,
      ...(input.trigger.metric === "MIN_AMOUNT" ? { minAmount: input.trigger.minimum } : { minQuantity: input.trigger.minimum }),
    }] : [],
    rewards: targetIds.map((targetId) => ({
      targetType: input.scope,
      targetId,
      rewardType: input.benefit,
      ...(input.benefit === "PERCENTAGE" ? { percentage: input.value } : { amount: input.value }),
    })),
  };
}
