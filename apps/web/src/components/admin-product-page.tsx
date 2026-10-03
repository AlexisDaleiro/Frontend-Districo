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
import { Empty, ErrorBox, Loading, Modal, PageHeading } from "./ui";
import { adminProductEditor } from "@/lib/admin-product-editor";
import { canEditAdminFeature, canSeeAdminSection } from "@/lib/staff-access";
import { storeRoutes } from "@/lib/store-routes";
import type { Entity, Product } from "@/lib/types";

export function AdminProductPage({ slug }: { slug: string }) {
  const router = useRouter();
  const { user } = useSession();
  const [editor, setEditor] = useState<Editor | null>(null);
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

  return (
    <div className="container admin-page section">
      <AccessGate admin>
        <div className="admin-shell">
          <AdminNav section="catalogo" email={user?.email} />
          <div className="admin-main admin-product-page">
            {!canSeeAdminSection(user, "catalogo") ? (
              <Empty title="No tenés acceso a esta sección" />
            ) : product.isPending ? (
              <Loading />
            ) : product.error ? (
              <ErrorBox error={product.error} retry={() => void product.refetch()} />
            ) : item && !canEditAdminFeature(user, "catalogo") ? (
              <div className="stack"><PageHeading eyebrow="DISTRICO · Administración" title={item.name} /><Link className="button small secondary" href={storeRoutes.adminProductPreview(item.slug)}>Ver producto</Link></div>
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
                  <Link className="icon-button admin-preview-toggle" href={storeRoutes.adminProductPreview(item.slug)} title="Vista previa" aria-label="Vista previa"><Eye size={19} /></Link>
                </div>
                <nav className="admin-product-tabs" aria-label="Secciones del producto">
                  <a href="#imagenes"><Images size={16} /> Imágenes</a>
                  <a href="#edicion"><Pencil size={16} /> Editar producto</a>
                  <a href="#presentaciones"><Layers3 size={16} /> Presentaciones</a>
                </nav>
                <AdminProductImages product={item} edit={setEditor} />
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
