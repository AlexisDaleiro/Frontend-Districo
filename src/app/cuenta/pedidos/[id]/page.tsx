import { OrdersPage } from "@/components/orders";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ confirmado?: string }>;
}) {
  return (
    <OrdersPage
      id={(await params).id}
      confirmed={(await searchParams).confirmado === "1"}
    />
  );
}
