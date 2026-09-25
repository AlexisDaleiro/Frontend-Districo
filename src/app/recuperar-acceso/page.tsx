import { ActionLink, PageHeading } from "@/components/ui";
export const metadata = { title: "Recuperar acceso" };
export default function Page() {
  return (
    <div className="container section" style={{ maxWidth: 740 }}>
      <PageHeading title="Recuperá tu acceso." />
      <div className="panel stack">
        <p>
          La recuperación automática por correo todavía no está disponible en
          esta versión.
        </p>
        <p>Contactá a DISTRICO para coordinar la recuperación de tu cuenta.</p>
        <a className="text-link" href="mailto:contacto@districo.com.uy">
          contacto@districo.com.uy
        </a>
        <a className="text-link" href="tel:08001004">
          0800 1004
        </a>
      </div>
      <div className="actions">
        <ActionLink href="/ingresar">Volver al acceso</ActionLink>
      </div>
    </div>
  );
}
