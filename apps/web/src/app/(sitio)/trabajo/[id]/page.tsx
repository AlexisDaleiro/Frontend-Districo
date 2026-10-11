import { SiteJobPage } from "@/components/site-job-page";
export const metadata = { title: "Oferta laboral" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <SiteJobPage id={(await params).id} />; }
