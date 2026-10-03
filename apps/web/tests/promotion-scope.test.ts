import { describe, expect, it } from "vitest";
import { scopedPromotion, scopedPromotionPayload } from "../src/lib/promotion-scope";
import type { Rule } from "../src/lib/types";

const input = {
  name: "  Semana de mascotas  ", description: "  Descuento  ", scope: "PRODUCT" as const,
  targetIds: ["p1", "p2", "p1"], benefit: "PERCENTAGE" as const, value: 15,
  startsAt: "2026-10-03", endsAt: "2026-10-05", priority: 0, combinable: false,
};

describe("promotion scope", () => {
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
  });
});
