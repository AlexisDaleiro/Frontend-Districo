"use client";

import type { ReactNode } from "react";

export function CatalogPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const visiblePages = [...new Set([1, page - 1, page, page + 1, totalPages])]
    .filter((target) => target >= 1 && target <= totalPages)
    .sort((a, b) => a - b);
  const pageItems: ReactNode[] = [];

  visiblePages.forEach((target, index) => {
    const previous = visiblePages[index - 1];
    if (previous && target - previous === 2) {
      pageItems.push(
        <button
          key={previous + 1}
          type="button"
          className="pagination-page"
          aria-label={`Ir a la página ${previous + 1}`}
          onClick={() => onPageChange(previous + 1)}
        >
          {previous + 1}
        </button>,
      );
    } else if (previous && target - previous > 2) {
      const jumpTarget =
        target <= page
          ? Math.max(previous + 1, page - 5)
          : Math.min(target - 1, page + 5);
      pageItems.push(
        <button
          key={`gap-${previous}`}
          type="button"
          className="pagination-gap"
          aria-label={`Saltar a la página ${jumpTarget}`}
          onClick={() => onPageChange(jumpTarget)}
        >
          …
        </button>,
      );
    }

    pageItems.push(
      target === page ? (
        <span
          key={target}
          className="pagination-current"
          aria-current="page"
          aria-label={`Página ${page} de ${totalPages}`}
        >
          {target}
        </span>
      ) : (
        <button
          key={target}
          type="button"
          className="pagination-page"
          aria-label={`Ir a la página ${target}`}
          onClick={() => onPageChange(target)}
        >
          {target}
        </button>
      ),
    );
  });

  return (
    <nav
      className="pagination catalog-pagination"
      aria-label="Páginas del catálogo"
    >
      <button
        type="button"
        className="catalog-pagination-direction"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        ← Anterior
      </button>
      <div className="pagination-pages">{pageItems}</div>
      <button
        type="button"
        className="catalog-pagination-direction"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Siguiente →
      </button>
    </nav>
  );
}
