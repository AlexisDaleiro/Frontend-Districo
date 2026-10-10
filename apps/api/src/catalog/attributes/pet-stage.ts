export const petStages = [
  { slug: 'cachorro-gatito', value: 'Cachorro / gatito' },
  { slug: 'adulto', value: 'Adulto' },
  { slug: 'senior', value: 'Senior' },
  { slug: 'todas-las-etapas', value: 'Todas las etapas' },
] as const;
export type PetStageSlug = typeof petStages[number]['slug'];

export function inferPetStage(name: string): PetStageSlug | undefined {
  const text = name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  if (/\b(?:todas? (?:las? )?(?:etapas|edades)|all life stages)\b/.test(text)) return 'todas-las-etapas';
  const matches: PetStageSlug[] = [];
  if (/\b(?:cachorros?|gatitos?|filhotes?|kitten|kittens|puppy|puppies|baby|junior)\b/.test(text)) matches.push('cachorro-gatito');
  if (/\b(?:adultos?|adults?)\b/.test(text)) matches.push('adulto');
  if (/\b(?:senior|seniores|mature)\b/.test(text)) matches.push('senior');
  // Ambiguous names need an administrator's decision, not an automatic guess.
  return matches.length === 1 ? matches[0] : undefined;
}

type StageCategory = { id: string; name: string; parentId: string | null };
const foodNames = ['alimento para perro', 'alimento para gato', 'alimento para mascotas', 'alimentacion'];
export const petFoodCategoryIds = (categories: StageCategory[]) => categoryDescendants(categories, foodNames);
export const petCategoryIds = (categories: StageCategory[]) => categoryDescendants(categories, ['perros', 'gatos', 'pequenos animales', ...foodNames]);

function categoryDescendants(categories: StageCategory[], names: string[]) {
  const ids = new Set(categories.filter((category) => names.includes(category.name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim())).map((category) => category.id));
  for (let added = true; added;) {
    added = false;
    for (const category of categories) {
      if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) {
        ids.add(category.id);
        added = true;
      }
    }
  }
  return ids;
}
