export type CategoryIdentity = {
  id: string;
  name: string;
  parentId: string | null;
};

const normalizedName = (name: string) =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();

export function groupEquivalentCategories<T extends CategoryIdentity>(categories: T[]) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const paths = new Map<string, string>();
  const pathFor = (category: T, visiting = new Set<string>()): string => {
    const cached = paths.get(category.id);
    if (cached) return cached;
    if (visiting.has(category.id)) return JSON.stringify(['cycle', category.id]);
    visiting.add(category.id);
    const parent = category.parentId ? byId.get(category.parentId) : undefined;
    const path = JSON.stringify([
      parent ? pathFor(parent, visiting) : null,
      normalizedName(category.name) || category.id,
    ]);
    visiting.delete(category.id);
    paths.set(category.id, path);
    return path;
  };

  const groups = new Map<string, T[]>();
  for (const category of categories) {
    const path = pathFor(category);
    groups.set(path, [...(groups.get(path) ?? []), category]);
  }
  return groups;
}
