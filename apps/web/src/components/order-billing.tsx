"use client";
import { useRef, useState, type FormEvent } from "react";
import { CreditCard, Download, FileUp, RotateCcw, X } from "lucide-react";
import { DEMO, request, useSession } from "./providers";
import { money } from "@/lib/commerce";
import { downloadPrivateFile } from "@/lib/http";
import { orderBalance } from "@/lib/order-billing";
import type { Order } from "@/lib/types";
import { OrderReturns } from "./order-returns";

export function OrderBilling({ order, onUpdated, readOnly = false }: { order: Order; onUpdated: () => Promise<void>; readOnly?: boolean }) {
  const { notify } = useSession();
  const [mode, setMode] = useState<"partial" | "full">("full");
  const [amount, setAmount] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<"payment" | "invoice" | "download" | "void" | null>(null);
  const [correction, setCorrection] = useState<{ kind: "payment" | "invoice"; id: string; requestId: string } | null>(null);
  const [reason, setReason] = useState("");
  const [replacesInvoiceId, setReplacesInvoiceId] = useState("");
  const [replacementReason, setReplacementReason] = useState("");
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const requestId = useRef(crypto.randomUUID());
  const invoiceRequestId = useRef(crypto.randomUUID());
  const balance = orderBalance(order);
  const canPay = balance.due > 0 && !["DRAFT", "REJECTED", "CANCELLED"].includes(order.status);

  async function recordPayment(event: FormEvent) {
    event.preventDefault();
    setError("");
    const value = mode === "full" ? balance.due : Number(amount);
    if (!canPay || !Number.isFinite(value) || value <= 0 || (mode === "partial" && value >= balance.due)) {
      setError("Ingresá un abono parcial menor al saldo pendiente.");
      return;
    }
    setBusy("payment");
    try {
      await request(`admin/orders/${order.id}/payments`, "POST", {
        amount: value.toFixed(2), requestId: requestId.current,
      });
      await onUpdated();
      requestId.current = crypto.randomUUID();
      setAmount("");
      setMode("full");
      notify("Pago registrado.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo registrar el pago.");
    } finally {
      setBusy(null);
    }
  }

  async function attachInvoice(event: FormEvent) {
    event.preventDefault();
    setError("");
    const number = invoiceNumber.trim();
    if (!number && !file) {
      setError("Ingresá un número de factura o seleccioná un archivo.");
      return;
    }
    if (replacesInvoiceId && replacementReason.trim().length < 3) {
      setError("Indicá el motivo del reemplazo.");
      return;
    }
    if (number.length > 80 || (file && (file.size === 0 || file.size > 5_000_000))) {
      setError("El número admite hasta 80 caracteres y el archivo hasta 5 MB.");
      return;
    }
    const form = new FormData();
    if (file) form.set("file", file);
    if (number) form.set("invoiceNumber", number);
    if (replacesInvoiceId) {
      form.set("replacesInvoiceId", replacesInvoiceId);
      form.set("replacementReason", replacementReason.trim());
    }
    form.set("requestId", invoiceRequestId.current);
    setBusy("invoice");
    try {
      await request(`admin/orders/${order.id}/invoices`, "POST", form);
      await onUpdated();
      setFile(null);
      setInvoiceNumber("");
      setReplacesInvoiceId("");
      setReplacementReason("");
      invoiceRequestId.current = crypto.randomUUID();
      if (fileInput.current) fileInput.current.value = "";
      notify("Factura registrada.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo adjuntar la factura.");
    } finally {
      setBusy(null);
    }
  }

  async function voidRecord(event: FormEvent) {
    event.preventDefault();
    if (!correction || reason.trim().length < 3) return;
    setError("");
    setBusy("void");
    try {
      const segment = correction.kind === "payment" ? "payments" : "invoices";
      await request(`admin/orders/${order.id}/${segment}/${correction.id}/void`, "POST", {
        requestId: correction.requestId,
        reason: reason.trim(),
      });
      await onUpdated();
      setCorrection(null);
      setReason("");
      notify(correction.kind === "payment" ? "Pago anulado." : "Factura anulada.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo anular el registro.");
    } finally {
      setBusy(null);
    }
  }

  async function download(id: string, filename: string) {
    setError("");
    setBusy("download");
    try {
      await downloadPrivateFile(`admin/orders/${order.id}/invoices/${id}`, filename);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo descargar la factura.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="order-billing">
      <h3>Facturación y pagos</h3>
      <div className="order-billing-summary">
        <div><span>Estado de pago</span><strong className={`status-pill${balance.status === "Parcial" ? " pending" : ""}`}>{balance.status}</strong></div>
        <div><span>Monto pagado</span><strong>{money(balance.paid, order.currency)}</strong></div>
        <div><span>Monto a pagar</span><strong>{money(balance.due, order.currency)}</strong></div>
        <div><span>Notas de crédito</span><strong>{money(balance.credited, order.currency)}</strong></div>
      </div>
      {!!order.payments?.length && (
        <div className="order-billing-history">
          <h4>Abonos registrados</h4>
          <ul>{order.payments.map((payment) => (
            <li key={payment.id} className={payment.voidedAt ? "is-voided" : ""}>
              <span>{new Date(payment.createdAt).toLocaleString("es-UY")}{payment.recordedByEmail ? ` · ${payment.recordedByEmail}` : ""}{payment.voidedAt ? ` · Anulado ${new Date(payment.voidedAt).toLocaleString("es-UY")}${payment.voidedByEmail ? ` por ${payment.voidedByEmail}` : ""}: ${payment.voidReason}` : ""}</span>
              <strong>{money(Number(payment.amount), order.currency)}</strong>
              {!readOnly && !payment.voidedAt && !DEMO && <button className="text-link" type="button" disabled={!!busy} onClick={() => { setCorrection({ kind: "payment", id: payment.id, requestId: crypto.randomUUID() }); setReason(""); }}>Anular</button>}
            </li>
          ))}</ul>
        </div>
      )}
      {!readOnly && !DEMO && canPay && (
        <form data-admin-save="true" aria-busy={!!busy} onSubmit={(event) => void recordPayment(event)} className="order-billing-form">
          <h4>Actualizar estado de pago</h4>
          <div className="order-billing-modes" role="group" aria-label="Tipo de pago">
            <button type="button" aria-pressed={mode === "partial"} onClick={() => { setMode("partial"); requestId.current = crypto.randomUUID(); }}>Pago parcial</button>
            <button type="button" aria-pressed={mode === "full"} onClick={() => { setMode("full"); requestId.current = crypto.randomUUID(); }}>Pago completo</button>
          </div>
          <label className="field">
            Monto de este pago ({order.currency})
            <input className="form-input" type="number" min="0.01" max={mode === "partial" ? Math.max(0, balance.due - 0.01) : balance.due} step="0.01" required value={mode === "full" ? balance.due.toFixed(2) : amount} readOnly={mode === "full"} onChange={(event) => { setAmount(event.target.value); requestId.current = crypto.randomUUID(); }} />
          </label>
          <button className="button small" type="submit" disabled={!!busy}><CreditCard size={16} /> Guardar pago</button>
        </form>
      )}
      <div className="order-billing-history">
        <h4>Facturas</h4>
        {order.invoices?.length ? (
          <ul>{order.invoices.map((invoice) => (
            <li key={invoice.id} className={invoice.voidedAt ? "is-voided" : ""}>
              <span>
                {invoice.invoiceNumber ? `Factura ${invoice.invoiceNumber}` : "Factura sin número"}
                {invoice.originalName ? ` · ${invoice.originalName}` : ""}
                {` · ${new Date(invoice.createdAt).toLocaleString("es-UY")}`}
                {invoice.uploadedByEmail ? ` · ${invoice.uploadedByEmail}` : ""}
                {invoice.voidedAt ? ` · Anulada ${new Date(invoice.voidedAt).toLocaleString("es-UY")}${invoice.voidedByEmail ? ` por ${invoice.voidedByEmail}` : ""}: ${invoice.voidReason}` : ""}
                {invoice.replacesInvoiceId ? ` · Reemplazo: ${invoice.replacementReason}` : ""}
              </span>
              {!readOnly && invoice.originalName && (
                <button className="text-link" type="button" disabled={!!busy} onClick={() => void download(invoice.id, invoice.originalName!)}><Download size={16} /> Descargar</button>
              )}
              {!readOnly && !invoice.voidedAt && !DEMO && <div className="actions">
                <button className="text-link" type="button" disabled={!!busy} onClick={() => { setReplacesInvoiceId(invoice.id); setReplacementReason(""); }}>Reemplazar</button>
                <button className="text-link" type="button" disabled={!!busy} onClick={() => { setCorrection({ kind: "invoice", id: invoice.id, requestId: crypto.randomUUID() }); setReason(""); }}>Anular</button>
              </div>}
            </li>
          ))}</ul>
        ) : <p className="muted small-copy">Sin facturas registradas.</p>}
      </div>
      {correction && (
        <form data-admin-save="true" aria-busy={!!busy} className="order-billing-form" onSubmit={(event) => void voidRecord(event)}>
          <h4>Anular {correction.kind === "payment" ? "pago" : "factura"}</h4>
          <label className="field">Motivo de la anulación
            <textarea className="form-input" value={reason} required minLength={3} maxLength={500} onChange={(event) => setReason(event.target.value)} />
          </label>
          <div className="actions">
            <button className="button small danger" type="submit" disabled={!!busy || reason.trim().length < 3}>Confirmar anulación</button>
            <button className="button small secondary" type="button" onClick={() => setCorrection(null)}><X size={16} /> Cancelar</button>
          </div>
        </form>
      )}
      {!readOnly && !DEMO && (
        <form data-admin-save="true" aria-busy={!!busy} className="order-billing-form" onSubmit={(event) => void attachInvoice(event)}>
          <h4>{replacesInvoiceId ? "Reemplazar factura" : "Registrar factura"}</h4>
          {replacesInvoiceId && <>
            <p className="small-copy muted">La factura anterior quedará en el historial como anulada.</p>
            <label className="field">Motivo del reemplazo
              <textarea className="form-input" required minLength={3} maxLength={500} value={replacementReason} onChange={(event) => setReplacementReason(event.target.value)} />
            </label>
            <button className="text-link" type="button" onClick={() => setReplacesInvoiceId("")}><RotateCcw size={15} /> Volver a registrar una factura</button>
          </>}
          <label className="field">Número de factura
            <input className="form-input" type="text" maxLength={80} value={invoiceNumber} onChange={(event) => { setInvoiceNumber(event.target.value); invoiceRequestId.current = crypto.randomUUID(); }} />
          </label>
          <label className="field">Archivo de factura (PDF, PNG o JPG)
            <input ref={fileInput} className="form-input" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={(event) => { setFile(event.target.files?.[0] ?? null); invoiceRequestId.current = crypto.randomUUID(); }} />
          </label>
          <button className="button small secondary" type="submit" disabled={(!file && !invoiceNumber.trim()) || !!busy || (!!replacesInvoiceId && replacementReason.trim().length < 3)}><FileUp size={16} /> {replacesInvoiceId ? "Guardar reemplazo" : "Registrar factura"}</button>
        </form>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <OrderReturns order={order} onUpdated={onUpdated} readOnly={readOnly} />
    </section>
  );
}
