import { Admin } from "@/components/admin";
import { notFound, redirect } from "next/navigation";
import { storeRoutes } from "@/lib/store-routes";
export const metadata = { title: "Administración" };
export default async function Page({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section } = await params;
  if (section && section.length > 1) notFound();
  if (section?.[0] === "organizacion") redirect(storeRoutes.adminSection("marcas"));
  return <Admin section={section?.[0] ?? ""} />;
}
