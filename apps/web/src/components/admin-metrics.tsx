"use client";
import { useState } from "react";
import { useApi } from "./providers";
import { ErrorBox, Loading } from "./ui";
type Metrics = {
  usage: {
    searches: number;
    noResults: number;
    starts: number;
    abandoned: number;
  };
  customers: { buyers: number; repeat: number };
  support: {
    resolved: number;
    resolutionHours: number | null;
    overdue: number;
  };
  from: string;
  to: string;
};
const percent = (part: number, total: number) =>
  total ? `${((100 * part) / total).toFixed(1)}%` : "Sin muestra";
export function AdminMetrics() {
  const [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const params = new URLSearchParams();
  if (from) params.set("dateFrom", from);
  if (to) params.set("dateTo", to);
  const q = useApi<Metrics>(
    `admin/operations/metrics${params.size ? `?${params}` : ""}`,
  );
  return (
    <>
      <div className="admin-toolbar">
        <label className="field">
          Desde
          <input
            className="form-input"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label className="field">
          Hasta
          <input
            className="form-input"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
      </div>
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} />
      ) : (
        <>
          <p className="muted">
            {new Date(q.data.from).toLocaleDateString("es-UY")} a{" "}
            {new Date(q.data.to).toLocaleDateString("es-UY")}
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Indicador</th>
                  <th>Resultado</th>
                  <th>Base</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Abandono del checkout</td>
                  <td>
                    {percent(q.data.usage.abandoned, q.data.usage.starts)}
                  </td>
                  <td>
                    {q.data.usage.abandoned} de {q.data.usage.starts} sesiones;
                    sin confirmación durante al menos una hora
                  </td>
                </tr>
                <tr>
                  <td>Búsquedas sin resultados</td>
                  <td>
                    {percent(q.data.usage.noResults, q.data.usage.searches)}
                  </td>
                  <td>
                    {q.data.usage.noResults} de {q.data.usage.searches} sesiones
                    con búsqueda
                  </td>
                </tr>
                <tr>
                  <td>Clientes con recompra</td>
                  <td>
                    {percent(q.data.customers.repeat, q.data.customers.buyers)}
                  </td>
                  <td>
                    {q.data.customers.repeat} de {q.data.customers.buyers}{" "}
                    clientes; dos o más pedidos no anulados en el período
                  </td>
                </tr>
                <tr>
                  <td>Tiempo medio de resolución</td>
                  <td>
                    {q.data.support.resolutionHours === null
                      ? "Sin consultas resueltas"
                      : `${q.data.support.resolutionHours.toFixed(1)} horas`}
                  </td>
                  <td>{q.data.support.resolved} consultas resueltas</td>
                </tr>
                <tr>
                  <td>Consultas fuera de plazo</td>
                  <td>{q.data.support.overdue}</td>
                  <td>Pendientes con fecha de respuesta vencida</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="muted small-copy">
            Las métricas de navegación incluyen únicamente sesiones que
            aceptaron participar. No se guardan textos de búsqueda ni datos de
            contacto.
          </p>
        </>
      )}
    </>
  );
}
