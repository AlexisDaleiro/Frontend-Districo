import { AdminOrderPage } from "@/components/admin-order-page";

export const metadata = { title: "Pedido | Administración" };

export default async function Page({ params }: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminOrderPage id={id} />;
}
