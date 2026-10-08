import { describe, expect, it } from "vitest";
import { catalogNavigation } from "../src/lib/catalog-navigation";

describe("catalog navigation", () => {
  it("uses current category IDs, keeps the hierarchy and orders the six store roots", () => {
    const tree = catalogNavigation([
      { id: "people", name: "Consumo humano" },
      { id: "pharmacy", name: "Farmacia" },
      { id: "small", name: "Pequeños animales" },
      { id: "livestock", name: "Ganadería" },
      { id: "cats", name: "Gatos" },
      { id: "dogs", name: "Perros" },
      { id: "dog-food", name: "Alimento para perro", parentId: "dogs" },
      { id: "cattle", name: "Medicamentos para ganado", parentId: "pharmacy" },
      { id: "bovine", name: "Bovinos", parentId: "cattle" },
    ]);
    expect(tree.map((category) => category.id)).toEqual([
      "dogs",
      "cats",
      "livestock",
      "small",
      "pharmacy",
      "people",
    ]);
    expect(tree[0].children[0].id).toBe("dog-food");
    expect(tree[4].children[0].children[0].id).toBe("bovine");
  });
  it("does not duplicate IDs or expose inactive branches, and safely handles cycles and missing parents", () => {
    const categories = [
      { id: "dogs", name: "Perros" },
      { id: "dogs", name: "Perros" },
      { id: "hidden", name: "Oculta", active: false },
      { id: "child", name: "No mostrar", parentId: "hidden" },
      { id: "orphan", name: "Otra", parentId: "missing" },
      { id: "a", name: "Ciclo A", parentId: "b" },
      { id: "b", name: "Ciclo B", parentId: "a" },
    ];
    expect(
      catalogNavigation(categories).map((category) => category.id),
    ).toEqual(["dogs", "orphan"]);
    expect(catalogNavigation([])).toEqual([]);
  });
});
