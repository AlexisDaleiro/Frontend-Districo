import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "../globals.css";
import "../motion.css";
import "../site.css";
import "../site-motion.css";
import { MotionSystem } from "@/components/motion-system";
import { StoreFrame } from "@/components/store-frame";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")),
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
    <>
      <MotionSystem />
      <StoreFrame>{children}</StoreFrame>
    </>
  );
}
