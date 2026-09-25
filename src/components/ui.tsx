"use client";
import Link from "next/link";
import {
  useEffect,
  useRef,
  type ReactNode,
  type ImgHTMLAttributes,
} from "react";
import { X, ArrowRight, PackageOpen } from "lucide-react";
export function Picture(props: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      {...props}
      alt={props.alt ?? ""}
      onError={(e) => {
        const img = e.currentTarget;
        if (!img.src.endsWith("placeholder.svg"))
          img.src = "/images/placeholder.svg";
      }}
    />
  );
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
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    else if (!open && dialog?.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={title}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Cerrar"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      {open && children}
    </dialog>
  );
}
