import { describe, expect, it } from "vitest";
import { customerInvoiceFilename, type CustomerInvoice } from "../src/lib/customer-invoices";
import { allowedPath } from "../src/lib/proxy-policy";

describe("customer invoice downloads", () => {
  it("permits only the private customer GET endpoints", () => {
    expect(allowedPath("orders/me/invoices", "GET")).toBe(true);
    expect(allowedPath("orders/me/invoices/invoice-1/pdf", "GET")).toBe(true);
    expect(allowedPath("orders/me/invoices/invoice-1/pdf", "POST")).toBe(false);
    expect(allowedPath("orders/another/invoices/invoice-1/pdf", "GET")).toBe(false);
    expect(allowedPath("orders/me/invoices/../secret/pdf", "GET")).toBe(false);
  });
  it("always downloads a safe .pdf filename, including numberless invoices", () => {
    expect(customerInvoiceFilename({ id: "invoice-1", invoiceNumber: "A/2026:001" } as CustomerInvoice)).toBe("factura-A-2026-001.pdf");
    expect(customerInvoiceFilename({ id: "invoice-1", invoiceNumber: null } as CustomerInvoice)).toBe("factura-invoice-1.pdf");
  });
});
