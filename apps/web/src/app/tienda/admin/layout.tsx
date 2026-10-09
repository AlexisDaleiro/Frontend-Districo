"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/providers";
import { ErrorBox, Loading } from "@/components/ui";
import { canAccessAdmin } from "@/lib/staff-access";
import { storeRoutes } from "@/lib/store-routes";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading, error } = useSession();
  const router = useRouter();
  const allowed = canAccessAdmin(user);

  useEffect(() => {
    if (!loading && !error && !allowed)
      router.replace(user ? storeRoutes.account : storeRoutes.login);
  }, [user, loading, error, allowed, router]);

  if (loading) return <div className="container section"><Loading /></div>;
  if (error) return <div className="container section"><ErrorBox error={error} /></div>;
  // Do not mount admin pages or their queries while access is being checked or denied.
  if (!allowed) return <div className="container section"><Loading /></div>;
  return children;
}
