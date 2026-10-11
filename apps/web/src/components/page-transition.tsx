"use client";

import { usePathname } from "next/navigation";
import { ViewTransition, type ReactNode } from "react";
import { storeRoutes } from "@/lib/store-routes";

// Cada ruta es un bloque que sale con fundido y entra subiendo (motion.css).
// El key por ruta cubre también producto → producto o cuenta → pedidos, que
// un template.tsx no vuelve a montar. Administración conserva su layout sin
// transiciones que retrasen la interacción entre secciones.
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === storeRoutes.admin || pathname.startsWith(`${storeRoutes.admin}/`)) {
    return <div className="page-view">{children}</div>;
  }
  return (
    <ViewTransition
      key={pathname}
      enter="page-enter"
      exit="page-exit"
      default="none"
    >
      <div className="page-view">{children}</div>
    </ViewTransition>
  );
}
