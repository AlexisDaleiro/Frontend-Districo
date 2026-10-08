# Administrative search, shortcuts and bulk actions

## Access and navigation

- Ctrl+K (Cmd+K on macOS) opens the administrative search. It also has a sidebar button.
- Search accepts customer name, email, RUT, phone, order ID/number, product name or SKU. Each permitted group returns up to five matches.
- Quick navigation exposes only permitted sections. Product matches open the editor or the read-only preview according to catalog access.
- SALES users can search only assigned customers and their orders. The server rechecks configured role access for every request.
- Ctrl+S submits the focused, explicitly marked editable form through its normal validation. An open dialog takes precedence; multiple forms require focus. Read-only, hidden and busy forms are not submitted. Bulk confirmations are intentionally excluded.

## Bulk actions

- Catalog and customer lists have per-row and current-page checkboxes. Selection persists across pages and filters until cleared or applied; maximum 100 records.
- Product actions activate/deactivate or adjust prices. Price updates target active, non-deleted presentations in the active `Lista Mayorista Districo`, in UYU.
- Percentage accepts increases or reductions greater than -100%; all presentations must already have current prices. Fixed price assigns the same amount to each selected presentation and can fill missing prices. Every amount is previewed before confirmation.
- Customer reassignment requires viewing customers and editing sellers. The target must be an active, verified internal SALES user with a completed seller profile. SALES actors can only move their own assigned customers.
- All actions require a reason, server preview and explicit confirmation. The preview fingerprint includes the input and current data; stale confirmation fails without writing.
- Applying uses a serializable transaction. A request UUID recorded in the audit log prevents a repeated confirmation from applying twice. Conflicts require refreshed preview. Price changes also retain `PriceHistory`; assignments retain per-customer audit records.
- History is available from each relevant list, paginated with before/after values, reason, actor and date. It requires the corresponding view permissions; SALES sees only its own batches.

## API

- `GET /api/admin/search?search=...`
- `GET /api/admin/bulk/history?feature=catalogo|vendedores&page=1&limit=10`
- `POST /api/admin/bulk/products/active[/preview]`
- `POST /api/admin/bulk/products/prices[/preview]`
- `POST /api/admin/bulk/customers/salesperson[/preview]`

Preview and apply bodies include `ids`, `reason`, `requestId` and their action parameters (`active`, `mode`/`value`, or `salespersonUserId`). Apply adds the returned `previewToken`. Batches support up to 500 presentations; larger price batches must be split.

No migration or storage bucket is required. Demo mode implements the same workflows in browser-local data, independently of Supabase.

## Verification

- API: `npm run test:admin-tools -w apps/api` (also included in the full backend suite).
- Web: `npm test -w apps/web`.
- Browser: `apps/web/tests/e2e/admin-tools.spec.ts` covers cross-page selection, confirmation/history, price update, search, Ctrl+S, mobile layouts and read-only access.

Validated on 2026-10-07 after integrating `origin/main` at `fc02e38`: production builds and lint passed, the full API suite passed, web unit tests passed (83), and the administrative Chrome regression suite passed (16). Local real-mode routes returned 200 for the admin page and 401 for unauthenticated search, directly and through the proxy. Browser mutations used isolated demo data; no bulk changes were applied to Supabase during verification.
