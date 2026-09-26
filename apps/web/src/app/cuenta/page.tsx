"use client";
import { useRouter } from "next/navigation";
import { AccessGate } from "@/components/auth";
import { useSession } from "@/components/providers";
import { ActionLink, PageHeading, ErrorBox } from "@/components/ui";
import { label } from "@/lib/commerce";
import { useState } from "react";
export default function Page() {
  const { user, logout } = useSession();
  const router = useRouter();
  const [error, setError] = useState<unknown>();
  return (
    <div className="container section">
      <AccessGate>
        <PageHeading
          eyebrow="Tu espacio mayorista"
          title={user?.customerAccount?.businessName ?? "Mi cuenta"}
        >
          {user?.email}
        </PageHeading>
        {user?.customerAccount && (
          <div className="panel">
            <p>
              Estado de cuenta:{" "}
              <strong>{label(user.customerAccount.accountStatus)}</strong>
            </p>
            <p>
              Situación comercial:{" "}
              <strong>{label(user.customerAccount.creditStatus)}</strong>
            </p>
            <p>
              Productos restringidos:{" "}
              <strong>
                {user.permissions.includes("CAN_BUY_MEDICATIONS")
                  ? "Habilitado"
                  : "Sin habilitación"}
              </strong>
            </p>
          </div>
        )}
        <div className="account-panels">
          <div className="card stack">
            <h2>Mis pedidos</h2>
            <p className="muted">
              Consultá el detalle y estado de los pedidos enviados.
            </p>
            <ActionLink href="/cuenta/pedidos">Ver pedidos</ActionLink>
          </div>
          <div className="card stack">
            <h2>Mi próximo pedido</h2>
            <p className="muted">Explorá productos y revisá tu carrito.</p>
            <ActionLink href="/catalogo">Explorar catálogo</ActionLink>
          </div>
        </div>
        <div className="actions">
          {user?.role === "ADMIN" && (
            <ActionLink href="/admin">Administración</ActionLink>
          )}
          <button
            className="button secondary"
            onClick={async () => {
              try {
                await logout();
                router.push("/");
              } catch (e) {
                setError(e);
              }
            }}
          >
            Cerrar sesión
          </button>
        </div>
        {error !== undefined && <ErrorBox error={error} />}
      </AccessGate>
    </div>
  );
}
