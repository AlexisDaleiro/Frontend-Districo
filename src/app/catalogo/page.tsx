import { Suspense } from "react";
import { Catalog } from "@/components/catalog";
import { Loading } from "@/components/ui";
export const metadata = { title: "Catálogo" };
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <Catalog />
    </Suspense>
  );
}
