"use client";
import { useRef, useState, type ReactNode } from "react";
import { Save } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { request, useSession } from "./providers";
import { useUnsavedChanges } from "@/lib/unsaved-changes";
import { ErrorBox } from "./ui";

export function OperationForm({
  path,
  method = "POST",
  children,
  transform,
  idempotent = true,
  refresh,
  onDone,
  button = "Guardar",
  canSubmit = true,
}: {
  path: string;
  method?: "POST" | "PATCH";
  children: ReactNode;
  transform?: (data: FormData) => Record<string, unknown>;
  idempotent?: boolean;
  refresh: string[];
  onDone?: () => void;
  button?: string;
  canSubmit?: boolean;
}) {
  const client = useQueryClient(),
    { user, notify } = useSession();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [dirty, setDirty] = useState(false);
  const operationId = useRef("");
  useUnsavedChanges(dirty);
  return (
    <form
      className="operation-form"
      aria-busy={busy}
      data-unsaved-changes={dirty}
      onChange={() => setDirty(true)}
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy || !canSubmit) return;
        const form = event.currentTarget;
        setBusy(true);
        setError(undefined);
        try {
          const data = new FormData(form);
          const payload = transform
            ? transform(data)
            : Object.fromEntries(data);
          if (idempotent) {
            operationId.current ||= crypto.randomUUID();
            payload.requestId = operationId.current;
          }
          await request(path, method, payload);
          operationId.current = "";
          setDirty(false);
          form.reset();
          void client.invalidateQueries({
            predicate: (query) =>
              query.queryKey[1] === user?.id &&
              refresh.some((key) =>
                String(query.queryKey[query.queryKey.length - 1]).startsWith(
                  key,
                ),
              ),
          });
          notify("Operación guardada.");
          onDone?.();
        } catch (cause) {
          setError(cause);
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy || !canSubmit}>
        {children}
        {canSubmit && (
          <button className="button small" type="submit">
            <Save size={16} />
            {busy ? "Guardando..." : button}
          </button>
        )}
      </fieldset>
      {error !== undefined && <ErrorBox error={error} />}
    </form>
  );
}
