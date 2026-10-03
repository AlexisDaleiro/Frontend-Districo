"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccessGate } from "./auth";
import { AdminNav } from "./admin";
import { useApi, useSession } from "./providers";
import { Empty, ErrorBox, Loading, PageHeading, Picture } from "./ui";
import { money } from "@/lib/commerce";
import { canEditAdminFeature, canSeeAdminSection } from "@/lib/staff-access";
import { storeRoutes } from "@/lib/store-routes";
import type { Product } from "@/lib/types";

export function AdminProductPreviewPage({ slug }: { slug: string }) {
  const { user } = useSession();
  const product = useApi<Product>(`products/admin/${slug}`);
  const item = product.data;
  const image = item?.media.find((media) => media.type === "IMAGE" && media.isPrimary)
    ?? item?.media.find((media) => media.type === "IMAGE");
  const activeVariants = item?.variants.filter((variant) => variant.active !== false) ?? [];
  const availableStock = activeVariants.reduce((total, variant) => total + variant.availableStock, 0);

  return <div className="container admin-page section">
    <AccessGate admin>
      <div className="admin-shell">
          <AdminNav section="catalogo" email={user?.email} />
        <main className="admin-main admin-product-page">
          {!canSeeAdminSection(user, "catalogo") ? <Empty title="No tenés acceso a esta sección" /> :
            product.isPending ? <Loading /> : product.error ? <ErrorBox error={product.error} retry={() => void product.refetch()} /> : item ? <>
              <Link className="text-link admin-product-back" href={canEditAdminFeature(user, "catalogo") ? storeRoutes.adminProduct(item.slug) : storeRoutes.adminSection("catalogo")}><ArrowLeft size={17} /> Volver al catálogo</Link>
              <PageHeading eyebrow="DISTRICO · Administración" title={item.name}>Vista previa del producto</PageHeading>
              <div className="admin-product-toolbar">
                <span className="status-pill">{item.active === false ? "Inactivo" : "Activo"}</span>
                {item.active !== false && <Link className="text-link" href={storeRoutes.product(item.slug)}>Ver en la tienda</Link>}
              </div>
              <section className="admin-product-section" aria-label="Vista previa">
                <div className="admin-product-preview">
                  <div className="admin-product-image">
                    <Picture src={image?.url ?? "/images/placeholder.svg"} alt={image?.alt ?? item.name} sizes="(max-width: 767px) 100vw, 320px" />
                  </div>
                  <div className="admin-product-summary">
                    <p className="eyebrow">{item.brand?.name ?? item.laboratory?.name ?? "Sin marca"}</p>
                    <h2>Información del producto</h2>
                    <p>{item.shortDescription || item.description || "Sin descripción"}</p>
                    <dl className="admin-product-facts">
                      <div><dt>Stock disponible</dt><dd>{availableStock} unidades</dd></div>
                      <div><dt>Presentaciones activas</dt><dd>{activeVariants.length}</dd></div>
                      <div><dt>Laboratorio</dt><dd>{item.laboratory?.name ?? "No asignado"}</dd></div>
                      <div><dt>Categorías</dt><dd>{item.categories.map((entry) => entry.category?.name).filter(Boolean).join(", ") || "Sin categoría"}</dd></div>
                    </dl>
                  </div>
                </div>
                {item.variants.length > 0 && <div className="table-wrap">
                  <table>
                    <thead><tr><th>PRESENTACIÓN</th><th>SKU</th><th>PRECIO</th><th>STOCK DISPONIBLE</th><th>ESTADO</th></tr></thead>
                    <tbody>{item.variants.map((variant) => <tr key={variant.id}>
                      <td>{variant.name}</td>
                      <td>{variant.sku}</td>
                      <td>{variant.price ? money(variant.price.amount, variant.price.currency) : "Sin precio"}</td>
                      <td>{variant.availableStock}</td>
                      <td>{variant.active === false ? "Inactiva" : "Activa"}</td>
                    </tr>)}</tbody>
                  </table>
                </div>}
              </section>
            </> : <Empty title="Producto no encontrado" />}
        </main>
      </div>
    </AccessGate>
  </div>;
}
