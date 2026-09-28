import {
  districoBrandFor,
  DISTRICO_BRANDS,
  LEGACY_DEMO_BRAND_IDS,
} from "./districo-brands";

interface StoredBrand {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  deletedAt: Date | null;
}
interface StoredProduct {
  id: string;
  source: string;
  sourceExternalId: string | null;
  brandId: string | null;
}

export function planDistricoBrands(
  brands: StoredBrand[],
  products: StoredProduct[],
) {
  const bySlug = new Map(brands.map((brand) => [brand.slug, brand]));
  const create = DISTRICO_BRANDS.filter((entry) => !bySlug.has(entry.slug)).map(
    ({ name, slug }) => ({
      id: `districo-brand-${slug}`,
      name,
      slug,
    }),
  );
  for (const entry of DISTRICO_BRANDS) {
    const stored = bySlug.get(entry.slug);
    if (
      stored &&
      (stored.name !== entry.name || !stored.active || stored.deletedAt)
    ) {
      throw new Error(
        `Revisar la marca existente ${entry.slug}; no se sobrescribe ni reactiva automaticamente.`,
      );
    }
  }
  const update: {
    id: string;
    beforeBrandId: string | null;
    brandId: string;
  }[] = [];
  const unmapped: string[] = [];
  for (const product of products) {
    if (product.source !== "DISTRICO") continue;
    const entry = product.sourceExternalId
      ? districoBrandFor(product.sourceExternalId)
      : undefined;
    if (!entry) {
      unmapped.push(product.id);
      if (product.brandId && LEGACY_DEMO_BRAND_IDS.includes(product.brandId)) {
        throw new Error(
          `Producto sin marca verificada: ${product.id}. Revisar antes de retirar las marcas ficticias.`,
        );
      }
      continue;
    }
    const brandId =
      bySlug.get(entry.slug)?.id ?? `districo-brand-${entry.slug}`;
    if (product.brandId === brandId) continue;
    if (product.brandId && !LEGACY_DEMO_BRAND_IDS.includes(product.brandId)) {
      throw new Error(
        `El producto ${product.id} tiene una marca editada manualmente; no se sobrescribe.`,
      );
    }
    update.push({ id: product.id, beforeBrandId: product.brandId, brandId });
  }
  const updatedIds = new Set(update.map((product) => product.id));
  const retire = brands
    .filter((brand) => LEGACY_DEMO_BRAND_IDS.includes(brand.id) && brand.active)
    .map((brand) => brand.id);
  if (
    products.some(
      (product) =>
        product.brandId &&
        retire.includes(product.brandId) &&
        !updatedIds.has(product.id),
    )
  ) {
    throw new Error(
      "Una marca ficticia conserva productos fuera del mapeo. No se desactiva.",
    );
  }
  return { create, update, retire, unmapped };
}
