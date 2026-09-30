import { Suspense } from "react";
import { Catalog } from "@/components/catalog";
import { Loading } from "@/components/ui";

export const metadata = { title: "Categoría" };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<Loading />}>
      <Catalog categoryId={id} />
    </Suspense>
  );
}
