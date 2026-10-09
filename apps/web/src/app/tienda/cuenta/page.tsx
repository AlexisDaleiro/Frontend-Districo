"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Heart, MapPin, Package, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { AccessGate } from "@/components/auth";
import { AccountDetails } from "@/components/account-details";
import { useApi, useSession } from "@/components/providers";
import { ActionLink, ErrorBox, PageHeading } from "@/components/ui";
import { can, label, money, reviewRequired } from "@/lib/commerce";
import { storeRoutes } from "@/lib/store-routes";
import { canAccessAdmin } from "@/lib/staff-access";
import type { Customer, Order } from "@/lib/types";

function AccountOverview({ customer }: { customer: Customer }) {
  const orders = useApi<Order[]>("orders/me");
  const latestOrder = [...(orders.data ?? [])].sort(
    (first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt),
  )[0];
  const primaryAddress = customer.addresses?.[0];
  const addressText = primaryAddress
    ? [primaryAddress.address, primaryAddress.city, primaryAddress.department].filter(Boolean).join(", ")
    : [customer.address, customer.city, customer.department].filter(Boolean).join(", ");

  return (
    <div className="account-overview">
      <section className="account-overview-card" aria-labelledby="account-latest-order">
        <div className="account-overview-heading">
          <span className="account-card-icon"><Package size={20} aria-hidden="true" /></span>
          <Link href={storeRoutes.orders}>Ver todos</Link>
        </div>
        <h2 id="account-latest-order">Último pedido</h2>
        {orders.isPending ? (
          <p className="account-card-muted" role="status">Cargando pedidos…</p>
        ) : orders.error ? (
          <p className="account-card-muted">No pudimos cargar tus pedidos ahora. Podés consultarlos desde “Ver todos”.</p>
        ) : latestOrder ? (
          <>
            <div className="account-order-line">
              <strong>{latestOrder.orderNumber}</strong>
              <span className={`status-pill ${latestOrder.status === "PENDING_REVIEW" ? "pending" : ""}`} data-status={latestOrder.status}>{label(latestOrder.status)}</span>
            </div>
            <p className="account-card-muted">
              {new Date(latestOrder.createdAt).toLocaleDateString("es-UY")} · {latestOrder.items.length} {latestOrder.items.length === 1 ? "producto" : "productos"} · {money(latestOrder.total, latestOrder.currency)}
            </p>
            <Link className="account-card-link" href={storeRoutes.order(latestOrder.id)}>Ver detalle del pedido</Link>
          </>
        ) : (
          <>
            <p className="account-card-muted">Todavía no hay pedidos enviados desde esta cuenta.</p>
            <Link className="account-card-link" href={storeRoutes.products}>Explorar productos</Link>
          </>
        )}
      </section>

      <section className="account-overview-card" aria-labelledby="account-delivery-title">
        <div className="account-overview-heading">
          <span className="account-card-icon"><MapPin size={20} aria-hidden="true" /></span>
          <a href="#direcciones">Gestionar</a>
        </div>
        <h2 id="account-delivery-title">Dirección principal</h2>
        {addressText ? (
          <>
            <strong className="account-address-name">{primaryAddress?.label || "Dirección registrada"}</strong>
            <p className="account-card-muted">{addressText}</p>
            {!!customer.addresses?.length && <p className="account-card-footnote">{customer.addresses.length} {customer.addresses.length === 1 ? "dirección guardada" : "direcciones guardadas"}</p>}
          </>
        ) : (
          <p className="account-card-muted">Agregá una dirección para poder seleccionarla al enviar tu pedido.</p>
        )}
        <a className="account-card-link" href="#direcciones">{addressText ? "Ver direcciones" : "Agregar dirección"}</a>
      </section>
    </div>
  );
}

export default function Page() {
  const { user, logout } = useSession();
  const router = useRouter();
  const [error, setError] = useState<unknown>();
  const customer = user?.customerAccount;
  const clientAccount = user?.role === "CLIENT" && customer;
  const canOrder = can(user, "CAN_PLACE_ORDERS");

  return (
    <div className="container section account-page">
      <AccessGate>
        {clientAccount ? (
          <>
            <section className="account-dashboard-hero" aria-labelledby="account-dashboard-title">
              <div className="account-dashboard-copy">
                <p className="eyebrow">Cuenta mayorista</p>
                <h1 id="account-dashboard-title">{customer.businessName}</h1>
                <div className="account-dashboard-statuses">
                  <span className="account-status-chip" data-status={customer.accountStatus}>Cuenta: {label(customer.accountStatus)}</span>
                  <span className="account-status-chip" data-status={customer.creditStatus}>Situación comercial: {label(customer.creditStatus)}</span>
                </div>
                {reviewRequired(customer.creditStatus) && <p className="account-dashboard-note">Los nuevos pedidos pueden quedar sujetos a revisión comercial.</p>}
                {!canOrder && <p className="account-dashboard-note">Tu cuenta todavía no tiene habilitada la compra. Podés explorar el catálogo y consultar tus pedidos.</p>}
              </div>
              <div className="account-dashboard-actions">
                <Link className="button lime" href={storeRoutes.products}><ShoppingBag size={18} aria-hidden="true" /> {canOrder ? "Armar pedido" : "Explorar catálogo"}</Link>
                <Link className="button secondary" href={storeRoutes.orders}><Package size={18} aria-hidden="true" /> Mis pedidos</Link>
                <Link className="button secondary" href={storeRoutes.invoices}><FileText size={18} aria-hidden="true" /> Mis facturas</Link>
                <Link className="button secondary" href={storeRoutes.favorites}><Heart size={18} aria-hidden="true" /> Mis favoritos</Link>
                {canOrder && <Link className="account-dashboard-cart" href={storeRoutes.cart}>Ir al carrito</Link>}
              </div>
            </section>

            <AccountOverview customer={customer} />

            <div className="account-detail-heading">
              <div>
                <h2>Datos de tu empresa</h2>
              </div>
            </div>
            <AccountDetails customer={customer} email={user.email} />
          </>
        ) : (
          <>
            <PageHeading eyebrow="Cuenta mayorista" title={customer?.businessName ?? "Mi cuenta"}>{user?.email}</PageHeading>
            {customer && <AccountDetails customer={customer} email={user.email} />}
            {canAccessAdmin(user) && <ActionLink href={storeRoutes.admin}>Administración</ActionLink>}
          </>
        )}
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
      </AccessGate>
    </div>
  );
}
