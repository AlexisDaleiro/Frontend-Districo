const logoSlugs = new Set([
  "4pets",
  "amazonia",
  "apolo",
  "atila",
  "beny",
  "biofresh",
  "eco-cane",
  "gran-plus",
  "kets",
  "mutts",
  "pipicat",
  "primocao",
  "primogato",
  "procao",
  "putz",
  "stack",
  "three-cats",
  "three-dogs",
]);

export function brandLogoSrc(slug?: string) {
  return slug && logoSlugs.has(slug) ? `/images/brands/${slug}.png` : null;
}
