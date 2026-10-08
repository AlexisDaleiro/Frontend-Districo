# Roles and Physical Product Returns

## Custom Role Lifecycle

- Roles can be renamed without changing their ID or users' assignments.
- Duplication creates an independent copy of the saved permission matrix. A
  delegated editor cannot duplicate permissions exceeding their own access.
- Retirement sets `retiredAt`; role records, permission matrices and audit history
  are retained. Retired roles disappear from configuration and assignment lists.
- Any assigned user blocks retirement, including inactive users and outstanding
  invitations. Reassign them in Personal first.
- Assignment, invitations, access updates and retirement lock the custom role to
  prevent concurrent assignment to a retiring role. Built-in roles are unaffected.
- Lifecycle changes generate `STAFF_ROLE_RENAMED`, `STAFF_ROLE_DUPLICATED` and
  `STAFF_ROLE_RETIRED` audit events.

## Physical Product Returns

- The order management page contains a separate physical returns section, using
  Pedidos view/edit permissions. Sales staff remain scoped to assigned customers.
- Orders must be SHIPPED or DELIVERED. Select order items, quantity received and
  quantity fit to return to stock; enter a reason and review before confirming.
- Each receipt is immutable and records items, quantities, date and responsible
  staff member. Several partial receipts are allowed up to the quantity sold.
- Returned goods do not automatically generate a credit note or refund. Existing
  billing records remain untouched and are managed with Facturacion permissions.
- Only the explicitly selected restocking quantity increases physical stock.
  Reserved stock is unchanged. Inactive variants remain inactive.
- Restocking requires consumed stock reservations for that order and cannot exceed
  those quantities. Deleted variants cannot receive stock.
- Preview tokens detect changes in quantities or physical stock. UUID request
  identifiers make application retries idempotent. Serializable transactions,
  order/variant row locks and audit entries make receipt and stock updates atomic.
- Audit event `ORDER_PRODUCTS_RETURNED` includes quantities and before/after stock.

## Deployment and Verification

Apply migration `202610070001_role_lifecycle_product_returns` with the normal API
migration deployment and regenerate the Prisma client. New receipt tables have RLS
enabled without public policies; access goes through authenticated backend routes.

The API test suite includes role lifecycle and product returns tests. Web unit
tests cover demo behavior and proxy paths. Playwright tests in
`roles-returns.spec.ts` cover lifecycle, invitation assignment blocking, partial
receipts, explicit confirmation, unchanged billing and mobile layouts.

Demo state mirrors the behavior locally in browser storage; no test needs to
modify real product stock or monetary records.
