"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Plus, Pencil, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AccessGate } from "./auth";
import { request, useApi, useSession } from "./providers";
import { AdminForm, type Editor, type Field } from "./admin-form";
import { Empty, ErrorBox, Loading, Modal, PageHeading, Picture } from "./ui";
import { OrderItems } from "./orders";
import { label, money } from "@/lib/commerce";
import type {
  Application,
  Customer,
  Entity,
  Expiration,
  Order,
  Product,
  ProductList,
  Rule,
  Variant,
} from "@/lib/types";
const sections = [
  ["", "Resumen"],
  ["solicitudes", "Solicitudes"],
  ["clientes", "Clientes"],
  ["pedidos", "Pedidos"],
  ["catalogo", "Catálogo"],
  ["organizacion", "Marcas y categorías"],
  ["promociones", "Promociones"],
  ["recomendaciones", "Recomendaciones"],
];
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
  const q = useApi<Record<string, number>>("admin/dashboard");
  if (q.isPending) return <Loading />;
  if (q.error)
    return <ErrorBox error={q.error} retry={() => void q.refetch()} />;
  return (
    <>
      <div className="stats">
        {[
          ["products", "Productos"],
          ["pendingApplications", "Solicitudes pendientes"],
          ["pendingReviewOrders", "Pedidos en revisión"],
          ["activePromotions", "Promociones activas"],
        ].map(([key, title]) => (
          <div className="card stat" key={key}>
            <span>{title}</span>
            <strong>{q.data[key] ?? 0}</strong>
          </div>
        ))}
      </div>
      <div className="panel" style={{ marginTop: 30 }}>
        <h2>Un buen día empieza por lo importante.</h2>
        <p className="muted" style={{ marginTop: 14 }}>
          Revisá las solicitudes de nuevos comercios y los pedidos que necesitan
          tu atención.
        </p>
        <div className="actions">
          <Link className="button" href="/admin/solicitudes">
            Revisar solicitudes <ArrowUpRight size={16} />
          </Link>
          <Link className="button secondary" href="/admin/pedidos">
            Gestionar pedidos
          </Link>
        </div>
      </div>
    </>
  );
}
function Applications({ edit }: { edit: OpenEditor }) {
  const q = useApi<Application[]>("admin/applications");
  if (q.isPending) return <Loading />;
  if (q.error)
    return <ErrorBox error={q.error} retry={() => void q.refetch()} />;
  return (
    <>
      <div className="admin-toolbar">
        <h2>Solicitudes de acceso</h2>
        <span className="muted small-copy">{q.data.length} solicitudes</span>
      </div>
      {!q.data.length ? (
        <Empty title="No hay solicitudes pendientes" />
      ) : (
        <div className="admin-cards">
          {q.data.map((a) => (
            <article className="card" key={a.id}>
              <div className="row between">
                <h3>{a.businessName}</h3>
                <span className="status-pill">{label(a.status)}</span>
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
              {a.status === "PENDING" && (
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
    </>
  );
}
function Customers({ edit }: { edit: OpenEditor }) {
  const q = useApi<Customer[]>("admin/customers");
  const [search, setSearch] = useState("");
  if (q.isPending) return <Loading />;
  if (q.error)
    return <ErrorBox error={q.error} retry={() => void q.refetch()} />;
  const rows = q.data.filter((c) =>
    `${c.businessName} ${c.rut}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="admin-toolbar">
        <h2>Clientes mayoristas</h2>
        <input
          className="form-input"
          aria-label="Buscar clientes"
          placeholder="Buscar comercio o RUT"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="admin-cards">
        {rows.map((c) => (
          <article className="card" key={c.id}>
            <h3>{c.businessName}</h3>
            <p>
              {c.legalName} · {c.rut}
            </p>
            <p>{c.users?.map((u) => u.email).join(", ")}</p>
            <p>
              <span className="status-pill">{label(c.accountStatus)}</span> ·{" "}
              {label(c.creditStatus)}
            </p>
            <p>
              Medicamentos:{" "}
              {c.medicationPermission ? "Habilitado" : "No habilitado"}
            </p>
            <div className="actions">
              <button
                className="button secondary small"
                onClick={() =>
                  edit({
                    title: c.businessName,
                    path: `admin/customers/${c.id}`,
                    method: "PATCH",
                    initial: { ...c },
                    fields: [
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
                    description:
                      "Los cambios de permisos pueden requerir que el cliente vuelva a iniciar sesión en la API actual.",
                  })
                }
              >
                <Pencil size={14} />
                Editar cuenta
              </button>
            </div>
          </article>
        ))}
      </div>
      {!rows.length && <Empty title="No encontramos clientes" />}
    </>
  );
}
function AdminOrders({ edit }: { edit: OpenEditor }) {
  const q = useApi<Order[]>("admin/orders");
  const [status, setStatus] = useState("");
  const [detail, setDetail] = useState<Order | null>(null);
  if (q.isPending) return <Loading />;
  if (q.error)
    return <ErrorBox error={q.error} retry={() => void q.refetch()} />;
  const rows = q.data.filter((o) => !status || o.status === status);
  return (
    <>
      <div className="admin-toolbar">
        <h2>Pedidos</h2>
        <select
          className="form-input"
          aria-label="Filtrar estado de pedidos"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {options([
            "SUBMITTED",
            "PENDING_REVIEW",
            "APPROVED",
            "PROCESSING",
            "SHIPPED",
            "DELIVERED",
            "REJECTED",
            "CANCELLED",
          ]).map((o) => (
            <option value={o.value} key={o.value}>
              {o.label}
            </option>
          ))}
        </select>
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
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td>
                    <button className="text-link" onClick={() => setDetail(o)}>
                      {o.orderNumber}
                    </button>
                    <br />
                    {new Date(o.createdAt).toLocaleDateString("es-UY")}
                  </td>
                  <td>{o.customerAccount?.businessName ?? "Cliente"}</td>
                  <td>
                    <span className="status-pill">{label(o.status)}</span>
                  </td>
                  <td>{money(o.total, o.currency)}</td>
                  <td>
                    <button
                      className="button small secondary"
                      onClick={() =>
                        edit({
                          title: `Gestionar ${o.orderNumber}`,
                          path: `admin/orders/${o.id}/status`,
                          method: "PATCH",
                          initial: { status: o.status },
                          fields: [
                            select(
                              "status",
                              "Nuevo estado",
                              options([
                                "SUBMITTED",
                                "PENDING_REVIEW",
                                "APPROVED",
                                "PROCESSING",
                                "SHIPPED",
                                "DELIVERED",
                                "REJECTED",
                                "CANCELLED",
                              ]),
                            ),
                            text("reviewReason", "Observación", false),
                          ],
                          description:
                            "Aprobar o preparar puede consumir reservas. Rechazar o cancelar libera las reservas activas según las reglas del backend.",
                        })
                      }
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
        <Empty title="No hay pedidos en este estado" />
      )}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.orderNumber ?? "Pedido"}
      >
        {detail && <OrderItems order={detail} />}
      </Modal>
    </>
  );
}
function ProductManagement({ edit }: { edit: OpenEditor }) {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [selectedSlug, setSelectedSlug] = useState("");
  const q = useApi<ProductList>(
    `products?limit=12&page=${page}&search=${encodeURIComponent(search)}`,
  );
  const detail = useApi<Product>(`products/${selectedSlug}`, !!selectedSlug);
  const brands = useApi<Entity[]>("brands"),
    categories = useApi<Entity[]>("categories"),
    labs = useApi<Entity[]>("laboratories");
  const productFields: Field[] = [
    text("name", "Nombre"),
    text("slug", "Identificador en la URL", false),
    { key: "shortDescription", label: "Descripción breve", type: "textarea" },
    { key: "description", label: "Descripción", type: "textarea" },
    select(
      "productType",
      "Tipo de producto",
      options([
        "FOOD",
        "HYGIENE",
        "ACCESSORY",
        "MEDICATION",
        "SUPPLEMENT",
        "OTHER",
      ]),
    ),
    select(
      "source",
      "Proveedor de origen",
      options(["DISTRICO", "RAICOR", "MAGNIS"]),
      false,
    ),
    select("brandId", "Marca", entities(brands.data), false),
    select("laboratoryId", "Laboratorio", entities(labs.data), false),
    select("categoryId", "Categoría principal", entities(categories.data)),
    bool("requiresMedicationPermission", "Requiere permiso para medicamentos"),
    bool("featured", "Mostrar entre destacados"),
    bool("active", "Producto activo"),
  ];
  function productEditor(p?: Product) {
    edit({
      title: p ? "Editar producto" : "Crear producto",
      path: p ? `products/${p.id}` : "products",
      method: p ? "PATCH" : "POST",
      fields: productFields,
      initial: p
        ? {
            ...p,
            brandId: p.brand?.id,
            laboratoryId: p.laboratory?.id,
            categoryId: p.categories[0]?.categoryId,
          }
        : { active: true, productType: "OTHER", source: "DISTRICO" },
      transform: ({ categoryId, ...data }) => ({
        ...data,
        categoryIds: categoryId
          ? [
              String(categoryId),
              ...(p?.categories.slice(1).map((c) => c.categoryId) ?? []),
            ]
          : (p?.categories.map((c) => c.categoryId) ?? []),
      }),
      description:
        "La API pública lista productos activos. Conservá activo el producto para poder volver a encontrarlo en esta versión.",
    });
  }
  if (q.isPending) return <Loading />;
  if (q.error)
    return <ErrorBox error={q.error} retry={() => void q.refetch()} />;
  return (
    <>
      <div className="admin-toolbar">
        <h2>Catálogo y existencias</h2>
        <button className="button small" onClick={() => productEditor()}>
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
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>PRODUCTO</th>
              <th>MARCA</th>
              <th>PRESENTACIONES</th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {q.data.items.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="row">
                    <Picture
                      src={
                        p.media.find((m) => m.type === "IMAGE")?.url ??
                        "/images/placeholder.svg"
                      }
                      alt=""
                      style={{ width: 42, height: 42, objectFit: "contain" }}
                    />
                    <strong>{p.name}</strong>
                  </div>
                </td>
                <td>{p.brand?.name ?? p.laboratory?.name ?? "—"}</td>
                <td>{p.variants.length}</td>
                <td>
                  <div className="row">
                    <button
                      className="button small secondary"
                      onClick={() => productEditor(p)}
                    >
                      Editar
                    </button>
                    <button
                      className="button small secondary"
                      onClick={() => setSelectedSlug(p.slug)}
                    >
                      Presentaciones e imágenes
                    </button>
                  </div>
                </td>
              </tr>
            ))}
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
      {selectedSlug && (
        <div className="panel" style={{ marginTop: 30 }}>
          <div className="row between">
            <h2>Presentaciones e imágenes</h2>
            <button
              className="button secondary small"
              onClick={() => setSelectedSlug("")}
            >
              Cerrar detalle
            </button>
          </div>
          {detail.isPending ? (
            <Loading />
          ) : detail.error ? (
            <ErrorBox error={detail.error} />
          ) : (
            <VariantManagement product={detail.data} edit={edit} />
          )}
        </div>
      )}
    </>
  );
}
function VariantManagement({
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
function Organization({ edit }: { edit: OpenEditor }) {
  const brands = useApi<Entity[]>("brands"),
    labs = useApi<Entity[]>("laboratories"),
    categories = useApi<Entity[]>("categories");
  return (
    <div className="stack">
      {[
        ["brands", "Marcas", brands],
        ["laboratories", "Laboratorios", labs],
        ["categories", "Categorías", categories],
      ].map(([path, title, query]) => {
        const q = query as typeof brands;
        const fields = [
          text("name", "Nombre"),
          text("slug", "Identificador en la URL", false),
          ...(path === "categories"
            ? [
                select(
                  "parentId",
                  "Categoría superior",
                  entities(categories.data),
                  false,
                ),
              ]
            : []),
        ];
        return (
          <div key={String(path)} className="card">
            <div className="admin-toolbar">
              <h2>{String(title)}</h2>
              <button
                className="button small"
                onClick={() =>
                  edit({
                    title: `Crear · ${title}`,
                    path: String(path),
                    fields,
                  })
                }
              >
                Crear
              </button>
            </div>
            {q.isPending ? (
              <Loading />
            ) : q.error ? (
              <ErrorBox error={q.error} />
            ) : (
              <div className="row">
                {q.data.map((item) => (
                  <button
                    className="chip"
                    key={item.id}
                    onClick={() =>
                      edit({
                        title: `Editar ${item.name}`,
                        path: `${path}/${item.id}`,
                        method: "PATCH",
                        fields,
                        initial: { ...item },
                      })
                    }
                  >
                    {item.name}
                    <Pencil size={12} />
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
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
    categories = useApi<Entity[]>("categories"),
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
export function Admin({ section = "" }: { section?: string }) {
  const { user } = useSession();
  const [editor, setEditor] = useState<Editor | null>(null);
  return (
    <div className="container section">
      <AccessGate admin>
        <PageHeading
          eyebrow="DISTRICO · Administración"
          title="Tu operación, en un solo lugar."
        >
          {user?.email}
        </PageHeading>
        <nav className="admin-tabs" aria-label="Administración">
          {sections.map(([path, title]) => (
            <Link
              className={section === path ? "active" : ""}
              href={`/admin${path ? `/${path}` : ""}`}
              key={path}
            >
              {title}
            </Link>
          ))}
        </nav>
        {section === "" ? (
          <Dashboard />
        ) : section === "solicitudes" ? (
          <Applications edit={setEditor} />
        ) : section === "clientes" ? (
          <Customers edit={setEditor} />
        ) : section === "pedidos" ? (
          <AdminOrders edit={setEditor} />
        ) : section === "catalogo" ? (
          <ProductManagement edit={setEditor} />
        ) : section === "organizacion" ? (
          <Organization edit={setEditor} />
        ) : section === "promociones" ? (
          <Marketing edit={setEditor} />
        ) : section === "recomendaciones" ? (
          <Marketing edit={setEditor} recommendations />
        ) : (
          <Empty title="Sección no disponible" />
        )}
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
