"use client";

import { RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { staffStatusOptions } from "@/lib/admin-list-filters";

export function AdminListFilters({ children, active, onClear }: { children: ReactNode; active: boolean; onClear: () => void }) {
  return <div className="admin-list-filters">
    {children}
    <button className="icon-button" type="button" title="Limpiar filtros" aria-label="Limpiar filtros" disabled={!active} onClick={onClear}><RotateCcw size={17} /></button>
  </div>;
}

export function StaffStatusFilter({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className="field">Estado<select className="form-input" aria-label="Filtrar por estado" value={value} onChange={(event) => onChange(event.target.value)}>
    <option value="">Todos los estados</option>
    {staffStatusOptions.map(([key, title]) => <option key={key} value={key}>{title}</option>)}
  </select></label>;
}

export function ListPagination({ meta, onPage }: { meta: { total: number; page: number; limit: number }; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(meta.total / meta.limit));
  return <div className="pagination">
    {pages > 1 && <button type="button" className="button small secondary" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>Anterior</button>}
    <span>{meta.total} registros{pages > 1 ? ` · Página ${meta.page} de ${pages}` : ""}</span>
    {pages > 1 && <button type="button" className="button small secondary" disabled={meta.page >= pages} onClick={() => onPage(meta.page + 1)}>Siguiente</button>}
  </div>;
}
