"use client";

import { usePathname } from "next/navigation";
import { ViewTransition, type ReactNode } from "react";
import { storeRoutes } from "@/lib/store-routes";

// Cada ruta es un bloque que sale con fundido y entra subiendo (motion.css).
// El key por ruta cubre también producto → producto o cuenta → pedidos, que
// un template.tsx no vuelve a montar. Las secciones de administración
// comparten la barra lateral y cambian con su propia transición (admin.tsx).
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const key = pathname.startsWith(storeRoutes.admin)
    ? storeRoutes.admin
    : pathname;
  return (
    <ViewTransition
      key={key}
      enter="page-enter"
      exit="page-exit"
      default="none"
    >
      <div className="page-view">{children}</div>
    </ViewTransition>
  );
}
