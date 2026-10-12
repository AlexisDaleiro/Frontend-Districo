import { Role } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

export const sensitiveStaffFeatures = {
  stock: 'catalogo', precios: 'catalogo', cobros: 'facturacion',
  'anular-cobros': 'facturacion', reintegros: 'facturacion',
} as const;
export type SensitiveStaffFeature = keyof typeof sensitiveStaffFeatures;
export const isSensitiveStaffFeature = (feature: string): feature is SensitiveStaffFeature =>
  Object.prototype.hasOwnProperty.call(sensitiveStaffFeatures, feature);

export const staffFeatures = [
  'resumen', 'ventas', 'consultas', 'solicitudes', 'clientes', 'pedidos',
  'descuentos-clientes', 'facturacion', 'catalogo', 'marcas', 'categorias', 'promociones',
  'banners', 'recomendaciones', 'personal', 'roles', 'vendedores', 'ofertas-laborales', 'integraciones',
  'cartera', 'finanzas', 'logistica', 'metricas',
  'stock', 'precios', 'cobros', 'anular-cobros', 'reintegros',
] as const;

export type StaffFeature = typeof staffFeatures[number];
export type StaffAccess = { canView: boolean; canEdit: boolean };

const defaults: Record<StaffFeature, Partial<Record<Role, StaffAccess>>> = {
  resumen: { SALES: { canView: true, canEdit: false }, CATALOG: { canView: true, canEdit: false }, FINANCE: { canView: true, canEdit: false } },
  ventas: { SALES: { canView: true, canEdit: false }, FINANCE: { canView: true, canEdit: false } },
  consultas: { SALES: { canView: true, canEdit: true } },
  solicitudes: { SALES: { canView: true, canEdit: false } },
  clientes: { SALES: { canView: true, canEdit: false }, FINANCE: { canView: true, canEdit: false } },
  'descuentos-clientes': { SALES: { canView: true, canEdit: true }, FINANCE: { canView: true, canEdit: false } },
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
  cartera: { SALES: { canView: true, canEdit: false } },
  finanzas: { FINANCE: { canView: true, canEdit: true } },
  logistica: {},
  metricas: { FINANCE: { canView: true, canEdit: false } },
  stock: {}, precios: {}, cobros: {}, 'anular-cobros': {}, reintegros: {},
};

export function defaultStaffAccess(role: Role, feature: StaffFeature): StaffAccess {
  if (isSensitiveStaffFeature(feature)) {
    const allowed = defaultStaffAccess(role, sensitiveStaffFeatures[feature]).canEdit;
    return { canView: allowed, canEdit: allowed };
  }
  if (role === Role.ADMIN) return { canView: true, canEdit: !['resumen', 'ventas', 'integraciones', 'metricas', 'cartera'].includes(feature) };
  return defaults[feature][role] ?? { canView: false, canEdit: false };
}

export function staffAccessMatrix(role: Role, overrides: { feature: string; canView: boolean; canEdit: boolean }[]) {
  return Object.fromEntries(staffFeatures.map((feature) => {
    const override = overrides.find((item) => item.feature === feature);
    return [feature, override
      ? { canView: override.canView, canEdit: override.canEdit }
      : isSensitiveStaffFeature(feature)
        ? inheritedSensitiveAccess(role, feature, overrides)
        : defaultStaffAccess(role, feature)];
  })) as Record<StaffFeature, StaffAccess>;
}

function inheritedSensitiveAccess(role: Role, feature: SensitiveStaffFeature, overrides: { feature: string; canView: boolean; canEdit: boolean }[]): StaffAccess {
  // Legacy roles retain their actions until explicit, independent permissions are saved.
  const parent = sensitiveStaffFeatures[feature];
  const access = overrides.find((item) => item.feature === parent) ?? defaultStaffAccess(role, parent);
  const allowed = access.canView && access.canEdit;
  return { canView: allowed, canEdit: allowed };
}

export async function staffAccessForUser(prisma: Pick<PrismaService, 'staffRoleAccess' | 'customStaffRoleAccess'>, user: { role: Role; customRoleId?: string | null }, feature: StaffFeature): Promise<StaffAccess> {
  if (user.role === Role.CLIENT || user.role === Role.CUSTOM && !user.customRoleId) return { canView: false, canEdit: false };
  if (user.role === Role.ADMIN) return defaultStaffAccess(user.role, feature);
  const override = user.role === Role.CUSTOM
    ? await prisma.customStaffRoleAccess.findUnique({ where: { roleId_feature: { roleId: user.customRoleId!, feature } } })
    : await prisma.staffRoleAccess.findUnique({ where: { role_feature: { role: user.role, feature } } });
  if (override) return { canView: override.canView, canEdit: override.canEdit };
  if (isSensitiveStaffFeature(feature)) {
    const parent = await staffAccessForUser(prisma, user, sensitiveStaffFeatures[feature]);
    const allowed = parent.canView && parent.canEdit;
    return { canView: allowed, canEdit: allowed };
  }
  return defaultStaffAccess(user.role, feature);
}

export function staffFeatureForPath(path: string, method = 'GET'): StaffFeature | undefined {
  const clean = path.split('?')[0].toLowerCase().replace(/^\/api\//, '/').replace(/\/+$/, '');
  if (method !== 'GET' && method !== 'HEAD') {
    if (/^\/inventory(?:\/|$)/.test(clean)) return 'stock';
    if (/^\/pricing(?:\/|$)|^\/admin\/bulk\/products\/prices(?:\/|$)/.test(clean)) return 'precios';
    if (/^\/admin\/orders\/[^/]+\/payments\/[^/]+\/void$/.test(clean)) return 'anular-cobros';
    if (/^\/admin\/orders\/[^/]+\/payments$/.test(clean)) return 'cobros';
    if (/^\/admin\/orders\/[^/]+\/refunds$/.test(clean)) return 'reintegros';
  }
  if (/^\/admin\/operations\/performance$/.test(clean)) return 'metricas';
  if (/^\/admin\/operations\/finance(?:\/|$)/.test(clean)) return 'finanzas';
  if (/^\/admin\/operations\/logistics(?:\/|$)/.test(clean)) return 'logistica';
  if (/^\/admin\/operations\/portfolio$/.test(clean)) return 'cartera';
  if (/^\/admin\/operations\/metrics$/.test(clean)) return 'metricas';
  if (/^\/admin\/operations\/support(?:\/|$)/.test(clean)) return 'consultas';
  if (/^\/admin\/operations\/recruitment(?:\/|$)/.test(clean)) return 'ofertas-laborales';
  if (/^\/admin\/audit-logs(?:\/|$)/.test(clean)) return undefined;
  if (/^\/admin\/staff\/access(?:\/|$)|^\/admin\/staff\/roles(?:\/|$)/.test(clean)) return 'roles';
  if (/^\/admin\/staff(?:\/|$)/.test(clean)) return 'personal';
  if (/^\/admin\/salespeople(?:\/|$)/.test(clean)) return 'vendedores';
  if (/^\/admin\/dashboard$/.test(clean)) return 'resumen';
  if (/^\/admin\/sales(?:\/|$)/.test(clean)) return 'ventas';
  if (/^\/admin\/contact-inquiries(?:\/|$)/.test(clean)) return 'consultas';
  if (/^\/(?:admin\/)?applications(?:\/|$)/.test(clean)) return 'solicitudes';
  if (/^\/admin\/customers\/[^/]+\/discount$/.test(clean)) return 'descuentos-clientes';
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
