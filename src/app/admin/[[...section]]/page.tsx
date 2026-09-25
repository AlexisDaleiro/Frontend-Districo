import { Admin } from "@/components/admin";
import { notFound } from "next/navigation";
export const metadata = { title: "Administración" };
export default async function Page({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section } = await params;
  if (section && section.length > 1) notFound();
  return <Admin section={section?.[0] ?? ""} />;
}
