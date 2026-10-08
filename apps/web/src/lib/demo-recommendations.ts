import { recommendationIds, recommendationPayload } from "./recommendation-scope";
import type { Cart, Entity, Product, Rule } from "./types";

type Catalog = { products: Product[]; brands: Entity[]; laboratories: Entity[]; categories: Entity[] };
function expandedCategories(categories: Entity[], ids: string[]) {
  const result = new Set(ids);
  for (let added = true; added;) {
    added = false;
    for (const category of categories) {
      if (result.has(category.id) || category.aliasIds?.some((id) => result.has(id)) || (category.parentId && result.has(category.parentId))) {
        for (const id of [category.id, ...(category.aliasIds ?? [])]) if (!result.has(id)) { result.add(id); added = true; }
      }
    }
  }
  return result;
}
export function demoRecommendationLabels(rule: Rule, catalog: Catalog): Rule {
  const labels = (type: string, ids: string[]) => ids.map((id) => {
    const collection = type === "PRODUCT" ? catalog.products : type === "BRAND" ? catalog.brands : type === "CATEGORY" ? catalog.categories : catalog.laboratories;
    const variantProduct = type === "PRODUCT" ? catalog.products.find((item) => item.variants.some((variant) => variant.id === id)) : undefined;
    return { id, name: collection.find((item) => item.id === id)?.name ?? variantProduct?.name ?? id };
  });
  return { ...rule, triggerTargets: labels(rule.triggerType ?? "PRODUCT", recommendationIds(rule, "trigger")), targetTargets: labels(rule.targetType ?? "PRODUCT", recommendationIds(rule, "target")) };
}
export function demoRecommendationPayload(body: Partial<Rule>, catalog: Catalog) {
  const rule = recommendationPayload(body);
  for (const [type, ids] of [[rule.triggerType, rule.triggerIds], [rule.targetType, rule.targetIds]] as const) {
    const collection = type === "PRODUCT" ? catalog.products : type === "BRAND" ? catalog.brands : type === "CATEGORY" ? catalog.categories : catalog.laboratories;
    if (ids.some((id) => !collection.some((item) => item.id === id) && !(type === "PRODUCT" && ids === rule.triggerIds && catalog.products.some((product) => product.variants.some((variant) => variant.id === id))))) throw new Error("Un elemento seleccionado no existe o fue eliminado.");
  }
  if (rule.products.some((ref) => ref.variantId && !catalog.products.find((item) => item.id === ref.productId)?.variants.some((variant) => variant.id === ref.variantId))) throw new Error("Una presentación no pertenece al producto recomendado.");
  return rule;
}
export function demoRecommendations(rules: Rule[], catalog: Catalog, cart: Cart, medicationAllowed: boolean, now = new Date()) {
  const results: { rule: string; product: Product }[] = [], seen = new Set(cart.items.map((item) => item.product.id));
  const matches = (product: Product, type: string, ids: Set<string>, variantId?: string) => type === "PRODUCT" ? ids.has(product.id) || !!variantId && ids.has(variantId)
    : type === "BRAND" ? !!product.brand && ids.has(product.brand.id)
    : type === "LABORATORY" ? !!product.laboratory && ids.has(product.laboratory.id)
    : product.categories.some((item) => ids.has(item.categoryId));
  for (const rule of [...rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))) {
    if (rule.active === false || (rule.startsAt && new Date(rule.startsAt) > now) || (rule.endsAt && new Date(rule.endsAt) < now) || cart.total < Number(rule.minimumCartAmount ?? 0)) continue;
    const triggerType = rule.triggerType ?? "PRODUCT", targetType = rule.targetType ?? "PRODUCT";
    const triggerIds = triggerType === "CATEGORY" ? expandedCategories(catalog.categories, recommendationIds(rule, "trigger")) : new Set(recommendationIds(rule, "trigger"));
    const quantity = cart.items.filter((item) => {
      const product = catalog.products.find((product) => product.id === item.product.id);
      return product && matches(product, triggerType, triggerIds, item.variant.id);
    }).reduce((sum, item) => sum + item.quantity, 0);
    if (quantity < (rule.minimumQuantity ?? 1)) continue;
    const selected = recommendationIds(rule, "target");
    const targets = targetType === "CATEGORY" ? expandedCategories(catalog.categories, selected) : new Set(selected);
    const products = [...catalog.products].sort((a, b) => targetType === "PRODUCT" ? selected.indexOf(a.id) - selected.indexOf(b.id) : a.name.localeCompare(b.name));
    for (const product of products) {
      if (seen.has(product.id) || product.active === false || !matches(product, targetType, targets) || product.requiresMedicationPermission && !medicationAllowed) continue;
      if (targetType === "BRAND" && product.brand?.active === false || targetType === "LABORATORY" && product.laboratory?.active === false) continue;
      const refs = rule.products?.filter((item) => item.productId === product.id) ?? [];
      const variants = product.variants.filter((variant) => variant.active !== false && (variant.physicalStock == null ? variant.availableStock : variant.physicalStock - (variant.reservedStock ?? 0)) > 0 &&
        !(targetType === "PRODUCT" && refs.length && refs.every((ref) => ref.variantId) && !refs.some((ref) => ref.variantId === variant.id)));
      if (!variants.length) continue;
      seen.add(product.id); results.push({ rule: rule.name, product: { ...product, variants } });
      if (results.length >= 12) return results;
    }
  }
  return results;
}
