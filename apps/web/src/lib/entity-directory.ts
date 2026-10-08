import type { Entity } from "./types";

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");

export function filterDirectory(items: Entity[], search: string, status: string, logo: string, sort: string) {
  const term = normalize(search.trim());
  return items.filter((item) =>
    (!term || normalize(`${item.name} ${item.slug ?? ""}`).includes(term)) &&
    (status !== "active" || item.active !== false) && (status !== "inactive" || item.active === false) &&
    (logo !== "with" || !!item.imageUrl) && (logo !== "without" || !item.imageUrl),
  ).sort((a, b) => (sort === "desc" ? -1 : 1) * a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
}
