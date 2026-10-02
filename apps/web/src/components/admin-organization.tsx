"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus } from "lucide-react";
import { useApi } from "./providers";
import { Empty, ErrorBox, Loading } from "./ui";
import type { Editor, Field } from "./admin-form";
import type { Entity } from "@/lib/types";

type OpenEditor = (editor: Editor) => void;
type CategoryNode = Entity & { children: CategoryNode[] };

const nameFields: Field[] = [
  { key: "name", label: "Nombre", required: true },
  { key: "slug", label: "Identificador en la URL" },
];

function EntityDirectory({ path, title, edit }: { path: "brands" | "laboratories"; title: string; edit: OpenEditor }) {
  const q = useApi<Entity[]>(path);
  return <section className="admin-directory">
    <div className="admin-toolbar">
      <h2>{title}</h2>
      <button className="button small" onClick={() => edit({ title: `Crear ${title.toLowerCase()}`, path, fields: nameFields })}>
        <Plus size={16} /> Crear
      </button>
    </div>
    {q.isPending ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={() => void q.refetch()} /> : !q.data.length ?
      <Empty title={`Todavía no hay ${title.toLowerCase()}`} /> :
      <div className="admin-directory-list">{q.data.map((item) =>
        <div className="admin-directory-row" key={item.id}>
          <span>{item.name}</span>
          <button className="icon-button" title={`Editar ${item.name}`} aria-label={`Editar ${item.name}`} onClick={() => edit({
            title: `Editar ${item.name}`, path: `${path}/${item.id}`, method: "PATCH", fields: nameFields, initial: { ...item },
          })}><Pencil size={16} /></button>
        </div>)}</div>}
  </section>;
}

export function AdminBrandsLabs({ edit }: { edit: OpenEditor }) {
  return <div className="stack admin-directories">
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
  const q = useApi<Entity[]>("categories/catalog");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
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
    }];
  };
  const openEditor = (node?: CategoryNode, parentId?: string) => edit({
    title: node ? `Editar ${node.name}` : parentId ? "Crear subcategoría" : "Crear categoría",
    path: node ? `categories/${node.id}` : "categories",
    method: node ? "PATCH" : "POST",
    fields: fieldsFor(node),
    initial: node ? { ...node } : { parentId: parentId ?? "" },
    transform: (data) => ({ ...data, parentId: data.parentId || null }),
  });
  const toggle = (id: string) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
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
          {hasChildren && <span className="muted small-copy">{node.children.length}</span>}
          <button className="icon-button" title={`Agregar subcategoría a ${node.name}`} aria-label={`Agregar subcategoría a ${node.name}`} onClick={() => openEditor(undefined, node.id)}><Plus size={16} /></button>
          <button className="icon-button" title={`Editar ${node.name}`} aria-label={`Editar ${node.name}`} onClick={() => openEditor(node)}><Pencil size={16} /></button>
        </div>
        {hasChildren && open && render(node.children, depth + 1)}
      </li>;
    })}
  </ul>;
  return <section>
    <div className="admin-toolbar">
      <h2>Árbol de categorías</h2>
      <button className="button small" onClick={() => openEditor()}><Plus size={16} /> Nueva categoría</button>
    </div>
    <input className="form-input admin-category-search" aria-label="Buscar categorías" placeholder="Buscar categoría" value={search} onChange={(event) => setSearch(event.target.value)} />
    {!forest.length ? <Empty title="Todavía no hay categorías" /> : term && !forest.some(matches) ? <Empty title="No hay categorías que coincidan" /> : render(forest)}
  </section>;
}
