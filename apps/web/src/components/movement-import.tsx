"use client";
import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { request, useSession } from "./providers";
import { ErrorBox } from "./ui";
import { useUnsavedChanges } from "@/lib/unsaved-changes";
type Preview = {
  total: number;
  toCreate: number;
  alreadyPresent: number;
  errors: { line: number; message: string }[];
  conflicts: string[];
  sample: {
    reference: string;
    amount: number;
    currency: string;
    description: string;
  }[];
};
export function MovementImport() {
  const [csv, setCsv] = useState(""),
    [preview, setPreview] = useState<Preview | null>(null),
    [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState(false);
  const token = useRef(""),
    client = useQueryClient(),
    { notify } = useSession();
  useUnsavedChanges(!!csv);
  return (
    <section
      className="admin-record-section"
      data-unsaved-changes={!!csv}
      aria-busy={busy}
    >
      <button
        className="button small secondary"
        onClick={() => {
          const url = URL.createObjectURL(
            new Blob(
              [
                'reference,occurredAt,amount,currency,description\nEJEMPLO-001,2026-10-12,1000.00,UYU,"Ejemplo de movimiento"\n',
              ],
              { type: "text/csv;charset=utf-8" },
            ),
          );
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = "plantilla-movimientos.csv";
          anchor.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}
      >
        <Download size={16} /> Plantilla CSV
      </button>
      <label className="field">
        Archivo de movimientos CSV
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={busy}
          onChange={async (event) => {
            setError(undefined);
            setPreview(null);
            const file = event.target.files?.[0];
            if (!file) return;
            if (file.size > 250000) {
              setError("El archivo supera 250 KB.");
              return;
            }
            setCsv(await file.text());
            token.current = crypto.randomUUID();
          }}
        />
      </label>
      <button
        className="button small secondary"
        disabled={!csv || busy}
        onClick={async () => {
          setBusy(true);
          setError(undefined);
          try {
            setPreview(
              await request<Preview>(
                "admin/operations/finance/movements/import/preview",
                "POST",
                { csv, requestId: token.current },
              ),
            );
          } catch (cause) {
            setError(cause);
          } finally {
            setBusy(false);
          }
        }}
      >
        Revisar importación
      </button>
      {preview && (
        <>
          <p>
            {preview.toCreate} nuevos · {preview.alreadyPresent} ya cargados ·{" "}
            {preview.errors.length} filas inválidas
          </p>
          {preview.errors.map((row) => (
            <p role="alert" key={row.line}>
              Fila {row.line}: {row.message}
            </p>
          ))}
          {preview.conflicts.length > 0 && (
            <p role="alert">
              Referencias con otro importe o moneda:{" "}
              {preview.conflicts.join(", ")}
            </p>
          )}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Referencia</th>
                  <th>Importe</th>
                  <th>Moneda</th>
                  <th>Descripción</th>
                </tr>
              </thead>
              <tbody>
                {preview.sample.map((row) => (
                  <tr key={row.reference}>
                    <td>{row.reference}</td>
                    <td>{row.amount}</td>
                    <td>{row.currency}</td>
                    <td>{row.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="button small"
            disabled={
              busy ||
              !!preview.errors.length ||
              !!preview.conflicts.length ||
              !preview.toCreate
            }
            onClick={async () => {
              if (
                !window.confirm(
                  `¿Importar ${preview.toCreate} movimientos nuevos? No se modificarán los existentes.`,
                )
              )
                return;
              setBusy(true);
              setError(undefined);
              try {
                await request(
                  "admin/operations/finance/movements/import",
                  "POST",
                  { csv, requestId: token.current },
                );
                setCsv("");
                setPreview(null);
                notify("Movimientos importados.");
                await client.invalidateQueries({
                  predicate: (query) =>
                    String(query.queryKey.at(-1)).startsWith(
                      "admin/operations/finance/movements",
                    ),
                });
              } catch (cause) {
                setError(cause);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Upload size={16} /> Confirmar importación
          </button>
        </>
      )}
      {error !== undefined && <ErrorBox error={error} />}
    </section>
  );
}
