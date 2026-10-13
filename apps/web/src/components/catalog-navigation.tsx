"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Cat,
  ChevronDown,
  Cookie,
  Dog,
  Pill,
  Rabbit,
  Shapes,
  Tractor,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiQueryKey, request, usePublicApi, useSession } from "./providers";
import {
  catalogCategoryKind,
  catalogNavigation,
  type CatalogCategory,
} from "@/lib/catalog-navigation";
import { catalogCardsPath } from "@/lib/catalog-query";
import { storeRoutes } from "@/lib/store-routes";
import type { Entity, ProductCardList } from "@/lib/types";

const categoryIcons = {
  perros: Dog,
  gatos: Cat,
  ganaderia: Tractor,
  "pequenos animales": Rabbit,
  farmacia: Pill,
  "consumo humano": Cookie,
};
const featuredKinds = new Set(["perros", "gatos"]);
const countCategories = (nodes: CatalogCategory[]): number =>
  nodes.reduce((total, node) => total + 1 + countCategories(node.children), 0);
const desktopLimit = 6;

// Dentro de la tarjeta de la especie el sufijo repite el contexto («Alimento para perro» → «Alimento»).
// Solo cambia el texto visible: el enlace conserva el nombre completo como nombre accesible.
export function shortCategoryName(name: string, rootName: string) {
  const kind = catalogCategoryKind(rootName);
  const short =
    kind === "perros" || kind === "gatos"
      ? name.replace(/\s+(para|de)\s+(perros?|gatos?)$/i, "")
      : kind === "farmacia"
        ? name.replace(/^medicamentos\s+(?=para\s)/i, "")
        : name;
  return short ? short.charAt(0).toUpperCase() + short.slice(1) : name;
}

export function CatalogNavigation({
  current,
  mobile = false,
  onNavigate,
}: {
  current: boolean;
  mobile?: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const open = openedFor === pathname;
  const id = useId();
  const root = useRef<HTMLDivElement>(null),
    panel = useRef<HTMLDivElement>(null),
    toggle = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const categories = usePublicApi<Entity[]>("categories/catalog");
  const tree = catalogNavigation(categories.data ?? []);
  const { user, loading } = useSession(),
    client = useQueryClient();

  function show() {
    clearTimeout(closeTimer.current);
    setOpenedFor(pathname);
  }
  function finish() {
    clearTimeout(closeTimer.current);
    setOpenedFor(null);
    onNavigate();
  }
  function prefetch(categoryId: string) {
    if (loading) return;
    const path = catalogCardsPath(new URLSearchParams({ categoryId }));
    void client.prefetchQuery({
      queryKey: apiQueryKey(path, user?.id),
      queryFn: () => request<ProductCardList>(path),
      staleTime: 20_000,
    });
  }
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpenedFor(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpenedFor(null);
      toggle.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  function categoryLink(category: CatalogCategory, className?: string, text: ReactNode = category.name) {
    return (
      <Link
        href={storeRoutes.category(category.id)}
        prefetch={false}
        className={className}
        onClick={finish}
        aria-label={text === category.name ? undefined : category.name}
        aria-current={
          pathname === storeRoutes.category(category.id) ? "page" : undefined
        }
        onMouseEnter={() => prefetch(category.id)}
        onFocus={() => prefetch(category.id)}
      >
        {text}
      </Link>
    );
  }
  function branches(nodes: CatalogCategory[], root?: CatalogCategory) {
    // Escritorio muestra hasta seis subcategorías por tarjeta; celular, todas.
    const extra = root && nodes.length > desktopLimit ? nodes.length - desktopLimit + 1 : 0;
    return (
      <ul>
        {nodes.map((category, index) => (
          <li key={category.id} className={extra && index >= nodes.length - extra ? "catalog-menu-extra" : undefined}>
            {categoryLink(
              category,
              category.children.length ? "catalog-menu-branch" : undefined,
              root ? shortCategoryName(category.name, root.name) : category.name,
            )}
            {category.children.length > 0 && branches(category.children)}
          </li>
        ))}
        {root && extra > 0 && (
          <li className="catalog-menu-more">
            <Link
              href={storeRoutes.category(root.id)}
              prefetch={false}
              onClick={finish}
              aria-label={`Ver ${extra} categorías más de ${root.name}`}
            >
              +{extra} más
            </Link>
          </li>
        )}
      </ul>
    );
  }
  return (
    <div
      ref={root}
      className={`catalog-nav${mobile ? " catalog-nav-mobile" : ""}`}
      onPointerEnter={() => clearTimeout(closeTimer.current)}
      onPointerLeave={() => {
        if (!mobile)
          closeTimer.current = setTimeout(() => setOpenedFor(null), 180);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setOpenedFor(null);
      }}
    >
      <div className="catalog-nav-entry">
        <Link
          href={storeRoutes.products}
          className={current ? "active" : ""}
          aria-current={current ? "page" : undefined}
          onClick={finish}
          onPointerEnter={(event) => {
            if (!mobile && event.pointerType === "mouse") show();
          }}
        >
          Catálogo
        </Link>
        <button
          ref={toggle}
          type="button"
          className="catalog-nav-toggle"
          title="Mostrar categorías del catálogo"
          aria-label="Mostrar categorías del catálogo"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => {
            clearTimeout(closeTimer.current);
            setOpenedFor(open ? null : pathname);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              show();
              requestAnimationFrame(() =>
                panel.current?.querySelector<HTMLAnchorElement>("a")?.focus(),
              );
            }
          }}
        >
          <ChevronDown size={16} />
        </button>
      </div>
      <div
        ref={panel}
        id={id}
        className="catalog-menu"
        role="region"
        aria-label="Categorías del catálogo"
        hidden={!open}
      >
        <div className="catalog-menu-head">
          <p>
            <strong>Catálogo</strong>
            {tree.length > 0 && (
              <span>
                {tree.length} {tree.length === 1 ? "línea" : "líneas"} · {countCategories(tree)} categorías
              </span>
            )}
          </p>
          <Link href={storeRoutes.products} onClick={finish}>
            Ver todo el catálogo <ArrowRight size={16} />
          </Link>
        </div>
        {categories.isError ? (
          <div className="catalog-menu-status" role="alert">
            <span>No se pudieron cargar las categorías.</span>
            <button
              type="button"
              className="text-link"
              onClick={() => void categories.refetch()}
            >
              Reintentar
            </button>
          </div>
        ) : categories.isPending ? (
          <p className="catalog-menu-status" role="status">
            Cargando categorías...
          </p>
        ) : !tree.length ? (
          <p className="catalog-menu-status">No hay categorías disponibles.</p>
        ) : (
          <div className="catalog-menu-grid">
            {tree.map((category) => {
              const Icon =
                categoryIcons[
                  catalogCategoryKind(
                    category.name,
                  ) as keyof typeof categoryIcons
                ] ?? Shapes;
              return (
                <section
                  key={category.id}
                  className="catalog-menu-column"
                  aria-label={category.name}
                  data-featured={featuredKinds.has(catalogCategoryKind(category.name)) || undefined}
                >
                  {categoryLink(
                    category,
                    "catalog-menu-root",
                    <>
                      <Icon size={26} strokeWidth={1.8} aria-hidden="true" />
                      <span>{category.name}</span>
                    </>,
                  )}
                  {category.children.length > 0 && branches(category.children, category)}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
