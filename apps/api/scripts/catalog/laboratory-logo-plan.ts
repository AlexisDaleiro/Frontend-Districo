export interface LaboratoryLogoAsset {
  slug: string;
  name: string;
  pageUrl: string;
  sourceUrl: string;
  url: string;
  sha256: string;
}

export interface LaboratoryWithLogo {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  active: boolean;
  deletedAt: Date | null;
}

export function planLaboratoryLogos(laboratories: LaboratoryWithLogo[], assets: LaboratoryLogoAsset[]) {
  const bySlug = new Map<string, LaboratoryLogoAsset>();
  for (const asset of assets) {
    if (bySlug.has(asset.slug) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(asset.slug) ||
      !/^\/images\/laboratories\/[a-z0-9-]+-[a-f0-9]{12}\.webp$/.test(asset.url) ||
      !/^[a-f0-9]{64}$/.test(asset.sha256) || new URL(asset.sourceUrl).protocol !== 'https:') {
      throw new Error('Invalid laboratory logo manifest.');
    }
    bySlug.set(asset.slug, asset);
  }
  return laboratories.filter((laboratory) => laboratory.active && !laboratory.deletedAt && !laboratory.imageUrl && bySlug.has(laboratory.slug))
    .map((laboratory) => ({ laboratory, asset: bySlug.get(laboratory.slug)! }));
}
