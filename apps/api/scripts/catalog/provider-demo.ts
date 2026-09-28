import { DEMO_TAG } from './demo-data';

export type ProviderSource = 'RAICOR' | 'MAGNIS';
export const PROVIDER_DEMO_TAG = 'PRUEBA_LOCAL_RAICOR_MAGNIS';
export const MANUFACTURER_REVIEW_TAG = 'FABRICANTE_POR_CONFIRMAR';
export const LAB_VERIFIED_AT = '2026-09-27';

interface LaboratoryMapping {
  name: string;
  slug: string;
  evidenceUrl: string;
  manufacturerPending?: boolean;
}

const lab = (name: string, slug: string, evidenceUrl: string): LaboratoryMapping => ({
  name,
  slug,
  evidenceUrl,
});
const raicor = 'https://raicor.com.uy/product-category/laboratorios/';
const magnis = 'https://magnis.com.uy/product-category/laboratorios/';
export const PROVIDER_LABORATORIES: Record<ProviderSource, Record<string, LaboratoryMapping>> = {
  RAICOR: {
    '148': lab('Virbac', 'virbac', `${raicor}virbac/`),
    '151': lab('Zoetis', 'zoetis', `${raicor}zoetis/`),
    '153': lab('Boehringer Ingelheim', 'boehringer-ingelheim', `${raicor}boheringer-ingelheim/`),
  },
  MAGNIS: {
    '265': lab('Bimeda', 'bimeda', `${magnis}bimeda/`),
    '268': lab('Dragpharma', 'dragpharma', `${magnis}dragpharma/`),
    '263': lab('Norbrook', 'norbrook', `${magnis}norbrook/`),
    '267': lab('Y-Tex', 'y-tex', `${magnis}y-tex/`),
    '266': lab('Kela', 'kela', `${magnis}kela/`),
    '269': lab('Lapisa', 'lapisa', `${magnis}lapisa/`),
    '264': lab('Zoetis', 'zoetis', `${magnis}zoetis/`),
    '270': { ...lab('Magnis', 'magnis', `${magnis}magnis/`), manufacturerPending: true },
    // Storm is the commercial line; its official product page identifies BASF as developer.
    '271': lab('BASF', 'basf', 'https://magnis.com.uy/product/storm-caja-x-100-grs/'),
  },
};

const nutriblockIds = new Set(['1323', '1324', '1325', '1326', '1327', '1328', '1329', '1332']);
const nutriblock = lab('Nutriblock', 'nutriblock', 'https://www.nutriblock.com.uy/empresa/');

export function providerLaboratory(source: ProviderSource, externalId: string, categorySlugs: string[]) {
  const categories = new Set(categorySlugs);
  const matches = Object.entries(PROVIDER_LABORATORIES[source])
    .filter(([id]) => categories.has(`${source.toLowerCase()}-web-category-${id}`))
    .map(([, value]) => value);
  if (source === 'RAICOR' && nutriblockIds.has(externalId)) matches.push(nutriblock);
  if (matches.length > 1) throw new Error(`Laboratorio ambiguo: ${source}:${externalId}.`);
  return matches[0];
}

export function providerDemoProfile(source: ProviderSource, externalId: string) {
  if (!['RAICOR', 'MAGNIS'].includes(source) || !/^[1-9]\d{0,14}$/.test(externalId)) {
    throw new Error('Identidad de proveedor invalida.');
  }
  const number = Number(externalId);
  const prefix = source.toLowerCase();
  return {
    variantId: `local-demo-${prefix}-variant-${externalId}`,
    priceId: `local-demo-${prefix}-price-${externalId}`,
    sku: `DEMO-${source === 'RAICOR' ? 'RAI' : 'MAG'}-${externalId}`,
    price: 450 + (number % 31) * 125,
    stock: 20 + (number % 9) * 10,
  };
}

export interface ProviderDraft {
  id: string;
  source: string;
  sourceExternalId: string | null;
  active: boolean;
  deletedAt: Date | null;
  brandId: string | null;
  laboratoryId: string | null;
  tags: string[];
  categories: { category: { slug: string } }[];
  variants: { id: string }[];
}

export function planProviderDemo(products: ProviderDraft[]) {
  const pending: {
    product: ProviderDraft;
    laboratory: LaboratoryMapping;
    profile: ReturnType<typeof providerDemoProfile>;
  }[] = [];
  const unresolved: string[] = [];
  let skipped = 0;
  for (const product of products) {
    if (!['RAICOR', 'MAGNIS'].includes(product.source)) continue;
    if (
      product.active ||
      product.deletedAt ||
      product.variants.length ||
      product.tags.includes(DEMO_TAG) ||
      product.tags.includes(PROVIDER_DEMO_TAG)
    ) {
      skipped++;
      continue;
    }
    if (!product.sourceExternalId) {
      unresolved.push(product.id);
      continue;
    }
    const source = product.source as ProviderSource;
    const laboratory = providerLaboratory(
      source,
      product.sourceExternalId,
      product.categories.map(({ category }) => category.slug),
    );
    if (!laboratory) {
      unresolved.push(product.id);
      continue;
    }
    pending.push({ product, laboratory, profile: providerDemoProfile(source, product.sourceExternalId) });
  }
  return { pending, skipped, unresolved };
}
