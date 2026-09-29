import Image from "next/image";
import { brandLogoSrc } from "@/lib/brand-logos";
import type { Entity } from "@/lib/types";

export function BrandLogo({ brand }: { brand: Pick<Entity, "name" | "slug"> }) {
  const src = brandLogoSrc(brand.slug);
  return (
    <span className={`brand-mark${src ? "" : " brand-mark--text"}`}>
      {src ? (
        <Image src={src} alt={brand.name} fill sizes="180px" unoptimized />
      ) : (
        brand.name
      )}
    </span>
  );
}
