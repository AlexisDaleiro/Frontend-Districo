const filterKeys = [
  "search",
  "categoryId",
  "brandId",
  "laboratoryId",
  "attributeValueIds",
  "page",
  "featured",
  "productType",
];

export function catalogCardsPath(params: Pick<URLSearchParams, "get">) {
  const filtered = new URLSearchParams();
  for (const key of filterKeys) {
    const value = params.get(key);
    if (key === "page" && !/^[1-9]\d*$/.test(value ?? "")) continue;
    if (value) filtered.set(key, value);
  }
  filtered.set("limit", "12");
  return `products/cards?${filtered}`;
}
