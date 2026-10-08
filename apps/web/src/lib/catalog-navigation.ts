import type { Entity } from "./types";

export type CatalogCategory = Entity & { children: CatalogCategory[] };
export const catalogCategoryKind = (name: string) =>
  name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
const rootOrder = [
  "perros",
  "gatos",
  "ganaderia",
  "pequenos animales",
  "farmacia",
  "consumo humano",
];

export function catalogNavigation(categories: Entity[]): CatalogCategory[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const children = new Map<string | null, Entity[]>();
  for (const category of byId.values()) {
    const parent =
      category.parentId && byId.has(category.parentId)
        ? category.parentId
        : null;
    children.set(parent, [...(children.get(parent) ?? []), category]);
  }
  const seen = new Set<string>();
  const walk = (parent: string | null): CatalogCategory[] =>
    (children.get(parent) ?? [])
      .filter(
        (category) =>
          category.active !== false &&
          !seen.has(category.id) &&
          seen.add(category.id),
      )
      .map((category) => ({ ...category, children: walk(category.id) }))
      .sort((a, b) => a.name.localeCompare(b.name, "es-UY"));
  const rank = (name: string) => {
    const index = rootOrder.indexOf(catalogCategoryKind(name));
    return index < 0 ? rootOrder.length : index;
  };
  return walk(null).sort(
    (a, b) =>
      rank(a.name) - rank(b.name) || a.name.localeCompare(b.name, "es-UY"),
  );
}
