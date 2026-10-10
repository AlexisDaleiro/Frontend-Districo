// No provider adapters are configured yet; these are not live health checks.
export function integrationConnections() {
  return [
    { id: 'whatsapp', name: 'WhatsApp', status: 'INACTIVE' },
    { id: 'mailing', name: 'Mailing', status: 'INACTIVE' },
    { id: 'mercarea', name: 'Mercarea', status: 'INACTIVE' },
  ];
}
