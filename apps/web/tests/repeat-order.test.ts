import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../src/lib/http";
import { repeatOrderItems } from "../src/lib/repeat-order";
import type { Cart, Order } from "../src/lib/types";

const items = [
  { variantId: "a", productName: "Alimento", variantName: "3 kg", quantity: 2 },
  { variantId: "b", productName: "Arena", variantName: "10 kg", quantity: 1 },
] as Order["items"];

const cart = (lines: { variantId: string; quantity: number }[]): Cart => ({
  id: "cart",
  total: 0,
  items: lines.map(({ variantId, quantity }) => ({
    id: variantId,
    quantity,
    variant: { id: variantId },
  })) as Cart["items"],
});

describe("repeatOrderItems", () => {
  it("adds order quantities to an existing cart without changing unrelated lines", async () => {
    let current = cart([{ variantId: "a", quantity: 1 }, { variantId: "other", quantity: 4 }]);
    const add = vi.fn(async (variantId: string, quantity: number) => {
      current = cart([
        ...current.items.filter((line) => line.variant.id !== variantId).map((line) => ({ variantId: line.variant.id, quantity: line.quantity })),
        { variantId, quantity },
      ]);
      return current;
    });

    const result = await repeatOrderItems(items, async () => current, add);

    expect(add.mock.calls).toEqual([["a", 3], ["b", 1]]);
    expect(result.cart.items.map((line) => [line.variant.id, line.quantity])).toEqual([
      ["other", 4], ["a", 3], ["b", 1],
    ]);
    expect(result).toMatchObject({ added: 2, skipped: [], interrupted: false });
  });

  it("continues after a known validation failure and reports the skipped line", async () => {
    const add = vi.fn(async (variantId: string) => {
      if (variantId === "a") throw new ApiError("Sin stock disponible.", 400);
      return cart([{ variantId: "b", quantity: 1 }]);
    });

    const result = await repeatOrderItems(items, async () => cart([]), add);

    expect(add).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      added: 1,
      skipped: [{ name: "Alimento - 3 kg", reason: "Sin stock disponible." }],
      interrupted: false,
    });
  });

  it("stops after an uncertain write so retry cannot silently duplicate lines", async () => {
    const add = vi.fn(async () => { throw new ApiError("Sin confirmación."); });

    const result = await repeatOrderItems(items, async () => cart([]), add);

    expect(add).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ added: 0, interrupted: true });
    expect(result.skipped[0].reason).toContain("Revisá el carrito");
  });
});
