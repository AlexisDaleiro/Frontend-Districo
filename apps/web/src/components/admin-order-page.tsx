"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { AccessGate } from "./auth";
import { AdminNav, OrderProgressControl } from "./admin";
import { OrderBilling } from "./order-billing";
import { OrderProductReturns } from "./order-product-returns";
import { OrderItems } from "./orders";
import { useApi, useSession } from "./providers";
import { Empty, ErrorBox, Loading, PageHeading } from "./ui";
import { label } from "@/lib/commerce";
import { canEditAdminFeature, canSeeAdminSection, canViewAdminFeature } from "@/lib/staff-access";
import { storeRoutes } from "@/lib/store-routes";
import { invalidateAdminMutation } from "@/lib/admin-query-invalidation";
import type { Order } from "@/lib/types";

export function AdminOrderPage({ id, back }: { id: string; back?: string }) {
  const { user } = useSession();
  const client = useQueryClient();
  const q = useApi<Order>(`admin/orders/${id}`);
  const refreshOrder = async () => { await invalidateAdminMutation(client, `admin/orders/${id}`); };
  const canView = canSeeAdminSection(user, "pedidos");
  const canViewBilling = canViewAdminFeature(user, "facturacion");
  const order = q.data;
  return <div className="container admin-page section"><AccessGate admin><div className="admin-shell">
    <AdminNav section="pedidos" email={user?.email} />
    <main className="admin-main admin-record-page">
      {!canView ? <Empty title="No tenés acceso a esta sección" /> : q.isPending ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={() => void q.refetch()} /> : order ? <>
        <Link className="text-link admin-product-back" href={back ?? storeRoutes.adminSection("pedidos")}><ArrowLeft size={17} /> Volver a {user?.role === "SALES" ? "pedidos asignados" : "pedidos"}</Link>
        <PageHeading eyebrow="DISTRICO · Administración" title={`Pedido ${order.orderNumber}`}>
          {new Date(order.createdAt).toLocaleString("es-UY", { dateStyle: "short", timeStyle: "short" })}
        </PageHeading>
        <dl className="order-meta admin-record-meta">
          <div><dt>Cliente</dt><dd>{order.customerAccount ? <Link className="text-link" href={storeRoutes.adminCustomer(order.customerAccount.id)}>{order.customerAccount.businessName}</Link> : order.user?.email ?? "Sin correo"}</dd></div>
          <div><dt>Correo</dt><dd>{order.user?.email ?? "Sin correo"}</dd></div>
          <div><dt>Estado</dt><dd><span className="status-pill" data-status={order.status}>{label(order.status)}</span></dd></div>
          {order.requiresManualReview && <div><dt>Revisión manual</dt><dd>{order.acceptedManualReview ? "Aceptada por el cliente" : "Requerida"}</dd></div>}
          {order.reviewReason && <div><dt>Observación actual</dt><dd>{label(order.reviewReason)}</dd></div>}
          {order.deliveryAddress && <div><dt>Entrega{order.deliveryLabel ? ` · ${order.deliveryLabel}` : ""}</dt><dd>{[order.deliveryAddress, order.deliveryCity, order.deliveryDepartment].filter(Boolean).join(", ")}</dd></div>}
        </dl>
        {canEditAdminFeature(user, "pedidos") && <section className="admin-record-section"><OrderProgressControl key={`${order.id}-${order.status}`} order={order} onUpdated={refreshOrder} /></section>}
        <section className="admin-record-section"><h2>Productos del pedido</h2><OrderItems order={order} /><p className="muted small-copy">Importes registrados al confirmar el pedido; no cambian con precios posteriores.</p></section>
        <section className="admin-record-section"><OrderProductReturns key={order.id} order={order} readOnly={!canEditAdminFeature(user, "pedidos")} onUpdated={refreshOrder} /></section>
        {canViewBilling && <section className="admin-record-section"><OrderBilling key={order.id} order={order} readOnly={!canEditAdminFeature(user, "facturacion")} onUpdated={refreshOrder} /></section>}
      </> : <Empty title="Pedido no encontrado" />}
    </main>
  </div></AccessGate></div>;
}
