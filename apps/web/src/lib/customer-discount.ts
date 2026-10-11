import { z } from "zod";
import type { CartPricing, CustomerDiscountMode } from "./types";

export const discountModes = [
  { value: "BEST_PRICE", label: "Sólo el más conveniente por producto" },
  { value: "STACK", label: "Acumular con promociones" },
] satisfies { value: CustomerDiscountMode; label: string }[];
export const customerDiscountSchema = z.object({
  discountPercentage: z.number().min(0).max(100).refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8, "Usá hasta dos decimales."),
  discountMode: z.enum(["BEST_PRICE", "STACK"]),
}).strict();
export function discountModeLabel(mode?: string) {
  return discountModes.find((item) => item.value === mode)?.label ?? discountModes[0].label;
}

export function omitCustomerDiscounts(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(omitCustomerDiscounts);
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).filter(([key]) => !["discountPercentage", "discountMode", "discountChanges",
      "customerDiscountPercentage", "customerDiscountMode", "customerDiscountTotal"].includes(key)).map(([key, item]) => [key, omitCustomerDiscounts(item)]));
  }
  return value;
}

// Explicit demo only. In real mode, cart and order amounts are returned by the API.
export function demoCustomerPricing(grossAmounts: number[], promotions: number[], percentage = 0, mode: CustomerDiscountMode = "BEST_PRICE") {
  const rate = Math.round(percentage * 100);
  const round = (value: number) => Math.round(value + 1e-8);
  const lines = grossAmounts.map((amount, index) => {
    const gross = round(amount * 100);
    const promotional = Math.max(0, Math.min(gross, round((promotions[index] ?? 0) * 100)));
    const customer = round((mode === "STACK" ? gross - promotional : gross) * rate / 10000);
    const wins = mode === "BEST_PRICE" && customer > promotional;
    const promotionDiscount = wins ? 0 : promotional;
    const customerDiscount = mode === "STACK" || wins ? customer : 0;
    return { gross, promotionDiscount, customerDiscount, discount: promotionDiscount + customerDiscount, total: gross - promotionDiscount - customerDiscount };
  });
  const sum = (key: keyof typeof lines[number]) => lines.reduce((total, line) => total + line[key], 0) / 100;
  const pricing: CartPricing = { subtotal: sum("gross"), promotionDiscountTotal: sum("promotionDiscount"), customerDiscountTotal: sum("customerDiscount"),
    discountTotal: sum("discount"), total: sum("total"), customerDiscountPercentage: percentage, customerDiscountMode: mode };
  return { pricing, discounts: lines.map((line) => line.discount / 100), totals: lines.map((line) => line.total / 100) };
}
