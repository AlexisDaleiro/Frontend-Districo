"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FileText, Heart, LayoutDashboard, LogOut, MessagesSquare, Package, ShieldCheck, type LucideIcon } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { useApi, useSession } from "./providers";
import type { OrderSummary } from "./customer-orders-list";
import { label } from "@/lib/commerce";
import { storeRoutes } from "@/lib/store-routes";
import type { Customer } from "@/lib/types";

type Counter = { href: string; title: string; nav: string; Icon: LucideIcon; total?: number };

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();

// Mismas rutas en el menú y en el resumen: comparten la caché de cada consulta.
export function useAccountCounters() {
  const orders = useApi<{ items: OrderSummary[]; meta: { total: number } }>("orders/me/page?limit=1");
  const invoices = useApi<{ meta: { total: number } }>("orders/me/invoices?page=1&limit=1");
  const favorites = useApi<string[]>("account/me/favorites/ids");
  const queries = useApi<unknown[]>("account/queries");
  const counters: Counter[] = [
    { href: storeRoutes.orders, title: "Pedidos", nav: "Mis pedidos", Icon: Package, total: orders.data?.meta.total },
    { href: storeRoutes.invoices, title: "Facturas", nav: "Mis facturas", Icon: FileText, total: invoices.data?.meta.total },
    { href: storeRoutes.favorites, title: "Favoritos", nav: "Mis favoritos", Icon: Heart, total: favorites.data?.length },
    { href: storeRoutes.queries, title: "Consultas", nav: "Mis consultas", Icon: MessagesSquare, total: queries.data?.length },
  ];
  return { counters, orders };
}

function AccountSidebar({ customer, email }: { customer: Customer; email: string }) {
  const { logout, notify } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { counters } = useAccountCounters();
  const navRef = useRef<HTMLElement>(null);
  const current = (href: string) => (href === storeRoutes.account ? pathname === href : pathname.startsWith(href)) ? "page" as const : undefined;

  // En celular el menú es una fila deslizable: centra la sección activa sin mover la página.
  // Se repite al llegar los contadores porque ensanchan las pestañas.
  const totals = counters.map((counter) => counter.total).join();
  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>("[aria-current]");
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return;
    const offset = active.getBoundingClientRect().left - nav.getBoundingClientRect().left + nav.scrollLeft;
    nav.scrollLeft = offset - (nav.clientWidth - active.offsetWidth) / 2;
  }, [pathname, totals]);

  return (
    <aside className="account-sidebar" aria-label="Tu cuenta">
      <div className="account-identity">
        <span className="account-avatar" aria-hidden="true">{initials(customer.businessName)}</span>
        <div>
          <p className="account-identity-name">{customer.businessName}</p>
          <p className="account-identity-email">{email}</p>
          <div className="account-dashboard-statuses">
            <span className="account-status-chip" data-status={customer.accountStatus}><span className="visually-hidden">Cuenta: </span>{label(customer.accountStatus)}</span>
            <span className="account-status-chip" data-status={customer.creditStatus}><span className="visually-hidden">Situación comercial: </span>{label(customer.creditStatus)}</span>
          </div>
        </div>
      </div>
      {/* Las pruebas de favoritos y facturas ubican estos enlaces por esta clase. */}
      <nav ref={navRef} className="account-nav account-dashboard-actions" aria-label="Secciones de tu cuenta">
        <Link href={storeRoutes.account} aria-current={current(storeRoutes.account)}><LayoutDashboard size={17} aria-hidden="true" /> Resumen</Link>
        {counters.map(({ href, nav, Icon, total }) => (
          <Link key={href} href={href} aria-current={current(href)}><Icon size={17} aria-hidden="true" /> {nav}{total !== undefined && <small aria-hidden="true">{total}</small>}</Link>
        ))}
        <Link href={storeRoutes.security} aria-current={current(storeRoutes.security)}><ShieldCheck size={17} aria-hidden="true" /> Seguridad</Link>
      </nav>
      <button className="account-logout" type="button" onClick={async () => {
        try {
          await logout();
          router.push(storeRoutes.home);
        } catch (cause) {
          notify(cause instanceof Error ? cause.message : "No se pudo cerrar la sesión.");
        }
      }}><LogOut size={17} aria-hidden="true" /> Cerrar sesión</button>
    </aside>
  );
}

// La estructura no cambia al resolverse la sesión, así las subpáginas no se vuelven a montar.
export function AccountFrame({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const customer = user?.role === "CLIENT" ? user.customerAccount : undefined;
  return (
    <div className={customer ? "container section account-page account-shell" : undefined}>
      {customer && <AccountSidebar customer={customer} email={user!.email} />}
      <div className={customer ? "account-content" : undefined}>{children}</div>
    </div>
  );
}
