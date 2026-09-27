import type { Permission, Product, User, Variant } from "./types";
export const money = (value: number | string, currency = "UYU") =>
  new Intl.NumberFormat("es-UY", { style: "currency", currency }).format(
    Number(value),
  );
export const can = (user: User | null | undefined, permission: Permission) =>
  !!user && (user.role === "ADMIN" || user.permissions.includes(permission));
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
  FOOD: "Alimentación",
  HYGIENE: "Higiene",
  MEDICATION: "Veterinaria",
  SUPPLEMENT: "Suplementos",
  ACCESSORY: "Accesorios",
  OTHER: "Otros",
};
export const label = (key: string) => labels[key] ?? key;
