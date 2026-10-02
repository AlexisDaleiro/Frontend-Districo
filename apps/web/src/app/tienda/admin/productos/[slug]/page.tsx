import { AdminProductPage } from "@/components/admin-product-page";

export const metadata = { title: "Producto | Administración" };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <AdminProductPage slug={slug} />;
}
