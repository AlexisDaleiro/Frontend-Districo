"use client";
import { ShareAdminList, useAdminListField, useAdminListScroll } from "./admin-list-navigation";

import { useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { request, useApi, useSession } from "./providers";
import { invalidateAdminMutation } from "@/lib/admin-query-invalidation";
import { Empty, ErrorBox, Loading, Modal, Picture } from "./ui";
import { AdminCategoryEditor } from "./admin-category-editor";
import type { Editor, Field } from "./admin-form";
import type { Entity } from "@/lib/types";
import { canEditAdminFeature } from "@/lib/staff-access";
import { filterDirectory } from "@/lib/entity-directory";
import { salesLineLabel, salesLineOptions } from "@/lib/sales-line";

type OpenEditor = (editor: Editor) => void;
type CategoryNode = Entity & { children: CategoryNode[] };

const nameFields: Field[] = [
  { key: "name", label: "Nombre", required: true },
  { key: "slug", label: "Identificador en la URL" },
];

function LogoUploadButton({ item, busy, onFile }: { item: Entity; busy: boolean; onFile: (file?: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return <>
    <button className="icon-button" type="button" disabled={busy} title={`${item.imageUrl ? "Cambiar" : "Subir"} logo de ${item.name}`} aria-label={`${item.imageUrl ? "Cambiar" : "Subir"} logo de ${item.name}`} onClick={() => input.current?.click()}><ImagePlus size={16} /></button>
    <input ref={input} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => { onFile(event.target.files?.[0]); event.target.value = ""; }} />
  </>;
}

function EntityDirectory({ path, title, edit }: { path: "brands" | "laboratories"; title: string; edit: OpenEditor }) {
  const q = useApi<Entity[]>(`${path}/admin`);
  const [search, setSearch] = useAdminListField(`${path}Search`, "");
  const [status, setStatus] = useAdminListField(`${path}Status`, "", ["active", "inactive"]);
  const [logo, setLogo] = useAdminListField(`${path}Logo`, "", ["with", "without"]);
  const [sort, setSort] = useAdminListField(`${path}Sort`, "asc", ["asc", "desc"]);
  const [salesLine, setSalesLine] = useAdminListField(`${path}Line`, "", [...salesLineOptions.map((option) => option.value), "unclassified"]);
  const items = filterDirectory(q.data ?? [], search, status, logo, sort, path === "brands" ? salesLine : "");
  const fields: Field[] = path === "brands" ? [...nameFields, {
    key: "salesLine", label: "Línea de venta", type: "select", required: true, options: salesLineOptions,
  }] : nameFields;
  const client = useQueryClient();
  const { notify, user } = useSession();
  const canEdit = canEditAdminFeature(user, "marcas");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>();
  async function upload(item: Entity, file?: File) {
    if (!file) return;
    if (file.size === 0 || file.size > 5_000_000) { setError(new Error("El logo debe pesar menos de 5 MB.")); return; }
    const form = new FormData();
    form.set("file", file);
    setBusy(item.id);
    setError(undefined);
    try {
      await request(`${path}/${item.id}/logo`, "POST", form);
      await invalidateAdminMutation(client, path);
      notify("Logo guardado.");
    } catch (cause) { setError(cause); }
    finally { setBusy(null); }
  }
  async function removeLogo(item: Entity) {
    if (!window.confirm(`¿Quitar el logo de ${item.name}?`)) return;
    setBusy(item.id);
    setError(undefined);
    try {
      await request(`${path}/${item.id}/logo`, "DELETE");
      await invalidateAdminMutation(client, path);
      notify("Logo quitado.");
    } catch (cause) { setError(cause); }
    finally { setBusy(null); }
  }
  async function remove(item: Entity) {
    if (!window.confirm(`¿Eliminar ${item.name}? Esta acción no se puede deshacer.`)) return;
    setBusy(item.id);
    setError(undefined);
    try {
      await request(`${path}/${item.id}`, "DELETE");
      await invalidateAdminMutation(client, path);
      notify(`${path === "brands" ? "Marca" : "Laboratorio"} eliminado.`);
    } catch (cause) { setError(cause); }
    finally { setBusy(null); }
  }
  return <section className="admin-directory">
    <div className="admin-toolbar">
      <h2>{title}</h2>
      {canEdit && <button className="button small" onClick={() => edit({ title: `Crear ${title.toLowerCase()}`, path, fields })}>
        <Plus size={16} /> Crear
      </button>}
    </div>
    <div className={`admin-directory-filters${path === "brands" ? " admin-directory-filters-brands" : ""}`}>
      <input className="form-input" aria-label={`Buscar ${title.toLowerCase()}`} placeholder={`Buscar ${title.toLowerCase()}`} value={search} onChange={(event) => setSearch(event.target.value)} />
      <select className="form-input" aria-label={`Estado de ${title.toLowerCase()}`} value={status} onChange={(event) => setStatus(event.target.value)}>
        <option value="">Todos los estados</option><option value="active">Activos</option><option value="inactive">Inactivos</option>
      </select>
      <select className="form-input" aria-label={`Logo de ${title.toLowerCase()}`} value={logo} onChange={(event) => setLogo(event.target.value)}>
        <option value="">Todos los logos</option><option value="with">Con logo</option><option value="without">Sin logo</option>
      </select>
      <select className="form-input" aria-label={`Orden de ${title.toLowerCase()}`} value={sort} onChange={(event) => setSort(event.target.value)}>
        <option value="asc">Nombre A-Z</option><option value="desc">Nombre Z-A</option>
      </select>
      {path === "brands" && <select className="form-input" aria-label="Línea de marcas" value={salesLine} onChange={(event) => setSalesLine(event.target.value)}>
        <option value="">Todas las líneas</option>{salesLineOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}<option value="unclassified">Sin clasificar</option>
      </select>}
    </div>
    {!q.isPending && !q.error && <p className="small-copy muted">{items.length} de {q.data?.length ?? 0}</p>}
    {error ? <ErrorBox error={error} /> : null}
    {q.isPending ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={() => void q.refetch()} /> : !items.length ?
      <Empty title={q.data.length ? "No hay resultados para estos filtros" : `Todavía no hay ${title.toLowerCase()}`} /> :
      <div className="admin-directory-list">{items.map((item) =>
        <div className="admin-directory-row" key={item.id}>
          {item.imageUrl ? <Picture className="admin-directory-logo" src={item.imageUrl} alt={item.name} sizes="42px" /> : <span className="admin-directory-logo admin-directory-logo-empty" aria-hidden="true" />}
          <span>{item.name}{path === "brands" && <> <span className="status-pill">{salesLineLabel(item.salesLine) ?? "Sin clasificar"}</span></>}{item.active === false && <> <span className="status-pill">Inactivo</span></>}</span>
          {canEdit && <div className="actions">
          <LogoUploadButton item={item} busy={busy === item.id} onFile={(file) => { void upload(item, file); }} />
          {item.imageUrl && <button className="icon-button" disabled={busy === item.id} title={`Quitar logo de ${item.name}`} aria-label={`Quitar logo de ${item.name}`} onClick={() => void removeLogo(item)}><Trash2 size={16} /></button>}
          <button className="icon-button" title={`Editar ${item.name}`} aria-label={`Editar ${item.name}`} onClick={() => edit({
            title: `Editar ${item.name}`, path: `${path}/${item.id}`, method: "PATCH", fields: [...fields, { key: "active", label: "Activo", type: "checkbox" }], initial: { ...item, active: item.active !== false },
          })}><Pencil size={16} /></button>
          <button className="icon-button" disabled={busy === item.id} title={`Eliminar ${item.name}`} aria-label={`Eliminar ${item.name}`} onClick={() => void remove(item)}><Trash2 size={16} /></button>
          </div>}
        </div>)}</div>}
  </section>;
}

export function AdminBrandsLabs({ edit }: { edit: OpenEditor }) {
  return <div className="stack admin-directories">
    <div className="admin-toolbar"><ShareAdminList /></div>
    <EntityDirectory path="brands" title="Marcas" edit={edit} />
    <EntityDirectory path="laboratories" title="Laboratorios" edit={edit} />
  </div>;
}

export function categoryForest(items: Entity[]): CategoryNode[] {
  const nodes = new Map(items.map((item) => [item.id, { ...item, children: [] as CategoryNode[] }]));
  const roots: CategoryNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId && nodes.get(node.parentId);
    if (parent && parent !== node) parent.children.push(node);
    else roots.push(node);
  }
  const sort = (branches: CategoryNode[]) => {
    branches.sort((a, b) => a.name.localeCompare(b.name, "es"));
    branches.forEach((branch) => sort(branch.children));
  };
  sort(roots);
  return roots;
}

function descendants(node: CategoryNode): Set<string> {
  return new Set([node.id, ...node.children.flatMap((child) => [...descendants(child)])]);
}

export function AdminCategories({ edit }: { edit: OpenEditor }) {
  const q = useApi<Entity[]>("categories/admin");
  const client = useQueryClient();
  const { notify, user } = useSession();
  const canEdit = canEditAdminFeature(user, "categorias");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useAdminListField("search", "");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<unknown>();
  const [editingCategory, setEditingCategory] = useState<CategoryNode | null>(null);
  useAdminListScroll(!q.isPending && !q.error);
  if (q.isPending) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} retry={() => void q.refetch()} />;
  const forest = categoryForest(q.data);
  const term = search.trim().toLocaleLowerCase("es");
  const matches = (node: CategoryNode): boolean =>
    !term || node.name.toLocaleLowerCase("es").includes(term) || node.children.some(matches);
  const fieldsFor = (node?: CategoryNode): Field[] => {
    const excluded = node ? descendants(node) : new Set<string>();
    return [...nameFields, {
      key: "parentId", label: "Categoría superior", type: "select", allowEmpty: true,
      options: q.data.filter((item) => !excluded.has(item.id)).map((item) => ({ value: item.id, label: item.name })),
    }, { key: "active", label: "Visible en la tienda", type: "checkbox" }];
  };
  const openEditor = (node?: CategoryNode, parentId?: string) => {
    if (node) { setEditingCategory(node); return; }
    edit({
      title: parentId ? "Crear subcategoría" : "Crear categoría",
      path: "categories",
      method: "POST",
      fields: fieldsFor(),
      initial: { parentId: parentId ?? "", active: true },
      transform: (data) => ({ ...data, parentId: data.parentId || null }),
    });
  };
  const toggle = (id: string) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  async function setActive(node: CategoryNode, active: boolean) {
    setBusyId(node.id);
    setError(undefined);
    try {
      await request(`categories/${node.id}`, "PATCH", { active });
      await invalidateAdminMutation(client, "categories");
      notify(active ? "Categoría activada." : "Categoría desactivada.");
    } catch (cause) { setError(cause); }
    finally { setBusyId(null); }
  }
  const excludedCategoryIds = editingCategory ? descendants(editingCategory) : new Set<string>();
  const render = (nodes: CategoryNode[], depth = 0): ReactNode => <ul className="admin-category-list">
    {nodes.filter(matches).map((node) => {
      const hasChildren = node.children.length > 0;
      const open = !!term || expanded.has(node.id);
      return <li key={node.id}>
        <div className="admin-category-row" style={{ paddingLeft: `${12 + depth * 20}px` }}>
          {hasChildren ? <button className="icon-button" aria-expanded={open} aria-label={`${open ? "Cerrar" : "Abrir"} ${node.name}`} title={`${open ? "Cerrar" : "Abrir"} ${node.name}`} onClick={() => toggle(node.id)}>
            {open ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
          </button> : <span className="admin-category-spacer" />}
          <span className="admin-category-name">{node.name}</span>
          {node.active === false && <span className="status-pill" data-status="INACTIVE">Inactiva</span>}
          {hasChildren && <span className="muted small-copy">{node.children.length}</span>}
          {canEdit && <label className="admin-category-active" title={`Visible en la tienda: ${node.name}`}>
            <input type="checkbox" aria-label={`Visible en la tienda: ${node.name}`} checked={node.active !== false} disabled={busyId === node.id} onChange={(event) => void setActive(node, event.target.checked)} />
          </label>}
          {canEdit && <button className="icon-button" title={`Agregar subcategoría a ${node.name}`} aria-label={`Agregar subcategoría a ${node.name}`} onClick={() => openEditor(undefined, node.id)}><Plus size={16} /></button>}
          {canEdit && <button className="icon-button" title={`Editar ${node.name}`} aria-label={`Editar ${node.name}`} onClick={() => openEditor(node)}><Pencil size={16} /></button>}
        </div>
        {hasChildren && open && render(node.children, depth + 1)}
      </li>;
    })}
  </ul>;
  return <section>
    <div className="admin-toolbar">
      <h2>Árbol de categorías</h2>
      <ShareAdminList />
      {canEdit && <button className="button small" onClick={() => openEditor()}><Plus size={16} /> Nueva categoría</button>}
    </div>
    <input className="form-input admin-category-search" aria-label="Buscar categorías" placeholder="Buscar categoría" value={search} onChange={(event) => setSearch(event.target.value)} />
    {error !== undefined && <ErrorBox error={error} />}
    {!forest.length ? <Empty title="Todavía no hay categorías" /> : term && !forest.some(matches) ? <Empty title="No hay categorías que coincidan" /> : render(forest)}
    <Modal open={!!editingCategory} onClose={() => setEditingCategory(null)} title={editingCategory ? `Editar ${editingCategory.name}` : ""} className="admin-category-editor-modal">
      {editingCategory && <AdminCategoryEditor key={editingCategory.id} category={editingCategory}
        parentOptions={q.data.filter((item) => !excludedCategoryIds.has(item.id))}
        onClose={() => setEditingCategory(null)}
        onRenamed={(name) => setEditingCategory((current) => current ? { ...current, name } : null)} />}
    </Modal>
  </section>;
}
