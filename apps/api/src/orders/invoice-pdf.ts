import { ServiceUnavailableException } from '@nestjs/common';
import { PDFDocument, PageSizes } from 'pdf-lib';

export async function invoicePdf(bytes: Buffer, mimeType: string): Promise<Buffer> {
  // Preserve original PDFs byte-for-byte, including signatures and all pages.
  if (mimeType === 'application/pdf' && bytes.subarray(0, 5).toString() === '%PDF-') return bytes;
  try {
    const pdf = await PDFDocument.create();
    const image = mimeType === 'image/png' ? await pdf.embedPng(bytes)
      : mimeType === 'image/jpeg' ? await pdf.embedJpg(bytes) : null;
    if (!image || !image.width || !image.height) throw new Error('Unsupported invoice file');
    const [width, height] = image.width > image.height ? [PageSizes.A4[1], PageSizes.A4[0]] : PageSizes.A4;
    const scale = Math.min(1, (width - 48) / image.width, (height - 48) / image.height);
    const page = pdf.addPage([width, height]);
    page.drawImage(image, { x: (width - image.width * scale) / 2, y: (height - image.height * scale) / 2, width: image.width * scale, height: image.height * scale });
    return Buffer.from(await pdf.save());
  } catch {
    throw new ServiceUnavailableException('No se pudo preparar el PDF de la factura. Contacta a DISTRICO.');
  }
}
