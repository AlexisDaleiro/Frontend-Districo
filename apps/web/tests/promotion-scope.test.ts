import { describe, expect, it } from "vitest";
import { promotionDay, scopedPromotion, scopedPromotionPayload } from "../src/lib/promotion-scope";
import type { Rule } from "../src/lib/types";

const input = {
  name: "  Semana de mascotas  ", description: "  Descuento  ", scope: "PRODUCT" as const,
  targetIds: ["p1", "p2", "p1"], benefit: "PERCENTAGE" as const, value: 15,
  startsAt: "2026-10-03", endsAt: "2026-10-05", priority: 0, combinable: false,
};

describe("promotion scope", () => {
  it("preserves the Uruguay end date when editing", () => {
    const payload = scopedPromotionPayload(input);
    expect(promotionDay(payload.startsAt)).toBe(input.startsAt);
    expect(promotionDay(payload.endsAt)).toBe(input.endsAt);
  });
  it("saves selected products as alternative rewards without requiring every product in the cart", () => {
    const payload = scopedPromotionPayload(input);
    expect(payload.conditions).toEqual([]);
    expect(payload.rewards).toEqual([
      { targetType: "PRODUCT", targetId: "p1", rewardType: "PERCENTAGE", percentage: 15 },
      { targetType: "PRODUCT", targetId: "p2", rewardType: "PERCENTAGE", percentage: 15 },
    ]);
    expect(payload.name).toBe("Semana de mascotas");
  });

  it("supports brands and categories, and rejects an empty selection", () => {
    expect(scopedPromotionPayload({ ...input, scope: "BRAND", targetIds: ["b1"] }).rewards[0].targetType).toBe("BRAND");
    expect(scopedPromotionPayload({ ...input, scope: "CATEGORY", targetIds: ["c1"] }).rewards[0].targetType).toBe("CATEGORY");
    expect(() => scopedPromotionPayload({ ...input, targetIds: [] })).toThrow(/Elegí/);
    expect(() => scopedPromotionPayload({ ...input, value: 101 })).toThrow(/100/);
  });

  it("preserves advanced cross promotions in their existing editor", () => {
    const rule: Rule = { id: "r1", name: "Cruce", type: "CROSS_DISCOUNT", rewards: [
      { targetType: "PRODUCT", targetId: "p1", rewardType: "PERCENTAGE", percentage: 15 },
    ] };
    expect(scopedPromotion(rule)).toBe(false);
    expect(scopedPromotion({ ...rule, type: "PERCENTAGE", conditions: [] })).toBe(true);
    expect(scopedPromotion({ ...rule, conditions: [
      { targetType: "BRAND", targetIds: ["b1", "b2"], metric: "MIN_QUANTITY", minQuantity: 2 },
    ] })).toBe(true);
    expect(scopedPromotion({ ...rule, conditions: [
      { targetType: "PRODUCT", targetId: "p1", metric: "MIN_QUANTITY", minQuantity: 1 },
      { targetType: "PRODUCT", targetId: "p2", metric: "MIN_QUANTITY", minQuantity: 1 },
    ] })).toBe(false);
  });

  it("saves activation alternatives independently from the rewarded scope", () => {
    const payload = scopedPromotionPayload({ ...input, scope: "CATEGORY", targetIds: ["c1", "c2"],
      trigger: { scope: "BRAND", ids: ["b1", "b2"], metric: "MIN_QUANTITY", minimum: 3 } });
    expect(payload.type).toBe("CROSS_DISCOUNT");
    expect(payload.conditions).toEqual([{ targetType: "BRAND", targetIds: ["b1", "b2"], metric: "MIN_QUANTITY", minQuantity: 3 }]);
    expect(payload.rewards.map((item) => item.targetId)).toEqual(["c1", "c2"]);
    expect(scopedPromotionPayload({ ...input, trigger: { scope: "PRODUCT", ids: ["p3"], metric: "MIN_AMOUNT", minimum: 100 } }).conditions[0]).toMatchObject({ minAmount: 100 });
  });

  it("rejects empty activation, invalid minimum and oversized selections", () => {
    expect(() => scopedPromotionPayload({ ...input, trigger: { scope: "BRAND", ids: [], metric: "MIN_QUANTITY", minimum: 1 } })).toThrow(/activar/);
    expect(() => scopedPromotionPayload({ ...input, trigger: { scope: "BRAND", ids: ["b1"], metric: "MIN_QUANTITY", minimum: 1.5 } })).toThrow(/mínimo/);
    expect(() => scopedPromotionPayload({ ...input, targetIds: Array.from({ length: 101 }, (_, index) => `p${index}`) })).toThrow(/cien/);
  });
});
