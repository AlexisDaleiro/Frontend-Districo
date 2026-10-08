"use client";

import { useRef, useState, type FormEvent } from "react";
import { Check, RotateCcw } from "lucide-react";
import { request, useSession } from "./providers";
import { ErrorBox } from "./ui";
import { returnedQuantities, type ProductReturnLine, type ProductReturnPreview } from "@/lib/product-returns";
import type { Order } from "@/lib/types";

export function OrderProductReturns({ order, onUpdated, readOnly }: { order: Order; onUpdated: () => Promise<void>; readOnly: boolean }) {
  const { notify } = useSession();
  const [draft, setDraft] = useState<Record<string, ProductReturnLine>>({});
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<ProductReturnPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const requestId = useRef(crypto.randomUUID());
  const returned = returnedQuantities(order);
  const items = order.items.filter((item) => item.id && item.quantity > (returned.get(item.id) ?? 0));
  const canReceive = !readOnly && ["SHIPPED", "DELIVERED"].includes(order.status) && items.length > 0;
  const selected = Object.values(draft);
  function change() { setPreview(null); setError(undefined); requestId.current = crypto.randomUUID(); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !selected.length) return;
    setBusy(true); setError(undefined);
    const path = `admin/orders/${order.id}/returns`;
    try {
      const body = { items: selected, reason: reason.trim(), requestId: requestId.current };
      if (!preview) { setPreview(await request<ProductReturnPreview>(`${path}/preview`, "POST", body)); return; }
      await request(path, "POST", { ...body, previewToken: preview.token });
      setDraft({}); setReason(""); setPreview(null); requestId.current = crypto.randomUUID();
      notify("Devolución de mercadería registrada.");
      try { await onUpdated(); } catch { notify("Devolución guardada. Actualizá el pedido para ver los cambios."); }
    } catch (cause) { setError(cause); }
    finally { setBusy(false); }
  }
  return <section className="order-product-returns">
    <h2>Devoluciones de mercadería</h2>
    {order.returns?.length ? <div className="order-return-history">{order.returns.map((receipt) => <details key={receipt.id}>
      <summary>{new Date(receipt.createdAt).toLocaleString("es-UY")} · {receipt.items.reduce((sum, item) => sum + item.quantity, 0)} unidades devueltas</summary>
      <p className="small-copy">{receipt.reason}{receipt.recordedByEmail ? ` · ${receipt.recordedByEmail}` : ""}</p>
      <div className="table-wrap"><table><thead><tr><th>PRODUCTO</th><th>DEVUELTO</th><th>REINCORPORADO AL STOCK</th></tr></thead><tbody>{receipt.items.map((line) => {
        const item = order.items.find((item) => item.id === line.orderItemId);
        return <tr key={line.orderItemId}><td>{item?.productName ?? "Producto del pedido"}<br /><small>{item?.variantName} · {item?.sku}</small></td><td>{line.quantity}</td><td>{line.restockedQuantity}</td></tr>;
      })}</tbody></table></div>
    </details>)}</div> : <p className="small-copy muted">Sin mercadería devuelta.</p>}
    {canReceive && <form className="stack" onSubmit={(event) => void submit(event)}>
      <fieldset disabled={busy || !!preview} className="admin-bulk-fields">
        <div className="table-wrap"><table className="order-return-table"><thead><tr><th>PRODUCTO</th><th>VENDIDO</th><th>YA DEVUELTO</th><th>RECIBIR</th><th>VOLVER AL STOCK</th></tr></thead><tbody>{items.map((item) => {
          const id = item.id!;
          const line = draft[id];
          const remaining = item.quantity - (returned.get(id) ?? 0);
          return <tr key={id}>
            <td><label className="check-field"><input type="checkbox" checked={!!line} aria-label={`Devolver ${item.productName} ${item.variantName}`} onChange={(event) => { change(); setDraft((current) => {
              if (event.target.checked) return { ...current, [id]: { orderItemId: id, quantity: 1, restockedQuantity: 0 } };
              const next = { ...current }; delete next[id]; return next;
            }); }} /><span>{item.productName}<small>{item.variantName} · {item.sku}</small></span></label></td>
            <td>{item.quantity}</td><td>{returned.get(id) ?? 0}</td>
            <td><input aria-label={`Cantidad a devolver ${item.sku}`} className="form-input" type="number" min={1} max={Math.min(remaining, 1000000)} step={1} required={!!line} disabled={!line} value={line?.quantity ?? ""} onChange={(event) => { change(); const quantity = Number(event.target.value); setDraft((current) => ({ ...current, [id]: { ...current[id], quantity, restockedQuantity: Math.min(quantity, current[id].restockedQuantity) } })); }} /></td>
            <td><input aria-label={`Cantidad a reincorporar ${item.sku}`} className="form-input" type="number" min={0} max={line?.quantity ?? 0} step={1} required={!!line} disabled={!line} value={line?.restockedQuantity ?? ""} onChange={(event) => { change(); setDraft((current) => ({ ...current, [id]: { ...current[id], restockedQuantity: Number(event.target.value) } })); }} /></td>
          </tr>;
        })}</tbody></table></div>
        <label className="field">Motivo de devolución de mercadería<textarea className="form-input" required minLength={3} maxLength={500} value={reason} onChange={(event) => { change(); setReason(event.target.value); }} /></label>
      </fieldset>
      {preview && <div className="order-return-confirmation">
        <h3>Confirmar recepción</h3>
        <div className="table-wrap"><table><thead><tr><th>PRODUCTO</th><th>DEVUELTO</th><th>AL STOCK</th><th>SIN REINCORPORAR</th></tr></thead><tbody>{preview.entries.map((item) => <tr data-bulk-entry="true" key={item.orderItemId}><td>{item.productName}<br /><small>{item.variantName} · {item.sku}</small></td><td>{item.quantity}</td><td>{item.restockedQuantity}</td><td>{item.quantity - item.restockedQuantity}</td></tr>)}</tbody></table></div>
        {preview.stock.map((movement) => <p className="small-copy" key={movement.variantId}>Stock físico · {order.items.find((item) => item.variantId === movement.variantId)?.sku}: {movement.before} → {movement.after}</p>)}
      </div>}
      {error !== undefined && <ErrorBox error={error} />}
      <div className="actions"><button className="button small" type="submit" disabled={busy || !selected.length}><Check size={16} />{busy ? "Guardando…" : preview ? "Confirmar recepción" : "Revisar devolución"}</button>
        {preview && <button className="button small secondary" type="button" disabled={busy} onClick={change}><RotateCcw size={16} />Volver a editar</button>}
      </div>
    </form>}
  </section>;
}
