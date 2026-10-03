import { groupEquivalentCategories, normalizedCategoryName } from '../src/catalog/categories/category-groups';

export type CleanupCategory = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
};

export type CategoryCleanupPlan = {
  retire: { id: string; reason: string }[];
  merge: { fromId: string; intoId: string }[];
};

export function categoryRetirementReason(name: string, organizationNames: Set<string>): string | null {
  const normalized = normalizedCategoryName(name);
  if (normalized === 'laboratorios') return 'Etiqueta de laboratorio, no rubro';
  if (normalized === 'boheringer ingelheim') return 'Nombre de laboratorio mal escrito';
  return organizationNames.has(normalized) ? 'Marca o laboratorio' : null;
}

export function planCategoryCleanup(categories: CleanupCategory[], brandAndLabNames: string[]): CategoryCleanupPlan {
  const organizationNames = new Set(brandAndLabNames.map(normalizedCategoryName));
  const retire = categories.flatMap((category) => {
    const reason = categoryRetirementReason(category.name, organizationNames);
    return reason ? [{ id: category.id, reason }] : [];
  });
  const retired = new Set(retire.map((category) => category.id));
  const merge: CategoryCleanupPlan['merge'] = [];
  for (const group of groupEquivalentCategories(categories.filter((category) => !retired.has(category.id))).values()) {
    if (group.length < 2) continue;
    const [canonical, ...duplicates] = [...group].sort((a, b) => a.slug.localeCompare(b.slug) || a.id.localeCompare(b.id));
    for (const duplicate of duplicates) merge.push({ fromId: duplicate.id, intoId: canonical.id });
  }
  return { retire, merge };
}
