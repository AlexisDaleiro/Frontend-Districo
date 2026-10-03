"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Facebook, Linkedin, Menu, Phone } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Picture, Modal } from "./ui";
import { WhatsAppFab } from "./whatsapp-fab";
import { storeRoutes } from "@/lib/store-routes";

const navLinks = [
  ["/productos", "Productos"],
  ["/marcas", "Marcas"],
  ["/garantia", "Garantía"],
  ["/nosotros", "Nosotros"],
  ["/contacto", "Contacto"],
] as const;

export function PublicHeader({ solid = false }: { solid?: boolean }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const desktopNav = useRef<HTMLElement>(null);
  const isLanding = pathname === "/";

  useLayoutEffect(() => {
    const nav = desktopNav.current;
    if (!nav) return;

    const positionIndicator = () => {
      const active = nav.querySelector<HTMLAnchorElement>('a[aria-current="page"]');
      nav.dataset.indicatorReady = "";
      if (!active) {
        nav.style.setProperty("--site-nav-indicator-opacity", "0");
        return;
      }
      const navRect = nav.getBoundingClientRect();
      const linkRect = active.getBoundingClientRect();
      nav.style.setProperty("--site-nav-indicator-x", `${linkRect.left - navRect.left}px`);
      nav.style.setProperty("--site-nav-indicator-width", `${linkRect.width}px`);
      nav.style.setProperty("--site-nav-indicator-opacity", "1");
    };

    positionIndicator();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(positionIndicator);
    if (observer) observer.observe(nav);
    window.addEventListener("resize", positionIndicator);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", positionIndicator);
    };
  }, [pathname]);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const closeMenu = () => {
    setOpen(false);
    // El diálogo conserva su animación de salida antes de devolver el foco.
    window.setTimeout(() => menuButton.current?.focus(), 400);
  };
  const nav = (mobile = false) =>
    navLinks.map(([href, label]) => (
      <Link
        key={href}
        href={href}
        aria-current={pathname.startsWith(href) ? "page" : undefined}
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
          <nav ref={desktopNav} className="site-nav" aria-label="Navegación institucional">
            {nav()}
            <span className="site-nav-indicator" aria-hidden="true" />
          </nav>
          <div className="site-header-actions">
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
            Distribución de alimento para mascotas, arenas sanitarias,
            cuidado animal y snacks en todo Uruguay.
          </p>
          <span className="footer-pill">ISO 9001 · Desde 1995</span>
        </div>
        <div>
          <h3>Explorá</h3>
          <Link href="/nosotros">Nosotros</Link>
          <Link href="/productos">Productos</Link>
          <Link href="/marcas">Marcas</Link>
        </div>
        <div>
          <h3>Casa Matriz</h3>
          <p>César Mayo Gutiérrez 3024 bis, esq. Camino Uruguay · Montevideo</p>
          <a href="tel:08001004">
            <Phone size={14} /> 0800 1004
          </a>
          <a href="tel:+59823201381">(+598) 2320 1381</a>
        </div>
        <div>
          <h3>Sucursal Maldonado</h3>
          <p>A. Antonio Lusich esq. Vicenza · Maldonado</p>
          <a href="tel:+59842252155">(+598) 4225 2155</a>
          <a href="mailto:contacto@districo.com.uy">contacto@districo.com.uy</a>
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
