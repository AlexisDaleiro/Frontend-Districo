import { AdminSalespersonPage } from "@/components/admin-salespeople";

export const metadata = { title: "Vendedor | Administración" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminSalespersonPage id={id} />;
}
