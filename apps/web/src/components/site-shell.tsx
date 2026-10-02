"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Facebook, Linkedin, Menu, Phone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Picture, Modal } from "./ui";
import { WhatsAppFab } from "./whatsapp-fab";
import { storeRoutes } from "@/lib/store-routes";

const sections = [
  ["nosotros", "Nosotros"],
  ["marcas", "Marcas"],
  ["como-trabajamos", "Cómo trabajamos"],
  ["novedades", "Novedades"],
  ["contacto", "Contacto"],
] as const;

export function PublicHeader({ solid = false }: { solid?: boolean }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");
  const menuButton = useRef<HTMLButtonElement>(null);
  const isLanding = pathname === "/";

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  useEffect(() => {
    if (!isLanding || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const current = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (current) setActive(current.target.id);
      },
      { rootMargin: "-22% 0px -58% 0px", threshold: [0, 0.2, 0.5] },
    );
    for (const [id] of sections) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, [isLanding]);

  const closeMenu = () => {
    setOpen(false);
    // El diálogo conserva su animación de salida antes de devolver el foco.
    window.setTimeout(() => menuButton.current?.focus(), 400);
  };
  const nav = (mobile = false) =>
    sections.map(([id, label]) => (
      <Link
        key={id}
        href={isLanding ? `#${id}` : `/#${id}`}
        aria-current={isLanding && active === id ? "location" : undefined}
        onClick={mobile ? closeMenu : undefined}
      >
        {label}
      </Link>
    ));

  return (
    <>
      <a className="skip-link" href="#contenido">
        Ir al contenido
      </a>
      <header
        className={`site-header${solid || !isLanding || scrolled ? " is-solid" : ""}`}
      >
        <div className="container site-header-inner">
          <Link href="/" className="site-logo" aria-label="DISTRICO · Inicio">
            <Picture
              src="/images/logo-districo.png"
              alt="DISTRICO"
              width={201}
              height={38}
              sizes="201px"
              loading="eager"
            />
          </Link>
          <nav className="site-nav" aria-label="Navegación institucional">
            {nav()}
          </nav>
          <div className="site-header-actions">
            <Link
              className="button secondary site-products"
              href="/productos"
              aria-current={pathname.startsWith("/productos") ? "page" : undefined}
            >
              Ver productos
            </Link>
            <Link className="site-login" href={storeRoutes.login}>
              Ingresar
            </Link>
            <Link
              className="button lime site-apply"
              href={storeRoutes.requestAccount}
            >
              Solicitar cuenta <ArrowUpRight size={16} />
            </Link>
          </div>
          <button
            ref={menuButton}
            className="icon-button site-menu-button"
            type="button"
            aria-label="Abrir menú"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Menu />
          </button>
        </div>
      </header>
      <Modal open={open} onClose={closeMenu} title="Explorá DISTRICO" sheet>
        <nav className="site-mobile-nav" aria-label="Navegación institucional">
          {nav(true)}
          <Link href="/productos" onClick={closeMenu}>
            Productos
          </Link>
          <Link href={storeRoutes.login} onClick={closeMenu}>
            Ingresar
          </Link>
          <Link
            className="button lime"
            href={storeRoutes.requestAccount}
            onClick={closeMenu}
          >
            Solicitar cuenta
          </Link>
        </nav>
      </Modal>
    </>
  );
}

export function PublicFooter() {
  return (
    <footer className="site-footer">
      <WhatsAppFab />
      <div className="container footer-grid">
        <div>
          <Picture
            className="footer-logo"
            src="/images/logo-districo.png"
            alt="DISTRICO"
            width={201}
            height={38}
            sizes="201px"
          />
          <p>
            Marcas que acompañan.
            <br />
            Un socio que responde.
          </p>
          <span className="footer-pill">Distribución mayorista · Uruguay</span>
        </div>
        <div>
          <h3>Explorá</h3>
          <Link href="/#nosotros">Nosotros</Link>
          <Link href="/productos">Productos</Link>
          <Link href="/#marcas">Marcas</Link>
          <Link href="/#novedades">Novedades</Link>
        </div>
        <div>
          <h3>Estamos cerca</h3>
          <a href="tel:08001004">
            <Phone size={14} /> 0800 1004
          </a>
          <a href="mailto:contacto@districo.com.uy">contacto@districo.com.uy</a>
          <p>Montevideo · Maldonado</p>
        </div>
        <div>
          <h3>Seguinos</h3>
          <div className="site-socials">
            <a
              href="https://www.facebook.com/districosa/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="DISTRICO en Facebook"
            >
              <Facebook size={20} />
            </a>
            <a
              href="https://uy.linkedin.com/company/districouy"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="DISTRICO en LinkedIn"
            >
              <Linkedin size={20} />
            </a>
          </div>
          <Link className="text-link" href={storeRoutes.requestAccount}>
            Solicitar cuenta <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} DISTRICO S.A.</span>
        <span>Sitio institucional</span>
      </div>
    </footer>
  );
}
