import localFont from "next/font/local";
import { Providers } from "@/components/providers";

const manrope = localFont({
  src: "../../../../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2",
  weight: "200 800",
  style: "normal",
  display: "swap",
  preload: true,
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-UY">
      <body className={manrope.className}><Providers release={process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown"} performanceEnvironment={process.env.VERCEL_ENV === "production" || (!process.env.VERCEL && process.env.NODE_ENV === "production") ? "PRODUCTION" : "LOCAL"}>{children}</Providers></body>
    </html>
  );
}
