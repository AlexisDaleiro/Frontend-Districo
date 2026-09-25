"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { request, useSession } from "./providers";
import { ErrorBox } from "./ui";
export type Field = {
  key: string;
  label: string;
  type?:
    "text" | "number" | "textarea" | "checkbox" | "select" | "date" | "url";
  required?: boolean;
  min?: number;
  max?: number;
  step?: string;
  options?: { value: string; label: string }[];
  hint?: string;
};
export type Editor = {
  title: string;
  path: string;
  method?: string;
  fields: Field[];
  initial?: Record<string, unknown>;
  transform?: (data: Record<string, unknown>) => unknown;
  description?: string;
};
export function AdminForm({
  editor,
  onDone,
}: {
  editor: Editor;
  onDone: () => void;
}) {
  const form = useForm<Record<string, unknown>>({
    defaultValues: editor.initial,
  });
  const [error, setError] = useState<unknown>();
  const client = useQueryClient();
  const { notify } = useSession();
  async function submit(raw: Record<string, unknown>) {
    setError(undefined);
    const data: Record<string, unknown> = {};
    let invalid = false;
    for (const field of editor.fields) {
      const value = raw[field.key];
      if (field.type === "checkbox") {
        data[field.key] = !!value;
        continue;
      }
      if (value === "" || value === undefined || value === null) {
        if (field.required) {
          form.setError(field.key, { message: "Completá este campo." });
          invalid = true;
        }
        continue;
      }
      let schema: z.ZodType =
        field.type === "number"
          ? z.coerce
              .number()
              .min(field.min ?? 0)
              .max(field.max ?? Number.MAX_SAFE_INTEGER)
          : field.type === "date"
            ? z.iso.date()
            : field.type === "url"
              ? z
                  .url()
                  .refine(
                    (s) => /^https?:\/\//.test(s),
                    "Usá una URL HTTP o HTTPS.",
                  )
              : z.string().min(1);
      if (field.type === "number" && field.step !== "any")
        schema = z.coerce
          .number()
          .int()
          .min(field.min ?? 0)
          .max(field.max ?? Number.MAX_SAFE_INTEGER);
      const parsed = schema.safeParse(value);
      if (!parsed.success) {
        form.setError(field.key, {
          message:
            field.type === "number"
              ? "Ingresá un número válido."
              : "Revisá este valor.",
        });
        invalid = true;
      } else
        data[field.key] =
          field.type === "date"
            ? new Date(
                `${parsed.data}T${field.key === "endsAt" ? "23:59:59.999" : "00:00:00"}-03:00`,
              ).toISOString()
            : parsed.data;
    }
    if (invalid) return;
    try {
      await request(
        editor.path,
        editor.method ?? "POST",
        editor.transform ? editor.transform(data) : data,
      );
      await client.invalidateQueries();
      notify("Cambios guardados.");
      onDone();
    } catch (e) {
      setError(e);
    }
  }
  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      {editor.description && (
        <p className="muted small-copy" style={{ marginBottom: 20 }}>
          {editor.description}
        </p>
      )}
      <div className="form-grid">
        {editor.fields.map((field) =>
          field.type === "checkbox" ? (
            <label key={field.key} className="check-field span-2">
              <input type="checkbox" {...form.register(field.key)} />
              {field.label}
            </label>
          ) : (
            <label
              key={field.key}
              className={`field ${field.type === "textarea" ? "span-2" : ""}`}
            >
              {field.label}
              {field.required ? " *" : ""}
              {field.type === "select" ? (
                <select {...form.register(field.key)}>
                  <option value="">Seleccionar</option>
                  {field.options?.map((o) => (
                    <option value={o.value} key={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea {...form.register(field.key)} />
              ) : (
                <input
                  type={field.type ?? "text"}
                  min={field.min}
                  max={field.max}
                  step={field.step ?? 1}
                  {...form.register(field.key)}
                />
              )}{" "}
              {field.hint && <small>{field.hint}</small>}
              <span className="field-error">
                {String(form.formState.errors[field.key]?.message ?? "")}
              </span>
            </label>
          ),
        )}
      </div>
      {error !== undefined && <ErrorBox error={error} />}
      <div className="actions">
        <button className="button" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Guardando…" : "Guardar cambios"}
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={form.formState.isSubmitting}
          onClick={onDone}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
