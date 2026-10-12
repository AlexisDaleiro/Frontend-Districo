import { Prisma } from '@prisma/client';

export function notificationContent(event: string, payload: Prisma.InputJsonValue | undefined, origin: string) {
  const data: Prisma.InputJsonObject = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload as Prisma.InputJsonObject : {};
  const orderId = typeof data.orderId === 'string' ? data.orderId : '';
  if (event === 'registration.received') return { subject: 'DISTRICO: recibimos tu solicitud', text: 'Recibimos tu solicitud de cuenta mayorista. Te avisaremos cuando termine la revision.' };
  if (event === 'account.approved') return { subject: 'DISTRICO: tu cuenta fue aprobada', text: `Tu cuenta mayorista fue aprobada. Podes ingresar en ${origin}/tienda/ingresar` };
  if (event === 'account.rejected') return { subject: 'DISTRICO: actualizacion de tu solicitud', text: `Tu solicitud no fue aprobada.${typeof data.rejectionReason === 'string' ? ` Motivo: ${data.rejectionReason.slice(0, 1500)}` : ''}\nContacta a DISTRICO si necesitas mas informacion.` };
  if (event === 'contact.received') return { subject: 'DISTRICO: nueva consulta', text: `Hay una nueva consulta en la bandeja del dashboard: ${origin}/tienda/admin/consultas` };
  const statuses: Record<string, string> = {
    received: 'recibido', pending_review: 'pendiente de revision', submitted: 'pendiente',
    approved: 'aprobado', processing: 'procesando', shipped: 'en camino', delivered: 'entregado',
    rejected: 'rechazado', cancelled: 'cancelado',
  };
  if (event.startsWith('order.') && statuses[event.slice(6)]) return {
    subject: `DISTRICO: pedido ${statuses[event.slice(6)]}`,
    text: `Tu pedido ${orderId} esta ${statuses[event.slice(6)]}.\nPodes consultarlo en ${origin}/tienda/cuenta/pedidos`,
  };
  return undefined;
}
