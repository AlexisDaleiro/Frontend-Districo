"use client";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { Search } from "lucide-react";
import { useApi } from "./providers";
import { storeRoutes } from "@/lib/store-routes";

export function CatalogSearch({
  value,
  filters,
  onSearch,
  onPreview,
}: {
  value: string;
  filters: string;
  onSearch: (value: string) => void;
  onPreview?: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value),
    [term, setTerm] = useState(""),
    [open, setOpen] = useState(false),
    [active, setActive] = useState(-1);
  const listId = useId();
  useEffect(() => {
    const timer = setTimeout(() => setTerm(draft.trim()), 250);
    return () => clearTimeout(timer);
  }, [draft]);
  const query = new URLSearchParams(filters);
  query.set("search", term);
  query.delete("page");
  query.set("limit", "6");
  query.delete("includeVariants");
  const q = useApi<{ items: { id: string; slug: string; name: string }[] }>(
    `products/suggestions?${query}`,
    open && term.length >= 2,
  );
  const items = term === draft.trim() ? (q.data?.items ?? []) : [];
  return (
    <div className="catalog-search-control">
      <form
        className="inline-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          setOpen(false);
          onSearch(draft.trim());
        }}
      >
        <input
          className="form-input"
          name="search"
          type="search"
          maxLength={120}
          aria-label="Buscar en el catálogo"
          placeholder="Nombre, marca o SKU"
          value={draft}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && items.length > 0}
          aria-controls={listId}
          aria-activedescendant={
            active >= 0 && items[active] ? `${listId}-${active}` : undefined
          }
          onFocus={() => setOpen(true)}
          onBlur={(event) => {
            if (
              !event.currentTarget
                .closest(".catalog-search-control")
                ?.contains(event.relatedTarget)
            )
              setOpen(false);
          }}
          onChange={(event) => {
            setDraft(event.target.value);
            setActive(-1);
            setOpen(true);
            onPreview?.(event.target.value.trim());
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              setActive(-1);
            }
            if (items.length && ["ArrowDown", "ArrowUp"].includes(event.key)) {
              event.preventDefault();
              setActive(
                (index) =>
                  (index +
                    (event.key === "ArrowDown" ? 1 : -1) +
                    items.length) %
                  items.length,
              );
            }
            if (event.key === "Enter" && open && active >= 0 && items[active]) {
              event.preventDefault();
              document
                .getElementById(`${listId}-${active}`)
                ?.querySelector<HTMLAnchorElement>("a")
                ?.click();
            }
          }}
        />
        <button
          className="icon-button"
          type="submit"
          title="Buscar productos"
          aria-label="Buscar productos"
        >
          <Search size={18} />
        </button>
      </form>
      {open && items.length > 0 && (
        <ul
          className="catalog-search-results"
          role="listbox"
          id={listId}
          aria-label="Productos sugeridos"
        >
          {items.map((item, index) => (
            <li
              id={`${listId}-${index}`}
              role="option"
              aria-selected={active === index}
              key={item.id}
            >
              <Link
                href={storeRoutes.product(item.slug)}
                onClick={() => setOpen(false)}
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
