"use client";
import { useState } from "react";
import {
  performancePages,
  performanceThreshold,
} from "@/lib/performance-contract";
import { useApi } from "./providers";
import { ErrorBox, Loading } from "./ui";
import { UsageConsent } from "./usage-consent";
type Row = {
  name: string;
  target: string;
  device: string;
  phase: string;
  cache: string;
  samples: number;
  validSamples: number;
  errors: number;
  p50: number | null;
  p75: number | null;
  p95: number | null;
};
type Report = {
  readiness: "READY" | "PENDING" | "UNAVAILABLE";
  rows: Row[];
  views: number;
};
const deviceName = (device: string) =>
  device === "MOBILE" ? "Móvil" : "Escritorio";
const phaseName = (phase: string) =>
  phase === "SOFT"
    ? "Navegación interna"
    : phase === "RESTORE"
      ? "Restauración"
      : "Carga inicial";
const labels: Record<string, string> = {
  NAVIGATION: "Ruta y render estimado",
  DATA_READY: "Consultas visibles terminadas",
  API: "Petición de API",
  IMAGE: "Descarga de imagen",
  PAGE: "Página",
  CATALOG: "Catálogo",
  PRODUCT: "Producto",
  TAXONOMY: "Categorías y marcas",
  ACCOUNT: "Cuenta",
  ORDERS: "Pedidos",
  ADMIN: "Dashboard",
  OTHER: "Otras consultas",
  LOCAL_IMAGE: "Imagen del sitio",
  EXTERNAL_IMAGE: "Imagen externa",
  UNKNOWN: "Sin dato de caché",
  CACHE: "Caché",
  NETWORK: "Red",
};
const value = (row: Row, amount: number | null) =>
  amount === null
    ? "Sin muestra"
    : row.name === "CLS"
      ? amount.toFixed(3)
      : amount >= 1000
        ? `${(amount / 1000).toFixed(2)} s`
        : `${Math.round(amount)} ms`;
export function PerformanceReport({ from, to }: { from: string; to: string }) {
  const [environment, setEnvironment] = useState("PRODUCTION"),
    [device, setDevice] = useState(""),
    [page, setPage] = useState(""),
    [visit, setVisit] = useState(""),
    [release, setRelease] = useState("");
  const params = new URLSearchParams({ environment });
  if (from) params.set("dateFrom", from);
  if (to) params.set("dateTo", to);
  if (device) params.set("device", device);
  if (page) params.set("pageGroup", page);
  if (visit) params.set("visit", visit);
  if (/^(?:[a-f0-9]{7,40}|unknown)$/i.test(release))
    params.set("release", release);
  const q = useApi<Report>(`admin/operations/performance?${params}`);
  const core =
    q.data?.rows.filter((row) =>
      ["LCP", "INP", "CLS", "FCP", "TTFB"].includes(row.name),
    ) ?? [];
  const missing = (device ? [device] : ["MOBILE", "DESKTOP"]).flatMap(
    (screen) =>
      ["LCP", "INP", "CLS"]
        .filter(
          (name) =>
            !core.some((row) => row.device === screen && row.name === name),
        )
        .map((name): Row => ({
          name,
          device: screen,
          phase: "DOCUMENT",
          target: "PAGE",
          cache: "UNKNOWN",
          samples: 0,
          validSamples: 0,
          errors: 0,
          p50: null,
          p75: null,
          p95: null,
        })),
  );
  const diagnostics =
    q.data?.rows.filter(
      (row) => !["LCP", "INP", "CLS", "FCP", "TTFB"].includes(row.name),
    ) ?? [];
  return (
    <section
      className="admin-record-section"
      aria-labelledby="performance-title"
    >
      <h2 id="performance-title">Velocidad real</h2>
      <div className="admin-list-filters">
        <label className="field">
          Entorno
          <select
            className="form-input"
            value={environment}
            onChange={(event) => setEnvironment(event.target.value)}
          >
            <option value="PRODUCTION">Producción</option>
            <option value="LOCAL">Pruebas locales y preview</option>
          </select>
        </label>
        <label className="field">
          Dispositivo
          <select
            className="form-input"
            value={device}
            onChange={(event) => setDevice(event.target.value)}
          >
            <option value="">Móvil y escritorio</option>
            <option value="MOBILE">Móvil</option>
            <option value="DESKTOP">Escritorio</option>
          </select>
        </label>
        <label className="field">
          Página
          <select
            className="form-input"
            value={page}
            onChange={(event) => setPage(event.target.value)}
          >
            <option value="">Todas</option>
            {Object.entries(performancePages).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Visita
          <select
            className="form-input"
            value={visit}
            onChange={(event) => setVisit(event.target.value)}
          >
            <option value="">Todas</option>
            <option value="FIRST">Primera visita en este navegador</option>
            <option value="RETURNING">Navegador que vuelve</option>
            <option value="UNKNOWN">Sin dato de visita</option>
          </select>
        </label>
        <label className="field">
          Versión publicada
          <input
            className="form-input"
            value={release}
            maxLength={40}
            placeholder="Commit, opcional"
            onChange={(event) => setRelease(event.target.value.trim())}
          />
        </label>
      </div>
      {release && !/^(?:[a-f0-9]{7,40}|unknown)$/i.test(release) && (
        <p role="status">
          La versión debe ser un identificador de commit de 7 a 40 caracteres.
        </p>
      )}
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} retry={() => void q.refetch()} />
      ) : q.data.readiness !== "READY" ? (
        <p role="status">
          {q.data.readiness === "PENDING"
            ? "La captura de rendimiento está pendiente de activar su migración en la base."
            : "No se pudo comprobar la disponibilidad de las mediciones."}
        </p>
      ) : (
        <>
          <p className="muted small-copy">
            {q.data.views} cargas de documento con muestras consentidas. Los
            resultados con menos de 20 muestras son orientativos; no certifican
            el objetivo.
          </p>
          <div className="table-wrap">
            <table aria-label="Percentiles de Web Vitals">
              <thead>
                <tr>
                  <th>Métrica</th>
                  <th>Dispositivo</th>
                  <th>Contexto</th>
                  <th>Muestras</th>
                  <th>p50</th>
                  <th>p75</th>
                  <th>p95</th>
                  <th>Objetivo p75</th>
                </tr>
              </thead>
              <tbody>
                {[...core, ...missing].map((row) => {
                  const threshold = performanceThreshold(row.name),
                    assessed = row.validSamples >= 20 && row.p75 !== null;
                  return (
                    <tr key={`${row.name}-${row.device}-${row.phase}`}>
                      <td>{row.name}</td>
                      <td>{deviceName(row.device)}</td>
                      <td>{phaseName(row.phase)}</td>
                      <td>{row.validSamples}</td>
                      <td>{value(row, row.p50)}</td>
                      <td>{value(row, row.p75)}</td>
                      <td>{value(row, row.p95)}</td>
                      <td>
                        {threshold === null
                          ? "Sin referencia fija"
                          : `${value(row, threshold)} · ${!assessed ? "Muestra insuficiente" : row.p75! <= threshold ? "Cumple" : "Fuera del objetivo"}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <h3>Navegación, consultas e imágenes</h3>
          {diagnostics.length ? (
            <div className="table-wrap">
              <table aria-label="Diagnóstico de rendimiento">
                <thead>
                  <tr>
                    <th>Medición</th>
                    <th>Grupo</th>
                    <th>Dispositivo</th>
                    <th>Contexto</th>
                    <th>Caché</th>
                    <th>Muestras / errores</th>
                    <th>p50</th>
                    <th>p75</th>
                    <th>p95</th>
                  </tr>
                </thead>
                <tbody>
                  {diagnostics.map((row) => (
                    <tr
                      key={`${row.name}-${row.target}-${row.device}-${row.phase}-${row.cache}`}
                    >
                      <td>{labels[row.name]}</td>
                      <td>{labels[row.target]}</td>
                      <td>{deviceName(row.device)}</td>
                      <td>{phaseName(row.phase)}</td>
                      <td>{labels[row.cache]}</td>
                      <td>
                        {row.validSamples} / {row.errors}
                      </td>
                      <td>{value(row, row.p50)}</td>
                      <td>{value(row, row.p75)}</td>
                      <td>{value(row, row.p95)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>
              Sin muestras de navegación, consultas o imágenes en este período.
            </p>
          )}
          <p className="muted small-copy">
            LCP, INP y CLS son métricas de documento; no representan cambios
            internos de ruta. INP necesita interacciones. API incluye peticiones
            de precarga. Imagen mide descarga, no decodificación; sin
            información de tamaño no se infiere caché. Consultas visibles
            incluye 100 ms de estabilización.
          </p>
        </>
      )}
      <UsageConsent />
    </section>
  );
}
