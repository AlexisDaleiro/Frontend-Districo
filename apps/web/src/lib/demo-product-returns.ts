import { ApiError } from "./http";
import { returnedQuantities, type ProductReturnLine } from "./product-returns";
import type { Order, Product, User } from "./types";

export async function demoProductReturn(state: { orders: Order[]; products: Product[]; consumedOrderIds?: string[] }, orderId: string, body: Record<string, unknown>, actor: User, previewOnly: boolean, hash: (value: string) => Promise<string>) {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) throw new ApiError("Pedido no encontrado.", 404);
  const reason = String(body.reason ?? "").trim();
  const requestId = String(body.requestId ?? "");
  const raw = body.items as ProductReturnLine[];
  if (!Array.isArray(raw) || !raw.length || raw.length > 100 || reason.length < 3 || reason.length > 500 ||
      !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(requestId) || new Set(raw.map((item) => item.orderItemId)).size !== raw.length ||
      raw.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000000 || !Number.isInteger(item.restockedQuantity) || item.restockedQuantity < 0 || item.restockedQuantity > item.quantity))
    throw new ApiError("Revisá los productos, cantidades y motivo de devolución.", 400);
  const items = raw.map(({ orderItemId, quantity, restockedQuantity }) => ({ orderItemId, quantity, restockedQuantity })).sort((a, b) => a.orderItemId.localeCompare(b.orderItemId));
  const previous = state.orders.flatMap((item) => item.returns ?? []).find((item) => item.requestId === requestId);
  if (previous && !previewOnly) {
    if (!order.returns?.includes(previous) || previous.recordedById !== actor.id || JSON.stringify({ reason: previous.reason, items: previous.items }) !== JSON.stringify({ reason, items }))
      throw new ApiError("Este identificador ya pertenece a otra devolución.", 409);
    return previous;
  }
  if (!["SHIPPED", "DELIVERED"].includes(order.status)) throw new ApiError("Solo se puede recibir mercadería de pedidos en camino o enviados.", 400);
  const returned = returnedQuantities(order);
  const restock = new Map<string, number>();
  const entries = items.map((item) => {
    const line = order.items.find((line) => line.id === item.orderItemId);
    if (!line) throw new ApiError("Un producto no pertenece al pedido.", 400);
    const alreadyReturned = returned.get(line.id!) ?? 0;
    if (alreadyReturned + item.quantity > line.quantity) throw new ApiError(`${line.productName}: la devolución supera la cantidad pendiente.`, 400);
    restock.set(line.variantId, (restock.get(line.variantId) ?? 0) + item.restockedQuantity);
    return { ...item, productName: line.productName, variantName: line.variantName, sku: line.sku, soldQuantity: line.quantity, alreadyReturned };
  });
  const stock = [...restock].sort(([a], [b]) => a.localeCompare(b)).filter(([, quantity]) => quantity > 0).map(([variantId, quantity]) => {
    const restored = (order.returns ?? []).flatMap((receipt) => receipt.items).filter((item) => order.items.find((line) => line.id === item.orderItemId)?.variantId === variantId).reduce((sum, item) => sum + item.restockedQuantity, 0);
    const consumed = state.consumedOrderIds?.includes(order.id) ? order.items.filter((item) => item.variantId === variantId).reduce((sum, item) => sum + item.quantity, 0) : 0;
    if (restored + quantity > consumed) throw new ApiError("No hay salida de stock registrada suficiente para reincorporar esa mercadería.", 400);
    const variant = state.products.flatMap((item) => item.variants).find((item) => item.id === variantId);
    if (!variant) throw new ApiError("La presentación fue eliminada y no puede recibir stock.", 400);
    const before = variant.physicalStock ?? 0;
    if (before + quantity > 2147483647) throw new ApiError("La reincorporación supera el máximo de stock permitido.", 400);
    return { variantId, quantity, before, after: before + quantity };
  });
  const token = await hash(JSON.stringify({ orderId, requestId, reason, items, status: order.status, entries, stock }));
  if (previewOnly) return { token, entries, stock };
  if (body.previewToken !== token) throw new ApiError("Las cantidades o el stock cambiaron. Revisá la devolución antes de confirmar.", 409);
  const receipt = { id: crypto.randomUUID(), requestId, reason, items, createdAt: new Date().toISOString(), recordedById: actor.id, recordedByEmail: actor.email };
  for (const movement of stock) {
    const variant = state.products.flatMap((item) => item.variants).find((item) => item.id === movement.variantId)!;
    variant.physicalStock = movement.after;
    variant.availableStock = movement.after - (variant.reservedStock ?? 0);
  }
  (order.returns ??= []).unshift(receipt);
  return receipt;
}
