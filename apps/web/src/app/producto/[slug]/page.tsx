import { ProductDetail } from "@/components/catalog";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <ProductDetail slug={(await params).slug} />;
}
