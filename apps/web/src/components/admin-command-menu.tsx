"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, UserRound, Package, ShoppingBag, ArrowRight } from "lucide-react";
import { useApi, useSession } from "./providers";
import { Modal } from "./ui";
import { canEditAdminFeature, canSeeAdminSection, canViewAdminFeature, isStaff } from "@/lib/staff-access";
import { storeRoutes } from "@/lib/store-routes";
import { label } from "@/lib/commerce";
import { shortcutForm, submitShortcutForm, type AdminSearchResult } from "@/lib/admin-tools";

export function AdminCommandMenu() {
  const { user, notify } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const visible = isStaff(user);
  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (!visible) return;
    const onKey = (event: KeyboardEvent) => {
      if ((!event.ctrlKey && !event.metaKey) || event.altKey || event.isComposing) return;
      if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (event.repeat || document.querySelector('dialog[open]:not(.admin-command-dialog):not([data-closing])')) return;
        setOpen((value) => !value);
      } else if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (event.repeat) return;
        const form = shortcutForm(document);
        if (!form || !submitShortcutForm(form)) notify("Seleccioná un formulario editable con cambios para guardar.");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, notify]);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);
  const q = useApi<AdminSearchResult>(`admin/search?search=${encodeURIComponent(term)}`, visible && open && term.length >= 2);
  const routes = [
    ["clientes", user?.role === "SALES" ? "Clientes asignados" : "Clientes", UserRound],
    ["pedidos", user?.role === "SALES" ? "Pedidos asignados" : "Pedidos", ShoppingBag],
    ["catalogo", "Catálogo", Package], ["vendedores", "Vendedores", UserRound],
    ["solicitudes", "Solicitudes", UserRound], ["personal", "Personal", UserRound], ["roles", "Roles", UserRound],
  ] as const;
  const shortcuts = routes.filter(([section, title]) => canSeeAdminSection(user, section) &&
    (!search.trim() || title.toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es"))))
    .map(([section, title, Icon]) => ({ id: `section-${section}`, name: title, detail: "Abrir sección", href: storeRoutes.adminSection(section), Icon }));
  // Never retain results from a previous term or expose a group whose access changed.
  const data = term === search.trim() && !q.isFetching && !q.error ? q.data : undefined;
  const results = [
    ...(canViewAdminFeature(user, "clientes") ? data?.customers ?? [] : []).map((item) => ({ id: `customer-${item.id}`, name: item.businessName,
      detail: `${item.rut} · ${item.email}`, href: storeRoutes.adminCustomer(item.id), Icon: UserRound })),
    ...(canViewAdminFeature(user, "pedidos") ? data?.orders ?? [] : []).map((item) => ({ id: `order-${item.id}`, name: item.orderNumber,
      detail: `${item.customerAccount?.businessName ?? item.user.email} · ${label(item.status)}`, href: storeRoutes.adminOrder(item.id), Icon: ShoppingBag })),
    ...(canViewAdminFeature(user, "catalogo") ? data?.products ?? [] : []).map((item) => ({ id: `product-${item.id}`, name: item.name,
      detail: item.active ? "Producto activo" : "Producto inactivo", href: canEditAdminFeature(user, "catalogo") ? storeRoutes.adminProduct(item.slug) : storeRoutes.adminProductPreview(item.slug), Icon: Package })),
    ...shortcuts,
  ];
  const activeIndex = Math.min(active, Math.max(0, results.length - 1));
  const activeResultId = results[activeIndex]?.id;
  useEffect(() => {
    if (open && activeResultId) document.getElementById(`command-${activeResultId}`)?.scrollIntoView({ block: "nearest" });
  }, [open, activeResultId]);
  function close() { setOpen(false); setSearch(""); setTerm(""); setActive(0); }
  function navigate(href: string) { close(); router.push(href); }
  if (!visible) return null;
  return <>
    <button className="admin-command-trigger" type="button" title="Buscar en administración (Ctrl+K)" aria-label="Buscar en administración" onClick={() => setOpen(true)}>
      <Search size={18} /><span>Buscar</span>
    </button>
    <Modal open={open} onClose={close} title="Buscar en administración" className="admin-command-dialog">
      <input ref={input} className="form-input" type="search" role="combobox" aria-label="Buscar clientes, pedidos o productos" aria-autocomplete="list"
        aria-controls="admin-command-results" aria-expanded="true" aria-activedescendant={results[activeIndex] ? `command-${results[activeIndex].id}` : undefined}
        placeholder="Cliente, correo, pedido, producto o SKU" maxLength={120} value={search}
        onChange={(event) => { setSearch(event.target.value); setActive(0); }}
        onKeyDown={(event) => {
          if (event.key === "Escape") { event.preventDefault(); close(); }
          else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault(); setActive((value) => results.length ? (Math.min(value, results.length - 1) + (event.key === "ArrowDown" ? 1 : results.length - 1)) % results.length : 0);
          } else if (event.key === "Enter" && results[activeIndex]) { event.preventDefault(); navigate(results[activeIndex].href); }
        }} />
      <div role="status" aria-live="polite">
        {search.trim().length >= 2 && (term !== search.trim() || q.isFetching) && <p className="muted small-copy">Buscando…</p>}
        {q.error && term === search.trim() && <p className="error">No se pudo buscar. <button className="text-link" type="button" onClick={() => void q.refetch()}>Reintentar</button></p>}
        {term.length >= 2 && data && !results.length && <p className="muted">No hay resultados.</p>}
      </div>
      <div id="admin-command-results" role="listbox" aria-label="Resultados" className="admin-command-results">
        {results.map((item, index) => <button id={`command-${item.id}`} type="button" role="option" aria-selected={index === activeIndex} key={item.id}
          className="admin-command-result" onMouseEnter={() => setActive(index)} onClick={() => navigate(item.href)}>
          <item.Icon size={18} aria-hidden="true" /><span><strong>{item.name}</strong><small>{item.detail}</small></span><ArrowRight size={16} aria-hidden="true" />
        </button>)}
      </div>
    </Modal>
  </>;
}
