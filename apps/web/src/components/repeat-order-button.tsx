"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { apiQueryKey, request, useSession } from "./providers";
import { ActionLink, ErrorBox } from "./ui";
import { can } from "@/lib/commerce";
import { repeatOrderItems, type RepeatOrderResult } from "@/lib/repeat-order";
import { storeRoutes } from "@/lib/store-routes";
import type { Cart, Order } from "@/lib/types";

export function RepeatOrderButton({
  order,
  orderId,
}: {
  order?: Order;
  orderId?: string;
}) {
  const { user, notify } = useSession(),
    client = useQueryClient(),
    router = useRouter();
  const [result, setResult] = useState<RepeatOrderResult | null>(null),
    [itemCount, setItemCount] = useState(order?.items.length ?? 0);
  const mutation = useMutation({
    mutationFn: async () => {
      const full =
        order ??
        (await request<Order>(`orders/me/${encodeURIComponent(orderId!)}`));
      setItemCount(full.items.length);
      return repeatOrderItems(
        full.items,
        () => request<Cart>("cart"),
        (variantId, quantity) =>
          request<Cart>("cart/items", "POST", { variantId, quantity }),
      );
    },
    onSuccess: (next) => {
      client.setQueryData(apiQueryKey("cart", user?.id), next.cart);
      if (next.interrupted)
        void client.invalidateQueries({
          queryKey: apiQueryKey("cart", user?.id),
        });
      void client.invalidateQueries({
        queryKey: apiQueryKey("cart/recommendations", user?.id),
      });
      if (!next.skipped.length) {
        notify("Productos agregados. Revisá el carrito antes de confirmar.");
        router.push(storeRoutes.cart);
      } else setResult(next);
    },
  });
  if (
    (!order && !orderId) ||
    (order && !order.items.length) ||
    !can(user, "CAN_VIEW_PRICES") ||
    !can(user, "CAN_PLACE_ORDERS")
  )
    return null;
  return (
    <div>
      <button
        type="button"
        className="button small secondary"
        disabled={mutation.isPending || !!result}
        onClick={() => mutation.mutate()}
      >
        <RotateCcw size={16} />
        {mutation.isPending ? "Agregando..." : "Repetir pedido"}
      </button>
      {mutation.error && <ErrorBox error={mutation.error} />}
      {result && (
        <div className="error-box" role="alert" style={{ marginTop: 12 }}>
          <p>
            {result.added
              ? `Se agregaron ${result.added} de ${itemCount} productos al carrito.`
              : "No se pudieron agregar productos al carrito."}
            {result.interrupted &&
              " La operación se interrumpió; verificá el carrito antes de intentarlo otra vez."}
          </p>
          <ul>
            {result.skipped.map((item, index) => (
              <li key={`${item.name}-${index}`}>
                {item.name}: {item.reason}
              </li>
            ))}
          </ul>
          <ActionLink href={storeRoutes.cart} secondary>
            Ver carrito
          </ActionLink>
        </div>
      )}
    </div>
  );
}
