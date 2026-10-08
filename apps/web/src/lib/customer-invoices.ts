export type CustomerInvoice = {
  id: string;
  invoiceNumber: string | null;
  createdAt: string;
  voidedAt: string | null;
  hasFile: boolean;
  order: { id: string; orderNumber: string };
};

export type CustomerInvoicePage = {
  items: CustomerInvoice[];
  meta: { total: number; page: number; limit: number };
};

export function customerInvoiceFilename(invoice: CustomerInvoice) {
  const name = (invoice.invoiceNumber || invoice.id).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 100);
  return `factura-${name}.pdf`;
}
