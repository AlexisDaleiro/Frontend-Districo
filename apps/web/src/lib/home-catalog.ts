import { brandLogoSrc } from "./brand-logos";
import { catalogCategoryKind, catalogNavigation } from "./catalog-navigation";
import type { Entity } from "./types";

export function homeCategories(categories: Entity[] = []) {
  const roots = catalogNavigation(categories);
  return {
    species: roots.filter((category) => ["perros", "gatos"].includes(catalogCategoryKind(category.name))),
    other: roots.filter((category) => !["perros", "gatos"].includes(catalogCategoryKind(category.name))),
  };
}

export function homePromoBrand(brands: Entity[] = [], slug: string, name: string) {
  const brand = brands.find((item) => item.slug === slug) ??
    brands.find((item) => catalogCategoryKind(item.name) === catalogCategoryKind(name));
  if (!brand || brand.active === false) return undefined;
  return { ...brand, logo: brand.imageUrl || brandLogoSrc(slug) || undefined };
}
