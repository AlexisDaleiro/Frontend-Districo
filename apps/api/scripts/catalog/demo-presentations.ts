export const APOLO_ADULT_PRESENTATIONS = [1, 7, 20] as const;
export const APOLO_ADULT_SOURCE_URL =
  'https://www.districo.com.uy/alimento-para-mascotas/perros/adultos-todas-las-razas-carne-y-cereales/';

export function demoPresentationPrice(basePrice: number, kilograms: number): number {
  if (!Number.isFinite(basePrice) || basePrice <= 0 || !APOLO_ADULT_PRESENTATIONS.includes(kilograms as 1 | 7 | 20)) {
    throw new Error('Precio o presentacion de prueba invalida.');
  }
  if (kilograms === 1) return basePrice;
  const discount = kilograms >= 20 ? 0.8 : kilograms >= 7 ? 0.9 : 1;
  return Math.round((basePrice * kilograms * discount) / 10) * 10;
}

export function assertDemoPresentationEligibility(value: {
  source: string;
  sourceExternalId: string | null;
  sourceUrl: string | null;
  active: boolean;
  tags: string[];
  variants: {
    id: string;
    sku: string;
    name: string;
    presentation: string | null;
    active: boolean;
    isDemoData: boolean;
    deletedAt: Date | null;
    cartItems: unknown[];
    stockReservations: unknown[];
    priceHistory: unknown[];
  }[];
  orderItems: number;
}): 'pending' | 'complete' {
  if (
    value.source !== 'DISTRICO' ||
    value.sourceExternalId !== '1461' ||
    value.sourceUrl !== APOLO_ADULT_SOURCE_URL ||
    !value.active ||
    !value.tags.includes('DATOS_COMERCIALES_FICTICIOS') ||
    value.orderItems !== 0 ||
    value.variants.some(
      (variant) =>
        !variant.isDemoData ||
        variant.deletedAt !== null ||
        variant.cartItems.length > 0 ||
        variant.stockReservations.length > 0 ||
        variant.priceHistory.length > 0,
    )
  ) {
    throw new Error('El producto contiene datos reales o referencias; no se modifican sus presentaciones.');
  }
  const [first, ...others] = value.variants;
  if (
    first?.id === 'local-demo-variant-1461' &&
    first.sku === 'DEMO-DIS-1461' &&
    first.name === 'Presentacion de prueba' &&
    first.presentation === 'Unidad ficticia' &&
    first.active &&
    others.length === 0
  ) return 'pending';
  const expected = APOLO_ADULT_PRESENTATIONS.map((kg) => ({
    id: kg === 1 ? 'local-demo-variant-1461' : `local-demo-variant-1461-${kg}kg`,
    sku: kg === 1 ? 'DEMO-DIS-1461' : `DEMO-DIS-1461-${kg}KG`,
    name: `Bolsa de ${kg} kg`,
    presentation: `${kg} kg`,
  }));
  if (
    value.variants.length === expected.length &&
    expected.every((item) =>
      value.variants.some(
        (variant) =>
          variant.id === item.id &&
          variant.sku === item.sku &&
          variant.name === item.name &&
          variant.presentation === item.presentation &&
          variant.active,
      ),
    )
  ) return 'complete';
  throw new Error('Las variantes del producto cambiaron; revisar manualmente antes de continuar.');
}
