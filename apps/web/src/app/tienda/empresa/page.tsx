import { redirect } from "next/navigation";

// La presentación de la empresa vive en el sitio público.
export default function Page() {
  redirect("/nosotros");
}
