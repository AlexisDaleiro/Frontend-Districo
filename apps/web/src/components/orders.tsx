"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, ArrowUpRight, CheckCircle, RotateCcw } from "lucide-react";
import { apiQueryKey, request, useApi, useSession, DEMO } from "./providers";
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
import { storeRoutes } from "@/lib/store-routes";
import { repeatOrderItems, type RepeatOrderResult } from "@/lib/repeat-order";
function CartLine({
  item,
  busy,
  onPendingChange,
}: {
  item: CartItem;
  busy: boolean;
  onPendingChange: (id: string, pending: boolean) => void;
}) {
  const [quantity, setQuantity] = useState(item.quantity);
  const client = useQueryClient();
  const { user } = useSession();
  const error = quantityError(item.variant, quantity);
  const mutation = useMutation({
    mutationFn: (remove: boolean) =>
      request<Cart>(
        `cart/items/${item.id}`,
        remove ? "DELETE" : "PATCH",
        remove ? undefined : { quantity },
      ),
    // La API devuelve el carrito con los totales ya calculados: se usa directo
    // en lugar de releer todas las consultas.
    onSuccess: (cart, remove) => {
      client.setQueryData(apiQueryKey("cart", user?.id), cart);
      if (remove) onPendingChange(item.id, false);
      void client.invalidateQueries({
        queryKey: apiQueryKey("cart/recommendations", user?.id),
      });
    },
    // Tras un error se relee el carrito: muestra lo que quedó guardado
    // (otra pestaña pudo cambiarlo) y la cantidad absoluta se puede reintentar.
    onError: () =>
      void client.invalidateQueries({
        queryKey: apiQueryKey("cart", user?.id),
      }),
  });
  const { isPending, isError, mutate } = mutation;
  useEffect(() => {
    onPendingChange(item.id, isPending || quantity !== item.quantity);
  }, [item.id, item.quantity, isPending, onPendingChange, quantity]);
  // Guarda la cantidad sola, un momento después del último cambio.
  useEffect(() => {
    if (busy || isPending || isError || error || quantity === item.quantity)
      return;
    const timer = setTimeout(() => mutate(false), 400);
    return () => clearTimeout(timer);
  }, [busy, isPending, isError, error, quantity, item.quantity, mutate]);
  return (
    <div className="cart-item">
      <div>
        <Link href={storeRoutes.product(item.product.slug)}>
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
            onChange={(value) => {
              mutation.reset();
              onPendingChange(item.id, true);
              setQuantity(value);
            }}
            variant={item.variant}
          />
          <button
            className="icon-button"
            aria-label={`Quitar ${item.product.name}`}
            disabled={busy || mutation.isPending}
            onClick={() => {
              onPendingChange(item.id, true);
              mutation.mutate(true);
            }}
          >
            <Trash2 size={17} />
          </button>
        </div>
        {error && <p className="field-error">{error}</p>}
        {!item.unitPrice && (
          <p className="field-error">
            Sin precio vigente. Quitala o consultá a DISTRICO.
          </p>
        )}
        {mutation.error && <ErrorBox error={mutation.error} />}
      </div>
      <strong
        aria-busy={isPending}
        data-saved={mutation.isSuccess && quantity === item.quantity}
        style={{ opacity: isPending ? 0.55 : 1, transition: "opacity .2s" }}
      >
        {item.unitPrice ? money(item.subtotal, item.currency) : "Sin precio"}
      </strong>
    </div>
  );
}
// El subtotal hace un "tick" (motion.css) cada vez que cambia su valor.
function SubtotalRow({
  value,
  children,
}: {
  value: number | string;
  children: React.ReactNode;
}) {
  const [seen, setSeen] = useState(value);
  const [ticks, setTicks] = useState(0);
  if (value !== seen) {
    setSeen(value);
    setTicks((count) => count + 1);
  }
  return (
    <div
      className={ticks ? "row between total is-tick" : "row between total"}
      key={ticks}
    >
      {children}
    </div>
  );
}
function CartContent({ checkoutMode }: { checkoutMode: boolean }) {
  const { user } = useSession();
  const q = useApi<Cart>("cart", can(user, "CAN_PLACE_ORDERS"));
  const recommendations = useApi<{ rule: string; product: Product }[]>(
    "cart/recommendations",
    can(user, "CAN_PLACE_ORDERS") && !checkoutMode,
  );
  const [accept, setAccept] = useState(false),
    [uncertain, setUncertain] = useState(false);
  const [pendingLines, setPendingLines] = useState<string[]>([]);
  const onPendingChange = useCallback((id: string, pending: boolean) => {
    setPendingLines((current) => {
      const present = current.includes(id);
      if (present === pending) return current;
      return pending ? [...current, id] : current.filter((line) => line !== id);
    });
  }, []);
  const router = useRouter();
  const client = useQueryClient();
  const manual = reviewRequired(user?.customerAccount?.creditStatus);
  // Líneas guardadas que la API rechazaría al confirmar (precio o cantidad).
  const blocked = !!q.data?.items.some(
    (i) => !i.unitPrice || quantityError(i.variant, i.quantity),
  );
  const checkout = useMutation({
    mutationFn: () =>
      request<Order>("checkout", "POST", { acceptManualReview: accept }),
    onSuccess: (order) => {
      router.replace(`${storeRoutes.order(order.id)}?confirmado=1`);
      void client.invalidateQueries();
    },
    onError: (error) => {
      // El carrito o el historial pudieron cambiar (stock, precio o un pedido
      // registrado sin confirmación): se releen en lugar de reintentar a ciegas.
      void client.invalidateQueries();
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
        <ActionLink href={storeRoutes.contact}>Consultar</ActionLink>
      </Empty>
    );
  // Sin respuesta al enviar: el pedido pudo registrarse (y el carrito vaciarse).
  // Se reemplaza el carrito por el aviso para no reenviar a ciegas.
  if (uncertain)
    return (
      <div className="error-box" role="alert">
        <p>
          No sabemos si el pedido se confirmó. Revisá tus pedidos antes de
          volver a enviar.
        </p>
        <Link className="button secondary small" href={storeRoutes.orders}>
          Ver mis pedidos
        </Link>
      </div>
    );
  if (q.isPending) return <Loading />;
  if (q.error)
    return <ErrorBox error={q.error} retry={() => void q.refetch()} />;
  if (!q.data.items.length)
    return (
      <Empty title="Tu carrito está esperando">
        <p>Explorá el catálogo y elegí las presentaciones para tu negocio.</p>
        <ActionLink href={storeRoutes.products}>Explorar catálogo</ActionLink>
      </Empty>
    );
  return (
    <div className="cart-layout">
      <div className="cart-items">
        {q.data.items.map((item) => (
          <CartLine
            key={item.id}
            item={item}
            busy={checkout.isPending}
            onPendingChange={onPendingChange}
          />
        ))}
        <div className="actions">
          <ActionLink href={checkoutMode ? storeRoutes.cart : storeRoutes.products} secondary>
            {checkoutMode ? "Volver al carrito" : "Seguir explorando"}
          </ActionLink>
        </div>
        {recommendations.data?.length ? (
          <div className="panel" style={{ marginTop: 30 }}>
            <h3>También puede interesarte</h3>
            {recommendations.data.map((r, i) => (
              <p key={`${r.product.id}-${i}`} style={{ marginTop: 10 }}>
                <Link
                  className="text-link"
                  href={storeRoutes.product(r.product.slug)}
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
          <span>
            {q.data.items.length}{" "}
            {q.data.items.length === 1 ? "producto" : "productos"}
          </span>
          <span>{money(q.data.total, q.data.items[0]?.currency)}</span>
        </div>
        <SubtotalRow value={q.data.total}>
          <strong>Subtotal</strong>
          <strong>{money(q.data.total, q.data.items[0]?.currency)}</strong>
        </SubtotalRow>
        <p className="info-note">
          Los descuentos aplicables se confirman al enviar el pedido. No se
          realizará ningún cobro en línea. La entrega se coordina con DISTRICO.
        </p>
        {checkoutMode && manual && (
          <label className="check-field" style={{ marginTop: 20 }}>
            <input
              type="checkbox"
              checked={accept}
              onChange={(e) => setAccept(e.target.checked)}
            />
            Acepto que este pedido quede sujeto a revisión comercial.
          </label>
        )}
        {blocked && (
          <p className="field-error">
            Revisá las líneas marcadas antes de enviar el pedido.
          </p>
        )}
        {checkoutMode && checkout.error && <ErrorBox error={checkout.error} />}
        {checkoutMode ? (
          <button
            className="button"
            disabled={checkout.isPending || (manual && !accept) || q.isFetching || blocked || pendingLines.length > 0}
            onClick={() => checkout.mutate()}
          >
            {checkout.isPending ? "Enviando…" : "Enviar pedido a DISTRICO"}
            <ArrowUpRight size={17} />
          </button>
        ) : (
          <button
            className="button"
            disabled={q.isFetching || blocked || pendingLines.length > 0}
            onClick={() => router.push(storeRoutes.checkout)}
          >
            Continuar al checkout <ArrowUpRight size={17} />
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
// Vista previa editable del carrito (panel lateral del header). Comparte la
// consulta "cart" con el header y la página; los importes llegan de la API.
export function CartPreview({ onNavigate }: { onNavigate: () => void }) {
  const { user } = useSession();
  const q = useApi<Cart>("cart", can(user, "CAN_PLACE_ORDERS"));
  const router = useRouter();
  const [pendingLines, setPendingLines] = useState<string[]>([]);
  const onPendingChange = useCallback((id: string, pending: boolean) => {
    setPendingLines((current) => {
      const present = current.includes(id);
      if (present === pending) return current;
      return pending ? [...current, id] : current.filter((line) => line !== id);
    });
  }, []);
  if (q.isPending) return <Loading />;
  if (q.error)
    return <ErrorBox error={q.error} retry={() => void q.refetch()} />;
  const blocked = q.data.items.some(
    (i) => !i.unitPrice || quantityError(i.variant, i.quantity),
  );
  return (
    // Cualquier enlace del panel (producto, carrito, catálogo) lo cierra.
    <div
      className="cart-preview"
      onClick={(e) => {
        if ((e.target as Element).closest("a")) onNavigate();
      }}
    >
      {!q.data.items.length ? (
        <Empty title="Tu carrito está esperando">
          <p>Explorá el catálogo y elegí las presentaciones para tu negocio.</p>
          <ActionLink href={storeRoutes.products}>Explorar catálogo</ActionLink>
        </Empty>
      ) : (
        <>
          <div className="cart-preview-items">
            {q.data.items.map((item) => (
              <CartLine
                key={item.id}
                item={item}
                busy={false}
                onPendingChange={onPendingChange}
              />
            ))}
          </div>
          <div className="cart-preview-foot">
            <SubtotalRow value={q.data.total}>
              <strong>Subtotal</strong>
              <strong>{money(q.data.total, q.data.items[0]?.currency)}</strong>
            </SubtotalRow>
            {blocked && (
              <p className="field-error">
                Revisá las líneas marcadas antes de enviar el pedido.
              </p>
            )}
            <button
              className="button"
              disabled={q.isFetching || blocked || pendingLines.length > 0}
              onClick={() => {
                onNavigate();
                router.push(storeRoutes.checkout);
              }}
            >
              Finalizar pedido <ArrowUpRight size={17} />
            </button>
            <ActionLink href={storeRoutes.cart} secondary>
              Ver carrito
            </ActionLink>
          </div>
        </>
      )}
    </div>
  );
}
export function CartPage() {
  return (
    <div className="container section">
      <PageHeading eyebrow="Un paso más cerca" title="Tu carrito" />
      <AccessGate>
        <CartContent checkoutMode={false} />
      </AccessGate>
    </div>
  );
}
export function CheckoutPage() {
  return (
    <div className="container section">
      <PageHeading eyebrow="Revisá tu pedido" title="Confirmar pedido" />
      <AccessGate>
        <CartContent checkoutMode />
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
function RepeatOrderButton({ order }: { order: Order }) {
  const { user, notify } = useSession();
  const client = useQueryClient();
  const router = useRouter();
  const [result, setResult] = useState<RepeatOrderResult | null>(null);
  const mutation = useMutation({
    mutationFn: () => repeatOrderItems(
      order.items,
      () => request<Cart>("cart"),
      (variantId, quantity) => request<Cart>("cart/items", "POST", { variantId, quantity }),
    ),
    onSuccess: (next) => {
      client.setQueryData(apiQueryKey("cart", user?.id), next.cart);
      if (next.interrupted) {
        void client.invalidateQueries({ queryKey: apiQueryKey("cart", user?.id) });
      }
      void client.invalidateQueries({ queryKey: apiQueryKey("cart/recommendations", user?.id) });
      if (!next.skipped.length) {
        notify("Productos agregados. Revisá el carrito antes de confirmar.");
        router.push(storeRoutes.cart);
      } else {
        setResult(next);
      }
    },
  });

  if (!order.items.length || !can(user, "CAN_VIEW_PRICES") || !can(user, "CAN_PLACE_ORDERS"))
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
        {mutation.isPending ? "Agregando…" : "Repetir pedido"}
      </button>
      {mutation.error && <ErrorBox error={mutation.error} />}
      {result && (
        <div className="error-box" role="alert" style={{ marginTop: 12 }}>
          <p>
            {result.added
              ? `Se agregaron ${result.added} de ${order.items.length} productos al carrito.`
              : "No se pudieron agregar productos al carrito."}
            {result.interrupted && " La operación se interrumpió; verificá el carrito antes de intentarlo otra vez."}
          </p>
          <ul>
            {result.skipped.map((item, index) => (
              <li key={`${item.name}-${index}`}>{item.name}: {item.reason}</li>
            ))}
          </ul>
          <ActionLink href={storeRoutes.cart} secondary>Ver carrito</ActionLink>
        </div>
      )}
    </div>
  );
}
function OrdersContent({ id }: { id?: string }) {
  const { user } = useSession();
  const q = useApi<Order[] | Order>(
    id ? `orders/me/${id}` : "orders/me",
    !!user,
  );
  if (q.isPending) return <Loading />;
  if (id && q.error instanceof ApiError && q.error.status === 404)
    return (
      <Empty title="No encontramos ese pedido">
        <p>Puede no existir o pertenecer a otra cuenta.</p>
        <ActionLink href={storeRoutes.orders}>Ver mis pedidos</ActionLink>
      </Empty>
    );
  if (q.error)
    return <ErrorBox error={q.error} retry={() => void q.refetch()} />;
  const orders = Array.isArray(q.data) ? q.data : [q.data];
  if (!orders.length)
    return (
      <Empty title="Todavía no hay pedidos">
        <ActionLink href={storeRoutes.products}>Armar mi primer pedido</ActionLink>
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
              <div className="actions">
                <RepeatOrderButton order={order} />
              </div>
            </>
          ) : (
            <>
              <div className="row between">
                <span>
                  {order.items.length}{" "}
                  {order.items.length === 1 ? "producto" : "productos"} ·{" "}
                  <strong>{money(order.total, order.currency)}</strong>
                </span>
                <ActionLink href={storeRoutes.order(order.id)} secondary>
                  Ver detalle
                </ActionLink>
              </div>
              <div className="actions">
                <RepeatOrderButton order={order} />
              </div>
            </>
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
            <ActionLink href={storeRoutes.orders} secondary>
              Todos mis pedidos
            </ActionLink>
          </div>
        )}
      </AccessGate>
    </div>
  );
}
