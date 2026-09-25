import type { Permission, User, Variant } from "./types";
export const money = (value: number | string, currency = "UYU") =>
  new Intl.NumberFormat("es-UY", { style: "currency", currency }).format(
    Number(value),
  );
export const can = (user: User | null | undefined, permission: Permission) =>
  !!user && (user.role === "ADMIN" || user.permissions.includes(permission));
export function quantityError(variant: Variant, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < variant.minimumOrderQuantity)
    return `La cantidad mínima es ${variant.minimumOrderQuantity}.`;
  if (quantity % variant.saleMultiple !== 0)
    return `Elegí un múltiplo de ${variant.saleMultiple}.`;
  if (quantity > variant.availableStock)
    return `Hay ${variant.availableStock} unidades disponibles.`;
  return null;
}
export const firstQuantity = (variant: Variant) =>
  Math.ceil(variant.minimumOrderQuantity / variant.saleMultiple) *
  variant.saleMultiple;
export const reviewRequired = (status?: string) =>
  ["PAYMENT_DELAY", "PAYMENT_PENDING", "RESTRICTED"].includes(status ?? "");
export const labels: Record<string, string> = {
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
