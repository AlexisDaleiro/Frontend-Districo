import type { Metadata } from "next";
import "../globals.css";
import "../motion.css";
import "../site.css";
import "../site-reference.css";
import "../site-motion.css";
import { MotionSystem } from "@/components/motion-system";
import { PublicHeader, PublicFooter } from "@/components/site-shell";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")),
  title: { default: "DISTRICO · Marcas para tu negocio en todo Uruguay", template: "%s | DISTRICO" },
  description: "DISTRICO distribuye alimento para mascotas, arenas sanitarias, cuidado animal y snacks en todo Uruguay. Conocé nuestras marcas y solicitá tu cuenta mayorista.",
  robots: { index: false, follow: false },
  openGraph: { type: "website", locale: "es_UY", siteName: "DISTRICO", title: "DISTRICO · Marcas para tu negocio en todo Uruguay", images: ["/tienda/opengraph-image"] },
  twitter: { card: "summary_large_image" },
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <><MotionSystem /><PublicHeader /><main id="contenido" className="site-page">{children}</main><PublicFooter /></>;
}
