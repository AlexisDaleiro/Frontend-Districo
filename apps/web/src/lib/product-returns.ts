import type { Order } from "./types";

export type ProductReturnLine = { orderItemId: string; quantity: number; restockedQuantity: number };
export type ProductReturnPreview = { token: string; entries: (ProductReturnLine & { productName: string; variantName: string; sku: string; soldQuantity: number; alreadyReturned: number })[];
  stock: { variantId: string; quantity: number; before: number; after: number }[] };

export function returnedQuantities(order: Pick<Order, "returns">) {
  const quantities = new Map<string, number>();
  for (const receipt of order.returns ?? []) for (const item of receipt.items)
    quantities.set(item.orderItemId, (quantities.get(item.orderItemId) ?? 0) + item.quantity);
  return quantities;
}
