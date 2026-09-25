"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, ArrowUpRight, CheckCircle } from "lucide-react";
import { request, useApi, useSession, DEMO } from "./providers";
import { AccessGate } from "./auth";
import { Quantity } from "./catalog";
import { ActionLink, Empty, ErrorBox, Loading, PageHeading } from "./ui";
import type { Cart, CartItem, Order, Product } from "@/lib/types";
import {
  can,
  label,
  money,
  quantityError,
  reviewRequired,
} from "@/lib/commerce";
import { ApiError } from "@/lib/http";
function CartLine({ item, busy }: { item: CartItem; busy: boolean }) {
  const [quantity, setQuantity] = useState(item.quantity);
  const client = useQueryClient();
  const error = quantityError(item.variant, quantity);
  const mutation = useMutation({
    mutationFn: (remove: boolean) =>
      request(
        `cart/items/${item.id}`,
        remove ? "DELETE" : "PATCH",
        remove ? undefined : { quantity },
      ),
    onSuccess: () => void client.invalidateQueries(),
  });
  return (
    <div className="cart-item">
      <div>
        <Link href={`/producto/${item.product.slug}`}>
          <h3>{item.product.name}</h3>
        </Link>
        <p>
          {item.variant.name} · {item.variant.sku}
        </p>
        <p>
          Mínimo {item.variant.minimumOrderQuantity} · Múltiplos de{" "}
          {item.variant.saleMultiple}
        </p>
        <div className="row">
          <Quantity
            value={quantity}
            onChange={setQuantity}
            variant={item.variant}
          />
          <button
            className="button secondary small"
            disabled={
              busy ||
              mutation.isPending ||
              !!error ||
              quantity === item.quantity
            }
            onClick={() => mutation.mutate(false)}
          >
            Actualizar
          </button>
          <button
            className="icon-button"
            aria-label={`Quitar ${item.product.name}`}
            disabled={busy || mutation.isPending}
            onClick={() => mutation.mutate(true)}
          >
            <Trash2 size={17} />
          </button>
        </div>
        {error && <p className="field-error">{error}</p>}
        {mutation.error && <ErrorBox error={mutation.error} />}
      </div>
      <strong>{money(item.subtotal, item.currency)}</strong>
    </div>
  );
}
function CartContent() {
  const { user } = useSession();
  const q = useApi<Cart>("cart", can(user, "CAN_PLACE_ORDERS"));
  const recommendations = useApi<{ rule: string; product: Product }[]>(
    "cart/recommendations",
    can(user, "CAN_PLACE_ORDERS"),
  );
  const [accept, setAccept] = useState(false),
    [uncertain, setUncertain] = useState(false);
  const router = useRouter();
  const client = useQueryClient();
  const manual = reviewRequired(user?.customerAccount?.creditStatus);
  const checkout = useMutation({
    mutationFn: () =>
      request<Order>("checkout", "POST", { acceptManualReview: accept }),
    onSuccess: async (order) => {
      await client.invalidateQueries();
      router.push(`/cuenta/pedidos/${order.id}?confirmado=1`);
    },
    onError: (error) => {
      if (
        !(error instanceof ApiError) ||
        error.status === 0 ||
        error.status >= 500
      )
        setUncertain(true);
    },
  });
  if (!can(user, "CAN_PLACE_ORDERS"))
    return (
      <Empty title="Tu cuenta no está habilitada para enviar pedidos">
        <ActionLink href="/contacto">Consultar</ActionLink>
      </Empty>
    );
  if (q.isPending) return <Loading />;
  if (q.error)
    return <ErrorBox error={q.error} retry={() => void q.refetch()} />;
  if (!q.data.items.length)
    return (
      <Empty title="Tu carrito está esperando">
        <p>Explorá el catálogo y elegí las presentaciones para tu negocio.</p>
        <ActionLink href="/catalogo">Explorar catálogo</ActionLink>
      </Empty>
    );
  return (
    <div className="cart-layout">
      <div>
        {q.data.items.map((item) => (
          <CartLine
            key={`${item.id}-${item.quantity}`}
            item={item}
            busy={checkout.isPending}
          />
        ))}
        <div className="actions">
          <ActionLink href="/catalogo" secondary>
            Seguir explorando
          </ActionLink>
        </div>
        {recommendations.data?.length ? (
          <div className="panel" style={{ marginTop: 30 }}>
            <h3>También puede interesarte</h3>
            {recommendations.data.map((r, i) => (
              <p key={`${r.product.id}-${i}`} style={{ marginTop: 10 }}>
                <Link
                  className="text-link"
                  href={`/producto/${r.product.slug}`}
                >
                  {r.product.name}
                  <ArrowUpRight size={15} />
                </Link>
              </p>
            ))}
          </div>
        ) : null}
      </div>
      <aside className="summary">
        <h2>Resumen del pedido</h2>
        <div className="row between">
          <span>{q.data.items.length} productos</span>
          <span>{money(q.data.total, q.data.items[0]?.currency)}</span>
        </div>
        <div className="row between total">
          <strong>Subtotal</strong>
          <strong>{money(q.data.total, q.data.items[0]?.currency)}</strong>
        </div>
        <p className="info-note">
          Los descuentos aplicables se confirman al enviar el pedido. No se
          realizará ningún cobro en línea. La entrega se coordina con DISTRICO.
        </p>
        {manual && (
          <label className="check-field" style={{ marginTop: 20 }}>
            <input
              type="checkbox"
              checked={accept}
              onChange={(e) => setAccept(e.target.checked)}
            />
            Acepto que este pedido quede sujeto a revisión comercial.
          </label>
        )}
        {checkout.error && <ErrorBox error={checkout.error} />}{" "}
        {uncertain ? (
          <div className="error-box">
            <p>
              No sabemos si el pedido se confirmó. Revisá tus pedidos antes de
              volver a enviar.
            </p>
            <Link className="button secondary small" href="/cuenta/pedidos">
              Ver mis pedidos
            </Link>
          </div>
        ) : (
          <button
            className="button"
            disabled={checkout.isPending || (manual && !accept) || q.isFetching}
            onClick={() => checkout.mutate()}
          >
            {checkout.isPending ? "Enviando…" : "Enviar pedido a DISTRICO"}
            <ArrowUpRight size={17} />
          </button>
        )}
        {DEMO && (
          <p className="info-note">
            Operación simulada. No genera pedidos comerciales.
          </p>
        )}
      </aside>
    </div>
  );
}
export function CartPage() {
  return (
    <div className="container section">
      <PageHeading eyebrow="Un paso más cerca" title="Tu carrito" />
      <AccessGate>
        <CartContent />
      </AccessGate>
    </div>
  );
}
export function OrderItems({ order }: { order: Order }) {
  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>PRODUCTO</th>
              <th>CANT.</th>
              <th>UNITARIO</th>
              <th>SUBTOTAL</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => (
              <tr key={item.id ?? `${item.variantId}-${i}`}>
                <td>
                  <strong>{item.productName}</strong>
                  <br />
                  <span className="muted">
                    {item.variantName} · {item.sku}
                  </span>
                </td>
                <td>{item.quantity}</td>
                <td>{money(item.unitPrice, order.currency)}</td>
                <td>{money(item.subtotal, order.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row between" style={{ marginTop: 20 }}>
        <span className="small-copy">
          Descuentos: {money(order.discountTotal, order.currency)}
        </span>
        <h3>Total: {money(order.total, order.currency)}</h3>
      </div>
    </>
  );
}
function OrdersContent({ id }: { id?: string }) {
  const { user } = useSession();
  const q = useApi<Order[] | Order>(
    id ? `orders/me/${id}` : "orders/me",
    !!user,
  );
  if (q.isPending) return <Loading />;
  if (q.error)
    return <ErrorBox error={q.error} retry={() => void q.refetch()} />;
  const orders = Array.isArray(q.data) ? q.data : [q.data];
  if (!orders.length)
    return (
      <Empty title="Todavía no hay pedidos">
        <ActionLink href="/catalogo">Armar mi primer pedido</ActionLink>
      </Empty>
    );
  return (
    <div className="orders-list">
      {orders.map((order) => (
        <article className="card" key={order.id}>
          <div className="order-head">
            <div>
              <p className="eyebrow">
                {new Date(order.createdAt).toLocaleDateString("es-UY")}
              </p>
              <h3>{order.orderNumber}</h3>
            </div>
            <span
              className={`status-pill ${order.status === "PENDING_REVIEW" ? "pending" : ""}`}
            >
              {label(order.status)}
            </span>
          </div>
          {id ? (
            <>
              <p className="small-copy muted" style={{ marginBottom: 20 }}>
                {order.requiresManualReview
                  ? "Tu pedido está sujeto a revisión comercial."
                  : "Podés consultar aquí la evolución de tu pedido."}{" "}
                Pago y entrega se coordinan con DISTRICO.
              </p>
              <OrderItems order={order} />
            </>
          ) : (
            <div className="row between">
              <span>
                {order.items.length} productos ·{" "}
                <strong>{money(order.total, order.currency)}</strong>
              </span>
              <ActionLink href={`/cuenta/pedidos/${order.id}`} secondary>
                Ver detalle
              </ActionLink>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
export function OrdersPage({
  id,
  confirmed = false,
}: {
  id?: string;
  confirmed?: boolean;
}) {
  return (
    <div className="container section">
      <PageHeading
        eyebrow="Mi cuenta"
        title={
          confirmed
            ? "Pedido recibido"
            : id
              ? "Detalle del pedido"
              : "Mis pedidos"
        }
      />
      <AccessGate>
        {confirmed && (
          <div className="success-box row" style={{ marginBottom: 25 }}>
            <CheckCircle size={22} />
            {DEMO
              ? "Tu pedido simulado quedó guardado."
              : "Tu pedido fue registrado por DISTRICO."}
          </div>
        )}
        <OrdersContent id={id} />
        {id && (
          <div className="actions">
            <ActionLink href="/cuenta/pedidos" secondary>
              Todos mis pedidos
            </ActionLink>
          </div>
        )}
      </AccessGate>
    </div>
  );
}
