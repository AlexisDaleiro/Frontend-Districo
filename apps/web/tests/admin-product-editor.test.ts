import { describe, expect, it } from "vitest";
import { adminProductEditor } from "../src/lib/admin-product-editor";
import type { Entity, Product } from "../src/lib/types";
import { demoPetStage } from "../src/lib/pet-stage";

describe("editor de productos", () => {
  it("edita o quita la etapa sin perder otros atributos y sin enviar campos ficticios a la API", () => {
    const product: Product = { id: "p", slug: "alimento", name: "Alimento", productType: "FOOD", categories: [], variants: [], media: [], requiresMedicationPermission: false, attributes: [
      { attributeValue: { id: "demo-etapa-juvenil", value: "Cachorro / gatito", attribute: demoPetStage } },
      { attributeValue: { id: "color-white", value: "Blanco", attribute: { id: "color", name: "Color" } } },
    ] };
    const editor = adminProductEditor(product, [], [], [], [demoPetStage]);
    expect(editor.initial?.stageValueId).toBe("demo-etapa-juvenil");
    expect(editor.fields.find((field) => field.key === "stageValueId")?.showWhen).toEqual({ key: "productType", value: "FOOD" });
    expect(editor.transform?.({ productType: "FOOD", stageValueId: "demo-etapa-adulto" })).toEqual({ productType: "FOOD", attributeValueIds: ["color-white", "demo-etapa-adulto"], categoryIds: [] });
    expect(editor.transform?.({ productType: "FOOD", stageValueId: "" })).toMatchObject({ attributeValueIds: ["color-white"] });
    expect(editor.transform?.({ productType: "ACCESSORY" })).not.toHaveProperty("attributeValueIds");
  });
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
