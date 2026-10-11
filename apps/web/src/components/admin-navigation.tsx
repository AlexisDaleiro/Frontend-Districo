"use client";

import Link, { useLinkStatus } from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  BadgePercent, BriefcaseBusiness, Cable, ClipboardList, FolderTree, Images,
  Inbox, LayoutDashboard, ListChecks, LogOut, Menu, Package, ShieldCheck,
  Sparkles, Tags, UserPlus, Users, type LucideIcon,
} from "lucide-react";
import { AdminCommandMenu } from "./admin-command-menu";
import { useApi, useSession } from "./providers";
import { ErrorBox } from "./ui";
import { canSeeAdminSection } from "@/lib/staff-access";
import { storeRoutes } from "@/lib/store-routes";

export const adminSections: [string, string, string, LucideIcon, string?][] = [
  ["Operación", "", "Resumen", LayoutDashboard],
  ["Operación", "consultas", "Consultas", Inbox, "newContactInquiries"],
  ["Operación", "solicitudes", "Solicitudes", UserPlus, "pendingApplications"],
  ["Operación", "clientes", "Clientes", Users],
  ["Operación", "vendedores", "Vendedores", BriefcaseBusiness],
  ["Operación", "pedidos", "Pedidos", ClipboardList, "pendingReviewOrders"],
  ["Catálogo", "catalogo", "Catálogo", Package],
  ["Catálogo", "marcas", "Marcas y laboratorios", Tags],
  ["Catálogo", "categorias", "Categorías", FolderTree],
  ["Marketing", "promociones", "Promociones", BadgePercent],
  ["Marketing", "banners", "Banners", Images],
  ["Marketing", "recomendaciones", "Recomendaciones", Sparkles],
  ["Institucional", "ofertas-laborales", "Ofertas laborales", BriefcaseBusiness],
  ["Acceso", "personal", "Personal", ShieldCheck],
  ["Acceso", "roles", "Roles", ListChecks],
  ["Configuración", "integraciones", "Integraciones", Cable],
];
const groups = [...new Set(adminSections.map(([group]) => group))];

function LinkStatus() {
  const { pending } = useLinkStatus();
  return <span className="admin-link-pending" data-pending={pending} hidden={!pending} aria-hidden="true" />;
}

export function AdminNav({ section, email }: { section: string; email?: string }) {
  const { logout, user } = useSession();
  const counts = useApi<Record<string, number>>("admin/dashboard", canSeeAdminSection(user, ""));
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<unknown>();
  const nav = useRef<HTMLElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try { setCollapsed(window.localStorage.getItem("districo-admin-nav-collapsed") === "true"); }
      catch { /* The preference is optional. */ }
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { window.localStorage.setItem("districo-admin-nav-collapsed", String(next)); }
    catch { /* The preference is optional. */ }
  };
  useEffect(() => {
    const strip = nav.current;
    const active = strip?.querySelector<HTMLElement>("a.active");
    if (!strip || !active || strip.scrollWidth <= strip.clientWidth) return;
    strip.scrollLeft = active.offsetLeft - (strip.clientWidth - active.offsetWidth) / 2;
  }, [section]);
  useLayoutEffect(() => {
    const strip = nav.current, mark = indicator.current;
    if (!strip || !mark) return;
    const place = () => {
      const active = strip.querySelector<HTMLElement>("a.active");
      mark.hidden = !active;
      if (!active) return;
      mark.style.setProperty("--indicator-x", `${active.offsetLeft}px`);
      mark.style.setProperty("--indicator-y", `${active.offsetTop}px`);
      mark.style.setProperty("--indicator-width", `${active.offsetWidth}px`);
      mark.style.setProperty("--indicator-height", `${active.offsetHeight}px`);
    };
    place();
    const ready = requestAnimationFrame(() => { mark.dataset.ready = "true"; });
    const resize = new ResizeObserver(place);
    resize.observe(strip);
    return () => { cancelAnimationFrame(ready); resize.disconnect(); };
  }, [section, counts.data, collapsed]);
  return <aside className="admin-sidebar" data-collapsed={collapsed}>
    <div className="admin-sidebar-head">
      <div className="admin-sidebar-identity"><strong>Administración</strong>{email && <span>{email}</span>}</div>
      <button type="button" className="admin-sidebar-toggle" aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
        title={collapsed ? "Expandir menú" : "Contraer menú"} aria-expanded={!collapsed} aria-controls="admin-navigation" onClick={toggleCollapsed}><Menu size={20} /></button>
    </div>
    <AdminCommandMenu />
    <nav className="admin-nav" aria-label="Administración" id="admin-navigation" ref={nav}>
      <span className="admin-nav-indicator" ref={indicator} aria-hidden="true" />
      {groups.filter((group) => adminSections.some(([g, path]) => g === group && canSeeAdminSection(user, path))).map((group) => <div className="admin-nav-group" key={group}>
        <p>{group}</p>
        {adminSections.filter(([g, path]) => g === group && canSeeAdminSection(user, path)).map(([, path, title, Icon, countKey]) => {
          const visibleTitle = user?.role === "SALES" && path === "clientes" ? "Clientes asignados" : user?.role === "SALES" && path === "pedidos" ? "Pedidos asignados" : title;
          const count = countKey && !(user?.role === "SALES" && path === "pedidos") ? counts.data?.[countKey] ?? 0 : 0;
          return <Link className={section === path ? "active" : ""} aria-current={section === path ? "page" : undefined}
            aria-label={visibleTitle} title={collapsed ? visibleTitle : undefined} href={storeRoutes.adminSection(path)} prefetch={true} key={path}>
            <Icon size={17} aria-hidden="true" /><span>{visibleTitle}</span>
            {count > 0 && <em className="admin-nav-count" aria-label={`${count} pendientes`}>{count}</em>}
            <LinkStatus />
          </Link>;
        })}
      </div>)}
    </nav>
    <div className="admin-sidebar-footer">
      <Link className="admin-logout" href={storeRoutes.security} title="Seguridad de mi cuenta" aria-label="Seguridad de mi cuenta"><ShieldCheck size={17} /><span>Seguridad</span></Link>
      <button type="button" className="admin-logout" aria-label="Cerrar sesión" title="Cerrar sesión" disabled={loggingOut} onClick={async () => {
        setLoggingOut(true); setLogoutError(undefined);
        try { await logout(); router.replace(storeRoutes.login); }
        catch (error) { setLogoutError(error); }
        finally { setLoggingOut(false); }
      }}><LogOut size={17} aria-hidden="true" /><span>{loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}</span></button>
      {logoutError !== undefined && <ErrorBox error={logoutError} />}
    </div>
  </aside>;
}
