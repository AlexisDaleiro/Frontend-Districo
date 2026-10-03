import type { Rule } from "./types";

export type PromotionScope = "PRODUCT" | "BRAND" | "CATEGORY";
export type PromotionBenefit = "PERCENTAGE" | "FIXED_AMOUNT" | "PROMOTIONAL_PRICE";

export function scopedPromotion(rule: Rule): rule is Rule & { rewards: NonNullable<Rule["rewards"]> } {
  const rewards = rule.rewards;
  if (rule.type === "CROSS_DISCOUNT" || !rewards?.length) return false;
  const first = rewards[0];
  if (!["PRODUCT", "BRAND", "CATEGORY"].includes(first.targetType) || !first.targetId) return false;
  if (!rewards.every((reward) => reward.targetType === first.targetType && reward.targetId &&
    reward.rewardType === first.rewardType && reward.percentage === first.percentage && reward.amount === first.amount)) return false;
  const conditions = rule.conditions ?? [];
  return conditions.length === 0 || (conditions.length === 1 && rewards.length === 1 &&
    conditions[0].targetType === first.targetType && conditions[0].targetId === first.targetId &&
    conditions[0].metric === "MIN_QUANTITY" && Number(conditions[0].minQuantity ?? 1) === 1);
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
}) {
  if (!input.name.trim()) throw new Error("Ingresá un nombre para la promoción.");
  const targetIds = [...new Set(input.targetIds.filter(Boolean))];
  if (!targetIds.length) throw new Error("Elegí al menos un producto, marca o categoría.");
  if (!Number.isFinite(input.value) || input.value <= 0 || (input.benefit === "PERCENTAGE" && input.value > 100))
    throw new Error("Ingresá un beneficio válido. El porcentaje no puede superar 100.");
  if (!input.startsAt || (input.endsAt && input.endsAt < input.startsAt))
    throw new Error("Revisá las fechas de inicio y fin.");
  if (!Number.isInteger(input.priority) || input.priority < 0) throw new Error("Ingresá una prioridad válida.");
  const atTime = (day: string, end = false) => new Date(`${day}T${end ? "23:59:59.999" : "00:00:00"}-03:00`).toISOString();
  return {
    name: input.name.trim(),
    description: input.description.trim(),
    type: input.benefit === "PERCENTAGE" ? "PERCENTAGE" : "FIXED_AMOUNT",
    startsAt: atTime(input.startsAt),
    endsAt: input.endsAt ? atTime(input.endsAt, true) : undefined,
    priority: input.priority,
    combinable: input.combinable,
    conditions: [],
    rewards: targetIds.map((targetId) => ({
      targetType: input.scope,
      targetId,
      rewardType: input.benefit,
      ...(input.benefit === "PERCENTAGE" ? { percentage: input.value } : { amount: input.value }),
    })),
  };
}
