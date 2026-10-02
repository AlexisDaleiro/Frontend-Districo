"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  ViewTransition,
} from "react";
import {
  ArrowUpRight,
  BadgePercent,
  Images,
  ClipboardList,
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
  type LucideIcon,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AccessGate } from "./auth";
import { request, useApi, useSession } from "./providers";
import { AdminForm, type Editor, type Field } from "./admin-form";
import { Empty, ErrorBox, Loading, Modal, PageHeading, Picture } from "./ui";
import { CountUp } from "./count-up";
import { OrderItems } from "./orders";
import { OrderBilling } from "./order-billing";
import { AdminSales } from "./admin-sales";
import { AdminBanners } from "./admin-banners";
import { AdminStaff } from "./admin-staff";
import { AdminBrandsLabs, AdminCategories } from "./admin-organization";
import { orderBalance } from "@/lib/order-billing";
import { orderProgressChoices, orderProgressOptionLabel } from "@/lib/order-progress";
import { storeRoutes } from "@/lib/store-routes";
import { adminProductEditor } from "@/lib/admin-product-editor";
import { canSeeAdminSection } from "@/lib/staff-access";
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
  ["Operación", "pedidos", "Pedidos", ClipboardList, "pendingReviewOrders"],
  ["Catálogo", "catalogo", "Catálogo", Package],
  ["Catálogo", "marcas", "Marcas y laboratorios", Tags],
  ["Catálogo", "categorias", "Categorías", FolderTree],
  ["Marketing", "promociones", "Promociones", BadgePercent],
  ["Marketing", "banners", "Banners", Images],
  ["Marketing", "recomendaciones", "Recomendaciones", Sparkles],
  ["Acceso", "personal", "Personal", ShieldCheck],
];
const groups = [...new Set(sections.map(([group]) => group))];
const options = (values: string[]) =>
  values.map((value) => ({ value, label: label(value) }));
const entities = (values: Entity[] | undefined) =>
  values?.map((e) => ({ value: e.id, label: e.name })) ?? [];
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
      {user?.role !== "CATALOG" && <AdminSales />}
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
        ).filter(([, , path]) => canSeeAdminSection(user?.role, path)).map(([key, title, path, Icon]) => (
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
      {(user?.role === "ADMIN" || user?.role === "SALES") && <div className="panel" style={{ marginTop: 30 }}>
        <h2>Un buen día empieza por lo importante.</h2>
        <p className="muted" style={{ marginTop: 14 }}>
          Revisá las solicitudes de nuevos comercios y los pedidos que necesitan
          tu atención.
        </p>
        <div className="actions">
          {canSeeAdminSection(user?.role, "solicitudes") && <Link className="button" href={storeRoutes.adminSection("solicitudes")}>
            Revisar solicitudes <ArrowUpRight size={16} />
          </Link>}
          {canSeeAdminSection(user?.role, "pedidos") && <Link className="button secondary" href={storeRoutes.adminSection("pedidos")}>
            Gestionar pedidos
          </Link>}
          {canSeeAdminSection(user?.role, "consultas") && <Link className="button secondary" href={storeRoutes.adminSection("consultas")}>
            Ver consultas
          </Link>}
        </div>
      </div>}
    </>
  );
}
function ContactInquiries({ edit }: { edit: OpenEditor }) {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
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
        <div className="admin-cards contact-admin-list">
          {q.data.items.map((inquiry) => (
            <article className="card" key={inquiry.id}>
              <div className="row between">
                <div>
                  <h3>{inquiry.businessName || inquiry.name}</h3>
                  {inquiry.businessName && <p>{inquiry.name}</p>}
                </div>
                <span className="status-pill" data-status={inquiry.status}>{label(inquiry.status)}</span>
              </div>
              <p>
                <a className="text-link" href={`mailto:${inquiry.email}`}>
                  {inquiry.email}
                </a>
                {inquiry.phone ? ` · ${inquiry.phone}` : ""}
              </p>
              {inquiry.locality && <p>{inquiry.locality}</p>}
              <p className="contact-admin-message">{inquiry.message}</p>
              <p className="muted small-copy">
                {new Intl.DateTimeFormat("es-UY", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(inquiry.createdAt))}
                {inquiry.handledBy?.email
                  ? ` · Gestionada por ${inquiry.handledBy.email}`
                  : ""}
              </p>
              {inquiry.internalNote && (
                <p className="contact-admin-note">
                  <strong>Nota interna:</strong> {inquiry.internalNote}
                </p>
              )}
              <div className="actions">
                <button
                  className="button small"
                  onClick={() =>
                    edit({
                      title: `Gestionar consulta de ${inquiry.name}`,
                      path: `admin/contact-inquiries/${inquiry.id}`,
                      method: "PATCH",
                      fields: [
                        select("status", "Estado", [
                          { value: "NEW", label: "Nueva" },
                          { value: "IN_PROGRESS", label: "En seguimiento" },
                          { value: "RESOLVED", label: "Resuelta" },
                        ]),
                        {
                          key: "internalNote",
                          label: "Nota interna",
                          type: "textarea",
                          required: false,
                        },
                      ],
                      initial: {
                        status: inquiry.status,
                        internalNote: inquiry.internalNote ?? "",
                      },
                    })
                  }
                >
                  Gestionar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <AdminPagination meta={q.data.meta} onPage={setPage} />
    </>
  );
}
function Applications({ edit }: { edit: OpenEditor }) {
  const { user } = useSession();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const q = useApi<{ items: Application[]; meta: { total: number; page: number; limit: number } }>(`admin/applications/page?page=${page}&limit=20&search=${encodeURIComponent(debouncedSearch)}${status ? `&status=${status}` : ""}`);
  if (q.isPending) return <Loading />;
  if (q.error)
    return <ErrorBox error={q.error} retry={() => void q.refetch()} />;
  const list = q.data.items;
  const pending = list.filter((a) => a.status === "PENDING").length;
  return (
    <>
      <div className="admin-toolbar">
        <h2>Solicitudes de acceso</h2>
        <span className="muted small-copy">
          {pending} {pending === 1 ? "pendiente" : "pendientes"} en esta página · {q.data.meta.total} en total
        </span>
        <div className="admin-order-filters">
          <input className="form-input" type="search" aria-label="Buscar solicitudes" placeholder="Comercio, RUT o correo" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
          <select className="form-input" aria-label="Filtrar solicitudes" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="">Todos los estados</option>
            <option value="PENDING">Pendientes</option>
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
              <p>
                Permiso para medicamentos:{" "}
                {a.requestedMedicationPermission
                  ? "Solicitado"
                  : "No solicitado"}
              </p>
              {a.documents?.map((d, i) => (
                <p key={i}>
                  {/^https?:\/\//.test(d.fileUrl) ? (
                    <a
                      className="text-link"
                      href={d.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {d.originalName} ↗
                    </a>
                  ) : (
                    d.originalName
                  )}
                </p>
              ))}
              {a.status === "PENDING" && user?.role === "ADMIN" && (
                <div className="actions">
                  <button
                    className="button small"
                    onClick={() =>
                      edit({
                        title: `Aprobar ${a.businessName}`,
                        path: `admin/applications/${a.id}/approve`,
                        fields: [
                          bool(
                            "medicationPermission",
                            "Habilitar compra de medicamentos",
                          ),
                        ],
                        initial: { medicationPermission: false },
                        description:
                          "La cuenta podrá ver precios y enviar pedidos. Habilitá medicamentos solo cuando corresponda.",
                      })
                    }
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
      <AdminPagination meta={q.data.meta} onPage={setPage} />
    </>
  );
}
function Customers({ edit }: { edit: OpenEditor }) {
  const { user } = useSession();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const q = useApi<{ items: Customer[]; meta: { total: number; page: number; limit: number } }>(
    `admin/customers/page?page=${page}&limit=20&search=${encodeURIComponent(debouncedSearch)}`,
  );
  if (q.isPending) return <Loading />;
  if (q.error)
    return <ErrorBox error={q.error} retry={() => void q.refetch()} />;
  const rows = q.data.items;
  return (
    <>
      <div className="admin-toolbar">
        <h2>Clientes mayoristas</h2>
        <input
          className="form-input"
          aria-label="Buscar clientes"
          placeholder="Buscar comercio, RUT, correo o teléfono"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>
      {!!rows.length && <div className="table-wrap">
        <table className="admin-customers-table">
          <thead><tr><th>CLIENTE</th><th>CONTACTO</th><th>CUENTA</th><th>CRÉDITO</th><th>MEDICAMENTOS</th><th>ACCIÓN</th></tr></thead>
          <tbody>{rows.map((c) => (
          <tr key={c.id}>
            <td><strong>{c.businessName}</strong><br /><span className="muted">{c.legalName} · {c.rut}</span></td>
            <td>{c.users?.map((u) => u.email).join(", ") || "Sin correo"}<br /><span className="muted">{c.phone || "Sin teléfono"}</span></td>
            <td><span className="status-pill" data-status={c.accountStatus}>{label(c.accountStatus)}</span></td>
            <td>{label(c.creditStatus)}</td>
            <td>{c.medicationPermission ? "Habilitado" : "No habilitado"}</td>
            <td>{user?.role === "ADMIN" && (
              <button
                className="button secondary small"
                onClick={() =>
                  edit({
                    title: c.businessName,
                    path: `admin/customers/${c.id}`,
                    method: "PATCH",
                    initial: { ...c },
                    fields: [
                      { ...text("phone", "Teléfono", false), allowEmpty: true },
                      select(
                        "accountStatus",
                        "Estado de cuenta",
                        options([
                          "PENDING",
                          "APPROVED",
                          "REJECTED",
                          "SUSPENDED",
                        ]),
                      ),
                      select(
                        "creditStatus",
                        "Situación comercial",
                        options([
                          "GOOD_STANDING",
                          "PAYMENT_DELAY",
                          "PAYMENT_PENDING",
                          "RESTRICTED",
                        ]),
                      ),
                      {
                        ...number("creditLimit", "Límite de crédito", 0, "any"),
                        required: false,
                      },
                      {
                        key: "internalCreditNote",
                        label: "Nota interna de crédito",
                        type: "textarea",
                      },
                      bool(
                        "medicationPermission",
                        "Habilitar compra de medicamentos",
                      ),
                    ],
                    description: "Una cuenta suspendida puede ingresar y consultar su historial, pero no enviar pedidos nuevos.",
                  })
                }
              >
                <Pencil size={14} />
                Editar
              </button>
            )}</td>
          </tr>
        ))}</tbody></table>
      </div>}
      {!rows.length && <Empty title="No encontramos clientes" />}
      <AdminPagination meta={q.data.meta} onPage={setPage} />
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
function OrderProgressControl({ order, onUpdated }: { order: Order; onUpdated: () => Promise<void> }) {
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
        <div className="order-management-status-fields">
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
            type="button"
            disabled={selected === order.status || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            <Save size={16} /> Guardar estado
          </button>
          {selected !== order.status && (
            <p className="small-copy muted order-management-status-effect">
              {orderStockEffect(order.status, selected)}
            </p>
          )}
        </div>
      )}
      {mutation.error && <ErrorBox error={mutation.error} />}
    </section>
  );
}
function AdminOrders() {
  const { user } = useSession();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const q = useApi<{ items: Order[]; meta: { total: number; page: number; limit: number } }>(
    `admin/orders/page?page=${page}&limit=20&search=${encodeURIComponent(debouncedSearch)}${status ? `&status=${status}` : ""}`,
  );
  const detailQuery = useApi<{ items: Order[]; meta: { total: number; page: number; limit: number } }>(
    `admin/orders/page?page=1&limit=20&search=${encodeURIComponent(detailId ?? "")}`,
    !!detailId,
  );
  if (q.isPending) return <Loading />;
  if (q.error)
    return <ErrorBox error={q.error} retry={() => void q.refetch()} />;
  const rows = q.data.items;
  const detail = detailQuery.data?.items.find((order) => order.id === detailId) ?? rows.find((order) => order.id === detailId);
  return (
    <>
      <div className="admin-toolbar">
        <h2>Pedidos</h2>
        <span className="muted small-copy">
          {q.data.meta.total} {q.data.meta.total === 1 ? "pedido" : "pedidos"}
        </span>
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
        </div>
      </div>
      {rows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>PEDIDO</th>
                <th>CLIENTE</th>
                <th>ESTADO</th>
                <th>TOTAL</th>
                <th>ABONADO</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td>
                    <button
                      className="text-link"
                      onClick={() => setDetailId(o.id)}
                    >
                      {o.orderNumber}
                    </button>
                    <br />
                    {new Date(o.createdAt).toLocaleDateString("es-UY")}
                  </td>
                  <td>{o.user?.email || o.customerAccount?.businessName || "Sin correo"}</td>
                  <td>
                    <span className="status-pill" data-status={o.status}>{label(o.status)}</span>
                  </td>
                  <td>{money(o.total, o.currency)}</td>
                  <td>{money(orderBalance(o).paid, o.currency)}</td>
                  <td>
                    <button
                      className="button small secondary"
                      aria-label={`Gestionar ${o.orderNumber}`}
                      onClick={() => setDetailId(o.id)}
                    >
                      Gestionar
                    </button>
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
      <Modal
        open={!!detailId}
        onClose={() => setDetailId(null)}
        title={detail ? `Gestionar ${detail.orderNumber}` : "Gestionar pedido"}
      >
        {detail && (
          <>
            <dl className="order-meta">
              <div>
                <dt>Cliente</dt>
                <dd>
                  {detail.user?.email || detail.customerAccount?.businessName || "Sin correo"}
                </dd>
              </div>
              <div>
                <dt>Fecha</dt>
                <dd>
                  {new Date(detail.createdAt).toLocaleString("es-UY", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </dd>
              </div>
              {detail.requiresManualReview && (
                <div>
                  <dt>Revisión manual</dt>
                  <dd>
                    {detail.acceptedManualReview === false
                      ? "Requerida"
                      : "Aceptada por el cliente"}
                  </dd>
                </div>
              )}
              {detail.reviewReason && (
                <div>
                  <dt>Observación actual</dt>
                  <dd>{label(detail.reviewReason)}</dd>
                </div>
              )}
              {detail.deliveryAddress && (
                <div>
                  <dt>Entrega{detail.deliveryLabel ? ` · ${detail.deliveryLabel}` : ""}</dt>
                  <dd>{[detail.deliveryAddress, detail.deliveryCity, detail.deliveryDepartment].filter(Boolean).join(", ")}</dd>
                </div>
              )}
            </dl>
            {(user?.role === "ADMIN" || user?.role === "SALES") && <OrderProgressControl
              key={`${detail.id}-${detail.status}`}
              order={detail}
              onUpdated={async () => { await Promise.all([q.refetch(), detailQuery.refetch()]); }}
            />}
            {(user?.role === "ADMIN" || user?.role === "FINANCE") && <OrderBilling
              key={detail.id}
              order={detail}
              onUpdated={async () => {
                await Promise.all([q.refetch(), detailQuery.refetch()]);
              }}
            />}
            <p className="muted small-copy" style={{ marginTop: 12 }}>
              Importes registrados al confirmar el pedido; no cambian con
              precios posteriores.
            </p>
            <section className="order-management-items">
              <h3>Productos del pedido</h3>
              <OrderItems order={detail} />
            </section>
          </>
        )}
      </Modal>
    </>
  );
}
function ProductManagement({ edit }: { edit: OpenEditor }) {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [activity, setActivity] = useState("");
  const q = useApi<ProductList>(
    `products/admin/list?limit=12&page=${page}&search=${encodeURIComponent(search)}${activity ? `&active=${activity}` : ""}`,
  );
  const brands = useApi<Entity[]>("brands"),
    categories = useApi<Entity[]>("categories/catalog"),
    labs = useApi<Entity[]>("laboratories");
  if (q.isPending) return <Loading />;
  if (q.error)
    return <ErrorBox error={q.error} retry={() => void q.refetch()} />;
  return (
    <>
      <div className="admin-toolbar">
        <h2>Catálogo y existencias</h2>
        <button className="button small" onClick={() => edit(adminProductEditor(undefined, brands.data, categories.data, labs.data))}>
          <Plus size={16} />
          Crear producto
        </button>
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
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
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
                  <Link className="button small secondary" href={storeRoutes.adminProduct(p.slug)}>
                    <Pencil size={15} /> Editar producto
                  </Link>
                </td>
              </tr>
            })}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <button
          className="button secondary small"
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Anterior
        </button>
        <span>Página {page}</span>
        <button
          className="button secondary small"
          disabled={page * 12 >= q.data.meta.total}
          onClick={() => setPage((p) => p + 1)}
        >
          Siguiente
        </button>
      </div>
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
  const [remove, setRemove] = useState<string | null>(null),
    [stockId, setStockId] = useState("");
  const client = useQueryClient();
  const stock = useApi<{
    physicalStock: number;
    reservedStock: number;
    availableStock: number;
  }>(`inventory/variants/${stockId}/stock`, !!stockId);
  const deletion = useMutation({
    mutationFn: () => request(`products/media/${remove}`, "DELETE"),
    onSuccess: () => {
      void client.invalidateQueries();
      setRemove(null);
    },
  });
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
        <button className="button small" onClick={() => variantEditor()}>
          Agregar presentación
        </button>
        <button
          className="button secondary small"
          onClick={() =>
            edit({
              title: "Agregar imagen",
              path: `products/${product.id}/media`,
              fields: [
                { ...text("url", "URL de la imagen"), type: "url" },
                text("alt", "Texto alternativo"),
                number("position", "Orden", 0),
                bool("isPrimary", "Imagen principal"),
              ],
              initial: { position: 0, isPrimary: false },
              transform: (data) => ({ ...data, type: "IMAGE" }),
            })
          }
        >
          Agregar imagen por URL
        </button>
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
              <button
                className="button small secondary"
                onClick={() => variantEditor(v)}
              >
                Editar presentación
              </button>
              <button
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
              </button>
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
                <button
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
                </button>
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
      <div className="admin-cards" style={{ marginTop: 25 }}>
        {product.media.map((m) => (
          <div className="card" key={m.id}>
            <Picture
              src={m.url}
              alt={m.alt ?? product.name}
              sizes="240px"
              style={{ height: 110, width: "100%", objectFit: "contain" }}
            />
            <div className="actions">
              <button
                className="button secondary small"
                onClick={() =>
                  edit({
                    title: "Editar imagen",
                    path: `products/media/${m.id}`,
                    method: "PATCH",
                    fields: [
                      { key: "url", label: "URL", type: "url", required: true },
                      text("alt", "Texto alternativo", false),
                      bool("isPrimary", "Imagen principal"),
                    ],
                    initial: { ...m },
                  })
                }
              >
                Editar imagen
              </button>
              <button
                className="icon-button"
                aria-label="Eliminar imagen"
                onClick={() => setRemove(m.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <Modal
        open={!!remove}
        onClose={() => setRemove(null)}
        title="Eliminar imagen"
      >
        <p>Se quitará la referencia de esta imagen del producto.</p>
        {deletion.error && <ErrorBox error={deletion.error} />}
        <div className="actions">
          <button
            className="button danger"
            disabled={deletion.isPending}
            onClick={() => deletion.mutate()}
          >
            Eliminar imagen
          </button>
          <button className="button secondary" onClick={() => setRemove(null)}>
            Cancelar
          </button>
        </div>
      </Modal>
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
  const q = useApi<Rule[]>(path);
  const products = useApi<ProductList>("products?limit=100");
  const brands = useApi<Entity[]>("brands"),
    categories = useApi<Entity[]>("categories/catalog"),
    labs = useApi<Entity[]>("laboratories");
  const expiration = useApi<Expiration[]>(
    "promotions/expiration",
    !recommendations,
  );
  const productsOptions = entities(products.data?.items);
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
  function create() {
    if (recommendations)
      edit({
        title: "Crear recomendación",
        path,
        fields: [
          text("name", "Nombre de la regla"),
          select(
            "trigger",
            "Se activa al comprar",
            targets.filter((t) => !t.value.startsWith("PRODUCT_VARIANT")),
          ),
          number("minimumQuantity", "Cantidad mínima", 1),
          select("productId", "Producto recomendado", productsOptions),
          number("priority", "Prioridad", 0),
        ],
        initial: { minimumQuantity: 1, priority: 0 },
        transform: ({ trigger, productId, ...data }) => {
          const [triggerType, triggerId] = String(trigger).split(":");
          return {
            ...data,
            triggerType,
            triggerId,
            products: [{ productId, position: 0 }],
          };
        },
      });
    else
      edit({
        title: "Crear promoción",
        path,
        fields: [
          text("name", "Nombre"),
          { key: "description", label: "Descripción", type: "textarea" },
          select("type", "Tipo", [
            { value: "PERCENTAGE", label: "Porcentaje" },
            { value: "FIXED_AMOUNT", label: "Importe fijo" },
            { value: "CROSS_DISCOUNT", label: "Descuento cruzado" },
          ]),
          select("condition", "Compra que activa el beneficio", targets),
          number("minQuantity", "Cantidad mínima", 1),
          select("reward", "Productos que reciben el beneficio", targets),
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
        ],
        initial: {
          type: "PERCENTAGE",
          rewardType: "PERCENTAGE",
          minQuantity: 1,
          startsAt: new Date().toISOString().slice(0, 10),
        },
        transform: ({
          condition,
          reward,
          rewardType,
          minQuantity,
          value,
          ...data
        }) => {
          if (rewardType === "PERCENTAGE" && Number(value) > 100)
            throw new Error("El porcentaje no puede superar 100.");
          if (data.endsAt && String(data.endsAt) < String(data.startsAt))
            throw new Error("La fecha final debe ser posterior al inicio.");
          const [ct, ci] = String(condition).split(":"),
            [rt, ri] = String(reward).split(":");
          return {
            ...data,
            conditions: [
              {
                targetType: ct,
                targetId: ci,
                metric: "MIN_QUANTITY",
                minQuantity,
              },
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
            ],
            combinable: false,
          };
        },
        description:
          "Esta versión crea una condición y un beneficio por regla. Las reglas existentes se consultan; el backend no expone edición ni eliminación.",
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
        <button
          className="button small"
          disabled={!products.data}
          onClick={create}
        >
          Crear {recommendations ? "recomendación" : "promoción"}
        </button>
      </div>
      {products.error && (
        <ErrorBox
          error={products.error}
          retry={() => void products.refetch()}
        />
      )}
      <p className="info-note" style={{ marginBottom: 20 }}>
        Los selectores cargan hasta 100 productos del catálogo. Las reglas se
        crean y consultan; la API actual no ofrece modificación ni eliminación.
      </p>
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} />
      ) : q.data.length ? (
        <div className="admin-cards">
          {q.data.map((rule) => (
            <div className="card" key={rule.id}>
              <h3>{rule.name}</h3>
              <p className="small-copy muted">
                {rule.description ??
                  (recommendations
                    ? "Recomendación configurada"
                    : "Promoción configurada")}
              </p>
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
            <button
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
                    number("discountPercentage", "Descuento (%)", 0, "any"),
                    date("startsAt", "Comienza"),
                    date("endsAt", "Finaliza", false),
                    {
                      ...number("quantityLimit", "Cantidad máxima", 1),
                      required: false,
                    },
                  ],
                  initial: { startsAt: new Date().toISOString().slice(0, 10) },
                  transform: (data) => {
                    if (Number(data.discountPercentage) > 100)
                      throw new Error("El porcentaje no puede superar 100.");
                    return data;
                  },
                })
              }
            >
              Crear por vencimiento
            </button>
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
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}
export function AdminNav({ section, email, role }: { section: string; email?: string; role?: "ADMIN" | "SALES" | "CATALOG" | "FINANCE" | "CLIENT" }) {
  // Misma consulta que el Resumen: los contadores no suman pedidos a la API.
  const counts = useApi<Record<string, number>>("admin/dashboard");
  const { logout } = useSession();
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
      <nav className="admin-nav" aria-label="Administración" id="admin-navigation" ref={nav}>
        <span className="admin-nav-indicator" ref={indicator} aria-hidden="true" />
        {groups.filter((group) => sections.some(([g, path]) => g === group && canSeeAdminSection(role, path))).map((group) => (
          <div className="admin-nav-group" key={group}>
            <p>{group}</p>
            {sections
              .filter(([g, path]) => g === group && canSeeAdminSection(role, path))
              .map(([, path, title, Icon, countKey]) => {
                const count = countKey ? (counts.data?.[countKey] ?? 0) : 0;
                return (
                  <Link
                    className={section === path ? "active" : ""}
                    aria-current={section === path ? "page" : undefined}
                    aria-label={title}
                    title={collapsed ? title : undefined}
                    href={path ? storeRoutes.adminSection(path) : storeRoutes.admin}
                    key={path}
                  >
                    <Icon size={17} aria-hidden="true" />
                    <span>{title}</span>
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
    <Customers edit={edit} />
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
  ) : (
    <Empty title="Sección no disponible" />
  );
}
export function Admin({ section = "" }: { section?: string }) {
  const { user } = useSession();
  const [editor, setEditor] = useState<Editor | null>(null);
  const current = sections.find(([, path]) => path === section);
  return (
    <div className="container admin-page section">
      <AccessGate admin>
        <div className="admin-shell">
          <AdminNav section={section} email={user?.email} role={user?.role} />
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
                  eyebrow="DISTRICO · Administración"
                  title={
                    section && current
                      ? current[2]
                      : "Tu operación, en un solo lugar."
                  }
                />
                {canSeeAdminSection(user?.role, section) ? <AdminSection section={section} edit={setEditor} /> : <Empty title="No tenés acceso a esta sección" />}
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
