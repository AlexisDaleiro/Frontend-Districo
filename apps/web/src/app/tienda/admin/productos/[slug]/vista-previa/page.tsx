import { AdminProductPreviewPage } from "@/components/admin-product-preview-page";

export const metadata = { title: "Vista previa del producto | Administración" };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <AdminProductPreviewPage slug={slug} />;
}
