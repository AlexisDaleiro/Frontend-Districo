"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Mail, Package, Phone, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { AccessGate } from "@/components/auth";
import { AccountDetails } from "@/components/account-details";
import { initials, useAccountCounters } from "@/components/account-frame";
import { useSession } from "@/components/providers";
import { ActionLink, ErrorBox, PageHeading } from "@/components/ui";
import { can, label, money, reviewRequired } from "@/lib/commerce";
import { storeRoutes } from "@/lib/store-routes";
import { canAccessAdmin } from "@/lib/staff-access";
import type { Customer } from "@/lib/types";
import type { OrderSummary } from "@/components/customer-orders-list";

const orderSteps = [
  ["SUBMITTED", "Enviado"],
  ["APPROVED", "Aprobado"],
  ["PROCESSING", "Preparación"],
  ["SHIPPED", "Despachado"],
  ["DELIVERED", "Entregado"],
] as const;

function OrderProgress({ status }: { status: string }) {
  const current = status === "PENDING_REVIEW" ? 0 : orderSteps.findIndex(([key]) => key === status);
  // Borradores, rechazos y cancelaciones no siguen el recorrido: queda solo su estado.
  if (current < 0) return null;
  return (
    <ol className="account-progress" aria-label="Seguimiento del pedido">
      {orderSteps.map(([key, text], index) => {
        const state = index < current || status === "DELIVERED" ? "done" : index === current ? "current" : "todo";
        return (
          <li key={key} data-state={state} aria-current={index === current ? "step" : undefined}>
            <span aria-hidden="true">{state === "done" ? <Check size={14} /> : state === "current" ? <Package size={14} /> : null}</span>
            <small>{index === current && status === "PENDING_REVIEW" ? "En revisión" : text}</small>
          </li>
        );
      })}
    </ol>
  );
}

function LatestOrder({ order, pending, error }: { order?: OrderSummary; pending: boolean; error: boolean }) {
  return (
    <section className="account-panel account-latest" aria-labelledby="account-latest-order">
      <div className="account-panel-heading">
        <h2 id="account-latest-order">Último pedido{order && <span> · {new Date(order.createdAt).toLocaleDateString("es-UY")}</span>}</h2>
        <Link href={storeRoutes.orders}>Ver todos</Link>
      </div>
      {pending ? (
        <p className="account-card-muted" role="status">Cargando pedidos…</p>
      ) : error ? (
        <p className="account-card-muted">No pudimos cargar tus pedidos ahora. Podés consultarlos desde “Ver todos”.</p>
      ) : order ? (
        <>
          <div className="account-order-line">
            <strong>{order.orderNumber}</strong>
            <span className="account-card-muted">{order.itemCount} {order.itemCount === 1 ? "producto" : "productos"} · {money(order.total, order.currency)}</span>
            <span className={`status-pill ${order.status === "PENDING_REVIEW" ? "pending" : ""}`} data-status={order.status}>{label(order.status)}</span>
          </div>
          <OrderProgress status={order.status} />
          <Link className="account-card-link" href={storeRoutes.order(order.id)}>Ver detalle del pedido</Link>
        </>
      ) : (
        <>
          <p className="account-card-muted">Todavía no hay pedidos enviados desde esta cuenta.</p>
          <Link className="account-card-link" href={storeRoutes.products}>Explorar productos</Link>
        </>
      )}
    </section>
  );
}

function Salesperson({ seller }: { seller: Customer["salesperson"] }) {
  return (
    <section className="account-panel account-seller" aria-labelledby="account-seller-title">
      <h2 id="account-seller-title">Tu vendedor</h2>
      {seller ? (
        <>
          <div className="account-seller-person">
            <span className="account-avatar small" aria-hidden="true">{initials(seller.name)}</span>
            <div>
              <strong>{seller.name}</strong>
              <span>{seller.phone}</span>
            </div>
          </div>
          <div className="account-seller-actions">
            <a href={`tel:${seller.phone.replace(/[^\d+]/g, "")}`}><Phone size={15} aria-hidden="true" /> Llamar</a>
            <a href={`mailto:${seller.user.email}`}><Mail size={15} aria-hidden="true" /> Correo</a>
          </div>
        </>
      ) : (
        <p className="account-card-muted">Todavía no tenés un vendedor asignado. Mientras tanto podés escribirnos desde Mis consultas.</p>
      )}
    </section>
  );
}

// El menú lateral lo agrega cuenta/layout.tsx (AccountFrame) para todas las páginas de la cuenta.
function ClientDashboard({ customer, email }: { customer: Customer; email: string }) {
  const { user } = useSession();
  const canOrder = can(user, "CAN_PLACE_ORDERS");
  const { counters, orders } = useAccountCounters();
  const notes = [
    reviewRequired(customer.creditStatus) && "Los nuevos pedidos pueden quedar sujetos a revisión comercial.",
    !canOrder && "Tu cuenta todavía no tiene habilitada la compra. Podés explorar el catálogo y consultar tus pedidos.",
  ].filter(Boolean);

  return (
    <div className="account-main">
      <section className="account-hero" aria-labelledby="account-dashboard-title">
        <div className="account-hero-copy">
          <p>Hola de nuevo</p>
          <h1 id="account-dashboard-title">{customer.businessName}</h1>
          <p>Cuenta: {label(customer.accountStatus)} · Situación comercial: {label(customer.creditStatus)}</p>
        </div>
        <div className="account-hero-actions">
          <Link className="button lime" href={storeRoutes.products}><ShoppingBag size={18} aria-hidden="true" /> {canOrder ? "Armar pedido" : "Explorar catálogo"}</Link>
          {canOrder && <Link className="account-dashboard-cart" href={storeRoutes.cart}>Ir al carrito</Link>}
        </div>
        {!!notes.length && <div className="account-hero-notes">{notes.map((note) => <p key={String(note)}>{note}</p>)}</div>}
      </section>

      <div className="account-stats">
        {counters.map(({ href, title, Icon, total }) => (
          <Link className="account-stat" key={href} href={href}>
            <Icon size={20} aria-hidden="true" />
            {total !== undefined ? <strong>{total}</strong> : <span className="account-stat-empty" aria-hidden="true">–</span>}
            <span>{title}</span>
          </Link>
        ))}
      </div>

      <div className="account-highlights">
        <LatestOrder order={orders.data?.items[0]} pending={orders.isPending} error={!!orders.error} />
        <Salesperson seller={customer.salesperson} />
      </div>

      <AccountDetails customer={customer} email={email} />
    </div>
  );
}

export default function Page() {
  const { user, logout } = useSession();
  const router = useRouter();
  const [error, setError] = useState<unknown>();
  const customer = user?.customerAccount;

  return (
    <div className="container section account-page">
      <AccessGate>
        {user?.role === "CLIENT" && customer ? (
          <ClientDashboard customer={customer} email={user.email} />
        ) : (
          <>
            <PageHeading eyebrow="Cuenta mayorista" title={customer?.businessName ?? "Mi cuenta"}>{user?.email}</PageHeading>
            {customer && <AccountDetails customer={customer} email={user.email} />}
            {canAccessAdmin(user) && <ActionLink href={storeRoutes.admin}>Administración</ActionLink>}
            <div className="account-session-actions">
              <button className="button secondary" onClick={async () => {
                try {
                  await logout();
                  router.push(storeRoutes.home);
                } catch (cause) {
                  setError(cause);
                }
              }}>Cerrar sesión</button>
            </div>
            {error !== undefined && <ErrorBox error={error} />}
          </>
        )}
      </AccessGate>
    </div>
  );
}
