import { demoRequest } from "./demo";
import { ApiError } from "./http";

export async function downloadDemoInvoice(invoiceId: string, filename: string) {
  const file = await demoRequest<{ base64: string; mimeType: string }>(`orders/me/invoices/${invoiceId}/pdf`);
  const bytes = Uint8Array.from(atob(file.base64), (character) => character.charCodeAt(0));
  let pdfBytes = bytes;
  if (file.mimeType !== "application/pdf") {
    const { PDFDocument, PageSizes } = await import("pdf-lib");
    try {
      const pdf = await PDFDocument.create();
      const image = file.mimeType === "image/png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
      const [width, height] = image.width > image.height ? [PageSizes.A4[1], PageSizes.A4[0]] : PageSizes.A4;
      const scale = Math.min(1, (width - 48) / image.width, (height - 48) / image.height);
      pdf.addPage([width, height]).drawImage(image, { x: (width - image.width * scale) / 2, y: (height - image.height * scale) / 2, width: image.width * scale, height: image.height * scale });
      pdfBytes = new Uint8Array(await pdf.save());
    } catch { throw new ApiError("No se pudo preparar el PDF de la factura."); }
  }
  const url = URL.createObjectURL(new Blob([pdfBytes], { type: "application/pdf" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
