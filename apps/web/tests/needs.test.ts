import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { catalogNavigation } from "../src/lib/catalog-navigation";
import { mappedNeeds, needs } from "../src/lib/needs";
import type { Entity } from "../src/lib/types";

const categories: Entity[] = [
  { id: "people", name: "Consumo humano" },
  { id: "pharmacy", name: "Farmacia" },
  { id: "small", name: "Pequeños animales" },
  { id: "livestock", name: "Ganadería" },
  { id: "cats", name: "Gatos" },
  { id: "dogs", name: "Perros" },
  { id: "food", name: "Alimento para perro", parentId: "dogs" },
  { id: "litter", name: "Arenas sanitarias", parentId: "cats" },
  { id: "inactive", name: "Inactiva", active: false },
];

describe("home category navigation", () => {
  it("includes all six current roots in the same order as the catalog menu", () => {
    const mapped = mappedNeeds(categories);
    expect(mapped.map((category) => category.name)).toEqual(needs.map((need) => need.name));
    expect(mapped.map((category) => category.id)).toEqual(catalogNavigation(categories).map((category) => category.id));
    expect(mapped.filter((category) => category.line).map((category) => category.name)).toEqual(["Perros", "Farmacia", "Consumo humano"]);
    for (const category of mapped) expect(existsSync(resolve("public", `.${category.image}`))).toBe(true);
  });

  it("does not duplicate children, inactive categories or repeated API rows", () => {
    expect(mappedNeeds([...categories, categories[5]]).map((category) => category.id)).toEqual(["dogs", "cats", "livestock", "small", "pharmacy", "people"]);
  });

  it("keeps new and renamed categories visible with a provided image or fallback", () => {
    expect(mappedNeeds([{ id: "new", name: "Novedades", imageUrl: "/images/product-0-0.jpg" }])[0]).toMatchObject({ id: "new", name: "Novedades", image: "/images/product-0-0.jpg" });
    expect(mappedNeeds([{ id: "new", name: "Otra categoría" }])[0]).toMatchObject({ id: "new", name: "Otra categoría", image: "/images/placeholder.svg" });
  });

  it("retains imagery and product lines for legacy demo categories", () => {
    expect(mappedNeeds([{ id: "food", name: "Alimentación" }, { id: "vet", name: "Veterinaria" }, { id: "snacks", name: "Snacks para personas" }]).every((category) => category.line && category.image !== "/images/placeholder.svg")).toBe(true);
    expect(mappedNeeds()).toEqual([]);
  });
});
