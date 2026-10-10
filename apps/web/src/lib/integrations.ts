export type IntegrationConnection = {
  id: "whatsapp" | "mailing" | "mercarea";
  name: string;
  status: "INACTIVE";
};

export const inactiveIntegrations: IntegrationConnection[] = [
  { id: "whatsapp", name: "WhatsApp", status: "INACTIVE" },
  { id: "mailing", name: "Mailing", status: "INACTIVE" },
  { id: "mercarea", name: "Mercarea", status: "INACTIVE" },
];
