import { Role } from '@prisma/client';

export const staffFeatures = [
  'resumen', 'ventas', 'consultas', 'solicitudes', 'clientes', 'pedidos',
  'facturacion', 'catalogo', 'marcas', 'categorias', 'promociones',
  'banners', 'recomendaciones', 'personal', 'roles', 'vendedores', 'ofertas-laborales', 'integraciones',
] as const;

export type StaffFeature = typeof staffFeatures[number];
export type StaffAccess = { canView: boolean; canEdit: boolean };

const defaults: Record<StaffFeature, Partial<Record<Role, StaffAccess>>> = {
  resumen: { SALES: { canView: true, canEdit: false }, CATALOG: { canView: true, canEdit: false }, FINANCE: { canView: true, canEdit: false } },
  ventas: { SALES: { canView: true, canEdit: false }, FINANCE: { canView: true, canEdit: false } },
  consultas: { SALES: { canView: true, canEdit: true } },
  solicitudes: { SALES: { canView: true, canEdit: false } },
  clientes: { SALES: { canView: true, canEdit: false }, FINANCE: { canView: true, canEdit: false } },
  pedidos: { SALES: { canView: true, canEdit: true }, FINANCE: { canView: true, canEdit: false } },
  facturacion: { SALES: { canView: true, canEdit: false }, FINANCE: { canView: true, canEdit: true } },
  catalogo: { CATALOG: { canView: true, canEdit: true } },
  marcas: { CATALOG: { canView: true, canEdit: true } },
  categorias: { CATALOG: { canView: true, canEdit: true } },
  promociones: { CATALOG: { canView: true, canEdit: true } },
  banners: { CATALOG: { canView: true, canEdit: true } },
  recomendaciones: { CATALOG: { canView: true, canEdit: true } },
  personal: {},
  roles: {},
  vendedores: {},
  'ofertas-laborales': {},
  integraciones: {},
};

export function defaultStaffAccess(role: Role, feature: StaffFeature): StaffAccess {
  if (role === Role.ADMIN) return { canView: true, canEdit: !['resumen', 'ventas', 'integraciones'].includes(feature) };
  return defaults[feature][role] ?? { canView: false, canEdit: false };
}

export function staffAccessMatrix(role: Role, overrides: { feature: string; canView: boolean; canEdit: boolean }[]) {
  return Object.fromEntries(staffFeatures.map((feature) => {
    const override = overrides.find((item) => item.feature === feature);
    return [feature, override
      ? { canView: override.canView, canEdit: override.canEdit }
      : defaultStaffAccess(role, feature)];
  })) as Record<StaffFeature, StaffAccess>;
}

export function staffFeatureForPath(path: string): StaffFeature | undefined {
  const clean = path.split('?')[0].replace(/^\/api\//, '/');
  if (/^\/admin\/audit-logs(?:\/|$)/.test(clean)) return undefined;
  if (/^\/admin\/staff\/access(?:\/|$)|^\/admin\/staff\/roles(?:\/|$)/.test(clean)) return 'roles';
  if (/^\/admin\/staff(?:\/|$)/.test(clean)) return 'personal';
  if (/^\/admin\/salespeople(?:\/|$)/.test(clean)) return 'vendedores';
  if (/^\/admin\/dashboard$/.test(clean)) return 'resumen';
  if (/^\/admin\/sales(?:\/|$)/.test(clean)) return 'ventas';
  if (/^\/admin\/contact-inquiries(?:\/|$)/.test(clean)) return 'consultas';
  if (/^\/(?:admin\/)?applications(?:\/|$)/.test(clean)) return 'solicitudes';
  if (/^\/admin\/customers(?:\/|$)/.test(clean)) return 'clientes';
  if (/^\/admin\/orders\/[^/]+\/(?:payments|invoices|credit-notes|refunds)(?:\/|$)/.test(clean)) return 'facturacion';
  if (/^\/admin\/orders(?:\/|$)/.test(clean)) return 'pedidos';
  if (/^\/(?:products|pricing|inventory|attributes)(?:\/|$)/.test(clean)) return 'catalogo';
  if (/^\/(?:brands|laboratories)(?:\/|$)/.test(clean)) return 'marcas';
  if (/^\/categories(?:\/|$)/.test(clean)) return 'categorias';
  if (/^\/(?:admin\/)?promotions(?:\/|$)/.test(clean)) return 'promociones';
  if (/^\/admin\/banners(?:\/|$)/.test(clean)) return 'banners';
  if (/^\/admin\/jobs(?:\/|$)/.test(clean)) return 'ofertas-laborales';
  if (/^\/admin\/integrations$/.test(clean)) return 'integraciones';
  if (/^\/(?:admin\/)?recommendations(?:\/|$)/.test(clean)) return 'recomendaciones';
  return undefined;
}
