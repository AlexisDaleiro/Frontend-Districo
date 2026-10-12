# Sensitive Staff Permissions

Roles now separates section viewing/editing from five sensitive actions:

| Feature | Action | Required section visibility |
| --- | --- | --- |
| `stock` | Adjust physical or reserved inventory; restock returned products | Catalog |
| `precios` | Change variant prices, including bulk previews and confirmation | Catalog |
| `cobros` | Register an order payment | Billing and orders |
| `anular-cobros` | Void an existing payment with its original history retained | Billing and orders |
| `reintegros` | Register money refunded against eligible payments and credit notes | Billing and orders |

The role editor exposes these as independent Allow checkboxes. Enabling an action
enables the corresponding section's viewing permission, not general editing.
Removing section visibility clears dependent actions. An explicit denied action
wins even when the role can edit the entire section.

Both API authorization and UI controls use these permissions. Stock fields sent
through variant creation/editing also require `stock`; bulk pricing independently
requires `precios`. Returning products without restocking remains possible with
order editing alone; positive restocked quantities require `stock` as well.
Sellers remain restricted to their assigned customer orders.
Invoice editing, return registration, and reconciliation retain their existing
permissions; these actions do not authorize them implicitly.

Existing roles without these five stored entries inherit their previous actions
from the saved section editing permission until the admin saves the expanded
matrix. New custom roles start without any permission. Saving the role writes all
entries explicitly, so later granting general editing does not grant a sensitive
action automatically. Existing roles can be duplicated without losing their
legacy behavior, but delegated role editors cannot grant actions they do not have.

No schema migration, new bucket, or environment variable is required. The existing
role access tables store feature identifiers and audit the updated permission matrix.
