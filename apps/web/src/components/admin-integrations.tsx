"use client";

import { Mail, MessageCircle, ShoppingBag, Unplug } from "lucide-react";
import type { IntegrationConnection } from "@/lib/integrations";
import { useApi } from "./providers";
import { ErrorBox, Loading } from "./ui";

const icons = { whatsapp: MessageCircle, mailing: Mail, mercarea: ShoppingBag };

export function AdminIntegrations() {
  const q = useApi<IntegrationConnection[]>("admin/integrations");
  if (q.isPending) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} retry={() => q.refetch()} />;

  return <div className="table-wrap admin-integrations">
    <table aria-label="Estado de las integraciones">
      <thead><tr><th scope="col">Integración</th><th scope="col">Estado de conexión</th></tr></thead>
      <tbody>{q.data?.map((integration) => {
        const Icon = icons[integration.id];
        return <tr key={integration.id}>
          <td><span className="admin-integration-name"><Icon size={20} aria-hidden="true" /><strong>{integration.name}</strong></span></td>
          <td><span className="admin-integration-status" data-status={integration.status}><Unplug size={14} aria-hidden="true" />Inactivo</span></td>
        </tr>;
      })}</tbody>
    </table>
  </div>;
}
