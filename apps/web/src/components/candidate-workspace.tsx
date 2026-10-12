"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApi, useSession, request } from "./providers";
import { ErrorBox, Loading } from "./ui";
import { OperationForm } from "./operation-form";
type Activities = {
  cvDeleteAfter: string | null;
  cvDeletedAt: string | null;
  cvRetentionMonths: number;
  items: {
    id: string;
    kind: string;
    body: string;
    scheduledAt: string | null;
    createdAt: string;
    notificationId: string | null;
  }[];
};
export function CandidateWorkspace({
  id,
  editable,
}: {
  id: string;
  editable: boolean;
}) {
  const q = useApi<Activities>(`admin/operations/recruitment/${id}`),
    { user, notify } = useSession(),
    client = useQueryClient();
  const [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState(false);
  const refresh = ["admin/operations/recruitment/", "admin/jobs/"];
  if (q.isPending) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  return (
    <section className="admin-record-section">
      <h3>Actividad del candidato</h3>
      {q.data.cvDeletedAt ? (
        <p>
          CV eliminado el{" "}
          {new Date(q.data.cvDeletedAt).toLocaleDateString("es-UY")}
        </p>
      ) : (
        <p>
          Conservación del CV:{" "}
          {q.data.cvDeleteAfter
            ? `hasta ${new Date(q.data.cvDeleteAfter).toLocaleDateString("es-UY")}`
            : "sin eliminación programada"}
        </p>
      )}
      {editable && (
        <>
          <OperationForm
            path={`admin/operations/recruitment/${id}`}
            refresh={refresh}
            transform={(form) => ({
              kind: form.get("kind"),
              body: form.get("body"),
              sendEmail: form.get("sendEmail") === "on",
              ...(form.get("scheduledAt")
                ? {
                    scheduledAt: new Date(
                      String(form.get("scheduledAt")),
                    ).toISOString(),
                  }
                : {}),
            })}
          >
            <label className="field">
              Actividad
              <select className="form-input" name="kind">
                <option value="NOTE">Nota de evaluación interna</option>
                <option value="INTERVIEW">Entrevista</option>
                <option value="EMAIL">Comunicación al candidato</option>
              </select>
            </label>
            <label className="field">
              Detalle
              <textarea
                className="form-input"
                name="body"
                required
                maxLength={4000}
              />
            </label>
            <label className="field">
              Fecha de entrevista
              <input
                name="scheduledAt"
                className="form-input"
                type="datetime-local"
              />
            </label>
            <label>
              <input name="sendEmail" type="checkbox" /> Enviar correo al
              candidato
            </label>
          </OperationForm>
          {!q.data.cvDeletedAt && (
            <OperationForm
              path={`admin/operations/recruitment/${id}/retention`}
              method="PATCH"
              idempotent={false}
              refresh={refresh}
              transform={(form) => ({ months: Number(form.get("months")) })}
              button="Guardar conservación"
            >
              <label className="field">
                Conservar desde la última actividad
                <select
                  className="form-input"
                  name="months"
                  defaultValue={q.data.cvRetentionMonths}
                >
                  <option value="0">Sin eliminación automática</option>
                  <option value="6">6 meses</option>
                  <option value="12">12 meses</option>
                </select>
              </label>
            </OperationForm>
          )}
          {user?.role === "ADMIN" && (
            <button
              type="button"
              className="button small secondary"
              disabled={busy}
              onClick={async () => {
                if (
                  !window.confirm(
                    "Se eliminarán permanentemente hasta 10 CV cuyo plazo de conservación ya venció. ¿Continuar?",
                  )
                )
                  return;
                setBusy(true);
                setError(undefined);
                try {
                  const result = await request<{ removed: number }>(
                    "admin/operations/recruitment/maintenance/cleanup",
                    "POST",
                    {},
                  );
                  notify(`${result.removed} CV vencidos eliminados.`);
                  void client.invalidateQueries({
                    predicate: (query) =>
                      query.queryKey[1] === user?.id &&
                      refresh.some((path) =>
                        String(
                          query.queryKey[query.queryKey.length - 1],
                        ).startsWith(path),
                      ),
                  });
                } catch (cause) {
                  setError(cause);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Eliminar CV vencidos
            </button>
          )}
        </>
      )}
      {error !== undefined && <ErrorBox error={error} />}
      {q.data.items.map((activity) => (
        <article className="operation-entry" key={activity.id}>
          <strong>
            {{
              NOTE: "Nota interna",
              INTERVIEW: "Entrevista",
              EMAIL: "Comunicación",
            }[activity.kind] ?? activity.kind}
          </strong>
          <p>{activity.body}</p>
          {activity.scheduledAt && (
            <p>{new Date(activity.scheduledAt).toLocaleString("es-UY")}</p>
          )}
          <span className="muted small-copy">
            {new Date(activity.createdAt).toLocaleString("es-UY")}
            {activity.notificationId
              ? " · Correo encolado"
              : activity.kind === "EMAIL"
                ? " · Borrador"
                : ""}
          </span>
        </article>
      ))}
    </section>
  );
}
