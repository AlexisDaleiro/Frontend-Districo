"use client";
import { useRef, useState, type FormEvent } from "react";
import { CreditCard, Download, FileUp } from "lucide-react";
import { DEMO, request, useSession } from "./providers";
import { money } from "@/lib/commerce";
import { downloadPrivateFile } from "@/lib/http";
import { orderBalance } from "@/lib/order-billing";
import type { Order } from "@/lib/types";

export function OrderBilling({ order, onUpdated }: { order: Order; onUpdated: () => Promise<void> }) {
  const { notify } = useSession();
  const [mode, setMode] = useState<"partial" | "full">("full");
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<"payment" | "invoice" | "download" | null>(null);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const requestId = useRef(crypto.randomUUID());
  const invoiceRequestId = useRef(crypto.randomUUID());
  const balance = orderBalance(order);
  const canPay = balance.due > 0 && !["DRAFT", "REJECTED", "CANCELLED"].includes(order.status);

  if (DEMO) return null;

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
    if (!file || file.size === 0 || file.size > 5_000_000) {
      setError("Seleccioná un PDF, PNG o JPG de hasta 5 MB.");
      return;
    }
    const form = new FormData();
    form.set("file", file);
    form.set("requestId", invoiceRequestId.current);
    setBusy("invoice");
    try {
      await request(`admin/orders/${order.id}/invoices`, "POST", form);
      await onUpdated();
      setFile(null);
      invoiceRequestId.current = crypto.randomUUID();
      if (fileInput.current) fileInput.current.value = "";
      notify("Factura adjuntada.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo adjuntar la factura.");
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
        <div><span>Abonado</span><strong>{money(balance.paid, order.currency)}</strong></div>
        <div><span>Saldo pendiente</span><strong>{money(balance.due, order.currency)}</strong></div>
        <span className={`status-pill${balance.status === "Parcial" ? " pending" : ""}`}>{balance.status}</span>
      </div>
      {!!order.payments?.length && (
        <div className="order-billing-history">
          <h4>Abonos registrados</h4>
          <ul>{order.payments.map((payment) => (
            <li key={payment.id}>
              <span>{new Date(payment.createdAt).toLocaleDateString("es-UY")}</span>
              <strong>{money(Number(payment.amount), order.currency)}</strong>
            </li>
          ))}</ul>
        </div>
      )}
      {canPay && (
        <form onSubmit={(event) => void recordPayment(event)} className="order-billing-form">
          <h4>Registrar abono</h4>
          <div className="order-billing-modes" role="group" aria-label="Tipo de abono">
            <button type="button" aria-pressed={mode === "partial"} onClick={() => { setMode("partial"); requestId.current = crypto.randomUUID(); }}>Parcial</button>
            <button type="button" aria-pressed={mode === "full"} onClick={() => { setMode("full"); requestId.current = crypto.randomUUID(); }}>Completo</button>
          </div>
          <label className="field">
            Importe abonado ({order.currency})
            <input className="form-input" type="number" min="0.01" max={mode === "partial" ? Math.max(0, balance.due - 0.01) : balance.due} step="0.01" required value={mode === "full" ? balance.due.toFixed(2) : amount} readOnly={mode === "full"} onChange={(event) => { setAmount(event.target.value); requestId.current = crypto.randomUUID(); }} />
          </label>
          <button className="button small" type="submit" disabled={!!busy}><CreditCard size={16} /> Registrar pago</button>
        </form>
      )}
      <div className="order-billing-history">
        <h4>Facturas</h4>
        {order.invoices?.length ? (
          <ul>{order.invoices.map((invoice) => (
            <li key={invoice.id}>
              <span>{invoice.originalName} · {new Date(invoice.createdAt).toLocaleDateString("es-UY")}</span>
              <button className="text-link" type="button" disabled={!!busy} onClick={() => void download(invoice.id, invoice.originalName)}><Download size={16} /> Descargar</button>
            </li>
          ))}</ul>
        ) : <p className="muted small-copy">Sin factura adjunta.</p>}
      </div>
      <form className="order-billing-form" onSubmit={(event) => void attachInvoice(event)}>
        <label className="field">Adjuntar factura
          <input ref={fileInput} className="form-input" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={(event) => { setFile(event.target.files?.[0] ?? null); invoiceRequestId.current = crypto.randomUUID(); }} />
        </label>
        <button className="button small secondary" type="submit" disabled={!file || !!busy}><FileUp size={16} /> Adjuntar factura</button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  );
}
