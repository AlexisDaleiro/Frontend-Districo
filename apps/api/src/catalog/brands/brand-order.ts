const featured = [
  "guabi-natural",
  "biofresh",
  "gran-plus",
  "three-dogs",
  "three-cats",
  "stack",
];

// The storefront uses the first six entries for its brand strip.
export function orderBrands<T extends { slug: string; name: string }>(
  brands: T[],
): T[] {
  const rank = (slug: string) => {
    const index = featured.indexOf(slug);
    return index === -1 ? featured.length : index;
  };
  return [...brands].sort(
    (a, b) =>
      rank(a.slug) - rank(b.slug) ||
      a.name.localeCompare(b.name, "es") ||
      a.slug.localeCompare(b.slug),
  );
}
