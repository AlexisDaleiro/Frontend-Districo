import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Picture } from "./ui";
import type { siteBrands } from "@/lib/site-brands";

const panelPhotos: Record<string, string> = {
  "Gran Plus": "granplus.jpg",
  Biofresh: "biofresh.jpg",
  "Three Dogs": "three-dogs.jpg",
  TOH: "toh.jpg",
  Procão: "procao.jpg",
  "Three Cats": "three-cats.jpg",
  Stack: "stack.jpg",
  "Guabi Natural": "guabi-natural.jpg",
  Primocão: "primocao.jpg",
  Primogato: "primogato.jpg",
  YowUp: "yowup.jpg",
  LoPets: "lopets.jpg",
  Pipicat: "pipicat.jpg",
  Beny: "beny.jpg",
  "4 Pets": "4-pets.jpg",
};

export function SiteBrandCard({ brand, sizes }: { brand: (typeof siteBrands)[number]; sizes: string }) {
  const displayName = brand.displayName ?? brand.name;
  const photo = panelPhotos[brand.name]
    ? `/images/brand-panels/${panelPhotos[brand.name]}`
    : "/images/hero-raicor.jpg";
  return (
    <Link className="reference-brand-card" href={brand.name === "Raicor" ? "/productos?categoryId=veterinaria" : `/productos?search=${encodeURIComponent(brand.name)}`} aria-label={`Ver productos de ${displayName}`} style={{ backgroundColor: brand.color }}>
      <Picture className="reference-brand-photo" src={photo} alt="" loading="lazy" sizes={sizes} />
      <span className="reference-brand-shade" aria-hidden="true" />
      <span className="reference-brand-mark">
        <span className="reference-brand-wordmark">{displayName}</span>
      </span>
      <span className="reference-brand-name">{displayName}<ArrowUpRight size={15} aria-hidden="true" /></span>
    </Link>
  );
}
