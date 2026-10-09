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
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { DEMO, useSession, useApi } from "./providers";
import { Picture, Modal } from "./ui";
import { CartPreview } from "./orders";
import type { Cart, ProductCardList } from "@/lib/types";
import { can, hiddenPriceText, money } from "@/lib/commerce";
import { WhatsAppFab } from "./whatsapp-fab";
import { storeRoutes } from "@/lib/store-routes";
import { canAccessAdmin, isStaff } from "@/lib/staff-access";
import { CatalogNavigation } from "./catalog-navigation";
const links = [
  [storeRoutes.products, "Catálogo"],
  [storeRoutes.brands, "Marcas y laboratorios"],
  [storeRoutes.contact, "Contacto"],
];
// Sugerencias mientras se escribe; Enter sigue llevando al catálogo filtrado.
function HeaderSearch() {
  const { user } = useSession();
  const [value, setValue] = useState("");
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const input = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const trimmed = value.trim();
  const ready = term.length >= 2;
  const results = useApi<ProductCardList>(
    `products/cards?search=${encodeURIComponent(term)}&limit=5`,
    ready,
  );
  const items = results.data?.items ?? [];
  const showPanel = open && ready && trimmed.length >= 2;
  const allResults = `${storeRoutes.products}?search=${encodeURIComponent(trimmed)}`;

  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(trimmed), 250);
    return () => window.clearTimeout(timer);
  }, [trimmed]);

  // Al elegir un resultado la búsqueda terminó: el buscador queda vacío.
  function finish() {
    setOpen(false);
    setValue("");
    setTerm("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Escape" && showPanel) {
      event.preventDefault();
      setOpen(false);
      input.current?.focus();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const links = [...(panel.current?.querySelectorAll("a") ?? [])];
    if (!links.length) return;
    event.preventDefault();
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    const next = event.key === "ArrowDown" ? index + 1 : index - 1;
    if (next < 0) input.current?.focus();
    else links[Math.min(next, links.length - 1)].focus();
  }

  return (
    <form
      className="search"
      action={storeRoutes.products}
      onKeyDown={onKeyDown}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <Search size={19} />
      <input
        ref={input}
        aria-label="Buscar productos"
        name="search"
        placeholder="¿Qué necesita tu negocio?"
        autoComplete="off"
        aria-controls={panelId}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
        }}
        onClick={() => setOpen(true)}
      />
      <button type="submit" aria-label="Buscar">
        <ArrowUpRight size={19} />
      </button>
      <div
        id={panelId}
        ref={panel}
        className="search-panel"
        role="region"
        aria-label="Sugerencias de productos"
        hidden={!showPanel}
      >
        {results.isError ? (
          <p className="search-panel-note" role="alert">
            No se pudo buscar. Probá de nuevo.
          </p>
        ) : !results.data || term !== trimmed ? (
          <p className="search-panel-note">Buscando…</p>
        ) : items.length ? (
          <>
            <ul>
              {items.map((product) => {
                // Mismo criterio que la tarjeta del catálogo: primera presentación activa.
                const price = product.variants.find(
                  (variant) => variant.active !== false,
                )?.price;
                return (
                  <li key={product.id}>
                    <Link
                      href={storeRoutes.product(product.slug)}
                      onClick={finish}
                    >
                      <Picture
                        src={
                          product.media.find((media) => media.type === "IMAGE")
                            ?.url ?? "/images/placeholder.svg"
                        }
                        alt=""
                        sizes="44px"
                      />
                      <span>
                        <strong>{product.name}</strong>
                        {(product.brand ?? product.laboratory) && (
                          <small>
                            {(product.brand ?? product.laboratory)?.name}
                          </small>
                        )}
                      </span>
                      <em
                        className={
                          price
                            ? "search-panel-price"
                            : "search-panel-price is-hidden"
                        }
                      >
                        {price
                          ? money(price.amount, price.currency)
                          : hiddenPriceText(user, product)}
                      </em>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Link
              className="search-panel-all"
              href={allResults}
              onClick={finish}
            >
              Ver todos los resultados ({results.data.meta.total})
            </Link>
          </>
        ) : (
          <p className="search-panel-note">Sin resultados para «{trimmed}».</p>
        )}
      </div>
    </form>
  );
}

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
  const nav = (mobile = false) => (
    <>
      {links.map(([href, text]) => {
        const current =
          pathname === href ||
          pathname.startsWith(`${href}/`) ||
          (href === storeRoutes.products &&
            (pathname.startsWith(storeRoutes.category("")) ||
              pathname.startsWith(storeRoutes.product(""))));
        if (href === storeRoutes.products)
          return (
            <CatalogNavigation
              key={href}
              current={current}
              mobile={mobile}
              onNavigate={() => setOpen(false)}
            />
          );
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
          <span>Venta mayorista para comercios de todo Uruguay</span>
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
          <Link
            href={storeRoutes.home}
            aria-label="DISTRICO · Inicio de tienda"
            className="logo"
          >
            <Picture
              src="/images/logo-districo.png"
              alt="DISTRICO"
              width={201}
              height={38}
            />
          </Link>
          <HeaderSearch />
          <div className="header-actions">
            <Link
              href={
                user
                  ? canAccessAdmin(user)
                    ? storeRoutes.admin
                    : storeRoutes.account
                  : storeRoutes.login
              }
              className="account-link"
              aria-label={
                user
                  ? canAccessAdmin(user)
                    ? "Administración"
                    : "Mi cuenta"
                  : "Ingresar al portal mayorista"
              }
            >
              <UserRound size={22} />
              <span>
                {user
                  ? canAccessAdmin(user)
                    ? "Administración"
                    : "Mi cuenta"
                  : "Ingresar"}
                <small>
                  {user?.customerAccount?.businessName ?? "Acceso mayorista"}
                </small>
              </span>
            </Link>
            {/* Sin permiso para pedir, el ícono lleva a /carrito (pide ingresar). */}
            {isStaff(user) ? null : canOrder ? (
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
            {nav()}
            {/* Con sesión de cliente no tiene sentido invitar a solicitar cuenta. */}
            {(!user || canAccessAdmin(user)) && (
              <Link
                className="be-client"
                href={user ? storeRoutes.admin : storeRoutes.requestAccount}
              >
                {user ? "Administración" : "Quiero ser cliente"}
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
          {nav(true)}
          {canAccessAdmin(user) ? (
            <Link href={storeRoutes.admin} onClick={() => setOpen(false)}>
              Administración
            </Link>
          ) : (
            !user && (
              <Link
                href={storeRoutes.requestAccount}
                onClick={() => setOpen(false)}
              >
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
        className="cart-sheet"
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
      <WhatsAppFab />
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
            Distribución mayorista de alimento para mascotas, arenas
            sanitarias, cuidado animal y snacks en todo Uruguay.
          </p>
          <span className="footer-pill">Certificación ISO 9001</span>
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
          <h3>Contacto</h3>
          <a href="tel:08001004">0800 1004</a>
          <a href="mailto:contacto@districo.com.uy">contacto@districo.com.uy</a>
          <p>
            <MapPin size={15} /> Montevideo y Maldonado
          </p>
        </div>
        <div>
          <h3>Cuenta mayorista</h3>
          {user ? (
            <>
              <Link href={storeRoutes.account}>Mi cuenta</Link>
              <Link href={storeRoutes.orders}>Mis pedidos</Link>
              <Link href={storeRoutes.invoices}>Mis facturas</Link>
            </>
          ) : (
            <Link href={storeRoutes.requestAccount}>Solicitar acceso mayorista</Link>
          )}
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} DISTRICO S.A.</span>
        <span>
          {DEMO
            ? "Versión de demostración, sin cobros reales"
            : "Portal mayorista"}
        </span>
      </div>
    </footer>
  );
}
