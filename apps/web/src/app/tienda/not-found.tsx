import { ActionLink, Empty } from "@/components/ui";
import { storeRoutes } from "@/lib/store-routes";
export default function NotFound() {
  return (
    <div className="container section">
      <Empty title="No encontramos esta página">
        <p>Podés volver al catálogo y seguir explorando.</p>
        <ActionLink href={storeRoutes.products}>Ir al catálogo</ActionLink>
      </Empty>
    </div>
  );
}
