import { AdminCustomerPage } from "@/components/admin-customer-page";

export const metadata = { title: "Cliente | Administración" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminCustomerPage id={id} />;
}
