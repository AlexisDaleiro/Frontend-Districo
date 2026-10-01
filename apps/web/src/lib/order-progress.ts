import { label, orderTransitions } from "./commerce";

export function orderProgressLabel(status: string) {
  switch (status) {
    case "SUBMITTED":
    case "PENDING_REVIEW":
    case "APPROVED":
      return "Pendiente";
    case "PROCESSING":
      return "Procesando";
    case "SHIPPED":
      return "En camino";
    case "DELIVERED":
      return "Enviado";
    default:
      return label(status);
  }
}

export function nextOrderProgress(status: string) {
  switch (status) {
    case "SUBMITTED":
    case "APPROVED":
      return "PROCESSING";
    case "PROCESSING":
      return "SHIPPED";
    case "SHIPPED":
      return "DELIVERED";
    default:
      return null;
  }
}

export function orderProgressOptionLabel(status: string) {
  if (status === "PENDING_REVIEW") return "Pendiente (en revisión)";
  if (status === "APPROVED") return "Pendiente (aprobado)";
  return orderProgressLabel(status);
}

export function orderProgressChoices(status: string, paidTotal = 0) {
  const next = nextOrderProgress(status);
  return [
    status,
    ...(next ? [next] : []),
    ...(orderTransitions[status] ?? []).filter(
      (candidate) => candidate !== next &&
        (paidTotal <= 0 || !["REJECTED", "CANCELLED"].includes(candidate)),
    ),
  ];
}
