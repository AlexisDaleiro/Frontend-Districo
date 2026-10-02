"use client";

import { useRef, useState, type FormEvent } from "react";
import { Download, FileUp, RotateCcw } from "lucide-react";
import { DEMO, request, useSession } from "./providers";
import { money } from "@/lib/commerce";
import { downloadPrivateFile } from "@/lib/http";
import { orderBalance } from "@/lib/order-billing";
import type { Order } from "@/lib/types";

export function OrderReturns({ order, onUpdated }: { order: Order; onUpdated: () => Promise<void> }) {
  const { notify } = useSession();
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [noteNumber, setNoteNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const noteRequestId = useRef(crypto.randomUUID());
  const refundRequestId = useRef(crypto.randomUUID());
  const fileInput = useRef<HTMLInputElement>(null);
  const balance = orderBalance(order);
  const canCredit = balance.creditable > 0 && !["DRAFT", "REJECTED", "CANCELLED"].includes(order.status);

  async function saveCredit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const amount = Number(creditAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > balance.creditable || creditReason.trim().length < 3 || (!file && !noteNumber.trim()) || (file && (file.size === 0 || file.size > 5_000_000))) {
      setError("Revisá el importe, motivo y archivo de la nota de crédito.");
      return;
    }
    const form = new FormData();
    form.set("amount", amount.toFixed(2));
    form.set("reason", creditReason.trim());
    form.set("requestId", noteRequestId.current);
    if (noteNumber.trim()) form.set("noteNumber", noteNumber.trim());
    if (file) form.set("file", file);
    setBusy(true);
    try {
      await request(`admin/orders/${order.id}/credit-notes`, "POST", form);
      await onUpdated();
      noteRequestId.current = crypto.randomUUID();
      setCreditAmount(""); setCreditReason(""); setNoteNumber(""); setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      notify("Nota de crédito registrada.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo registrar la nota.");
    } finally { setBusy(false); }
  }

  async function saveRefund(event: FormEvent) {
    event.preventDefault();
    setError("");
    const amount = Number(refundAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > balance.refundable || refundReason.trim().length < 3) {
      setError("El reintegro debe estar cubierto por pagos y notas de crédito.");
      return;
    }
    setBusy(true);
    try {
      await request(`admin/orders/${order.id}/refunds`, "POST", { amount: amount.toFixed(2), reason: refundReason.trim(), reference: reference.trim() || undefined, requestId: refundRequestId.current });
      await onUpdated();
      refundRequestId.current = crypto.randomUUID();
      setRefundAmount(""); setRefundReason(""); setReference("");
      notify("Reintegro registrado.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo registrar el reintegro.");
    } finally { setBusy(false); }
  }

  async function download(id: string, name: string) {
    setError(""); setBusy(true);
    try { await downloadPrivateFile(`admin/orders/${order.id}/credit-notes/${id}`, name); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo descargar la nota."); }
    finally { setBusy(false); }
  }

  return <section className="order-billing-history">
    <h3>Devoluciones y notas de crédito</h3>
    <div className="order-billing-summary">
      <div><span>Total acreditado</span><strong>{money(balance.credited, order.currency)}</strong></div>
      <div><span>Reintegrado</span><strong>{money(balance.refunded, order.currency)}</strong></div>
      <div><span>Pendiente de reintegro</span><strong>{money(balance.refundable, order.currency)}</strong></div>
    </div>
    {!!order.creditNotes?.length && <><h4>Notas de crédito</h4><ul>{order.creditNotes.map((note) => <li key={note.id}>
      <span>{note.noteNumber ? `Nota ${note.noteNumber}` : "Nota sin número"} · {note.reason} · {new Date(note.createdAt).toLocaleString("es-UY")}{note.recordedByEmail ? ` · ${note.recordedByEmail}` : ""}</span>
      <strong>{money(Number(note.amount), order.currency)}</strong>
      {note.originalName && !DEMO && <button className="text-link" type="button" disabled={busy} onClick={() => void download(note.id, note.originalName!)}><Download size={16} /> Descargar</button>}
    </li>)}</ul></>}
    {!!order.refunds?.length && <><h4>Reintegros</h4><ul>{order.refunds.map((refund) => <li key={refund.id}>
      <span>{refund.reason}{refund.reference ? ` · Ref. ${refund.reference}` : ""} · {new Date(refund.createdAt).toLocaleString("es-UY")}{refund.recordedByEmail ? ` · ${refund.recordedByEmail}` : ""}</span>
      <strong>{money(Number(refund.amount), order.currency)}</strong>
    </li>)}</ul></>}
    {canCredit && <form className="order-billing-form" onSubmit={(event) => void saveCredit(event)}>
      <h4>Registrar nota de crédito</h4>
      <label className="field">Importe ({order.currency})<input className="form-input" type="number" min="0.01" max={balance.creditable} step="0.01" required value={creditAmount} onChange={(event) => setCreditAmount(event.target.value)} /></label>
      <label className="field">Motivo de la devolución<textarea className="form-input" minLength={3} maxLength={500} required value={creditReason} onChange={(event) => setCreditReason(event.target.value)} /></label>
      <label className="field">Número de nota de crédito<input className="form-input" maxLength={80} value={noteNumber} onChange={(event) => setNoteNumber(event.target.value)} /></label>
      <label className="field">Archivo (PDF, PNG o JPG)<input ref={fileInput} className="form-input" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
      <button className="button small secondary" disabled={busy} type="submit"><FileUp size={16} /> Registrar crédito</button>
    </form>}
    {balance.refundable > 0 && <form className="order-billing-form" onSubmit={(event) => void saveRefund(event)}>
      <h4>Registrar dinero reintegrado</h4>
      <label className="field">Importe ({order.currency})<input className="form-input" type="number" min="0.01" max={balance.refundable} step="0.01" required value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} /></label>
      <label className="field">Motivo<textarea className="form-input" minLength={3} maxLength={500} required value={refundReason} onChange={(event) => setRefundReason(event.target.value)} /></label>
      <label className="field">Referencia del reintegro<input className="form-input" maxLength={120} value={reference} onChange={(event) => setReference(event.target.value)} /></label>
      <button className="button small secondary" disabled={busy} type="submit"><RotateCcw size={16} /> Registrar reintegro</button>
    </form>}
    {error && <p className="error" role="alert">{error}</p>}
  </section>;
}
