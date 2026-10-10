import type { Editor, Field } from "@/components/admin-form";
import type { Attribute, Entity, Product } from "./types";
import { petStage } from "./pet-stage";

const text = (key: string, label: string, required = true): Field => ({ key, label, required });
const select = (key: string, label: string, values: { value: string; label: string }[], required = true): Field =>
  ({ key, label, type: "select", options: values, required });
const entityOptions = (items?: Entity[]) => items?.map((item) => ({ value: item.id, label: item.name })) ?? [];

export function adminProductEditor(
  product: Product | undefined,
  brands?: Entity[],
  categories?: Entity[],
  laboratories?: Entity[],
  attributes?: Attribute[],
): Editor {
  const stage = petStage(attributes);
  const stageIds = new Set(stage?.values.map((value) => value.id));
  const currentStage = product?.attributes?.find((item) => stageIds.has(item.attributeValue.id));
  const primaryCategoryId = product?.categories[0]?.categoryId;
  const categoryOptions = categories?.map((category) => ({
    value: primaryCategoryId && category.aliasIds?.includes(primaryCategoryId)
      ? primaryCategoryId
      : category.id,
    label: category.name,
  })) ?? [];
  return {
    title: product ? `Editar ${product.name}` : "Crear producto",
    path: product ? `products/${product.id}` : "products",
    method: product ? "PATCH" : "POST",
    fields: [
      text("name", "Nombre"),
      text("slug", "Identificador en la URL", false),
      { key: "shortDescription", label: "Descripción breve", type: "textarea" },
      { key: "description", label: "Descripción", type: "textarea" },
      select("productType", "Tipo de producto", [
        { value: "FOOD", label: "Alimento" },
        { value: "HYGIENE", label: "Higiene" },
        { value: "ACCESSORY", label: "Accesorio" },
        { value: "MEDICATION", label: "Medicamento" },
        { value: "SUPPLEMENT", label: "Suplemento" },
        { value: "OTHER", label: "Otro" },
      ]),
      select("source", "Proveedor de origen", [
        { value: "DISTRICO", label: "DISTRICO" },
        { value: "RAICOR", label: "RAICOR" },
        { value: "MAGNIS", label: "MAGNIS" },
      ], false),
      ...(stage ? [{ ...select("stageValueId", "Etapa (alimentos para mascotas)", stage.values.map((value) => ({ value: value.id, label: value.value })), false), allowEmpty: true, showWhen: { key: "productType", value: "FOOD" } }] : []),
      select("brandId", "Marca", entityOptions(brands), false),
      select("laboratoryId", "Laboratorio", entityOptions(laboratories), false),
      select("categoryId", "Categoría principal", categoryOptions),
      { key: "requiresMedicationPermission", label: "Requiere permiso para medicamentos", type: "checkbox" },
      { key: "featured", label: "Mostrar entre destacados", type: "checkbox" },
      { key: "active", label: "Producto activo", type: "checkbox" },
    ],
    initial: product ? {
      ...product,
      brandId: product.brand?.id,
      laboratoryId: product.laboratory?.id,
      categoryId: primaryCategoryId,
      stageValueId: currentStage?.attributeValue.id ?? "",
    } : { active: true, productType: "OTHER", source: "DISTRICO" },
    transform: ({ categoryId, stageValueId, ...data }) => ({
      ...data,
      ...(stageValueId !== undefined ? {
        attributeValueIds: [
          ...(product?.attributes?.filter((item) => !stageIds.has(item.attributeValue.id)).map((item) => item.attributeValue.id) ?? []),
          ...(stageValueId ? [String(stageValueId)] : []),
        ],
      } : {}),
      categoryIds: categoryId
        ? [String(categoryId), ...(product?.categories.slice(1).map((item) => item.categoryId) ?? [])]
        : (product?.categories.map((item) => item.categoryId) ?? []),
    }),
    description: "Los productos inactivos no aparecen en la tienda. Podés reactivarlos desde este catálogo.",
  };
}
