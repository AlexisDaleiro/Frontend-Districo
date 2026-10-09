"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Eye, Pencil, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { request, useSession } from "./providers";
import { ErrorBox } from "./ui";
import { TechnicalAccordions } from "./product-sheet";
import { TechnicalRichEditor } from "./technical-rich-editor";
import { invalidateAdminMutation } from "@/lib/admin-query-invalidation";
import { benefitLabels, normalizeProductSheet, sanitizeSheetHtml, sheetTextHtml } from "@/lib/product-sheet";
import type { Product, ProductSheet, TechnicalBlock } from "@/lib/types";

type DraftBlock = TechnicalBlock & { key: string };
const copySheet = (sheet?: ProductSheet | null) => ({ technical: structuredClone(sheet?.technical ?? []), benefits: structuredClone(sheet?.benefits ?? []) });

export function AdminTechnicalSheet({ product }: { product: Product }) {
  const client = useQueryClient();
  const { notify } = useSession();
  const [saved, setSaved] = useState(() => copySheet(product.technicalSheet));
  const [blocks, setBlocks] = useState<DraftBlock[]>(() => saved.technical.map((block, index) => ({ ...block, key: `initial-${index}` })));
  const [benefits, setBenefits] = useState(saved.benefits);
  const [revision, setRevision] = useState(product.technicalSheetRevision ?? 0);
  const [generation, setGeneration] = useState(0);
  const [newSection, setNewSection] = useState("Composición básica");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const sheet: Required<ProductSheet> = { technical: blocks.map(({ label, html, text }) => ({ label, ...(html !== undefined ? { html } : { text }) })), benefits };
  const dirty = JSON.stringify(sheet) !== JSON.stringify(saved);
  const remoteChanged = (product.technicalSheetRevision ?? 0) > revision;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function reset(next: ProductSheet | null | undefined, nextRevision: number) {
    const copied = copySheet(next);
    setSaved(copied);
    setBlocks(copied.technical.map((block, index) => ({ ...block, key: `saved-${index}` })));
    setBenefits(copied.benefits);
    setRevision(nextRevision);
    setGeneration((value) => value + 1);
    setError(undefined);
  }
  async function reload() {
    if (dirty && !window.confirm("¿Descartar los cambios sin guardar y cargar la ficha guardada?")) return;
    setBusy(true);
    try {
      const latest = await request<Product>(`products/admin/${encodeURIComponent(product.slug)}`);
      reset(latest.technicalSheet, latest.technicalSheetRevision ?? 0);
      await invalidateAdminMutation(client, `products/${product.id}/technical-sheet`);
    } catch (problem) { setError(problem); } finally { setBusy(false); }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !dirty) return;
    setError(undefined);
    setBusy(true);
    try {
      const normalized = normalizeProductSheet(sheet);
      const result = await request<Pick<Product, "technicalSheet" | "technicalSheetRevision">>(`products/${product.id}/technical-sheet`, "PATCH", { ...normalized, revision });
      reset(result.technicalSheet, result.technicalSheetRevision!);
      await invalidateAdminMutation(client, `products/${product.id}/technical-sheet`);
      notify("Ficha técnica guardada.");
    } catch (problem) {
      setError(problem);
      void invalidateAdminMutation(client, `products/${product.id}/technical-sheet`);
    } finally { setBusy(false); }
  }
  function move(index: number, delta: number) {
    setBlocks((current) => {
      const next = [...current];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
  }
  return <section id="ficha-tecnica" className="admin-product-section admin-technical-sheet">
    <div className="admin-toolbar"><h2>Ficha técnica</h2><div className="actions">
      {dirty && <span className="muted small-copy">Cambios sin guardar</span>}
      <button type="button" className="icon-button" title={preview ? "Editar ficha" : "Vista previa de la ficha"} aria-label={preview ? "Editar ficha" : "Vista previa de la ficha"} onClick={() => setPreview(!preview)}>{preview ? <Pencil size={18} /> : <Eye size={18} />}</button>
    </div></div>
    <form data-admin-save="true" aria-busy={busy} onSubmit={(event) => void save(event)}>
      {remoteChanged && <p role="status" className="notice">Hay una versión más reciente de esta ficha. Tus cambios todavía no se guardaron.</p>}
      {preview ? <div className="technical-sheet-preview">
        {blocks.length ? <TechnicalAccordions blocks={sheet.technical.map((block) => block.html !== undefined ? { ...block, html: sanitizeSheetHtml(block.html) } : block)} /> : <p className="muted">Sin información técnica.</p>}
        {benefits.length > 0 && <ul>{benefits.map((benefit, index) => <li key={index}>{benefit.label}</li>)}</ul>}
      </div> : <fieldset disabled={busy} className="technical-sheet-fields">
        {blocks.map((block, index) => <div className="technical-sheet-block" key={`${generation}-${block.key}`}>
          <div className="technical-block-heading">
            <label className="field">Título de la sección {index + 1}<input value={block.label} maxLength={100} required onChange={(event) => setBlocks((current) => current.map((item, at) => at === index ? { ...item, label: event.target.value } : item))} /></label>
            <div className="actions">
              <button type="button" className="icon-button" aria-label={`Subir sección ${index + 1}`} title="Subir sección" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={17} /></button>
              <button type="button" className="icon-button" aria-label={`Bajar sección ${index + 1}`} title="Bajar sección" disabled={index === blocks.length - 1} onClick={() => move(index, 1)}><ArrowDown size={17} /></button>
              <button type="button" className="icon-button" aria-label={`Eliminar sección ${index + 1}`} title="Eliminar sección" onClick={() => setBlocks((current) => current.filter((_, at) => at !== index))}><Trash2 size={17} /></button>
            </div>
          </div>
          <TechnicalRichEditor label={`Contenido de ${block.label || `sección ${index + 1}`}`} content={block.html ?? sheetTextHtml(block.text ?? "")} disabled={busy} onChange={(html) => setBlocks((current) => current.map((item) => item.key === block.key ? { key: item.key, label: item.label, html } : item))} />
        </div>)}
        <div className="technical-sheet-add">
          <label className="field">Nueva sección<select value={newSection} onChange={(event) => setNewSection(event.target.value)}><option>Composición básica</option><option>Tabla nutricional</option><option>Recomendaciones de uso</option><option>Otra sección</option></select></label>
          <button className="button secondary small" type="button" disabled={blocks.length >= 20} onClick={() => setBlocks((current) => [...current, { key: crypto.randomUUID(), label: newSection === "Otra sección" ? "" : newSection, html: newSection === "Tabla nutricional" ? "<table><tbody><tr><th>Nutriente</th><th>Valor</th></tr><tr><td></td><td></td></tr></tbody></table>" : "<p></p>" }])}><Plus size={16} /> Agregar sección</button>
        </div>
        <div className="technical-benefits">
          <div className="admin-toolbar"><h3>Características principales</h3><button type="button" className="button small secondary" disabled={benefits.length >= 12} onClick={() => setBenefits((current) => [...current, { icon: "nutrition", label: "" }])}><Plus size={16} /> Agregar característica</button></div>
          {benefits.map((benefit, index) => <div className="technical-benefit-row" key={index}>
            <label className="field">Ícono {index + 1}<select value={benefit.icon} onChange={(event) => setBenefits((current) => current.map((item, at) => at === index ? { ...item, icon: event.target.value } : item))}>{Object.entries(benefitLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="field">Característica {index + 1}<input value={benefit.label} maxLength={160} required onChange={(event) => setBenefits((current) => current.map((item, at) => at === index ? { ...item, label: event.target.value } : item))} /></label>
            <button type="button" className="icon-button" title="Eliminar característica" aria-label={`Eliminar característica ${index + 1}`} onClick={() => setBenefits((current) => current.filter((_, at) => at !== index))}><Trash2 size={17} /></button>
          </div>)}
        </div>
      </fieldset>}
      {error !== undefined && <ErrorBox error={error} />}
      <div className="actions technical-sheet-actions">
        <button className="button" type="submit" disabled={busy || !dirty}><Save size={17} /> {busy ? "Guardando…" : "Guardar ficha técnica"}</button>
        <button className="button secondary" type="button" disabled={busy} onClick={() => void reload()}><RotateCcw size={17} /> Recargar ficha guardada</button>
      </div>
    </form>
  </section>;
}
