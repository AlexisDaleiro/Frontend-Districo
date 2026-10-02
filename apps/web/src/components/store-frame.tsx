"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Header, Footer } from "./shell";
import { PublicHeader, PublicFooter } from "./site-shell";
import { PageTransition } from "./page-transition";
import { useSession } from "./providers";
import { storeRoutes } from "@/lib/store-routes";

const publicAccessPaths = new Set<string>([
  storeRoutes.login,
  storeRoutes.requestAccount,
  storeRoutes.recoverAccess,
]);

export function StoreFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, error } = useSession();
  const publicAccess = publicAccessPaths.has(pathname);

  useEffect(() => {
    if (!publicAccess && !loading && !error && !user)
      router.replace(storeRoutes.login);
  }, [publicAccess, loading, error, user, router]);

  const gated = !publicAccess && (loading || error || !user);
  return (
    <>
      {publicAccess ? <PublicHeader solid /> : !gated ? <Header /> : null}
      <main
        id="contenido"
        className={
          publicAccess ? "site-auth-main" : gated ? "session-gate" : undefined
        }
      >
        {publicAccess || !gated ? (
          <PageTransition>{children}</PageTransition>
        ) : error ? (
          <div role="alert">
            <p>No se pudo comprobar tu sesión.</p>
            <Link className="button" href="/">
              Volver al sitio
            </Link>
          </div>
        ) : (
          <div role="status">
            {loading ? "Comprobando tu acceso…" : "Abriendo el ingreso…"}
          </div>
        )}
      </main>
      {publicAccess ? <PublicFooter /> : !gated ? <Footer /> : null}
    </>
  );
}
