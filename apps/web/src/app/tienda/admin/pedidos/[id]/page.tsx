import { AdminOrderPage } from "@/components/admin-order-page";
import { storeRoutes } from "@/lib/store-routes";

export const metadata = { title: "Pedido | Administración" };

export default async function Page({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ back?: string }>;
}) {
  const { id } = await params;
  const { back } = await searchParams;
  const list = storeRoutes.adminSection("pedidos");
  return <AdminOrderPage id={id} back={back && (back === list || back.startsWith(`${list}?`)) ? back : list} />;
}
