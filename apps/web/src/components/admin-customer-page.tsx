"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { AccessGate } from "./auth";
import { AdminNav, customerEditor } from "./admin";
import { AdminForm } from "./admin-form";
import { useApi, useSession, DEMO } from "./providers";
import { Empty, ErrorBox, Loading, PageHeading } from "./ui";
import { label, money } from "@/lib/commerce";
import { canEditAdminFeature, canSeeAdminSection, canViewAdminFeature } from "@/lib/staff-access";
import { storeRoutes } from "@/lib/store-routes";
import type { CustomerDetail } from "@/lib/types";

function creditDescription(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "Datos de crédito actualizados";
  const data = metadata as Record<string, unknown>;
  const after = data.after && typeof data.after === "object" && !Array.isArray(data.after) ? data.after as Record<string, unknown> : data;
  return [
    after.creditStatus !== undefined ? `Situación: ${label(String(after.creditStatus))}` : "",
    after.creditLimit !== undefined ? `Límite: ${after.creditLimit === null ? "Sin límite" : money(Number(after.creditLimit))}` : "",
    after.internalCreditNote ? `Nota: ${String(after.internalCreditNote)}` : "",
  ].filter(Boolean).join(" · ") || "Datos de crédito actualizados";
}

export function AdminCustomerPage({ id }: { id: string }) {
  const { user } = useSession();
  const q = useApi<CustomerDetail>(`admin/customers/${id}`);
  const canView = canSeeAdminSection(user, "clientes");
  const canEdit = canEditAdminFeature(user, "clientes");
  const canViewBilling = canViewAdminFeature(user, "facturacion");
  const customer = q.data;
  return <div className="container admin-page section"><AccessGate admin><div className="admin-shell">
    <AdminNav section="clientes" email={user?.email} />
    <main className="admin-main admin-record-page">
      {!canView ? <Empty title="No tenés acceso a esta sección" /> : q.isPending ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={() => void q.refetch()} /> : customer ? <>
        <Link className="text-link admin-product-back" href={storeRoutes.adminSection("clientes")}><ArrowLeft size={17} /> Volver a {user?.role === "SALES" ? "clientes asignados" : "clientes"}</Link>
        <PageHeading eyebrow="DISTRICO · Administración" title={customer.businessName}>{customer.legalName} · RUT {customer.rut}</PageHeading>
        <div className="admin-record-summary">
          <div><span>Cuenta</span><strong>{label(customer.accountStatus)}</strong></div>
          <div><span>Situación comercial</span><strong>{label(customer.creditStatus)}</strong></div>
          <div><span>Medicamentos</span><strong>{customer.medicationPermission ? "Habilitados" : "Sin habilitación"}</strong></div>
          <div><span>Pedidos</span><strong>{customer.orderCount}</strong></div>
          <div><span>Vendedor responsable</span><strong>{customer.salesperson ? canSeeAdminSection(user, "vendedores") ? <Link className="text-link" href={storeRoutes.adminSalesperson(customer.salesperson.userId)}>{customer.salesperson.name}</Link> : customer.salesperson.name : "Sin asignar"}</strong></div>
          {canViewBilling && customer.debt !== undefined && <div><span>Deuda pendiente</span><strong>{money(customer.debt)}</strong></div>}
          {canViewBilling && customer.creditLimit != null && <div><span>Crédito disponible</span><strong>{money(Number(customer.availableCredit ?? 0))}</strong></div>}
        </div>
        <section className="admin-record-section"><h2>Contacto y direcciones</h2>
          <p>{customer.users?.map((account) => account.email).join(", ") || "Sin correo"} · {customer.phone || "Sin teléfono"}</p>
          {customer.addresses?.length ? <ul className="admin-record-list">{customer.addresses.map((address) => <li key={address.id}><strong>{address.label}</strong><span>{[address.address, address.city, address.department].filter(Boolean).join(", ")}</span></li>)}</ul> :
            <p className="muted">Sin direcciones cargadas.</p>}
        </section>
        <section className="admin-record-section"><h2>Permisos y habilitaciones</h2>
          {customer.documents?.length ? <ul className="admin-record-list">{customer.documents.map((document) => <li key={document.id}>
            <span>{document.originalName}</span>{DEMO ? null : <a className="text-link" href={`/api/backend/admin/customers/${id}/documents/${document.id}?preview=1`} target="_blank" rel="noopener noreferrer">Abrir <ExternalLink size={15} /></a>}
          </li>)}</ul> : <p className="muted">Sin documentos adjuntos.</p>}
        </section>
        <section className="admin-record-section"><div className="admin-toolbar"><h2>Pedidos recientes</h2>
          <Link className="text-link" href={`${storeRoutes.adminSection("pedidos")}?customerId=${encodeURIComponent(id)}`}>Ver todos</Link></div>
          {customer.recentOrders.length ? <div className="table-wrap"><table><thead><tr><th>PEDIDO</th><th>FECHA</th><th>ESTADO</th>{canViewBilling && <th>TOTAL</th>}</tr></thead><tbody>
            {customer.recentOrders.map((order) => <tr key={order.id}><td><Link className="text-link" href={storeRoutes.adminOrder(order.id)}>{order.orderNumber}</Link></td><td>{new Date(order.createdAt).toLocaleDateString("es-UY")}</td><td>{label(order.status)}</td>{canViewBilling && <td>{order.total !== undefined ? money(Number(order.total), order.currency ?? "UYU") : "—"}</td>}</tr>)}
          </tbody></table></div> : <p className="muted">Todavía no hay pedidos.</p>}
        </section>
        {canViewBilling && <section className="admin-record-section"><h2>Historial de crédito</h2>
          {customer.creditChanges?.length ? <ul className="admin-record-list">{customer.creditChanges.map((change) => <li key={change.id}>
            <span><strong>{new Date(change.createdAt).toLocaleString("es-UY")}</strong> · {change.user?.email ?? "Sistema"}</span><span>{creditDescription(change.metadata)}</span>
          </li>)}</ul> : <p className="muted">Sin cambios de crédito registrados.</p>}
        </section>}
        {canEdit && <section className="admin-record-section"><h2>Editar cliente</h2>
          <AdminForm key={`${customer.id}-${customer.updatedAt ?? ""}`} editor={customerEditor(customer)} onDone={() => {}} />
        </section>}
      </> : <Empty title="Cliente no encontrado" />}
    </main>
  </div></AccessGate></div>;
}
