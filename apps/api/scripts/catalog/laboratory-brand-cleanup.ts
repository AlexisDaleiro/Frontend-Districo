import { normalizedCategoryName } from '../../src/catalog/categories/category-groups';

export interface DuplicateBrand {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  products: { id: string; laboratoryId: string | null }[];
}

export interface MatchingLaboratory {
  id: string;
  name: string;
  slug: string;
}

export function planLaboratoryBrandCleanup(
  brands: DuplicateBrand[],
  laboratories: MatchingLaboratory[],
  referencedBrandIds: string[],
) {
  const laboratoryBySlug = new Map(laboratories.map((lab) => [lab.slug, lab]));
  const referenced = new Set(referencedBrandIds);
  return brands.flatMap((brand) => {
    const laboratory = laboratoryBySlug.get(brand.slug);
    if (!laboratory || normalizedCategoryName(brand.name) !== normalizedCategoryName(laboratory.name)) return [];
    if (brand.id !== `provider-brand-${brand.slug}` || laboratory.id !== `provider-laboratory-${brand.slug}`) {
      throw new Error(`Revisar la identidad de ${brand.name} antes de quitar la marca.`);
    }
    if (brand.imageUrl || referenced.has(brand.id)) {
      throw new Error(`La marca ${brand.name} tiene logo o reglas asociadas; requiere revisión manual.`);
    }
    if (brand.products.some((product) => product.laboratoryId !== laboratory.id)) {
      throw new Error(`La marca ${brand.name} tiene productos de otro laboratorio.`);
    }
    return [{ brandId: brand.id, laboratoryId: laboratory.id, name: brand.name, productIds: brand.products.map((product) => product.id) }];
  });
}
