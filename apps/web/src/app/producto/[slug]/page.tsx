import type { Metadata } from "next";
import { ProductDetail } from "@/components/catalog";
import { seedProducts } from "@/lib/demo-seed";
import type { Product } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

// Solo datos públicos del catálogo: sin token ni precios.
async function findProduct(slug: string): Promise<Product | undefined> {
  if (process.env.NEXT_PUBLIC_DATA_MODE !== "real")
    return seedProducts().find((p) => p.slug === slug);
  const base = process.env.BACKEND_API_URL;
  if (!base) return undefined;
  try {
    const res = await fetch(
      `${base.replace(/\/$/, "")}/products/${encodeURIComponent(slug)}`,
      { next: { revalidate: 300 } },
    );
    return res.ok ? ((await res.json()) as Product) : undefined;
  } catch {
    return undefined;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await findProduct((await params).slug);
  if (!product) return { title: "Producto" };
  const description = (product.shortDescription || product.description || "")
    .replace(/\s+/g, " ")
    .slice(0, 160);
  const image =
    product.media.find((m) => m.isPrimary)?.url ?? product.media[0]?.url;
  return {
    title: product.name,
    description,
    openGraph: {
      siteName: "DISTRICO",
      locale: "es_UY",
      title: product.name,
      description,
      images: image ? [{ url: image, alt: product.name }] : undefined,
    },
  };
}

export default async function Page({ params }: Props) {
  return <ProductDetail slug={(await params).slug} />;
}
