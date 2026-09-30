import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "leaflet/dist/leaflet.css";
import "../globals.css";
import "../motion.css";
import { Providers } from "@/components/providers";
import { Header, Footer } from "@/components/shell";
import { MotionSystem } from "@/components/motion-system";

export const metadata: Metadata = {
  title: {
    default: "DISTRICO · Marcas que acompañan",
    template: "%s | DISTRICO",
  },
  description:
    "Descubrí nuestras marcas y soluciones para tu negocio. Catálogo y acceso mayorista de DISTRICO Uruguay.",
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    locale: "es_UY",
    siteName: "DISTRICO",
  },
  twitter: { card: "summary_large_image" },
};

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <MotionSystem />
      <Header />
      <main id="contenido">{children}</main>
      <Footer />
    </Providers>
  );
}
