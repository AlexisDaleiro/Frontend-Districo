import { PublicProductDetail } from "@/components/public-products";

export const metadata = { title: "Producto", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicProductDetail slug={slug} />;
}
