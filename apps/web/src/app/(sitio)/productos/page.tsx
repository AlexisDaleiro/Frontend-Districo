import { Suspense } from "react";
import { PublicCatalog, PublicProductSkeletons } from "@/components/public-products";

export const metadata = { title: "Productos", description: "Explorá las marcas, líneas y productos distribuidos por DISTRICO en Uruguay. Catálogo público sin precios." };
export default function Page() { return <Suspense fallback={<div className="container site-catalog-body"><PublicProductSkeletons count={8} /></div>}><PublicCatalog /></Suspense>; }
