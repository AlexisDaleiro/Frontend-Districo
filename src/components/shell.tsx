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
  MapPin,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { DEMO, useSession, useApi } from "./providers";
import { Picture, Modal } from "./ui";
import type { Cart } from "@/lib/types";
import { can } from "@/lib/commerce";
const links = [
  ["/catalogo", "Catálogo"],
  ["/marcas", "Marcas y laboratorios"],
  ["/empresa", "Nuestra empresa"],
  ["/contacto", "Contacto"],
];
export function Header() {
  const { user, logout, reset } = useSession();
  const [open, setOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const cart = useApi<Cart>("cart", can(user, "CAN_PLACE_ORDERS"));
  const nav = (
    <>
      {links.map(([href, text]) => (
        <Link
          key={href}
          className={pathname === href ? "active" : ""}
          href={href}
          onClick={() => setOpen(false)}
        >
          {text}
        </Link>
      ))}
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
          <a href="tel:08001004">
            <Phone size={12} /> 0800 1004
          </a>
        </div>
      </div>
      <header className="header">
        <div className="container header-main">
          <button
            className="icon-button mobile-menu"
            aria-label="Abrir menú"
            onClick={() => setOpen(true)}
          >
            <Menu />
          </button>
          <Link href="/" aria-label="DISTRICO · Inicio" className="logo">
            <Picture
              src="/images/logo-districo.png"
              alt="DISTRICO"
              width={201}
              height={38}
            />
          </Link>
          <form className="search" action="/catalogo">
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
              href={user ? "/cuenta" : "/ingresar"}
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
            <Link
              className="cart-link icon-button"
              href="/carrito"
              aria-label={`Carrito, ${cart.data?.items.length ?? 0} productos`}
            >
              <ShoppingBag />
              <span className="cart-count">{cart.data?.items.length ?? 0}</span>
            </Link>
          </div>
        </div>
        <div className="navline">
          <nav aria-label="Navegación principal" className="container">
            {nav}
            <Link
              className="be-client"
              href={user?.role === "ADMIN" ? "/admin" : "/solicitar-cuenta"}
            >
              {user?.role === "ADMIN" ? "Administración" : "Quiero ser cliente"}
              <ArrowUpRight size={16} />
            </Link>
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
          <Link href="/solicitar-cuenta" onClick={() => setOpen(false)}>
            Quiero ser cliente
          </Link>
          {user?.role === "ADMIN" && (
            <Link href="/admin" onClick={() => setOpen(false)}>
              Administración
            </Link>
          )}
          {user && (
            <button
              onClick={async () => {
                await logout();
                setOpen(false);
                router.push("/");
              }}
            >
              <LogOut size={18} /> Cerrar sesión
            </button>
          )}
        </nav>
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
              router.push("/");
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
  return (
    <footer>
      <div className="container footer-grid">
        <div>
          <Picture
            className="footer-logo"
            src="/images/logo-districo.png"
            alt="DISTRICO"
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
          <Link className="text-link" href="/solicitar-cuenta">
            Solicitar acceso mayorista <ArrowUpRight size={16} />
          </Link>
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
