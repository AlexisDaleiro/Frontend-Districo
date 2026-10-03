"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Pencil, Star, Trash2 } from "lucide-react";
import { request, useSession } from "./providers";
import { invalidateAdminMutation } from "@/lib/admin-query-invalidation";
import { ErrorBox, Picture } from "./ui";
import type { Editor } from "./admin-form";
import type { Product } from "@/lib/types";

export function AdminProductImages({ product, edit }: { product: Product; edit: (editor: Editor) => void }) {
  const client = useQueryClient();
  const { notify } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const fileInput = useRef<HTMLInputElement>(null);
  const images = product.media.filter((media) => media.type === "IMAGE");

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files);
    if (selected.length > 8 || selected.some((file) => file.size === 0 || file.size > 5_000_000)) {
      setError(new Error("Podés subir hasta 8 imágenes por vez, de 5 MB como máximo cada una."));
      return;
    }
    const form = new FormData();
    selected.forEach((file) => form.append("files", file));
    setBusy(true);
    setError(undefined);
    try {
      await request(`products/${product.id}/media/upload`, "POST", form);
      await invalidateAdminMutation(client, "products");
      notify(selected.length === 1 ? "Imagen subida." : `${selected.length} imágenes subidas.`);
    } catch (cause) { setError(cause); }
    finally { setBusy(false); }
  }

  async function setPrimary(id: string) {
    setBusy(true);
    setError(undefined);
    try {
      await request(`products/media/${id}`, "PATCH", { isPrimary: true });
      await invalidateAdminMutation(client, "products");
      notify("Imagen principal actualizada.");
    } catch (cause) { setError(cause); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!window.confirm("¿Quitar esta imagen del producto?")) return;
    setBusy(true);
    setError(undefined);
    try {
      await request(`products/media/${id}`, "DELETE");
      await invalidateAdminMutation(client, "products");
      notify("Imagen quitada.");
    } catch (cause) { setError(cause); }
    finally { setBusy(false); }
  }

  return <section id="imagenes" className="admin-product-section">
    <div className="admin-toolbar">
      <h2>Imágenes del producto</h2>
      <button className="button small" type="button" disabled={busy} onClick={() => fileInput.current?.click()}><ImagePlus size={17} /> {busy ? "Subiendo…" : "Subir imágenes"}</button>
      <input ref={fileInput} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={busy} onChange={(event) => { void upload(event.target.files); event.target.value = ""; }} />
    </div>
    {error ? <ErrorBox error={error} /> : null}
    {images.length ? <div className="admin-product-images">
      {images.map((media) => <div className="admin-product-image-item" key={media.id}>
        <Picture src={media.url} alt={media.alt || product.name} sizes="180px" />
        <div className="admin-product-image-actions">
          <button type="button" className="icon-button" disabled={busy || media.isPrimary} title={media.isPrimary ? "Imagen principal" : "Elegir como principal"} aria-label={media.isPrimary ? "Imagen principal" : "Elegir como principal"} onClick={() => void setPrimary(media.id)}><Star size={17} fill={media.isPrimary ? "currentColor" : "none"} /></button>
          <button type="button" className="icon-button" disabled={busy} title="Editar imagen" aria-label="Editar imagen" onClick={() => edit({
            title: "Editar imagen", path: `products/media/${media.id}`, method: "PATCH",
            fields: [
              { key: "alt", label: "Texto alternativo" },
              { key: "position", label: "Orden", type: "number", min: 0 },
            ],
            initial: { alt: media.alt || "", position: media.position ?? 0 },
          })}><Pencil size={17} /></button>
          <button type="button" className="icon-button" disabled={busy} title="Quitar imagen" aria-label="Quitar imagen" onClick={() => void remove(media.id)}><Trash2 size={17} /></button>
        </div>
      </div>)}
    </div> : <p className="muted small-copy">Este producto todavía no tiene imágenes.</p>}
  </section>;
}
