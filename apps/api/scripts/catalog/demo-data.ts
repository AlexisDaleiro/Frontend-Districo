import { Permission, Role } from '@prisma/client';

export const DEMO_TAG = 'DATOS_COMERCIALES_FICTICIOS';
export const DEMO_PRICE_LIST = { id: 'local-demo-price-list', name: 'Lista Mayorista Districo' };
export const DEMO_BRANDS = ['A', 'B', 'C'].map((letter) => ({
  id: `local-demo-brand-${letter.toLowerCase()}`,
  slug: `marca-ficticia-${letter.toLowerCase()}`,
  name: `Marca ficticia ${letter}`,
}));
export const DEMO_LABORATORY = {
  id: 'local-demo-laboratory',
  slug: 'laboratorio-ficticio',
  name: 'Laboratorio ficticio',
};
const purchasePermissions: Permission[] = [Permission.CAN_VIEW_PRICES, Permission.CAN_PLACE_ORDERS];
export const DEMO_USERS: { key: string; email: string; role: Role; permissions: Permission[] }[] = [
  { key: 'admin', email: 'admin@districo.test', role: Role.ADMIN, permissions: [] },
  { key: 'cliente', email: 'cliente@districo.test', role: Role.CLIENT, permissions: purchasePermissions },
  {
    key: 'medicamentos',
    email: 'medicamentos@districo.test',
    role: Role.CLIENT,
    permissions: [...purchasePermissions, Permission.CAN_BUY_MEDICATIONS],
  },
  { key: 'pago', email: 'pago@districo.test', role: Role.CLIENT, permissions: purchasePermissions },
];

export function assertDemoTarget(environment: NodeJS.ProcessEnv, projectRef: string) {
  if (environment.NODE_ENV !== 'development') throw new Error('Solo se permiten datos ficticios en desarrollo.');
  if (!/^[a-z0-9]{15,30}$/.test(projectRef)) throw new Error('Indicar el proyecto Supabase de prueba esperado.');
  const url = new URL(environment.DATABASE_URL ?? '');
  if (
    url.protocol !== 'postgresql:' ||
    !/^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(url.hostname) ||
    url.username !== `postgres.${projectRef}` ||
    url.port !== '5432' ||
    url.pathname !== '/postgres' ||
    url.searchParams.get('schema') !== 'public' ||
    !['require', 'verify-full'].includes(url.searchParams.get('sslmode') ?? '')
  )
    throw new Error('El destino no coincide con el proyecto de prueba indicado.');
}

export function demoProductProfile(externalId: string, categorySlugs: string[]) {
  if (!/^[1-9]\d{0,14}$/.test(externalId)) throw new Error('Identidad de origen invalida.');
  const number = Number(externalId);
  // Only a test scenario: this is not a regulatory classification of real products.
  const unrestrictedCategories = ['49', '54', '52'].map((id) => `districo-web-category-${id}`);
  const restricted = !categorySlugs.some((slug) => unrestrictedCategories.includes(slug));
  return {
    variantId: `local-demo-variant-${externalId}`,
    priceId: `local-demo-price-${externalId}`,
    sku: `DEMO-DIS-${externalId}`,
    price: 390 + (number % 20) * 85,
    stock: 40 + (number % 7) * 10,
    brandId: DEMO_BRANDS[number % DEMO_BRANDS.length].id,
    laboratoryId: restricted ? DEMO_LABORATORY.id : null,
    requiresMedicationPermission: restricted,
  };
}
