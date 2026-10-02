"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, Pencil, Layers3, Images } from "lucide-react";
import { AccessGate } from "./auth";
import { AdminNav, VariantManagement } from "./admin";
import { AdminProductImages } from "./admin-product-images";
import { AdminForm, type Editor } from "./admin-form";
import { useApi, useSession } from "./providers";
import { Empty, ErrorBox, Loading, Modal, PageHeading, Picture } from "./ui";
import { adminProductEditor } from "@/lib/admin-product-editor";
import { money } from "@/lib/commerce";
import { canSeeAdminSection } from "@/lib/staff-access";
import { storeRoutes } from "@/lib/store-routes";
import type { Entity, Product } from "@/lib/types";

export function AdminProductPage({ slug }: { slug: string }) {
  const router = useRouter();
  const { user } = useSession();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const product = useApi<Product>(`products/admin/${slug}`);
  const brands = useApi<Entity[]>("brands");
  const categories = useApi<Entity[]>("categories/catalog");
  const laboratories = useApi<Entity[]>("laboratories");

  useEffect(() => {
    if (!product.data || !window.location.hash) return;
    const id = window.location.hash.slice(1);
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
  }, [product.data]);

  const catalog = storeRoutes.adminSection("catalogo");
  const item = product.data;
  const image = item?.media.find((media) => media.type === "IMAGE" && media.isPrimary)
    ?? item?.media.find((media) => media.type === "IMAGE");
  const activeVariants = item?.variants.filter((variant) => variant.active !== false) ?? [];
  const availableStock = activeVariants.reduce((total, variant) => total + variant.availableStock, 0);

  return (
    <div className="container admin-page section">
      <AccessGate admin>
        <div className="admin-shell">
          <AdminNav section="catalogo" email={user?.email} role={user?.role} />
          <div className="admin-main admin-product-page">
            {!canSeeAdminSection(user?.role, "catalogo") ? (
              <Empty title="No tenés acceso a esta sección" />
            ) : product.isPending ? (
              <Loading />
            ) : product.error ? (
              <ErrorBox error={product.error} retry={() => void product.refetch()} />
            ) : item ? (
              <>
                <Link className="text-link admin-product-back" href={catalog}>
                  <ArrowLeft size={17} /> Volver al catálogo
                </Link>
                <PageHeading eyebrow="DISTRICO · Administración" title={item.name}>
                  {item.slug}
                </PageHeading>
                <div className="admin-product-toolbar">
                  <span className="status-pill">{item.active === false ? "Inactivo" : "Activo"}</span>
                  <button
                    type="button"
                    className="icon-button admin-preview-toggle"
                    title={previewOpen ? "Ocultar vista previa" : "Vista previa"}
                    aria-label={previewOpen ? "Ocultar vista previa" : "Vista previa"}
                    aria-expanded={previewOpen}
                    aria-controls="vista-previa"
                    onClick={() => setPreviewOpen((open) => !open)}
                  ><Eye size={19} /></button>
                </div>
                <nav className="admin-product-tabs" aria-label="Secciones del producto">
                  <a href="#imagenes"><Images size={16} /> Imágenes</a>
                  <a href="#edicion"><Pencil size={16} /> Editar producto</a>
                  <a href="#presentaciones"><Layers3 size={16} /> Presentaciones</a>
                </nav>
                <AdminProductImages product={item} edit={setEditor} />
                {previewOpen && <section id="vista-previa" className="admin-product-section">
                  <div className="admin-toolbar">
                    <h2>Vista previa</h2>
                  </div>
                  <div className="admin-product-preview">
                    <div className="admin-product-image">
                      <Picture src={image?.url ?? "/images/placeholder.svg"} alt={image?.alt ?? item.name} sizes="(max-width: 767px) 100vw, 320px" />
                    </div>
                    <div className="admin-product-summary">
                      <p className="eyebrow">{item.brand?.name ?? item.laboratory?.name ?? "Sin marca"}</p>
                      <h3>{item.name}</h3>
                      <p>{item.shortDescription || item.description || "Sin descripción"}</p>
                      <dl className="admin-product-facts">
                        <div><dt>Stock disponible</dt><dd>{availableStock} unidades</dd></div>
                        <div><dt>Presentaciones activas</dt><dd>{activeVariants.length}</dd></div>
                        <div><dt>Laboratorio</dt><dd>{item.laboratory?.name ?? "No asignado"}</dd></div>
                        <div><dt>Categorías</dt><dd>{item.categories.map((entry) => entry.category?.name).filter(Boolean).join(", ") || "Sin categoría"}</dd></div>
                      </dl>
                    </div>
                  </div>
                  {item.variants.length > 0 && (
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>PRESENTACIÓN</th><th>SKU</th><th>PRECIO</th><th>STOCK DISPONIBLE</th><th>ESTADO</th></tr></thead>
                        <tbody>{item.variants.map((variant) => (
                          <tr key={variant.id}>
                            <td>{variant.name}</td>
                            <td>{variant.sku}</td>
                            <td>{variant.price ? money(variant.price.amount, variant.price.currency) : "Sin precio"}</td>
                            <td>{variant.availableStock}</td>
                            <td>{variant.active === false ? "Inactiva" : "Activa"}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
                  {item.active !== false && <Link className="text-link" href={storeRoutes.product(item.slug)}>Ver en la tienda</Link>}
                </section>}
                <section id="edicion" className="admin-product-section">
                  <div className="admin-toolbar"><h2>Editar producto</h2></div>
                  {brands.isPending || categories.isPending || laboratories.isPending ? <Loading /> :
                    brands.error || categories.error || laboratories.error ?
                      <ErrorBox error={brands.error ?? categories.error ?? laboratories.error} /> :
                      <AdminForm
                        key={item.id}
                        editor={adminProductEditor(item, brands.data, categories.data, laboratories.data)}
                        onDone={(result) => {
                          const updated = result as Product | undefined;
                          if (updated?.slug && updated.slug !== slug) router.replace(storeRoutes.adminProduct(updated.slug));
                        }}
                        onCancel={() => router.push(catalog)}
                      />}
                </section>
                <section id="presentaciones" className="admin-product-section">
                  <div className="admin-toolbar"><h2>Presentaciones</h2></div>
                  <VariantManagement product={item} edit={setEditor} />
                </section>
              </>
            ) : <Empty title="Producto no encontrado" />}
          </div>
        </div>
        <Modal open={!!editor} onClose={() => setEditor(null)} title={editor?.title ?? ""}>
          {editor && <AdminForm editor={editor} onDone={() => setEditor(null)} />}
        </Modal>
      </AccessGate>
    </div>
  );
}
