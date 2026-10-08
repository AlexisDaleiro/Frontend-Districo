import { expect, test, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function login(page: Page) {
  await page.goto("/tienda/ingresar");
  await expect(async () => {
    await page.getByRole("button", { name: "Cliente mayorista", exact: true }).click();
    expect(await page.getByLabel("Correo electrónico").inputValue()).toBe("cliente@gmail.com");
  }).toPass({ timeout: 15000 });
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/tienda$/, { timeout: 15000 });
}

test("mis facturas: acceso desde cuenta, búsqueda, paginación y descargas PDF reales", async ({ page }, info) => {
  test.setTimeout(90000);
  await login(page);
  const pdf = await PDFDocument.create();
  pdf.addPage().drawText("Factura de prueba A-100");
  pdf.addPage().drawText("Segunda pagina");
  const original = Buffer.from(await pdf.save());
  const png = await readFile(resolve("public/images/hero-biofresh-castrados.png"));
  await page.evaluate(({ pdf, png }) => {
    const state = JSON.parse(localStorage.getItem("districo-demo-v1")!);
    const own = state.users.find((user: { email: string }) => user.email === "cliente@gmail.com");
    const other = state.users.find((user: { email: string }) => user.email === "clientemed@gmail.com");
    state.orders = [
      { id: "own-order", userId: own.id, orderNumber: "DIS-100", items: [], total: 100, currency: "UYU", status: "APPROVED", createdAt: "2026-10-01T12:00:00Z", invoices: [
        { id: "original-pdf", invoiceNumber: "A-100", createdAt: "2026-10-04T12:00:00Z" },
        { id: "image-png", invoiceNumber: "A-101", createdAt: "2026-10-03T12:00:00Z" },
        { id: "number-only", invoiceNumber: "A-102", createdAt: "2026-10-02T12:00:00Z" },
        { id: "voided", invoiceNumber: "A-103", voidedAt: "2026-10-02T12:00:00Z", createdAt: "2026-10-01T12:00:00Z" },
        ...Array.from({ length: 20 }, (_, i) => ({ id: `extra-${i}`, invoiceNumber: `B-${i}`, createdAt: "2026-09-01T12:00:00Z" })),
      ] },
      { id: "other-order", userId: other.id, orderNumber: "FOREIGN-ORDER", items: [], total: 200, createdAt: "2026-10-07T12:00:00Z", invoices: [{ id: "foreign", invoiceNumber: "FOREIGN-INVOICE", createdAt: "2026-10-07T12:00:00Z" }] },
    ];
    state.invoiceFiles = { "original-pdf": { base64: pdf, mimeType: "application/pdf" }, "image-png": { base64: png, mimeType: "image/png" }, voided: { base64: pdf, mimeType: "application/pdf" }, foreign: { base64: pdf, mimeType: "application/pdf" } };
    localStorage.setItem("districo-demo-v1", JSON.stringify(state));
  }, { pdf: original.toString("base64"), png: png.toString("base64") });
  await page.goto("/tienda/cuenta");
  await page.locator(".account-dashboard-actions").getByRole("link", { name: "Mis facturas", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mis facturas" })).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(20);
  await expect(page.getByText("24 registros · Página 1 de 2", { exact: true })).toBeVisible();
  await expect(page.locator("tbody")).not.toContainText("FOREIGN");
  const numberOnly = page.getByRole("row").filter({ hasText: "A-102" });
  await expect(numberOnly).toContainText("Archivo pendiente");
  await expect(numberOnly.getByRole("button")).toHaveCount(0);
  const voided = page.getByRole("row").filter({ hasText: "A-103" });
  await expect(voided).toContainText("Anulada");
  await expect(voided.getByRole("button")).toHaveCount(0);
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(4);
  await page.getByRole("button", { name: "Anterior", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(20);

  const originalDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar PDF de factura A-100", exact: true }).click();
  const downloaded = await originalDownload;
  expect(downloaded.suggestedFilename()).toBe("factura-A-100.pdf");
  expect(await readFile((await downloaded.path())!)).toEqual(original);
  const imageDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar PDF de factura A-101", exact: true }).click();
  const converted = await imageDownload;
  expect(converted.suggestedFilename()).toBe("factura-A-101.pdf");
  const convertedBytes = await readFile((await converted.path())!);
  expect(convertedBytes.subarray(0, 5).toString()).toBe("%PDF-");
  expect((await PDFDocument.load(convertedBytes)).getPageCount()).toBe(1);
  await converted.saveAs(info.outputPath("converted-invoice.pdf"));
  await page.getByRole("heading", { name: "Mis facturas" }).click();
  await page.screenshot({ path: info.outputPath("invoices-desktop.png"), fullPage: true });
  await page.getByLabel("Buscar facturas").fill("A-101");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByLabel("Buscar facturas").fill("DIS-100");
  await expect(page.locator("tbody tr")).toHaveCount(20);
  await page.getByLabel("Buscar facturas").fill("FOREIGN-INVOICE");
  await expect(page.getByText("No encontramos facturas con esa búsqueda")).toBeVisible();
  await page.getByLabel("Buscar facturas").fill("");
  await expect(page.locator("tbody tr")).toHaveCount(20);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("heading", { name: "Mis facturas" }).click();
  await page.screenshot({ path: info.outputPath("invoices-mobile.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("facturas: requiere sesión y maneja ausencia de facturas", async ({ page }) => {
  await page.goto("/tienda/cuenta/facturas");
  await expect(page.getByRole("link", { name: "Ingresar", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Descargar PDF/ })).toHaveCount(0);
  await login(page);
  await page.goto("/tienda/cuenta/facturas");
  await expect(page.getByText("Todavía no hay facturas")).toBeVisible();
});
