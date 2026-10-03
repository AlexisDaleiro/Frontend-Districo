import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Picture } from "./ui";
import type { siteBrands } from "@/lib/site-brands";

const petPhotos = [3, 2, 1, 5, 6, 7, 4, 8].map(
  (number) => `/images/brand-pets-${String(number).padStart(2, "0")}.webp`,
);

export function SiteBrandCard({ brand, index, sizes, photo, textOnly = false }: { brand: (typeof siteBrands)[number]; index: number; sizes: string; photo?: string; textOnly?: boolean }) {
  return (
    <Link className="reference-brand-card" href={brand.name === "Raicor" ? "/productos?categoryId=veterinaria" : `/productos?search=${encodeURIComponent(brand.name)}`} aria-label={`Ver productos de ${brand.name}`} style={{ backgroundColor: brand.color }}>
      <Picture className="reference-brand-photo" src={photo ?? petPhotos[index % petPhotos.length]} alt="" loading="lazy" sizes={sizes} />
      <span className="reference-brand-shade" aria-hidden="true" />
      <span className="reference-brand-mark">
        {brand.logo && !textOnly ? (
          <Picture src={`/images/brands/${brand.logo}`} alt="" loading="lazy" sizes="140px" />
        ) : (
          <span className="reference-brand-wordmark">{brand.name}</span>
        )}
      </span>
      <span className="reference-brand-name">{brand.name}<ArrowUpRight size={15} aria-hidden="true" /></span>
    </Link>
  );
}
