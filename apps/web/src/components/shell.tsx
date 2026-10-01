"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  ShoppingBag,
  UserRound,
  Menu,
  ArrowUpRight,
  Phone,
  Facebook,
  Linkedin,
  MapPin,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { DEMO, useSession, useApi } from "./providers";
import { Picture, Modal } from "./ui";
import { CartPreview } from "./orders";
import type { Cart } from "@/lib/types";
import { can } from "@/lib/commerce";
import { whatsappUrl } from "@/lib/contact";
import { storeRoutes } from "@/lib/store-routes";
const links = [
  [storeRoutes.products, "Catálogo"],
  [storeRoutes.brands, "Marcas y laboratorios"],
  [storeRoutes.company, "Nuestra empresa"],
  [storeRoutes.contact, "Contacto"],
];
export function Header() {
  const { user, logout, reset } = useSession();
  const [open, setOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const canOrder = can(user, "CAN_PLACE_ORDERS");
  const cart = useApi<Cart>("cart", canOrder);
  // El contador rebota cuando cambia la cantidad de productos, no al cargar.
  const cartCount = cart.data?.items.length;
  const [seenCount, setSeenCount] = useState(cartCount);
  const [bumps, setBumps] = useState(0);
  if (cartCount !== seenCount) {
    setSeenCount(cartCount);
    if (seenCount !== undefined && cartCount !== undefined)
      setBumps((value) => value + 1);
  }
  const nav = (
    <>
      {links.map(([href, text]) => {
        const current =
          pathname === href ||
          pathname.startsWith(`${href}/`) ||
          (href === storeRoutes.products &&
            (pathname.startsWith(storeRoutes.category("")) ||
              pathname.startsWith(storeRoutes.product(""))));
        return (
          <Link
            key={href}
            className={current ? "active" : ""}
            aria-current={current ? "page" : undefined}
            href={href}
            onClick={() => setOpen(false)}
          >
            {text}
          </Link>
        );
      })}
    </>
  );
  return (
    <>
      <a className="skip-link" href="#contenido">
        Ir al contenido
      </a>
      {DEMO && (
        <div className="demo-strip">
          <span>
            <span className="dot" /> DEMO · Precios, stock y operaciones de
            prueba
          </span>
          <button onClick={() => setResetOpen(true)}>Reiniciar demo</button>
        </div>
      )}
      <div className="topbar">
        <div className="container">
          <span>Marcas que acompañan. Un socio que responde.</span>
          <div className="topbar-links">
            <a
              href="https://www.facebook.com/districosa/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="DISTRICO en Facebook"
            >
              <Facebook size={12} />
            </a>
            <a
              href="https://uy.linkedin.com/company/districouy"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="DISTRICO en LinkedIn"
            >
              <Linkedin size={12} />
            </a>
            <a href="tel:08001004">
              <Phone size={12} /> 0800 1004
            </a>
          </div>
        </div>
      </div>
      <header className="header">
        <div className="container header-main">
          <button
            className="icon-button mobile-menu"
            aria-label="Abrir menú"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Menu />
          </button>
          <Link href={storeRoutes.home} aria-label="DISTRICO · Inicio de tienda" className="logo">
            <Picture
              src="/images/logo-districo.png"
              alt="DISTRICO"
              width={201}
              height={38}
            />
          </Link>
          <form className="search" action={storeRoutes.products}>
            <Search size={19} />
            <input
              aria-label="Buscar productos"
              name="search"
              placeholder="¿Qué necesita tu negocio?"
            />
            <button type="submit" aria-label="Buscar">
              <ArrowUpRight size={19} />
            </button>
          </form>
          <div className="header-actions">
            <Link
              href={user ? storeRoutes.account : storeRoutes.login}
              className="account-link"
              aria-label={user ? "Mi cuenta" : "Ingresar al portal mayorista"}
            >
              <UserRound size={22} />
              <span>
                {user ? "Mi cuenta" : "Ingresar"}
                <small>
                  {user?.customerAccount?.businessName ?? "Acceso mayorista"}
                </small>
              </span>
            </Link>
            {/* Sin permiso para pedir, el ícono lleva a /carrito (pide ingresar). */}
            {canOrder ? (
              <button
                className="cart-link icon-button"
                aria-label={`Carrito, ${cartCount ?? 0} productos`}
                aria-haspopup="dialog"
                aria-expanded={cartOpen}
                onClick={() => setCartOpen(true)}
              >
                <ShoppingBag />
                <span
                  className={bumps ? "cart-count is-bump" : "cart-count"}
                  key={bumps}
                >
                  {cartCount ?? 0}
                </span>
              </button>
            ) : (
              <Link
                className="cart-link icon-button"
                href={storeRoutes.cart}
                aria-label={`Carrito, ${cartCount ?? 0} productos`}
              >
                <ShoppingBag />
                <span
                  className={bumps ? "cart-count is-bump" : "cart-count"}
                  key={bumps}
                >
                  {cartCount ?? 0}
                </span>
              </Link>
            )}
          </div>
        </div>
        <div className="navline">
          <nav aria-label="Navegación principal" className="container">
            {nav}
            {/* Con sesión de cliente no tiene sentido invitar a solicitar cuenta. */}
            {(!user || user.role === "ADMIN") && (
              <Link
                className="be-client"
                href={user ? storeRoutes.admin : storeRoutes.requestAccount}
              >
                {user ? "Administración" : "Quiero ser cliente"}
                <ArrowUpRight size={16} />
              </Link>
            )}
          </nav>
        </div>
      </header>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Explorá DISTRICO"
      >
        <nav className="mobile-nav">
          {nav}
          {user?.role === "ADMIN" ? (
            <Link href={storeRoutes.admin} onClick={() => setOpen(false)}>
              Administración
            </Link>
          ) : (
            !user && (
              <Link href={storeRoutes.requestAccount} onClick={() => setOpen(false)}>
                Quiero ser cliente
              </Link>
            )
          )}
          {user && (
            <button
              onClick={async () => {
                await logout();
                setOpen(false);
                router.push(storeRoutes.home);
              }}
            >
              <LogOut size={18} /> Cerrar sesión
            </button>
          )}
        </nav>
      </Modal>
      <Modal
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        title="Tu carrito"
        sheet
      >
        <CartPreview onNavigate={() => setCartOpen(false)} />
      </Modal>
      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reiniciar la demostración"
      >
        <p>
          Se eliminarán las solicitudes, pedidos y cambios simulados guardados
          en este navegador.
        </p>
        <div className="actions">
          <button
            className="button"
            onClick={() => {
              reset();
              setResetOpen(false);
              router.push(storeRoutes.home);
            }}
          >
            Reiniciar escenario
          </button>
          <button
            className="button secondary"
            onClick={() => setResetOpen(false)}
          >
            Volver
          </button>
        </div>
      </Modal>
    </>
  );
}
export function Footer() {
  const { user } = useSession();
  return (
    <footer>
      <a
        className="whatsapp-fab"
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Escribinos por WhatsApp"
      >
        {/* Logo de WhatsApp (simple-icons, CC0) */}
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
          <path
            fill="currentColor"
            d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
          />
        </svg>
      </a>
      <div className="container footer-grid">
        <div>
          <Picture
            className="footer-logo"
            src="/images/logo-districo.png"
            alt="DISTRICO"
            width={201}
            height={38}
          />
          <p>
            Conectamos tu negocio con marcas
            <br />
            que hacen la diferencia.
          </p>
          <span className="footer-pill">Distribución mayorista · Uruguay</span>
        </div>
        <div>
          <h3>Explorá</h3>
          {links.map(([href, text]) => (
            <Link href={href} key={href}>
              {text}
            </Link>
          ))}
        </div>
        <div>
          <h3>Estamos cerca</h3>
          <a href="tel:08001004">0800 1004</a>
          <a href="mailto:contacto@districo.com.uy">contacto@districo.com.uy</a>
          <p>
            <MapPin size={15} /> Montevideo y Maldonado
          </p>
        </div>
        <div>
          <h3>Crezcamos juntos</h3>
          <p>
            Una selección de marcas para
            <br />
            cada necesidad de tu negocio.
          </p>
          {!user && (
            <Link className="text-link" href={storeRoutes.requestAccount}>
              Solicitar acceso mayorista <ArrowUpRight size={16} />
            </Link>
          )}
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} DISTRICO S.A.</span>
        <span>
          {DEMO
            ? "Versión de demostración · Sin cobros reales"
            : "Portal mayorista"}
        </span>
      </div>
    </footer>
  );
}
