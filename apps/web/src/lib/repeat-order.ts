import { ApiError } from "./http";
import type { Cart, Order } from "./types";

type OrderItem = Order["items"][number];

export type RepeatOrderResult = {
  cart: Cart;
  added: number;
  skipped: { name: string; reason: string }[];
  interrupted: boolean;
};

export async function repeatOrderItems(
  items: OrderItem[],
  getCart: () => Promise<Cart>,
  addItem: (variantId: string, quantity: number) => Promise<Cart>,
): Promise<RepeatOrderResult> {
  let cart = await getCart();
  const result: RepeatOrderResult = {
    cart,
    added: 0,
    skipped: [],
    interrupted: false,
  };

  for (const item of items) {
    const current = cart.items.find((line) => line.variant.id === item.variantId);
    try {
      // cart/items sets an absolute quantity, so preserve what is already there.
      cart = await addItem(item.variantId, (current?.quantity ?? 0) + item.quantity);
      result.cart = cart;
      result.added += 1;
    } catch (error) {
      const expected = error instanceof ApiError &&
        [400, 403, 404, 409, 422].includes(error.status);
      result.skipped.push({
        name: `${item.productName} - ${item.variantName}`,
        reason: expected && error instanceof Error
          ? error.message
          : "No se pudo confirmar si se agregó. Revisá el carrito antes de continuar.",
      });
      if (!expected) {
        result.interrupted = true;
        break;
      }
    }
  }

  return result;
}
