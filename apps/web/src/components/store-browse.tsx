"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Home } from "./home";
import { Catalog, ProductDetail } from "./catalog";
import { storeBrowseTarget } from "@/lib/store-prefetch";

// These views already read their data in the browser. Keep their route-independent
// rendering in the authorized layout so URL changes need no extra RSC roundtrip.
export function StoreBrowse() {
  const pathname = usePathname(), view = storeBrowseTarget(pathname);
  useEffect(() => {
    if (view?.kind === "home") document.title = "Tienda | DISTRICO";
  }, [view?.kind]);
  if (view?.kind === "home") return <Home />;
  if (view?.kind === "catalog") return <Catalog categoryId={view.id} />;
  if (view?.kind === "product") return <ProductDetail slug={view.id!} />;
  return null;
}
