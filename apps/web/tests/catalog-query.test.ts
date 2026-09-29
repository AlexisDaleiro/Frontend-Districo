import { describe, expect, it } from "vitest";
import { canonicalCategoryIds, catalogCardsPath } from "../src/lib/catalog-query";

describe("ruta del listado", () => {
  it("usa el mismo orden y filtros para navegar y precargar", () => {
    const params = new URLSearchParams({
      page: "2",
      categoryId: "cat1,cat2",
      search: "alimento",
      ignored: "x",
    });
    expect(catalogCardsPath(params)).toBe(
      "products/cards?search=alimento&categoryId=cat1%2Ccat2&page=2&limit=12",
    );
  });

  it("descarta páginas inválidas", () => {
    expect(catalogCardsPath(new URLSearchParams({ page: "0" }))).toBe(
      "products/cards?limit=12",
    );
  });

  it("mantiene seleccionados los enlaces antiguos de categorías equivalentes", () => {
    expect(canonicalCategoryIds(
      [{ id: "new", aliasIds: ["new", "old"] }, { id: "other" }],
      ["old", "new", "other"],
    )).toEqual(["new", "other"]);
  });
});
