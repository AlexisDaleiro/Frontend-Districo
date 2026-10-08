"use client";

import Link from "next/link";
import { Download, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { AccessGate } from "./auth";
import { useApi, useSession, DEMO } from "./providers";
import { ActionLink, Empty, ErrorBox, Loading, PageHeading } from "./ui";
import { ListPagination } from "./admin-list-filters";
import { customerInvoiceFilename, type CustomerInvoice, type CustomerInvoicePage } from "@/lib/customer-invoices";
import { downloadPrivateFile } from "@/lib/http";
import { storeRoutes } from "@/lib/store-routes";

function InvoicesContent() {
  const { user } = useSession();
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<unknown>();
  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (term) params.set("search", term);
  const q = useApi<CustomerInvoicePage>(`orders/me/invoices?${params}`, !!user);

  async function download(invoice: CustomerInvoice) {
    setError(undefined);
    setDownloading(invoice.id);
    try {
      const name = customerInvoiceFilename(invoice);
      if (DEMO) await (await import("@/lib/demo-invoices")).downloadDemoInvoice(invoice.id, name);
      else await downloadPrivateFile(`orders/me/invoices/${encodeURIComponent(invoice.id)}/pdf`, name);
    } catch (cause) { setError(cause); }
    finally { setDownloading(null); }
  }

  return <>
    <div className="customer-invoices-toolbar">
      <label className="field">Buscar facturas
        <div className="customer-invoices-search"><Search size={18} aria-hidden="true" /><input className="form-input" type="search" maxLength={120} placeholder="Número de factura o pedido" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div>
      </label>
      <ActionLink href={storeRoutes.account} secondary>Mi cuenta</ActionLink>
    </div>
    {error !== undefined && <ErrorBox error={error} />}
    {q.isPending ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={() => void q.refetch()} /> : !q.data.items.length ?
      <Empty title={term ? "No encontramos facturas con esa búsqueda" : "Todavía no hay facturas"} /> : <>
        <div className="table-wrap customer-invoices-table" aria-busy={q.isFetching}>
          <table>
            <thead><tr><th>Factura</th><th>Fecha</th><th>Pedido</th><th>Estado</th><th>Archivo</th></tr></thead>
            <tbody>{q.data.items.map((invoice) => <tr key={invoice.id}>
              <td data-label="Factura"><strong>{invoice.invoiceNumber || "Sin número registrado"}</strong></td>
              <td data-label="Fecha">{new Date(invoice.createdAt).toLocaleDateString("es-UY")}</td>
              <td data-label="Pedido"><Link className="text-link" href={storeRoutes.order(invoice.order.id)}>{invoice.order.orderNumber}</Link></td>
              <td data-label="Estado"><span className="status-pill" data-status={invoice.voidedAt ? "CANCELLED" : "APPROVED"}>{invoice.voidedAt ? "Anulada" : "Vigente"}</span></td>
              <td data-label="Archivo">{invoice.voidedAt ? <span className="muted">No disponible</span> : invoice.hasFile ?
                <button className="button small secondary" type="button" disabled={!!downloading} aria-label={`Descargar PDF de factura ${invoice.invoiceNumber || invoice.id}`} onClick={() => void download(invoice)}><Download size={16} />{downloading === invoice.id ? "Descargando…" : "Descargar PDF"}</button> : <span className="muted">Archivo pendiente</span>}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <ListPagination meta={q.data.meta} onPage={setPage} />
      </>}
  </>;
}

export function CustomerInvoicesPage() {
  return <div className="container section">
    <PageHeading eyebrow="Mi cuenta" title="Mis facturas" />
    <AccessGate><InvoicesContent /></AccessGate>
  </div>;
}
