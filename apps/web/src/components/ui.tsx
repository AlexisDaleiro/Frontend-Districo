"use client";
import Link from "next/link";
import { getImageProps } from "next/image";
import { imageHosts } from "@/lib/image-hosts";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type ImgHTMLAttributes,
} from "react";
import { X, ArrowRight, PackageOpen } from "lucide-react";
export function Picture({
  sizes,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  // Con next/image solo se toman src/srcSet: el tamaño visible sigue en el CSS.
  const optimized = optimizable(props.src)
    ? getImageProps({
        src: props.src as string,
        alt: "",
        fill: true,
        sizes:
          sizes ??
          (typeof props.width === "number"
            ? `${props.width}px`
            : "(max-width: 767px) 100vw, 50vw"),
      }).props
    : undefined;
  return (
    <img
      {...props}
      src={optimized?.src ?? props.src}
      srcSet={optimized?.srcSet}
      sizes={optimized?.sizes ?? sizes}
      alt={props.alt ?? ""}
      onError={(e) => {
        const img = e.currentTarget;
        if (!img.src.endsWith("placeholder.svg")) {
          img.srcset = "";
          img.src = "/images/placeholder.svg";
        }
      }}
    />
  );
}
function optimizable(src: unknown): src is string {
  if (typeof src !== "string" || src.endsWith(".svg")) return false;
  if (src.startsWith("/images/")) return true;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && imageHosts.includes(url.host);
  } catch {
    return false;
  }
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      Cargando…
    </div>
  );
}
export function ErrorBox({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <div className="error-box" role="alert">
      <p>{error instanceof Error ? error.message : String(error)}</p>
      {retry && (
        <button className="button small secondary" onClick={retry}>
          Intentar nuevamente
        </button>
      )}
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <PackageOpen size={38} />
      <h2>{title}</h2>
      {children}
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {children && <p className="muted">{children}</p>}
    </div>
  );
}
export function ActionLink({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link className={`button ${secondary ? "secondary" : ""}`} href={href}>
      {children}
      <ArrowRight size={17} />
    </Link>
  );
}
export function Modal({
  open,
  onClose,
  title,
  sheet = false,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Panel lateral que entra desde la derecha (filtros en móvil). */
  sheet?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // Mientras corre la animación de cierre se muestra el último contenido y
  // título: varios diálogos quitan su contenido en el mismo cambio que los
  // cierra.
  const [shown, setShown] = useState(open);
  const [kept, setKept] = useState({ title, children });
  if (open && !shown) setShown(true);
  if (open && (kept.title !== title || kept.children !== children))
    setKept({ title, children });
  const content = open ? { title, children } : kept;
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      dialog.removeAttribute("data-closing");
      dialog.removeAttribute("aria-hidden");
      if (!dialog.open) dialog.showModal();
      return;
    }
    if (!dialog.open) return;
    // Se cierra al terminar la animación de salida de motion.css; el tiempo
    // de respaldo cubre navegadores que no disparan animationend. Mientras
    // sale queda oculto a la accesibilidad: puede convivir con el diálogo que
    // se abre en su lugar.
    dialog.setAttribute("data-closing", "");
    dialog.setAttribute("aria-hidden", "true");
    const finish = () => {
      dialog.removeAttribute("data-closing");
      dialog.removeAttribute("aria-hidden");
      dialog.close();
      setShown(false);
    };
    const onEnd = (event: AnimationEvent) => {
      if (event.target === dialog && !event.pseudoElement) finish();
    };
    dialog.addEventListener("animationend", onEnd);
    const fallback = setTimeout(finish, 400);
    return () => {
      dialog.removeEventListener("animationend", onEnd);
      clearTimeout(fallback);
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`${sheet ? "modal modal-sheet" : "modal"}${className ? ` ${className}` : ""}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        // Escape también pasa por la animación de cierre.
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2 id={titleId}>{content.title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Cerrar"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      {(open || shown) && content.children}
    </dialog>
  );
}
