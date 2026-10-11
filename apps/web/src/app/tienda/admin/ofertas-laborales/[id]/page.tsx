import { AdminJobPage } from "@/components/admin-job-page";
export const metadata = { title: "Oferta laboral | Administración" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <AdminJobPage id={(await params).id} />;
}
