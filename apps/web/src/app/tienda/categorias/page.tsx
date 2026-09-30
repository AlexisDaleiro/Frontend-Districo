import { redirect } from "next/navigation";
import { storeRoutes } from "@/lib/store-routes";

export default function Page() {
  redirect(storeRoutes.products);
}
