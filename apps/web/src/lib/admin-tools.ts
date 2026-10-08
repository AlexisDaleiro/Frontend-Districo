export type BulkEntry = { id: string; name: string; before: string; after: string; changed: boolean };
export type BulkPreview = { token: string; entries: BulkEntry[]; changed: number };
export type BulkResult = { batchId: string; entries: BulkEntry[]; changed: number };
export type BulkHistoryRecord = { id: string; action: string; createdAt: string; user: { email: string } | null;
  metadata: { reason: string; entries: BulkEntry[]; changed: number } };
export type AdminSearchResult = {
  customers: { id: string; businessName: string; rut: string; email: string }[];
  orders: { id: string; orderNumber: string; status: string; user: { email: string }; customerAccount: { businessName: string } | null }[];
  products: { id: string; slug: string; name: string; active: boolean }[];
};

export function shortcutForm(root: Document): HTMLFormElement | undefined {
  const dialog = root.querySelector<HTMLDialogElement>('dialog[open]:not([data-closing])');
  const scope = dialog ?? root;
  const available = Array.from(scope.querySelectorAll<HTMLFormElement>('form[data-admin-save="true"]'))
    .filter((form) => !form.closest('[hidden], [aria-hidden="true"]') && form.getClientRects().length > 0);
  const focused = root.activeElement?.closest<HTMLFormElement>('form[data-admin-save="true"]');
  return focused && available.includes(focused) ? focused : available.length === 1 ? available[0] : undefined;
}

export function submitShortcutForm(form: HTMLFormElement): boolean {
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"], button:not([type]), input[type="submit"]');
  if (!button || button.disabled || form.getAttribute('aria-busy') === 'true') return false;
  form.requestSubmit(button);
  return true;
}
