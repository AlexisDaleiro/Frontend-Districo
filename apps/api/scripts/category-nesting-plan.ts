import { normalizedCategoryName } from '../src/catalog/categories/category-groups';

export type NestingCategory = { id: string; name: string; parentId: string | null };
export type NestingLink = { productId: string; categoryId: string };

export class CategoryNestingError extends Error {}

export const categoryParents: Record<string, string | null> = {
  Medicamentos: null,
  'Antibióticos': 'Medicamentos',
  'Antiflamatorios': 'Medicamentos',
  'Antiparasitarios': 'Medicamentos',
  'Pulguicidas y Garrapaticidas': 'Antiparasitarios',
  'Biológicos': 'Medicamentos',
  'Clostridiales': 'Biológicos',
  'Reproductivas': 'Biológicos',
  'Hormonales': 'Medicamentos',
  'Intramamarios': 'Medicamentos',
  'Inyectables': 'Medicamentos',
  'Terapéuticos': 'Medicamentos',
  'Animales de compañía': null,
  'Alimento para mascotas': 'Animales de compañía',
  'Alimento para perro': 'Alimento para mascotas',
  'Alimento para gato': 'Alimento para mascotas',
  'Gatos': 'Animales de compañía',
  'Perros': 'Animales de compañía',
  'Arenas sanitarias': 'Gatos',
  'Cuidado de la mascota': 'Animales de compañía',
  'Acondicionador': 'Cuidado de la mascota',
  'Shampoo': 'Cuidado de la mascota',
  'Educadores': 'Cuidado de la mascota',
  'Pet Spray': 'Cuidado de la mascota',
  'Higiene y dermatología': 'Cuidado de la mascota',
  'Nutracéuticos': 'Animales de compañía',
  'Destacados Animales de compañia': 'Animales de compañía',
  'Ganadería': null,
  'Aves y cerdos': 'Ganadería',
  'Equinos': 'Ganadería',
  'Nutrición': 'Ganadería',
  'Caravanas Insecticidas': 'Ganadería',
  'Destacados Ganaderia': 'Ganadería',
  'Snacks para consumo humano': null,
  'Maníes': 'Snacks para consumo humano',
  'Papas': 'Snacks para consumo humano',
  'Palitos': 'Snacks para consumo humano',
  'Packs': 'Snacks para consumo humano',
  'Raticidas': null,
  'Storm': 'Raticidas',
};

const newCategoryNames = new Set(['Medicamentos', 'Alimento para perro', 'Alimento para gato']);

export function planCategoryNesting(categories: NestingCategory[], links: NestingLink[]) {
  const byName = new Map<string, NestingCategory>();
  for (const category of categories) {
    const key = normalizedCategoryName(category.name);
    if (byName.has(key)) throw new CategoryNestingError(`Hay más de una categoría activa llamada ${category.name}.`);
    byName.set(key, category);
  }
  const get = (name: string) => byName.get(normalizedCategoryName(name));
  const create: { name: string; parentName: string | null }[] = [];
  const move: { id: string; name: string; parentName: string; previousParentId: string | null }[] = [];
  for (const [name, parentName] of Object.entries(categoryParents)) {
    const category = get(name);
    if (!category) {
      if (!newCategoryNames.has(name)) throw new CategoryNestingError(`Falta la categoría ${name}; revisar la base antes de aplicar.`);
      create.push({ name, parentName });
      continue;
    }
    if (!parentName) {
      if (category.parentId) throw new CategoryNestingError(`${name} dejó de ser una categoría principal.`);
      continue;
    }
    const parent = get(parentName);
    if (!parent && !newCategoryNames.has(parentName)) throw new CategoryNestingError(`Falta la categoría padre ${parentName}.`);
    if (parent && category.parentId === parent.id) continue;
    if (category.parentId) throw new CategoryNestingError(`${name} ya tiene otro padre; revisar el cambio manualmente.`);
    move.push({ id: category.id, name, parentName, previousParentId: category.parentId });
  }

  const food = get('Alimento para mascotas')!;
  const dogs = get('Perros')!;
  const cats = get('Gatos')!;
  const linked = (id: string) => new Set(links.filter((link) => link.categoryId === id).map((link) => link.productId));
  const foodIds = linked(food.id);
  const dogIds = linked(dogs.id);
  const catIds = linked(cats.id);
  for (const productId of foodIds) {
    if (Number(dogIds.has(productId)) + Number(catIds.has(productId)) !== 1) {
      throw new CategoryNestingError(`El alimento ${productId} no está clasificado exclusivamente como perro o gato.`);
    }
  }
  for (const productId of [...dogIds, ...catIds]) {
    if (!foodIds.has(productId)) throw new CategoryNestingError(`El producto ${productId} no está asociado a Alimento para mascotas.`);
  }
  const newDog = get('Alimento para perro');
  const newCat = get('Alimento para gato');
  const existingDog = newDog ? linked(newDog.id) : new Set<string>();
  const existingCat = newCat ? linked(newCat.id) : new Set<string>();
  const assign = [
    ...[...dogIds].filter((productId) => !existingDog.has(productId)).map((productId) => ({ productId, categoryName: 'Alimento para perro' })),
    ...[...catIds].filter((productId) => !existingCat.has(productId)).map((productId) => ({ productId, categoryName: 'Alimento para gato' })),
  ];
  return { create, move, assign, dogCount: dogIds.size, catCount: catIds.size };
}
