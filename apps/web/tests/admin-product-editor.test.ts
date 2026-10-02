import { describe, expect, it } from "vitest";
import { adminProductEditor } from "../src/lib/admin-product-editor";
import type { Entity, Product } from "../src/lib/types";

describe("editor de productos", () => {
  it("muestra una categoría consolidada sin cambiar la asociación antigua del producto", () => {
    const categories: Entity[] = [
      { id: "canonical", name: "Biológicos", aliasIds: ["canonical", "legacy"] },
      { id: "food", name: "Alimentación", aliasIds: ["food"] },
    ];
    const product = {
      id: "product-1",
      name: "Producto de prueba",
      categories: [{ categoryId: "legacy" }],
    } as Product;

    const editor = adminProductEditor(product, [], categories, []);
    const category = editor.fields.find((field) => field.key === "categoryId");
    expect(category?.options).toEqual([
      { value: "legacy", label: "Biológicos" },
      { value: "food", label: "Alimentación" },
    ]);
    expect(editor.initial?.categoryId).toBe("legacy");
    expect(editor.transform?.({ name: product.name, categoryId: "legacy" })).toMatchObject({
      categoryIds: ["legacy"],
    });
  });
});
