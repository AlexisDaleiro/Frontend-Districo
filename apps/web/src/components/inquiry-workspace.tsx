"use client";
import { useEffect, useState } from "react";
import { useApi, useSession } from "./providers";
import { canEditAdminFeature } from "@/lib/staff-access";
import { ErrorBox, Loading } from "./ui";
import { OperationForm } from "./operation-form";
type Detail = {
  id: string;
  customerId: string | null;
  orderId: string | null;
  assignedToId: string | null;
  responseDueAt: string | null;
  entries: {
    id: string;
    body: string;
    visibility: string;
    notificationId: string | null;
    createdAt: string;
  }[];
  staff: { id: string; email: string }[];
};
export function InquiryWorkspace({ id }: { id: string }) {
  const { user } = useSession(),
    editable = canEditAdminFeature(user, "consultas"),
    q = useApi<Detail>(`admin/operations/support/${id}`);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const choices = useApi<{
    customers: { id: string; businessName: string }[];
    orders: {
      id: string;
      orderNumber: string;
      customerAccountId: string | null;
    }[];
  }>(
    `admin/operations/support/lookups?search=${encodeURIComponent(debouncedSearch)}&limit=20`,
    editable,
  );
  const refresh = ["admin/operations/support/", "admin/contact-inquiries"];
  if (q.isPending) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const data = q.data;
  return (
    <section className="admin-record-section">
      <h3>Seguimiento y respuestas</h3>
      {data.responseDueAt && (
        <p>
          Responder antes del{" "}
          {new Date(data.responseDueAt).toLocaleString("es-UY")}
        </p>
      )}
      {editable && (
        <>
          <label className="field">
            Buscar cliente o pedido
            <input
              className="form-input"
              type="search"
              maxLength={120}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          {choices.error && <ErrorBox error={choices.error} />}
          <OperationForm
            key={`${data.customerId}-${data.assignedToId}-${data.responseDueAt}`}
            path={`admin/operations/support/${id}`}
            method="PATCH"
            idempotent={false}
            refresh={refresh}
            transform={(form) => ({
              customerId: form.get("customerId"),
              orderId: form.get("orderId"),
              assignedToId: form.get("assignedToId"),
              ...(form.get("responseDueAt")
                ? {
                    responseDueAt: new Date(
                      String(form.get("responseDueAt")),
                    ).toISOString(),
                  }
                : {}),
            })}
          >
            <label className="field">
              Cliente
              <select
                className="form-input"
                name="customerId"
                defaultValue={data.customerId ?? ""}
              >
                <option value="">Sin vincular</option>
                {choices.data?.customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.businessName}
                  </option>
                ))}
                {data.customerId &&
                  !choices.data?.customers.some(
                    (customer) => customer.id === data.customerId,
                  ) && (
                    <option value={data.customerId}>Cliente vinculado</option>
                  )}
              </select>
            </label>
            <label className="field">
              Pedido
              <select
                className="form-input"
                name="orderId"
                defaultValue={data.orderId ?? ""}
              >
                <option value="">Sin vincular</option>
                {choices.data?.orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.orderNumber}
                  </option>
                ))}
                {data.orderId &&
                  !choices.data?.orders.some(
                    (order) => order.id === data.orderId,
                  ) && <option value={data.orderId}>Pedido vinculado</option>}
              </select>
            </label>
            <label className="field">
              Responsable
              <select
                className="form-input"
                name="assignedToId"
                defaultValue={data.assignedToId ?? ""}
              >
                <option value="">Sin asignar</option>
                {data.staff.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Fecha límite de respuesta
              <input
                className="form-input"
                type="datetime-local"
                name="responseDueAt"
                defaultValue={
                  data.responseDueAt
                    ? new Date(
                        new Date(data.responseDueAt).getTime() -
                          new Date().getTimezoneOffset() * 60000,
                      )
                        .toISOString()
                        .slice(0, 16)
                    : ""
                }
              />
            </label>
          </OperationForm>
          <OperationForm
            path={`admin/operations/support/${id}/entries`}
            refresh={refresh}
            transform={(form) => ({
              body: form.get("body"),
              visibility: form.get("visibility"),
              sendEmail: form.get("sendEmail") === "on",
            })}
          >
            <label className="field">
              Tipo
              <select className="form-input" name="visibility">
                <option value="INTERNAL">
                  Nota interna, no visible para el cliente
                </option>
                <option value="CUSTOMER">
                  Respuesta visible para el cliente
                </option>
              </select>
            </label>
            <label className="field">
              Mensaje
              <textarea
                className="form-input"
                name="body"
                maxLength={4000}
                required
              />
            </label>
            <label>
              <input name="sendEmail" type="checkbox" /> Enviar la respuesta por
              correo
            </label>
          </OperationForm>
        </>
      )}
      {data.entries.map((entry) => (
        <article className="operation-entry" key={entry.id}>
          <strong>
            {entry.visibility === "INTERNAL"
              ? "Nota interna"
              : "Respuesta al cliente"}
          </strong>
          <p>{entry.body}</p>
          <span className="muted small-copy">
            {new Date(entry.createdAt).toLocaleString("es-UY")}
            {entry.notificationId ? " · Correo encolado" : ""}
          </span>
        </article>
      ))}
    </section>
  );
}
