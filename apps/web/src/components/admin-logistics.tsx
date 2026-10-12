"use client";
import { useState } from "react";
import { Printer } from "lucide-react";
import { useApi, useSession } from "./providers";
import { canEditAdminFeature } from "@/lib/staff-access";
import { label } from "@/lib/commerce";
import { ListPagination } from "./admin-list-filters";
import { ErrorBox, Loading, Modal } from "./ui";
import { useOperationList } from "./admin-operational-pages";
import { OperationForm } from "./operation-form";

type Line = {
  id: string;
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
};
type Batch = {
  id: string;
  createdAt: string;
  deliveredAt: string | null;
  receivedBy: string | null;
  proof: string | null;
  items: { orderItemId: string; quantity: number }[];
};
type Picking = {
  id: string;
  orderNumber: string;
  status: string;
  deliveryAddress: string | null;
  deliveryCity: string | null;
  deliveryDepartment: string | null;
  customerAccount: { businessName: string } | null;
  items: Line[];
  fulfillments: Batch[];
};
export function AdminLogistics() {
  const list = useOperationList("admin/operations/logistics"),
    { user } = useSession(),
    editable = canEditAdminFeature(user, "logistica");
  const q = useApi<{
    items: Picking[];
    meta: { total: number; page: number; limit: number };
  }>(list.path);
  const [selected, setSelected] = useState<Picking | null>(null);
  return (
    <>
      <div className="admin-toolbar">
        <label className="field">
          Pedido o cliente
          <input
            className="form-input"
            type="search"
            maxLength={120}
            value={list.search}
            onChange={(event) => list.setSearch(event.target.value)}
          />
        </label>
        <label className="field">
          Estado
          <select
            className="form-input"
            value={list.filter}
            onChange={(event) => list.setFilter(event.target.value)}
          >
            <option value="">Por preparar o entregar</option>
            <option value="DELIVERED">Entregados</option>
          </select>
        </label>
      </div>
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} />
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Dirección</th>
                  <th>Estado</th>
                  <th>Entregas</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {q.data.items.map((order) => (
                  <tr key={order.id}>
                    <td>{order.orderNumber}</td>
                    <td>{order.customerAccount?.businessName}</td>
                    <td>
                      {[
                        order.deliveryAddress,
                        order.deliveryCity,
                        order.deliveryDepartment,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </td>
                    <td>{label(order.status)}</td>
                    <td>
                      {
                        order.fulfillments.filter((batch) => batch.deliveredAt)
                          .length
                      }{" "}
                      / {order.fulfillments.length}
                    </td>
                    <td>
                      <button
                        className="button small secondary"
                        onClick={() => setSelected(order)}
                      >
                        Preparación y entregas
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ListPagination meta={q.data.meta} onPage={list.setPage} />
        </>
      )}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Preparación ${selected?.orderNumber ?? ""}`}
        className="logistics-modal"
      >
        {selected && (
          <div className="picking-document">
            <button
              className="icon-button"
              title="Imprimir preparación"
              aria-label="Imprimir preparación"
              onClick={() => window.print()}
            >
              <Printer size={18} />
            </button>
            <p>
              {selected.customerAccount?.businessName} ·{" "}
              {[
                selected.deliveryAddress,
                selected.deliveryCity,
                selected.deliveryDepartment,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
            <OperationForm
              path={`admin/operations/logistics/orders/${selected.id}/fulfillments`}
              canSubmit={editable && selected.status !== "DELIVERED"}
              refresh={[
                "admin/operations/logistics",
                "admin/orders",
                "admin/dashboard",
              ]}
              onDone={() => setSelected(null)}
              button="Confirmar salida parcial"
              transform={(data) => ({
                items: selected.items.flatMap((item) => {
                  const quantity = Number(data.get(item.id));
                  return quantity > 0
                    ? [{ orderItemId: item.id, quantity }]
                    : [];
                }),
              })}
            >
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>SKU / Producto</th>
                      <th>Pedido</th>
                      <th>Preparado</th>
                      <th>Pendiente</th>
                      <th>En esta salida</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.items.map((item) => {
                      const prepared = selected.fulfillments
                          .flatMap((batch) => batch.items)
                          .filter((line) => line.orderItemId === item.id)
                          .reduce((sum, line) => sum + line.quantity, 0),
                        pending = Math.max(0, item.quantity - prepared);
                      return (
                        <tr key={item.id}>
                          <td>
                            {item.sku}
                            <p>
                              {item.productName} · {item.variantName}
                            </p>
                          </td>
                          <td>{item.quantity}</td>
                          <td>{prepared}</td>
                          <td>{pending}</td>
                          <td>
                            <input
                              className="form-input"
                              name={item.id}
                              type="number"
                              min="0"
                              max={pending}
                              step="1"
                              defaultValue="0"
                              disabled={
                                !editable ||
                                !pending ||
                                selected.status === "DELIVERED"
                              }
                              aria-label={`Preparar ${item.productName}, ${item.variantName}`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!editable && <p className="muted">Acceso de consulta</p>}
            </OperationForm>
            {selected.fulfillments.map((batch) => (
              <section className="admin-record-section" key={batch.id}>
                <h3>
                  Salida del {new Date(batch.createdAt).toLocaleString("es-UY")}
                </h3>
                <p>
                  {batch.items
                    .map(
                      (line) =>
                        `${selected.items.find((item) => item.id === line.orderItemId)?.sku ?? "Producto"}: ${line.quantity}`,
                    )
                    .join(" · ")}
                </p>
                {batch.deliveredAt ? (
                  <p>
                    Entregado el{" "}
                    {new Date(batch.deliveredAt).toLocaleString("es-UY")} ·
                    Recibió: {batch.receivedBy} · Constancia: {batch.proof}
                  </p>
                ) : (
                  editable && (
                    <OperationForm
                      path={`admin/operations/logistics/fulfillments/${batch.id}/delivery`}
                      method="PATCH"
                      idempotent={false}
                      refresh={[
                        "admin/operations/logistics",
                        "admin/orders",
                        "admin/dashboard",
                      ]}
                      onDone={() => setSelected(null)}
                      button="Confirmar entrega"
                    >
                      <label className="field">
                        Recibió
                        <input
                          name="receivedBy"
                          className="form-input"
                          required
                          minLength={2}
                          maxLength={120}
                        />
                      </label>
                      <label className="field">
                        Constancia de entrega
                        <textarea
                          name="proof"
                          className="form-input"
                          required
                          minLength={3}
                          maxLength={1000}
                        />
                      </label>
                    </OperationForm>
                  )
                )}
              </section>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}
