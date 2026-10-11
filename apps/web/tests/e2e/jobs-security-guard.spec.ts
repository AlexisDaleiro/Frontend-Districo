import { expect, test, type Page } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

async function admin(page: Page) {
  await page.goto('/tienda/ingresar');
  await page.getByRole('button', { name: 'Administración', exact: true }).click();
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).toHaveURL(/\/tienda$/);
}
test('oferta pública recibe CV, admin gestiona candidatos y descarga PDF en móvil y escritorio', async ({ page }, info) => {
  await admin(page);
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('districo-demo-v1')!);
    state.jobs.push({ ...state.jobs[0], id: 'qa-job', title: 'Vendedor de prueba QA', published: '2020-01-01', isExample: false });
    localStorage.setItem('districo-demo-v1', JSON.stringify(state));
  });
  await page.goto('/trabajo/qa-job');
  await expect(page.getByRole('heading', { name: 'Vendedor de prueba QA' })).toBeVisible();
  await page.getByLabel('Nombre completo').fill('Candidato de ejemplo');
  await page.getByLabel('Correo electrónico', { exact: true }).fill('candidato@example.test');
  await page.getByLabel('Teléfono', { exact: true }).fill('099123456');
  await page.getByLabel('Mensaje', { exact: true }).fill('Experiencia de prueba.');
  const pdf = await PDFDocument.create(); pdf.addPage().drawText('CV ficticio QA');
  await page.getByLabel('CV en PDF').setInputFiles({ name: 'cv-qa.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await pdf.save()) });
  await page.getByRole('checkbox', { name: /Autorizo a DISTRICO/ }).check();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath('postulacion-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Enviar postulación' }).click();
  await expect(page.getByRole('heading', { name: 'Recibimos tu postulación' })).toBeVisible();
  await page.goto('/tienda/admin/ofertas-laborales/qa-job');
  await expect(page.getByRole('heading', { name: 'Candidatos', exact: true })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByLabel('Estado de Candidato de ejemplo').selectOption('INTERVIEW');
  await expect(page.getByLabel('Estado de Candidato de ejemplo')).toHaveValue('INTERVIEW');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar CV de Candidato de ejemplo' }).click();
  expect((await download).suggestedFilename()).toBe('cv-qa.pdf');
  await page.getByRole('searchbox', { name: 'Buscar candidatos', exact: true }).fill('nadie');
  await page.getByRole('button', { name: 'Buscar candidatos', exact: true }).click();
  await expect(page.getByText('Sin candidatos con estos filtros')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/trabajo/qa-job');
  await expect(page.getByLabel('CV en PDF')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('postulacion-mobile.png'), fullPage: true });
  await page.goto('/trabajo');
  const filters = page.getByRole('button', { name: /Filtros \(/ });
  await expect(filters).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('checkbox', { name: /Ventas/ })).not.toBeVisible();
  await filters.click();
  await expect(page.getByRole('checkbox', { name: /Ventas/ })).toBeVisible();
  await page.screenshot({ path: info.outputPath('filtros-mobile.png'), fullPage: false });
});
test('marca protege Cancelar, Escape, cerrar y navegación sin perder campos', async ({ page }) => {
  await admin(page); await page.goto('/tienda/admin/marcas');
  await page.getByRole('button', { name: /^Editar / }).first().click();
  const modal = page.getByRole('dialog');
  await expect(modal.locator('form')).toHaveAttribute('data-unsaved-changes', 'false');
  await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(modal).not.toBeVisible();
  await page.getByRole('button', { name: /^Editar / }).first().click();
  const name = modal.getByRole('textbox', { name: 'Nombre *', exact: true });
  await name.fill('Cambio sin guardar QA');
  for (const action of [() => modal.getByRole('button', { name: 'Cancelar', exact: true }).click(), () => page.keyboard.press('Escape'), () => modal.getByRole('button', { name: 'Cerrar', exact: true }).click()]) {
    page.once('dialog', (dialog) => dialog.dismiss()); await action();
    await expect(modal).toBeVisible(); await expect(name).toHaveValue('Cambio sin guardar QA');
  }
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.goBack({ timeout: 3000 }).catch((error: Error) => {
    if (!/ERR_ABORTED|Timeout/.test(error.message)) throw error;
  });
  await expect(page).toHaveURL(/\/tienda\/admin\/marcas$/);
  await expect(name).toHaveValue('Cambio sin guardar QA');
  page.once('dialog', (dialog) => dialog.accept());
  await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(modal).not.toBeVisible();
  await page.goto('/tienda/cuenta/seguridad');
  await expect(page.getByRole('heading', { name: 'Sesiones abiertas' })).toBeVisible();
  await expect(page.getByText('Este dispositivo', { exact: true })).toBeVisible();
});
