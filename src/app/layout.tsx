import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Header, Footer } from "@/components/shell";
export const metadata: Metadata = {
  title: {
    default: "DISTRICO · Marcas que acompañan",
    template: "%s | DISTRICO",
  },
  description:
    "Descubrí nuestras marcas y soluciones para tu negocio. Catálogo y acceso mayorista de DISTRICO Uruguay.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-UY">
      <body>
        <Providers>
          <Header />
          <main id="contenido">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
