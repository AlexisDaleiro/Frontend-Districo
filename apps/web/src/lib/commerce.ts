import type { Permission, Product, User, Variant } from "./types";
export const money = (value: number | string, currency = "UYU") =>
  new Intl.NumberFormat("es-UY", { style: "currency", currency }).format(
    Number(value),
  );
export const can = (user: User | null | undefined, permission: Permission) =>
  !!user &&
  (user.role === "ADMIN" ||
    (user.role === "CLIENT" && user.permissions.includes(permission) &&
      (permission !== "CAN_PLACE_ORDERS" || user.customerAccount?.accountStatus === "APPROVED")));
// Igual que la API: el carrito exige ver precios y comprar, y los productos de
// uso profesional, además, el permiso de medicamentos.
export const canBuy = (
  user: User | null | undefined,
  product: Pick<Product, "requiresMedicationPermission">,
) =>
  can(user, "CAN_VIEW_PRICES") &&
  can(user, "CAN_PLACE_ORDERS") &&
  (!product.requiresMedicationPermission || can(user, "CAN_BUY_MEDICATIONS"));
// Motivo por el que no se muestra precio, según lo que devolvió la API.
export function hiddenPriceText(
  user: User | null | undefined,
  product: Pick<Product, "requiresMedicationPermission">,
) {
  if (!user) return "Ingresá para ver precios";
  if (!can(user, "CAN_VIEW_PRICES")) return "Precio no habilitado";
  if (product.requiresMedicationPermission && !can(user, "CAN_BUY_MEDICATIONS"))
    return "Requiere habilitación profesional";
  return "Sin precio vigente";
}
export function quantityError(variant: Variant, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < variant.minimumOrderQuantity)
    return `La cantidad mínima es ${variant.minimumOrderQuantity}.`;
  if (quantity % variant.saleMultiple !== 0)
    return `Elegí un múltiplo de ${variant.saleMultiple}.`;
  if (variant.availableStock <= 0) return "Sin stock disponible.";
  if (quantity > variant.availableStock)
    return `Hay ${variant.availableStock} unidades disponibles.`;
  return null;
}
export const firstQuantity = (variant: Variant) =>
  Math.ceil(variant.minimumOrderQuantity / variant.saleMultiple) *
  variant.saleMultiple;
// Hay stock para al menos la primera cantidad válida (mínimo y múltiplo).
export const purchasable = (variant: Variant) =>
  firstQuantity(variant) <= variant.availableStock;
export const reviewRequired = (status?: string) =>
  ["PAYMENT_DELAY", "PAYMENT_PENDING", "RESTRICTED"].includes(status ?? "");
export const labels: Record<string, string> = {
  DRAFT: "Borrador",
  SUBMITTED: "Enviado",
  PENDING: "Pendiente",
  PENDING_REVIEW: "En revisión",
  APPROVED: "Aprobado",
  PROCESSING: "En preparación",
  SHIPPED: "Despachado",
  DELIVERED: "Entregado",
  REJECTED: "Rechazado",
  CANCELLED: "Cancelado",
  SUSPENDED: "Suspendido",
  GOOD_STANDING: "Al día",
  PAYMENT_DELAY: "Pago atrasado",
  PAYMENT_PENDING: "Pago pendiente",
  RESTRICTED: "Restringido",
  CREDIT_LIMIT_EXCEEDED: "Supera el límite de crédito; requiere revisión",
  NEW: "Nueva",
  IN_PROGRESS: "En seguimiento",
  RESOLVED: "Resuelta",
  FOOD: "Alimentación",
  HYGIENE: "Higiene",
  MEDICATION: "Veterinaria",
  SUPPLEMENT: "Suplementos",
  ACCESSORY: "Accesorios",
  OTHER: "Otros",
};
export const label = (key: string) => labels[key] ?? key;
// Estados de pedido de la API (enum OrderStatus).
export const orderStatuses = [
  "DRAFT",
  "SUBMITTED",
  "PENDING_REVIEW",
  "APPROVED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "REJECTED",
  "CANCELLED",
];
// Cambios de estado que ofrece administración. Un rechazo puede revisarse
// nuevamente; una cancelación sigue siendo final.
export const orderTransitions: Record<string, string[]> = {
  SUBMITTED: ["PENDING_REVIEW", "APPROVED", "REJECTED", "CANCELLED"],
  PENDING_REVIEW: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  REJECTED: ["PENDING_REVIEW"],
};
// Efecto sobre reservas y stock según la API: aprobar o preparar consume las
// reservas activas (baja el stock físico); rechazar o cancelar libera las
// activas. Una reserva ya consumida no se devuelve al cancelar.
export function orderStockEffect(from: string, to: string) {
  const open = ["SUBMITTED", "PENDING_REVIEW"].includes(from);
  if (open && ["APPROVED", "PROCESSING"].includes(to))
    return "descuenta del stock físico las unidades reservadas.";
  if (open && ["REJECTED", "CANCELLED"].includes(to))
    return "libera las unidades reservadas; vuelven a estar disponibles.";
  if (from === "REJECTED" && to === "PENDING_REVIEW")
    return "vuelve a reservar las unidades disponibles; si falta stock, el cambio no se guarda.";
  if (to === "CANCELLED")
    return "no devuelve stock: las unidades ya se descontaron al aprobar. Ajustá las existencias en Catálogo si vuelven al depósito.";
  return "no modifica reservas ni stock.";
}
