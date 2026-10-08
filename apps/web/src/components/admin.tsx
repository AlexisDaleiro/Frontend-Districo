"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  ViewTransition,
} from "react";
import {
  BadgePercent,
  BriefcaseBusiness,
  Images,
  ClipboardList,
  Download,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Tags,
  FolderTree,
  Trash2,
  UserPlus,
  Users,
  ShieldCheck,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AccessGate } from "./auth";
import { DEMO, request, useApi, useSession } from "./providers";
import { AdminCommandMenu } from "./admin-command-menu";
import { AdminBulkActions, BulkHistory, PageSelection, RowSelection, useAdminSelection } from "./admin-bulk-actions";
import { AdminForm, type Editor, type Field } from "./admin-form";
import { Empty, ErrorBox, Loading, Modal, PageHeading, Picture } from "./ui";
import { CountUp } from "./count-up";
import { AdminSales } from "./admin-sales";
import { AdminBanners } from "./admin-banners";
import { AdminRoles, AdminStaff } from "./admin-staff";
import { AdminSalespeople } from "./admin-salespeople";
import { AdminPromotionForm } from "./admin-promotion-form";
import { AdminRecommendationForm } from "./admin-recommendation-form";
import { AdminListFilters, ListPagination } from "./admin-list-filters";
import { adminListPath } from "@/lib/admin-list-filters";
import { AdminRecordLink, ShareAdminList, useAdminListField, useAdminListScroll } from "./admin-list-navigation";
import { AdminBrandsLabs, AdminCategories } from "./admin-organization";
import { orderBalance } from "@/lib/order-billing";
import { downloadPrivateFile } from "@/lib/http";
import { orderProgressChoices, orderProgressOptionLabel } from "@/lib/order-progress";
import { storeRoutes } from "@/lib/store-routes";
import { adminProductEditor } from "@/lib/admin-product-editor";
import { canEditAdminFeature, canSeeAdminSection, canViewAdminFeature } from "@/lib/staff-access";
import { invalidateAdminMutation } from "@/lib/admin-query-invalidation";
import { scopedPromotion } from "@/lib/promotion-scope";
import {
  label,
  money,
  orderStockEffect,
  orderStatuses,
} from "@/lib/commerce";
import type {
  Application,
  ContactInquiry,
  Customer,
  Entity,
  Expiration,
  Order,
  Product,
  ProductList,
  Rule,
  Variant,
} from "@/lib/types";
// Grupo, ruta, título, icono y contador de admin/dashboard que se muestra al lado.
const sections: [string, string, string, LucideIcon, string?][] = [
  ["Operación", "", "Resumen", LayoutDashboard],
  ["Operación", "consultas", "Consultas", Inbox, "newContactInquiries"],
  ["Operación", "solicitudes", "Solicitudes", UserPlus, "pendingApplications"],
  ["Operación", "clientes", "Clientes", Users],
  ["Operación", "vendedores", "Vendedores", BriefcaseBusiness],
  ["Operación", "pedidos", "Pedidos", ClipboardList, "pendingReviewOrders"],
  ["Catálogo", "catalogo", "Catálogo", Package],
  ["Catálogo", "marcas", "Marcas y laboratorios", Tags],
  ["Catálogo", "categorias", "Categorías", FolderTree],
  ["Marketing", "promociones", "Promociones", BadgePercent],
  ["Marketing", "banners", "Banners", Images],
  ["Marketing", "recomendaciones", "Recomendaciones", Sparkles],
  ["Acceso", "personal", "Personal", ShieldCheck],
  ["Acceso", "roles", "Roles", ListChecks],
];
const groups = [...new Set(sections.map(([group]) => group))];
const options = (values: string[]) =>
  values.map((value) => ({ value, label: label(value) }));
const number = (key: string, title: string, min = 0, step = "1"): Field => ({
  key,
  label: title,
  type: "number",
  min,
  step,
  required: true,
});
const text = (key: string, title: string, required = true): Field => ({
  key,
  label: title,
  required,
});
const select = (
  key: string,
  title: string,
  values: { value: string; label: string }[],
  required = true,
): Field => ({ key, label: title, type: "select", options: values, required });
const bool = (key: string, title: string): Field => ({
  key,
  label: title,
  type: "checkbox",
});
const date = (key: string, title: string, required = true): Field => ({
  key,
  label: title,
  type: "date",
  required,
});
type OpenEditor = (editor: Editor) => void;
function Dashboard() {
  const { user } = useSession();
  const q = useApi<Record<string, number>>("admin/dashboard");
  if (q.isPending) return <Loading />;
  if (q.error)
    return <ErrorBox error={q.error} retry={() => void q.refetch()} />;
  return (
    <>
      {canViewAdminFeature(user, "ventas") && <AdminSales />}
      <div className="stats">
        {(
          [
            ["products", "Productos", "catalogo", Package],
            [
              "pendingApplications",
              "Solicitudes pendientes",
              "solicitudes",
              UserPlus,
            ],
            [
              "pendingReviewOrders",
              "Pedidos en revisión",
              "pedidos",
              ClipboardList,
            ],
            [
              "activePromotions",
              "Promociones activas",
              "promociones",
              BadgePercent,
            ],
            ["newContactInquiries", "Consultas nuevas", "consultas", Inbox],
          ] as const
        ).filter(([, , path]) => canSeeAdminSection(user, path)).map(([key, title, path, Icon]) => (
          <Link className="card stat" href={storeRoutes.adminSection(path)} key={key}>
            <span className="stat-icon" aria-hidden="true">
              <Icon size={18} />
            </span>
            <strong>
              <CountUp value={q.data[key] ?? 0} duration={900} />
            </strong>
            <span>{title}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
function ContactInquiries({ edit }: { edit: OpenEditor }) {
  const { user } = useSession();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [status, setStatus] = useAdminListField("status", "", ["", "NEW", "IN_PROGRESS", "RESOLVED"]);
  const [search, setSearch] = useAdminListField("search", "");
  const [debouncedSearch, setDebouncedSearch] = useState(search.trim());
  const [page, setPage] = useAdminListField("page", 1);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", "20");
  if (status) params.set("status", status);
  if (debouncedSearch) params.set("search", debouncedSearch);
  const q = useApi<{ items: ContactInquiry[]; meta: { total: number; page: number; limit: number } }>(`admin/contact-inquiries/page?${params}`);
  useAdminListScroll(!q.isPending && !q.error && debouncedSearch === search.trim());
  if (q.isPending) return <Loading />;
  if (q.error)
    return <ErrorBox error={q.error} retry={() => void q.refetch()} />;
  const newCount = q.data.items.filter((item) => item.status === "NEW").length;
  return (
    <>
      <div className="admin-toolbar contact-admin-toolbar">
        <div>
          <h2>Consultas comerciales</h2>
          <span className="muted small-copy">
            {newCount} {newCount === 1 ? "nueva" : "nuevas"} en esta página · {q.data.meta.total} en total
          </span>
        </div>
        <div className="contact-admin-filters">
          <ShareAdminList />
          <input
            className="form-input"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Buscar nombre, comercio o mensaje"
            aria-label="Buscar consultas"
          />
          <select
            className="form-input"
            value={status}
            onChange={(event) => { setStatus(event.target.value); setPage(1); }}
            aria-label="Filtrar consultas por estado"
          >
            <option value="">Todos los estados</option>
            <option value="NEW">Nueva</option>
            <option value="IN_PROGRESS">En seguimiento</option>
            <option value="RESOLVED">Resuelta</option>
          </select>
        </div>
      </div>
      {!q.data.items.length ? (
        <Empty title="No hay consultas con estos filtros" />
      ) : (
        <div className="table-wrap">
          <table className="admin-inquiries-table">
            <thead><tr><th>FECHA</th><th>COMERCIO / CONTACTO</th><th>ESTADO</th><th>RESPONSABLE</th><th>ACCIÓN</th></tr></thead>
            <tbody>{q.data.items.map((inquiry) => (
              <Fragment key={inquiry.id}>
                <tr>
                  <td>{new Intl.DateTimeFormat("es-UY", { dateStyle: "short", timeStyle: "short" }).format(new Date(inquiry.createdAt))}</td>
                  <td><strong>{inquiry.businessName || inquiry.name}</strong><br /><span className="muted small-copy">{inquiry.name} · {inquiry.email}</span></td>
                  <td><span className="status-pill" data-status={inquiry.status}>{label(inquiry.status)}</span></td>
                  <td>{inquiry.handledBy?.email ?? "Sin asignar"}</td>
                  <td><button className="button small secondary" type="button" aria-expanded={expandedId === inquiry.id} aria-controls={`consulta-${inquiry.id}`} onClick={() => setExpandedId(expandedId === inquiry.id ? null : inquiry.id)}>{expandedId === inquiry.id ? "Ocultar" : "Ver detalle"}</button></td>
                </tr>
                {expandedId === inquiry.id && <tr id={`consulta-${inquiry.id}`} className="admin-inquiry-detail"><td colSpan={5}>
                  <p>{inquiry.message}</p>
                  <p className="muted small-copy">{[inquiry.phone, inquiry.locality].filter(Boolean).join(" · ")}</p>
                  {inquiry.internalNote && <p><strong>Nota interna:</strong> {inquiry.internalNote}</p>}
                  <div className="actions">
                    <a className="text-link" href={`mailto:${inquiry.email}`}>{inquiry.email}</a>
                    {canEditAdminFeature(user, "consultas") && <button className="button small" type="button" onClick={() => edit({
                      title: `Gestionar consulta de ${inquiry.name}`,
                      path: `admin/contact-inquiries/${inquiry.id}`,
                      method: "PATCH",
                      fields: [
                        select("status", "Estado", [
                          { value: "NEW", label: "Nueva" },
                          { value: "IN_PROGRESS", label: "En seguimiento" },
                          { value: "RESOLVED", label: "Resuelta" },
                        ]),
                        { key: "internalNote", label: "Nota interna", type: "textarea", required: false, allowEmpty: true },
                      ],
                      initial: { status: inquiry.status, internalNote: inquiry.internalNote ?? "" },
                    })}>Gestionar</button>}
                  </div>
                </td></tr>}
              </Fragment>
            ))}</tbody>
          </table>
        </div>
      )}
      <AdminPagination meta={q.data.meta} onPage={setPage} />
    </>
  );
}
function Applications({ edit }: { edit: OpenEditor }) {
  const { user, notify } = useSession();
  const client = useQueryClient();
  const [search, setSearch] = useAdminListField("search", "");
  const [debouncedSearch, setDebouncedSearch] = useState(search.trim());
  const [status, setStatus] = useAdminListField("status", "PENDING", ["", "PENDING", "APPROVED", "REJECTED"]);
  const [page, setPage] = useAdminListField("page", 1);
  const [reviewing, setReviewing] = useState<Application | null>(null);
  const [medicationAccess, setMedicationAccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<unknown>();
  async function upload(application: Application, file?: File) {
    if (!file) return;
    setActionError(undefined);
    if (!file.size || file.size > 5_000_000 || !["application/pdf", "image/png", "image/jpeg"].includes(file.type)) {
      setActionError(new Error("Adjuntá un PDF, PNG o JPG de hasta 5 MB."));
      return;
    }
    setBusy(true);
    try {
      const data = new FormData();
      data.set("file", file);
      await request(`admin/applications/${application.id}/documents`, "POST", data);
      await invalidateAdminMutation(client, "admin/applications");
      notify("Habilitación adjuntada.");
    } catch (error) { setActionError(error); }
    finally { setBusy(false); }
  }
  async function approve() {
    if (!reviewing || !medicationAccess) return;
    setBusy(true);
    setActionError(undefined);
    try {
      await request(`admin/applications/${reviewing.id}/approve`, "POST", { medicationPermission: medicationAccess === "allow" });
      await invalidateAdminMutation(client, "admin/applications");
      setReviewing(null);
      setMedicationAccess("");
      notify("Solicitud aprobada.");
    } catch (error) { setActionError(error); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const q = useApi<{ items: Application[]; meta: { total: number; page: number; limit: number } }>(`admin/applications/page?page=${page}&limit=20&search=${encodeURIComponent(debouncedSearch)}${status ? `&status=${status}` : ""}`);
  useAdminListScroll(!q.isPending && !q.error && debouncedSearch === search.trim());
  if (q.isPending) return <Loading />;
  if (q.error)
    return <ErrorBox error={q.error} retry={() => void q.refetch()} />;
  const list = q.data.items;
  return (
    <>
      <div className="admin-toolbar">
        <h2>Solicitudes de acceso</h2>
        <ShareAdminList />
        <span className="muted small-copy">
          {q.data.meta.total} {status === "PENDING" ? "pendientes" : "solicitudes"}
        </span>
        <div className="admin-order-filters">
          <input className="form-input" type="search" aria-label="Buscar solicitudes" placeholder="Comercio, RUT o correo" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
          <select className="form-input" aria-label="Filtrar solicitudes" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="PENDING">Pendientes</option>
            <option value="">Historial completo</option>
            <option value="APPROVED">Aprobadas</option>
            <option value="REJECTED">Rechazadas</option>
          </select>
        </div>
      </div>
      {!list.length ? (
        <Empty title="No hay solicitudes" />
      ) : (
        <div className="admin-cards">
          {list.map((a) => (
            <article className="card" key={a.id}>
              <div className="row between">
                <h3>{a.businessName}</h3>
                <span className="status-pill" data-status={a.status}>{label(a.status)}</span>
              </div>
              <p>
                {a.legalName} · RUT {a.rut}
              </p>
              <p>
                {a.contactName} · {a.email} · {a.phone}
              </p>
              <p>
                {[a.address, a.city, a.department].filter(Boolean).join(", ")}
              </p>
              <p>Permisos o habilitaciones del negocio:</p>
              {!a.documents?.length && <p className="muted">Sin habilitaciones adjuntas. No se puede aprobar.</p>}
              {a.documents?.map((d) => (
                <p key={d.id}>{DEMO ? d.originalName : <a className="text-link" href={`/api/backend/admin/applications/${a.id}/documents/${d.id}?preview=1`} target="_blank" rel="noopener noreferrer">{d.originalName} ↗</a>}</p>
              ))}
              {a.status === "PENDING" && canEditAdminFeature(user, "solicitudes") && (
                <div className="actions">
                  {(a.documents?.length ?? 0) < 3 && <label className="field application-document-upload">
                    Adjuntar habilitación
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" disabled={busy} onChange={(event) => {
                      void upload(a, event.target.files?.[0]);
                      event.target.value = "";
                    }} />
                  </label>}
                  <button
                    className="button small"
                    disabled={!a.documents?.length || busy}
                    onClick={() => { setActionError(undefined); setMedicationAccess(""); setReviewing(a); }}
                  >
                    Aprobar
                  </button>
                  <button
                    className="button secondary small"
                    onClick={() =>
                      edit({
                        title: "Rechazar solicitud",
                        path: `admin/applications/${a.id}/reject`,
                        fields: [text("rejectionReason", "Motivo del rechazo")],
                      })
                    }
                  >
                    Rechazar
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      {actionError !== undefined && <ErrorBox error={actionError} />}
      <AdminPagination meta={q.data.meta} onPage={setPage} />
      <Modal open={!!reviewing} onClose={() => setReviewing(null)} title={reviewing ? `Aprobar ${reviewing.businessName}` : "Aprobar solicitud"}>
        {reviewing && <form className="stack" onSubmit={(event) => { event.preventDefault(); void approve(); }}>
          <div><strong>Habilitaciones adjuntas</strong>
            {reviewing.documents?.map((document) => <p key={document.id}>{DEMO ? document.originalName :
              <a className="text-link" href={`/api/backend/admin/applications/${reviewing.id}/documents/${document.id}?preview=1`} target="_blank" rel="noopener noreferrer">{document.originalName} ↗</a>}</p>)}
          </div>
          <label className="field">Acceso a medicamentos veterinarios restringidos *
            <select value={medicationAccess} required onChange={(event) => setMedicationAccess(event.target.value)}>
              <option value="">Seleccionar</option>
              <option value="deny">No habilitar</option>
              <option value="allow">Habilitar</option>
            </select>
          </label>
          <div className="actions"><button className="button" disabled={busy}>Aprobar solicitud</button><button className="button secondary" type="button" onClick={() => setReviewing(null)}>Cancelar</button></div>
          {actionError !== undefined && <ErrorBox error={actionError} />}
        </form>}
      </Modal>
    </>
  );
}
export function customerEditor(c: Customer): Editor {
  return {
    title: c.businessName,
    path: `admin/customers/${c.id}`,
    method: "PATCH",
    initial: { ...c },
    fields: [
      { ...text("phone", "Teléfono", false), allowEmpty: true },
      select("accountStatus", "Estado de cuenta", options(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"])),
      select("creditStatus", "Situación comercial", options(["GOOD_STANDING", "PAYMENT_DELAY", "PAYMENT_PENDING", "RESTRICTED"])),
      { ...number("creditLimit", "Límite de crédito", 0, "any"), required: false },
      { key: "internalCreditNote", label: "Nota interna de crédito", type: "textarea", required: false, allowEmpty: true },
      bool("medicationPermission", "Habilitar compra de medicamentos"),
    ],
    description: "Una cuenta suspendida puede ingresar y consultar su historial, pero no enviar pedidos nuevos.",
  };
}
function Customers() {
  const { user } = useSession();
  const canReassign = canEditAdminFeature(user, "vendedores");
  const selection = useAdminSelection();
  const [search, setSearch] = useAdminListField("search", "");
  const [debouncedSearch, setDebouncedSearch] = useState(search.trim());
  const [page, setPage] = useAdminListField("page", 1);
  const [seller, setSeller] = useAdminListField("salespersonId", "");
  const [accountStatus, setAccountStatus] = useAdminListField("accountStatus", "", ["", "PENDING", "APPROVED", "REJECTED", "SUSPENDED"]);
  const [debt, setDebt] = useAdminListField("debt", "", ["", "WITH_DEBT", "WITHOUT_DEBT"]);
  const canViewDebt = canViewAdminFeature(user, "facturacion");
  const sellers = useApi<{ id: string; name: string; user: { email: string } }[]>("admin/customers/page/options", user?.role !== "SALES");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const q = useApi<{ items: Customer[]; meta: { total: number; page: number; limit: number } }>(
    adminListPath("admin/customers/page", { page, limit: 20, search: debouncedSearch, salespersonId: seller, accountStatus, debt: canViewDebt ? debt : "" }),
  );
  const rows = q.data?.items ?? [];
  useAdminListScroll(!q.isPending && !q.error && debouncedSearch === search.trim());
  return (
    <>
      <div className="admin-toolbar">
        <h2>{user?.role === "SALES" ? "Clientes asignados" : "Clientes mayoristas"}</h2>
        <ShareAdminList />
        <input
          className="form-input"
          aria-label="Buscar clientes"
          placeholder="Buscar comercio, RUT, correo o teléfono"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>
      <AdminListFilters active={!!(search || seller || accountStatus || debt)} onClear={() => { setSearch(""); setDebouncedSearch(""); setSeller(""); setAccountStatus(""); setDebt(""); setPage(1); }}>
        {user?.role !== "SALES" && <label className="field">Vendedor<select className="form-input" aria-label="Vendedor" value={seller} onChange={(event) => { setSeller(event.target.value); setPage(1); }}>
          <option value="">Todos los vendedores</option><option value="unassigned">Sin vendedor</option>
          {sellers.data?.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.user.email}</option>)}
        </select></label>}
        <label className="field">Estado de cuenta<select className="form-input" aria-label="Estado de cuenta" value={accountStatus} onChange={(event) => { setAccountStatus(event.target.value); setPage(1); }}>
          <option value="">Todos los estados</option>{["PENDING", "APPROVED", "REJECTED", "SUSPENDED"].map((value) => <option key={value} value={value}>{label(value)}</option>)}
        </select></label>
        {canViewDebt && <label className="field">Deuda<select className="form-input" aria-label="Deuda" value={debt} onChange={(event) => { setDebt(event.target.value); setPage(1); }}>
          <option value="">Todos los saldos</option><option value="WITH_DEBT">Con deuda pendiente</option><option value="WITHOUT_DEBT">Sin deuda pendiente</option>
        </select></label>}
      </AdminListFilters>
      {sellers.error && <ErrorBox error={sellers.error} retry={() => void sellers.refetch()} />}
      {q.isPending ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={() => void q.refetch()} /> : <>
      {canReassign && <AdminBulkActions kind="customers" selection={selection} />}
      {canViewAdminFeature(user, "vendedores") && <div className="actions admin-history-actions"><BulkHistory feature="vendedores" /></div>}
      {!!rows.length && <div className="table-wrap">
        <table className="admin-customers-table">
          <thead><tr>{canReassign && <th className="admin-selection-cell"><PageSelection selection={selection} rows={rows.map((c) => ({ id: c.id, name: c.businessName }))} /></th>}<th>CLIENTE</th><th>CONTACTO</th><th>CUENTA</th><th>CRÉDITO</th><th>MEDICAMENTOS</th><th>ACCIÓN</th></tr></thead>
          <tbody>{rows.map((c) => (
          <tr key={c.id}>
            {canReassign && <td className="admin-selection-cell"><RowSelection selection={selection} id={c.id} name={c.businessName} /></td>}
            <td><strong>{c.businessName}</strong><br /><span className="muted">{c.legalName} · {c.rut}</span></td>
            <td>{c.users?.map((u) => u.email).join(", ") || "Sin correo"}<br /><span className="muted">{c.phone || "Sin teléfono"}</span></td>
            <td><span className="status-pill" data-status={c.accountStatus}>{label(c.accountStatus)}</span></td>
            <td>{label(c.creditStatus)}</td>
            <td>{c.medicationPermission ? "Habilitado" : "No habilitado"}</td>
            <td><AdminRecordLink className="button secondary small" href={storeRoutes.adminCustomer(c.id)}>Ver ficha</AdminRecordLink></td>
          </tr>
        ))}</tbody></table>
      </div>}
      {!rows.length && <Empty title="No encontramos clientes" />}
      {q.data && <ListPagination meta={q.data.meta} onPage={setPage} />}
      </>}
    </>
  );
}
function AdminPagination({ meta, onPage }: { meta: { total: number; page: number; limit: number }; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(meta.total / meta.limit));
  if (pages <= 1) return null;
  return (
    <div className="pagination">
      <button className="button small secondary" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>Anterior</button>
      <span>Página {meta.page} de {pages} · {meta.total} registros</span>
      <button className="button small secondary" disabled={meta.page >= pages} onClick={() => onPage(meta.page + 1)}>Siguiente</button>
    </div>
  );
}
export function OrderProgressControl({ order, onUpdated }: { order: Order; onUpdated: () => Promise<void> }) {
  const { notify } = useSession();
  const [selected, setSelected] = useState(order.status);
  const [reviewReason, setReviewReason] = useState("");
  const choices = orderProgressChoices(order.status, orderBalance(order).paid);
  const mutation = useMutation({
    mutationFn: () => request(`admin/orders/${order.id}/status`, "PATCH", {
      status: selected,
      ...(reviewReason.trim()
        ? { reviewReason: reviewReason.trim() }
        : {}),
    }),
    onSuccess: async () => {
      await onUpdated();
      notify("Estado del pedido actualizado.");
    },
    onError: () => { void onUpdated(); },
  });

  return (
    <section className="order-management-status">
      <h3>Estado del pedido</h3>
      <p className="small-copy muted">Actual: {orderProgressOptionLabel(order.status)}</p>
      {choices.length > 1 && (
        <form data-admin-save="true" aria-busy={mutation.isPending} className="order-management-status-fields" onSubmit={(event) => { event.preventDefault(); if (selected !== order.status && !mutation.isPending) mutation.mutate(); }}>
          <label className="field">
            Nuevo estado
            <select
              className="form-input"
              value={selected}
              disabled={mutation.isPending}
              onChange={(event) => setSelected(event.target.value)}
            >
              {choices.map((choice) => (
                <option value={choice} key={choice}>{orderProgressOptionLabel(choice)}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Nueva observación
            <input
              className="form-input"
              value={reviewReason}
              disabled={mutation.isPending}
              onChange={(event) => setReviewReason(event.target.value)}
            />
          </label>
          <button
            className="button small secondary"
            type="submit"
            disabled={selected === order.status || mutation.isPending}
          >
            <Save size={16} /> Guardar estado
          </button>
          {selected !== order.status && (
            <p className="small-copy muted order-management-status-effect">
              {orderStockEffect(order.status, selected)}
            </p>
          )}
        </form>
      )}
      {mutation.error && <ErrorBox error={mutation.error} />}
    </section>
  );
}
function AdminOrders() {
  const { user } = useSession();
  const canViewBilling = canViewAdminFeature(user, "facturacion");
  const [status, setStatus] = useAdminListField("status", "", ["", ...orderStatuses]);
  const [search, setSearch] = useAdminListField("search", "");
  const [debouncedSearch, setDebouncedSearch] = useState(search.trim());
  const [customer, setCustomer] = useAdminListField("customer", "");
  const [debouncedCustomer, setDebouncedCustomer] = useState(customer.trim());
  const [customerId, setCustomerId] = useAdminListField("customerId", "");
  const [dateFrom, setDateFrom] = useAdminListField("dateFrom", "");
  const [dateTo, setDateTo] = useAdminListField("dateTo", "");
  const [paymentStatus, setPaymentStatus] = useAdminListField("paymentStatus", "", ["", "PENDING", "PARTIAL", "PAID", "CREDITED"]);
  const [page, setPage] = useAdminListField("page", 1);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<unknown>();
  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search.trim()); setDebouncedCustomer(customer.trim()); }, 250);
    return () => clearTimeout(timer);
  }, [search, customer]);
  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (debouncedCustomer) params.set("customer", debouncedCustomer);
  if (customerId) params.set("customerId", customerId);
  if (status) params.set("status", status);
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);
  if (paymentStatus && canViewBilling) params.set("paymentStatus", paymentStatus);
  const q = useApi<{ items: Order[]; meta: { total: number; page: number; limit: number } }>(
    `admin/orders/page?${params}`,
  );
  useAdminListScroll(!q.isPending && !q.error && debouncedSearch === search.trim() && debouncedCustomer === customer.trim());
  async function exportCsv() {
    setExporting(true);
    setExportError(undefined);
    try {
      if (DEMO) {
        const columns = ["ID", "Número", "Fecha", "Cliente", "Correo", "Estado", "Moneda", "Total", ...(canViewBilling ? ["Estado de pago", "Abonado", "Pendiente"] : [])];
        const cell = (value: unknown) => {
          const raw = String(value ?? "");
          const safe = /^[=+@\-\t\r]/.test(raw) ? `'${raw}` : raw;
          return `"${safe.replace(/"/g, '""')}"`;
        };
        const lines = [columns.map(cell).join(",")];
        for (let exportPage = 1; ; exportPage++) {
          const exportParams = new URLSearchParams(params);
          exportParams.set("page", String(exportPage));
          exportParams.set("limit", "100");
          const batch = await request<{ items: Order[]; meta: { total: number } }>(`admin/orders/page?${exportParams}`);
          for (const order of batch.items) {
            const balance = orderBalance(order);
            const values: unknown[] = [order.id, order.orderNumber, order.createdAt, order.customerAccount?.businessName, order.user?.email, order.status, order.currency, order.total];
            if (canViewBilling) values.push(balance.status, balance.paid, balance.due);
            lines.push(values.map(cell).join(","));
          }
          if (exportPage * 100 >= batch.meta.total) break;
        }
        const url = URL.createObjectURL(new Blob([`\uFEFF${lines.join("\r\n")}\r\n`], { type: "text/csv;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "pedidos.csv";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else await downloadPrivateFile(`admin/orders/export?${params}`, "pedidos.csv");
    }
    catch (error) { setExportError(error); }
    finally { setExporting(false); }
  }
  if (q.isPending) return <Loading />;
  if (q.error)
    return <ErrorBox error={q.error} retry={() => void q.refetch()} />;
  const rows = q.data.items;
  return (
    <>
      <div className="admin-toolbar">
        <h2>{user?.role === "SALES" ? "Pedidos asignados" : "Pedidos"}</h2>
        <ShareAdminList />
        <span className="muted small-copy">
          {q.data.meta.total} {q.data.meta.total === 1 ? "pedido" : "pedidos"}
        </span>
        <button className="button small secondary" disabled={exporting} onClick={() => void exportCsv()}><Download size={16} /> {exporting ? "Exportando…" : "Exportar CSV"}</button>
        <div className="admin-order-filters">
          <input
            className="form-input"
            type="search"
            aria-label="Buscar pedidos"
            placeholder="ID, cliente o correo"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <select
            className="form-input"
            aria-label="Filtrar estado de pedidos"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">Todos los estados</option>
            {orderStatuses.map((key) => (
                <option value={key} key={key}>
                  {label(key)}
                </option>
              ))}
          </select>
          <input className="form-input" type="search" aria-label="Filtrar cliente" placeholder={customerId ? "Cliente seleccionado" : "Cliente o correo"} value={customer} onChange={(event) => { setCustomer(event.target.value); setCustomerId(""); setPage(1); }} />
          {customerId && <button className="button small secondary" type="button" onClick={() => { setCustomerId(""); setPage(1); }}>Todos los clientes</button>}
          <label className="field">Desde<input className="form-input" type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} /></label>
          <label className="field">Hasta<input className="form-input" type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} /></label>
          {canViewBilling && <select className="form-input" aria-label="Filtrar estado de pago" value={paymentStatus} onChange={(event) => { setPaymentStatus(event.target.value); setPage(1); }}>
            <option value="">Todos los pagos</option><option value="PENDING">Pendiente</option><option value="PARTIAL">Parcial</option><option value="PAID">Completo</option><option value="CREDITED">Acreditado</option>
          </select>}
        </div>
      </div>
      {exportError !== undefined && <ErrorBox error={exportError} />}
      {rows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>PEDIDO</th>
                <th>CLIENTE</th>
                <th>ESTADO</th>
                <th>TOTAL</th>
                {canViewBilling && <th>ABONADO</th>}
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td>
                    <AdminRecordLink className="text-link" href={storeRoutes.adminOrder(o.id)}>{o.orderNumber}</AdminRecordLink>
                    <br />
                    {new Date(o.createdAt).toLocaleDateString("es-UY")}
                  </td>
                  <td>{o.user?.email || o.customerAccount?.businessName || "Sin correo"}</td>
                  <td>
                    <span className="status-pill" data-status={o.status}>{label(o.status)}</span>
                  </td>
                  <td>{money(o.total, o.currency)}</td>
                  {canViewBilling && <td>{money(orderBalance(o).paid, o.currency)}</td>}
                  <td>
                    <AdminRecordLink className="button small secondary" aria-label={`Gestionar ${o.orderNumber}`} href={storeRoutes.adminOrder(o.id)}>Gestionar</AdminRecordLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title={debouncedSearch
            ? "No hay pedidos que coincidan con la búsqueda"
            : status ? "No hay pedidos en este estado" : "Todavía no hay pedidos"}
        />
      )}
      <AdminPagination meta={q.data.meta} onPage={setPage} />
    </>
  );
}
function ProductManagement({ edit }: { edit: OpenEditor }) {
  const { user } = useSession();
  const canEdit = canEditAdminFeature(user, "catalogo");
  const selection = useAdminSelection();
  const [page, setPage] = useAdminListField("page", 1),
    [search, setSearch] = useAdminListField("search", ""),
    [activity, setActivity] = useAdminListField("active", "", ["", "true", "false"]);
  const [searchInput, setSearchInput] = [search, setSearch];
  const [brand, setBrand] = useAdminListField("brandId", "");
  const [category, setCategory] = useAdminListField("categoryId", "");
  const [withoutPrice, setWithoutPrice] = useAdminListField("withoutPrice", false);
  const [withoutStock, setWithoutStock] = useAdminListField("withoutStock", false);
  const [productSearch, setProductSearch] = useState(search.trim());
  useEffect(() => {
    const timer = setTimeout(() => setProductSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const q = useApi<ProductList>(
    adminListPath("products/admin/list", { limit: 12, page, search: productSearch, active: activity, brandId: brand, categoryId: category, withoutPrice, withoutStock }),
  );
  const brands = useApi<Entity[]>("brands"),
    categories = useApi<Entity[]>("categories/catalog"),
    labs = useApi<Entity[]>("laboratories");
  useAdminListScroll(!q.isPending && !q.error && productSearch === search.trim());
  return (
    <>
      <div className="admin-toolbar">
        <h2>Catálogo y existencias</h2>
        <ShareAdminList />
        {canEdit && <button className="button small" onClick={() => edit(adminProductEditor(undefined, brands.data, categories.data, labs.data))}>
          <Plus size={16} />
          Crear producto
        </button>}
      </div>
      <form
        className="inline-search"
        style={{ marginBottom: 25 }}
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(String(new FormData(e.currentTarget).get("search") ?? ""));
          setPage(1);
        }}
      >
        <input
          className="form-input"
          name="search"
          aria-label="Buscar producto para administrar"
          placeholder="Nombre o SKU"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <button className="button small">Buscar</button>
      </form>
      <div className="admin-status-filter" role="group" aria-label="Estado de productos">
        {[["", "Todos"], ["true", "Activos"], ["false", "Inactivos"]].map(([value, title]) => (
          <button key={title} className={activity === value ? "button small" : "button small secondary"} type="button"
            onClick={() => { setActivity(value); setPage(1); }}>
            {title}
          </button>
        ))}
      </div>
      <AdminListFilters active={!!(searchInput || search || activity || brand || category || withoutPrice || withoutStock)} onClear={() => { setSearch(""); setSearchInput(""); setActivity(""); setBrand(""); setCategory(""); setWithoutPrice(false); setWithoutStock(false); setPage(1); }}>
        <label className="field">Marca<select className="form-input" aria-label="Marca" value={brand} onChange={(event) => { setBrand(event.target.value); setPage(1); }}>
          <option value="">Todas las marcas</option>{brands.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>
        <label className="field">Categoría<select className="form-input" aria-label="Categoría" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}>
          <option value="">Todas las categorías</option>{categories.data?.map((item) => <option key={item.id} value={item.id}>{item.parentId ? `${categories.data?.find((parent) => parent.id === item.parentId)?.name ?? "Subcategoría"} / ` : ""}{item.name}</option>)}
        </select></label>
        <label className="admin-filter-check"><input type="checkbox" checked={withoutPrice} onChange={(event) => { setWithoutPrice(event.target.checked); setPage(1); }} />Sin precio vigente</label>
        <label className="admin-filter-check"><input type="checkbox" checked={withoutStock} onChange={(event) => { setWithoutStock(event.target.checked); setPage(1); }} />Sin stock disponible</label>
      </AdminListFilters>
      {q.isPending ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={() => void q.refetch()} /> : q.data && <>
      {canEdit && <AdminBulkActions kind="products" selection={selection} />}
      <div className="actions admin-history-actions"><BulkHistory feature="catalogo" /></div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {canEdit && <th className="admin-selection-cell"><PageSelection selection={selection} rows={q.data.items.map((p) => ({ id: p.id, name: p.name }))} /></th>}
              <th>PRODUCTO</th>
              <th>MARCA</th>
              <th>PRESENTACIONES</th>
              <th>STOCK</th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {q.data.items.map((p) => {
              const availableStock = p.variants
                .filter((variant) => variant.active !== false)
                .reduce((total, variant) => total + variant.availableStock, 0);
              return <tr key={p.id}>
                {canEdit && <td className="admin-selection-cell"><RowSelection selection={selection} id={p.id} name={p.name} /></td>}
                <td>
                  <div className="row">
                    <Picture
                      src={
                        p.media.find((m) => m.type === "IMAGE")?.url ??
                        "/images/placeholder.svg"
                      }
                      alt=""
                      sizes="42px"
                      style={{ width: 42, height: 42, objectFit: "contain" }}
                    />
                    <strong>{p.name}</strong>
                    <span className="status-pill">{p.active === false ? "Inactivo" : "Activo"}</span>
                  </div>
                </td>
                <td>{p.brand?.name ?? p.laboratory?.name ?? "—"}</td>
                <td>{p.variants.length}</td>
                <td><strong>{availableStock}</strong> uds.</td>
                <td>
                  <AdminRecordLink className="button small secondary" href={canEdit ? storeRoutes.adminProduct(p.slug) : storeRoutes.adminProductPreview(p.slug)}>
                    {canEdit ? <Pencil size={15} /> : null}{canEdit ? "Editar producto" : "Ver producto"}
                  </AdminRecordLink>
                </td>
              </tr>
            })}
          </tbody>
        </table>
      </div>
      {!q.data.items.length && <Empty title="No encontramos productos con esos filtros" />}
      <ListPagination meta={q.data.meta} onPage={setPage} />
      </>}
    </>
  );
}
export function VariantManagement({
  product,
  edit,
}: {
  product: Product;
  edit: OpenEditor;
}) {
  const { user } = useSession();
  const canEdit = canEditAdminFeature(user, "catalogo");
  const [stockId, setStockId] = useState("");
  const stock = useApi<{
    physicalStock: number;
    reservedStock: number;
    availableStock: number;
  }>(`inventory/variants/${stockId}/stock`, !!stockId);
  const fields: Field[] = [
    text("sku", "SKU"),
    text("name", "Nombre de la presentación"),
    text("ean", "EAN", false),
    text("presentation", "Descripción de presentación", false),
    number("saleMultiple", "Múltiplo de venta", 1),
    number("minimumOrderQuantity", "Cantidad mínima", 1),
    bool("active", "Presentación activa"),
  ];
  function variantEditor(v?: Variant) {
    edit({
      title: v ? "Editar presentación" : "Nueva presentación",
      path: v ? `products/variants/${v.id}` : `products/${product.id}/variants`,
      method: v ? "PATCH" : "POST",
      fields,
      initial: v
        ? { ...v }
        : { saleMultiple: 1, minimumOrderQuantity: 1, active: true },
    });
  }
  return (
    <>
      <h3 style={{ marginTop: 20 }}>{product.name}</h3>
      <div className="actions">
        {canEdit && <button className="button small" onClick={() => variantEditor()}>
          Agregar presentación
        </button>}
      </div>
      <div className="stack" style={{ marginTop: 20 }}>
        {product.variants.map((v) => (
          <div className="card" key={v.id}>
            <h3>{v.name}</h3>
            <p className="small-copy muted">
              {v.sku} · Disponible: {v.availableStock} ·{" "}
              {v.price ? money(v.price.amount, v.price.currency) : "Sin precio"}
            </p>
            <div className="actions">
              {canEdit && <button
                className="button small secondary"
                onClick={() => variantEditor(v)}
              >
                Editar presentación
              </button>}
              {canEdit && <button
                className="button small secondary"
                onClick={() =>
                  edit({
                    title: `Precio · ${v.name}`,
                    path: `pricing/variants/${v.id}`,
                    method: "PATCH",
                    fields: [
                      number("amount", "Precio", 0, "any"),
                      select("currency", "Moneda", options(["UYU", "USD"])),
                    ],
                    initial: {
                      amount: v.price?.amount,
                      currency: v.price?.currency ?? "UYU",
                    },
                    description:
                      "Se actualizará el precio vigente en la lista mayorista del backend.",
                  })
                }
              >
                Precio
              </button>}
              <button
                className="button small secondary"
                onClick={() => setStockId(v.id)}
              >
                Existencias
              </button>
            </div>
          </div>
        ))}
      </div>
      {stockId && (
        <div className="card" style={{ marginTop: 20 }}>
          {stock.isPending ? (
            <Loading />
          ) : stock.error ? (
            <ErrorBox error={stock.error} />
          ) : (
            <>
              <p>
                Stock físico: {stock.data.physicalStock} · Reservado:{" "}
                {stock.data.reservedStock} · Disponible:{" "}
                {stock.data.availableStock}
              </p>
              <div className="actions">
                {canEdit && <button
                  className="button small"
                  onClick={() =>
                    edit({
                      title: "Actualizar stock físico",
                      path: `inventory/variants/${stockId}/stock`,
                      method: "PATCH",
                      fields: [
                        number(
                          "physicalStock",
                          "Stock físico",
                          stock.data.reservedStock,
                        ),
                      ],
                      initial: { physicalStock: stock.data.physicalStock },
                      description:
                        "Las reservas se mantienen. El stock físico no puede ser menor al reservado.",
                    })
                  }
                >
                  Actualizar
                </button>}
                <button
                  className="button secondary small"
                  onClick={() => setStockId("")}
                >
                  Cerrar
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
function Marketing({
  edit,
  recommendations = false,
}: {
  edit: OpenEditor;
  recommendations?: boolean;
}) {
  const path = recommendations ? "admin/recommendations" : "admin/promotions";
  const mutationPath = recommendations ? "recommendations" : "promotions";
  const client = useQueryClient();
  const { notify, user } = useSession();
  const canEdit = canEditAdminFeature(user, recommendations ? "recomendaciones" : "promociones");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<unknown>();
  const [promotionRule, setPromotionRule] = useState<Rule | null | undefined>(undefined);
  const [recommendationRule, setRecommendationRule] = useState<Rule | null | undefined>(undefined);
  const [recommendationBusy, setRecommendationBusy] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedProductSearch(productSearch.trim()), 250);
    return () => clearTimeout(timer);
  }, [productSearch]);
  const q = useApi<Rule[]>(path);
  const products = useApi<ProductList>(`products?limit=100&search=${encodeURIComponent(debouncedProductSearch)}`, !recommendations);
  const brands = useApi<Entity[]>("brands", !recommendations),
    categories = useApi<Entity[]>("categories/catalog", !recommendations),
    labs = useApi<Entity[]>("laboratories", !recommendations);
  const expiration = useApi<Expiration[]>(
    "promotions/expiration",
    !recommendations,
  );
  const targets = [
    ...(products.data?.items.map((p) => ({
      value: `PRODUCT:${p.id}`,
      label: `Producto · ${p.name}`,
    })) ?? []),
    ...(products.data?.items.flatMap((p) =>
      p.variants.map((v) => ({
        value: `PRODUCT_VARIANT:${v.id}`,
        label: `Presentación · ${p.name} · ${v.name}`,
      })),
    ) ?? []),
    ...(
      [
        ["BRAND", brands.data],
        ["CATEGORY", categories.data],
        ["LABORATORY", labs.data],
      ] as const
    ).flatMap(([type, items]) =>
      (items ?? []).map((i) => ({
        value: `${type}:${i.id}`,
        label: `${type === "BRAND" ? "Marca" : type === "CATEGORY" ? "Categoría" : "Laboratorio"} · ${i.name}`,
      })),
    ),
  ];
  const day = (value?: string) => value ? value.slice(0, 10) : "";
  async function action(rule: Rule | Expiration, target: string, method: "PATCH" | "DELETE", body?: unknown) {
    if (method === "DELETE" && !window.confirm(`¿Eliminar ${"name" in rule ? rule.name : "esta promoción"}?`)) return;
    setBusyId(rule.id);
    setActionError(undefined);
    try {
      await request(target, method, body);
      await invalidateAdminMutation(client, target);
      notify(method === "DELETE" ? "Regla eliminada." : "Regla actualizada.");
    } catch (cause) { setActionError(cause); }
    finally { setBusyId(null); }
  }
  function create(rule?: Rule, advanced = false) {
    if (recommendations) {
      setRecommendationRule(rule ?? null);
      return;
    }
    if (!recommendations && !advanced && (!rule || scopedPromotion(rule))) {
      setPromotionRule(rule ?? null);
      return;
    }
    const condition = rule?.conditions?.[0];
    const reward = rule?.rewards?.[0];
    const selectedTargets = [
      rule?.triggerType && rule.triggerId ? `${rule.triggerType}:${rule.triggerId}` : "",
      condition?.targetType && condition.targetId ? `${condition.targetType}:${condition.targetId}` : "",
      reward?.targetType && reward.targetId ? `${reward.targetType}:${reward.targetId}` : "",
    ].filter(Boolean);
    const availableTargets = [...targets];
    for (const value of selectedTargets) if (!availableTargets.some((target) => target.value === value)) availableTargets.push({ value, label: `Actual · ${value}` });
      edit({
        title: rule ? "Editar promoción" : "Crear regla cruzada",
        path: rule ? `promotions/${rule.id}` : path,
        method: rule ? "PATCH" : "POST",
        fields: [
          text("name", "Nombre"),
          { key: "description", label: "Descripción", type: "textarea" },
          select("type", "Tipo", [
            { value: "PERCENTAGE", label: "Porcentaje" },
            { value: "FIXED_AMOUNT", label: "Importe fijo" },
            { value: "CROSS_DISCOUNT", label: "Descuento cruzado" },
          ]),
          select("condition", "Compra que activa el beneficio", availableTargets),
          select("metric", "Condición", [{ value: "MIN_QUANTITY", label: "Cantidad mínima" }, { value: "MIN_AMOUNT", label: "Importe mínimo" }]),
          { ...number("minQuantity", "Cantidad mínima", 1), required: false },
          { ...number("minAmount", "Importe mínimo", 0, "any"), required: false },
          select("reward", "Productos que reciben el beneficio", availableTargets),
          select("rewardType", "Beneficio", [
            { value: "PERCENTAGE", label: "Porcentaje" },
            { value: "FIXED_AMOUNT", label: "Importe por unidad" },
            {
              value: "PROMOTIONAL_PRICE",
              label: "Precio promocional por unidad",
            },
          ]),
          number("value", "Valor del beneficio", 0, "any"),
          date("startsAt", "Comienza"),
          date("endsAt", "Finaliza", false),
          number("priority", "Prioridad", 0),
          bool("combinable", "Combinable con otras promociones"),
        ],
        initial: rule ? {
          name: rule.name, description: rule.description ?? "", type: rule.type ?? "PERCENTAGE",
          condition: `${condition?.targetType}:${condition?.targetId}`,
          metric: condition?.metric ?? "MIN_QUANTITY", minQuantity: condition?.minQuantity ?? "",
          minAmount: condition?.minAmount ?? "",
          reward: `${reward?.targetType}:${reward?.targetId}`,
          rewardType: reward?.rewardType ?? "PERCENTAGE",
          value: reward?.rewardType === "PERCENTAGE" ? reward.percentage : reward?.amount,
          startsAt: day(rule.startsAt), endsAt: day(rule.endsAt),
          priority: rule.priority ?? 0, combinable: rule.combinable ?? false,
        } : {
          type: "CROSS_DISCOUNT",
          rewardType: "PERCENTAGE",
          metric: "MIN_QUANTITY",
          minQuantity: 1,
          startsAt: new Date().toISOString().slice(0, 10),
          priority: 0, combinable: false,
        },
        transform: ({
          condition,
          reward,
          rewardType,
          metric,
          minQuantity,
          minAmount,
          value,
          ...data
        }) => {
          if (rewardType === "PERCENTAGE" && Number(value) > 100)
            throw new Error("El porcentaje no puede superar 100.");
          if (data.endsAt && String(data.endsAt) < String(data.startsAt))
            throw new Error("La fecha final debe ser posterior al inicio.");
          if (metric === "MIN_QUANTITY" && !minQuantity) throw new Error("Indicá la cantidad mínima.");
          if (metric === "MIN_AMOUNT" && !minAmount) throw new Error("Indicá el importe mínimo.");
          const [ct, ci] = String(condition).split(":"),
            [rt, ri] = String(reward).split(":");
          return {
            ...data,
            conditions: [
              {
                targetType: ct,
                targetId: ci,
                metric,
                ...(metric === "MIN_QUANTITY" ? { minQuantity } : { minAmount }),
              },
              ...(rule?.conditions?.slice(1).map((item) => ({
                targetType: item.targetType, targetId: item.targetId, metric: item.metric,
                minQuantity: item.minQuantity, minAmount: item.minAmount,
              })) ?? []),
            ],
            rewards: [
              {
                targetType: rt,
                targetId: ri,
                rewardType,
                ...(rewardType === "PERCENTAGE"
                  ? { percentage: value }
                  : { amount: value }),
              },
              ...(rule?.rewards?.slice(1).map((item) => ({
                targetType: item.targetType, targetId: item.targetId,
                rewardType: item.rewardType, percentage: item.percentage, amount: item.amount,
              })) ?? []),
            ],
          };
        },
        description: rule && ((rule.conditions?.length ?? 0) > 1 || (rule.rewards?.length ?? 0) > 1)
          ? "Esta regla tiene condiciones o beneficios adicionales; se conservarán sin cambios."
          : undefined,
      });
  }
  return (
    <>
      <div className="admin-toolbar">
        <h2>
          {recommendations
            ? "Recomendaciones de carrito"
            : "Promociones comerciales"}
        </h2>
        {canEdit && <button
          className="button small"
          onClick={() => create()}
        >
          Crear {recommendations ? "recomendación" : "promoción"}
        </button>}
        {!recommendations && canEdit && <button className="button small secondary" disabled={!products.data} onClick={() => create(undefined, true)}>Crear regla cruzada</button>}
      </div>
      {!recommendations && <input className="form-input admin-category-search" type="search" aria-label="Buscar producto para reglas cruzadas" placeholder="Buscar producto para reglas cruzadas" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} />}
      {actionError && <ErrorBox error={actionError} />}
      {products.error && (
        <ErrorBox
          error={products.error}
          retry={() => void products.refetch()}
        />
      )}
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} />
      ) : q.data.length ? (
        <div className="admin-cards">
          {q.data.map((rule) => (
            <div className="card" key={rule.id}>
              <h3>{rule.name}</h3>
              {!recommendations && <p className="small-copy muted">
                {rule.description ??
                  "Promoción configurada"}
              </p>}
              <p className="small-copy">
                {rule.startsAt
                  ? `Desde ${new Date(rule.startsAt).toLocaleDateString("es-UY")}`
                  : "Sin fecha inicial"}
                {rule.endsAt
                  ? ` · Hasta ${new Date(rule.endsAt).toLocaleDateString("es-UY")}`
                  : ""}
              </p>
              <p className="small-copy">
                {rule.active === false ? "Inactiva" : "Activa"}
              </p>
              {recommendations && <>
                <p className="small-copy">Se activa al comprar: {rule.triggerTargets?.map((item) => item.name).join(", ") ?? rule.triggerIds?.join(", ") ?? rule.triggerId}</p>
                <p className="small-copy">Recomendar: {rule.targetTargets?.map((item) => item.name).join(", ") ?? rule.targetIds?.join(", ") ?? rule.products?.map((item) => item.productId).join(", ")}</p>
              </>}
              {!recommendations && scopedPromotion(rule) && <p className="small-copy">
                Aplicada a {rule.rewards.length} {rule.rewards[0].targetType === "PRODUCT"
                  ? rule.rewards.length === 1 ? "producto" : "productos"
                  : rule.rewards[0].targetType === "BRAND"
                    ? rule.rewards.length === 1 ? "marca" : "marcas"
                    : rule.rewards.length === 1 ? "categoría" : "categorías"}
              </p>}
              {canEdit && <div className="actions">
                <button className="button small secondary" disabled={!!busyId || (!recommendations && !scopedPromotion(rule) && !products.data)} onClick={() => create(rule)}><Pencil size={15} /> Editar</button>
                <button className="button small secondary" disabled={!!busyId} onClick={() => void action(rule, recommendations ? `recommendations/${rule.id}/active` : `promotions/${rule.id}/${rule.active === false ? "activate" : "deactivate"}`, "PATCH", recommendations ? { active: rule.active === false } : undefined)}>
                  {rule.active === false ? "Activar" : "Desactivar"}
                </button>
                <button className="icon-button" title={`Eliminar ${rule.name}`} aria-label={`Eliminar ${rule.name}`} disabled={!!busyId} onClick={() => void action(rule, `${mutationPath}/${rule.id}`, "DELETE")}><Trash2 size={16} /></button>
              </div>}
            </div>
          ))}
        </div>
      ) : (
        <Empty
          title={
            recommendations
              ? "Todavía no hay recomendaciones"
              : "Todavía no hay promociones"
          }
        />
      )}{" "}
      {!recommendations && (
        <section style={{ marginTop: 35 }}>
          <div className="admin-toolbar">
            <h2>Próximo vencimiento</h2>
            {canEdit && <button
              className="button secondary small"
              disabled={!products.data}
              onClick={() =>
                edit({
                  title: "Promoción por vencimiento",
                  path: "promotions/expiration",
                  fields: [
                    select(
                      "variantId",
                      "Presentación",
                      products.data?.items.flatMap((p) =>
                        p.variants.map((v) => ({
                          value: v.id,
                          label: `${p.name} · ${v.name}`,
                        })),
                      ) ?? [],
                    ),
                    text("batch", "Lote", false),
                    date("expirationDate", "Vencimiento del lote"),
                    { ...number("discountPercentage", "Descuento (%)", 0, "any"), required: false },
                    { ...number("promotionalPrice", "Precio promocional", 0, "any"), required: false },
                    date("startsAt", "Comienza"),
                    date("endsAt", "Finaliza", false),
                    {
                      ...number("quantityLimit", "Cantidad máxima", 1),
                      required: false,
                    },
                  ],
                  initial: { startsAt: new Date().toISOString().slice(0, 10) },
                  transform: (data) => {
                    if (!data.discountPercentage && !data.promotionalPrice)
                      throw new Error("Indicá un descuento o un precio promocional.");
                    if (Number(data.discountPercentage) > 100)
                      throw new Error("El porcentaje no puede superar 100.");
                    return data;
                  },
                })
              }
            >
              Crear por vencimiento
            </button>}
          </div>
          {expiration.isPending ? (
            <Loading />
          ) : expiration.error ? (
            <ErrorBox error={expiration.error} />
          ) : (
            <div className="admin-cards">
              {expiration.data.map((p) => (
                <div className="card" key={p.id}>
                  <h3>
                    {products.data?.items.find(
                      (i) =>
                        i.variants.some((v) => v.id === p.variantId) ||
                        i.id === p.productId,
                    )?.name ?? "Producto de la promoción"}
                  </h3>
                  <p>Lote: {p.batch ?? "Sin especificar"}</p>
                  <p>
                    Vence:{" "}
                    {new Date(p.expirationDate).toLocaleDateString("es-UY")}
                  </p>
                  <p>
                    {p.discountPercentage
                      ? `${p.discountPercentage}% de descuento`
                      : `Precio promocional: ${p.promotionalPrice}`}
                  </p>
                  <p className="small-copy">{p.active === false ? "Inactiva" : "Activa"}</p>
                  {canEdit && <div className="actions">
                    <button className="button small secondary" disabled={!!busyId || !products.data} onClick={() => edit({
                      title: "Editar promoción por vencimiento", path: `promotions/expiration/${p.id}`, method: "PATCH",
                      fields: [
                        select("variantId", "Presentación", [
                          ...(products.data?.items.flatMap((item) => item.variants.map((variant) => ({ value: variant.id, label: `${item.name} · ${variant.name}` }))) ?? []),
                          ...(!products.data?.items.some((item) => item.variants.some((variant) => variant.id === p.variantId)) && p.variantId ? [{ value: p.variantId, label: `Actual · ${p.variantId}` }] : []),
                        ]),
                        text("batch", "Lote", false), date("expirationDate", "Vencimiento del lote"),
                        { ...number("discountPercentage", "Descuento (%)", 0, "any"), required: false },
                        { ...number("promotionalPrice", "Precio promocional", 0, "any"), required: false },
                        date("startsAt", "Comienza"), date("endsAt", "Finaliza", false),
                        { ...number("quantityLimit", "Cantidad máxima", 1), required: false },
                        bool("active", "Promoción activa"),
                      ],
                      initial: {
                        variantId: p.variantId, batch: p.batch ?? "", expirationDate: day(p.expirationDate),
                        discountPercentage: p.discountPercentage ?? "", promotionalPrice: p.promotionalPrice ?? "",
                        startsAt: day(p.startsAt), endsAt: day(p.endsAt), quantityLimit: p.quantityLimit ?? "", active: p.active !== false,
                      },
                      transform: (data) => {
                        if (!data.discountPercentage && !data.promotionalPrice) throw new Error("Indicá un descuento o un precio promocional.");
                        if (Number(data.discountPercentage ?? 0) > 100) throw new Error("El porcentaje no puede superar 100.");
                        return data;
                      },
                    })}><Pencil size={15} /> Editar</button>
                    <button className="button small secondary" disabled={!!busyId} onClick={() => void action(p, `promotions/expiration/${p.id}`, "PATCH", {
                      productId: p.productId, variantId: p.variantId, batch: p.batch,
                      expirationDate: p.expirationDate, discountPercentage: p.discountPercentage,
                      promotionalPrice: p.promotionalPrice, startsAt: p.startsAt, endsAt: p.endsAt,
                      quantityLimit: p.quantityLimit, active: p.active === false,
                    })}>{p.active === false ? "Activar" : "Desactivar"}</button>
                    <button className="icon-button" title="Eliminar promoción por vencimiento" aria-label="Eliminar promoción por vencimiento" disabled={!!busyId} onClick={() => void action(p, `promotions/expiration/${p.id}`, "DELETE")}><Trash2 size={16} /></button>
                  </div>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      <Modal open={promotionRule !== undefined} onClose={() => setPromotionRule(undefined)} title={promotionRule ? "Editar promoción" : "Crear promoción"} className="promotion-editor-modal">
        {promotionRule !== undefined && <AdminPromotionForm key={promotionRule?.id ?? "new"} rule={promotionRule ?? undefined} onDone={() => setPromotionRule(undefined)} />}
      </Modal>
      <Modal open={recommendationRule !== undefined} onClose={() => { if (!recommendationBusy) setRecommendationRule(undefined); }} title={recommendationRule ? "Editar recomendación" : "Crear recomendación"} className="promotion-editor-modal">
        {recommendationRule !== undefined && <AdminRecommendationForm key={recommendationRule?.id ?? "new"} rule={recommendationRule ?? undefined} onBusy={setRecommendationBusy} onDone={() => setRecommendationRule(undefined)} />}
      </Modal>
    </>
  );
}
export function AdminNav({ section, email }: { section: string; email?: string }) {
  // Misma consulta que el Resumen: los contadores no suman pedidos a la API.
  const { logout, user } = useSession();
  const counts = useApi<Record<string, number>>("admin/dashboard", canSeeAdminSection(user, ""));
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<unknown>();
  const nav = useRef<HTMLElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try { setCollapsed(window.localStorage.getItem("districo-admin-nav-collapsed") === "true"); }
      catch { /* El menú sigue funcionando si el almacenamiento está deshabilitado. */ }
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { window.localStorage.setItem("districo-admin-nav-collapsed", String(next)); }
    catch { /* La preferencia es opcional. */ }
  };
  // En móvil la navegación es una franja con scroll: centra la sección activa
  // moviendo solo la franja, no la página.
  useEffect(() => {
    const strip = nav.current;
    const active = strip?.querySelector<HTMLElement>("a.active");
    if (!strip || !active || strip.scrollWidth <= strip.clientWidth) return;
    strip.scrollLeft =
      active.offsetLeft - (strip.clientWidth - active.offsetWidth) / 2;
  }, [section]);
  // El fondo lima de la sección activa es un solo indicador que se desliza
  // (motion.css). La primera ubicación no anima; las siguientes sí.
  useLayoutEffect(() => {
    const strip = nav.current;
    const mark = indicator.current;
    if (!strip || !mark) return;
    const place = () => {
      const active = strip.querySelector<HTMLElement>("a.active");
      mark.hidden = !active;
      if (!active) return;
      mark.style.setProperty("--indicator-x", `${active.offsetLeft}px`);
      mark.style.setProperty("--indicator-y", `${active.offsetTop}px`);
      mark.style.setProperty("--indicator-width", `${active.offsetWidth}px`);
      mark.style.setProperty("--indicator-height", `${active.offsetHeight}px`);
    };
    place();
    const ready = requestAnimationFrame(() => {
      mark.dataset.ready = "true";
    });
    const resize = new ResizeObserver(place);
    resize.observe(strip);
    return () => {
      cancelAnimationFrame(ready);
      resize.disconnect();
    };
  }, [section, counts.data, collapsed]);
  return (
    <aside className="admin-sidebar" data-collapsed={collapsed}>
      <div className="admin-sidebar-head">
        <div className="admin-sidebar-identity">
          <strong>Administración</strong>
          {email && <span>{email}</span>}
        </div>
        <button
          type="button"
          className="admin-sidebar-toggle"
          aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
          title={collapsed ? "Expandir menú" : "Contraer menú"}
          aria-expanded={!collapsed}
          aria-controls="admin-navigation"
          onClick={toggleCollapsed}
        ><Menu size={20} /></button>
      </div>
      <AdminCommandMenu />
      <nav className="admin-nav" aria-label="Administración" id="admin-navigation" ref={nav}>
        <span className="admin-nav-indicator" ref={indicator} aria-hidden="true" />
        {groups.filter((group) => sections.some(([g, path]) => g === group && canSeeAdminSection(user, path))).map((group) => (
          <div className="admin-nav-group" key={group}>
            <p>{group}</p>
            {sections
              .filter(([g, path]) => g === group && canSeeAdminSection(user, path))
              .map(([, path, title, Icon, countKey]) => {
                const visibleTitle = user?.role === "SALES" && path === "clientes" ? "Clientes asignados" :
                  user?.role === "SALES" && path === "pedidos" ? "Pedidos asignados" : title;
                const count = countKey && !(user?.role === "SALES" && path === "pedidos") ? (counts.data?.[countKey] ?? 0) : 0;
                return (
                  <Link
                    className={section === path ? "active" : ""}
                    aria-current={section === path ? "page" : undefined}
                    aria-label={visibleTitle}
                    title={collapsed ? visibleTitle : undefined}
                    href={path ? storeRoutes.adminSection(path) : storeRoutes.admin}
                    key={path}
                  >
                    <Icon size={17} aria-hidden="true" />
                    <span>{visibleTitle}</span>
                    {count > 0 && (
                      <em
                        className="admin-nav-count"
                        aria-label={`${count} pendientes`}
                      >
                        {count}
                      </em>
                    )}
                  </Link>
                );
              })}
          </div>
        ))}
      </nav>
      <div className="admin-sidebar-footer">
        <button
          type="button"
          className="admin-logout"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          disabled={loggingOut}
          onClick={async () => {
            setLoggingOut(true);
            setLogoutError(undefined);
            try {
              await logout();
              router.replace(storeRoutes.login);
            } catch (error) {
              setLogoutError(error);
            } finally {
              setLoggingOut(false);
            }
          }}
        >
          <LogOut size={17} aria-hidden="true" />
          <span>{loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}</span>
        </button>
        {logoutError !== undefined && <ErrorBox error={logoutError} />}
      </div>
    </aside>
  );
}
function AdminSection({ section, edit }: { section: string; edit: OpenEditor }) {
  return section === "" ? (
    <Dashboard />
  ) : section === "consultas" ? (
    <ContactInquiries edit={edit} />
  ) : section === "solicitudes" ? (
    <Applications edit={edit} />
  ) : section === "clientes" ? (
    <Customers />
  ) : section === "vendedores" ? (
    <AdminSalespeople />
  ) : section === "pedidos" ? (
    <AdminOrders />
  ) : section === "catalogo" ? (
    <ProductManagement edit={edit} />
  ) : section === "marcas" ? (
    <AdminBrandsLabs edit={edit} />
  ) : section === "categorias" ? (
    <AdminCategories edit={edit} />
  ) : section === "promociones" ? (
    <Marketing edit={edit} />
  ) : section === "banners" ? (
    <AdminBanners />
  ) : section === "recomendaciones" ? (
    <Marketing edit={edit} recommendations />
  ) : section === "personal" ? (
    <AdminStaff />
  ) : section === "roles" ? (
    <AdminRoles />
  ) : (
    <Empty title="Sección no disponible" />
  );
}
export function Admin({ section = "" }: { section?: string }) {
  const { user } = useSession();
  const router = useRouter();
  const [editor, setEditor] = useState<Editor | null>(null);
  const current = sections.find(([, path]) => path === section);
  useEffect(() => {
    if (section || !user || canSeeAdminSection(user, "")) return;
    const first = sections.find(([, path]) => path && canSeeAdminSection(user, path));
    if (first) router.replace(storeRoutes.adminSection(first[1]));
  }, [section, user, router]);
  return (
    <div className="container admin-page section">
      <AccessGate admin>
        <div className="admin-shell">
          <AdminNav section={section} email={user?.email} />
          <div className="admin-main">
            {/* Cada sección entra con su propia transición (motion.css); la
                barra lateral queda fija. */}
            <ViewTransition
              key={section}
              enter="section-enter"
              exit="section-exit"
              default="none"
            >
              <div className="admin-section">
                <PageHeading
                  eyebrow="Administración"
                  title={
                    section && current
                      ? current[2]
                      : "Resumen"
                  }
                />
                {canSeeAdminSection(user, section) ? <AdminSection section={section} edit={setEditor} /> : <Empty title="No tenés acceso a esta sección" />}
              </div>
            </ViewTransition>
          </div>
        </div>
        <Modal
          open={!!editor}
          onClose={() => setEditor(null)}
          title={editor?.title ?? ""}
        >
          {editor && (
            <AdminForm editor={editor} onDone={() => setEditor(null)} />
          )}
        </Modal>
      </AccessGate>
    </div>
  );
}
