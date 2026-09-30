import type { NextConfig } from "next";
import { imageHosts } from "./src/lib/image-hosts";
const config: NextConfig = {
  poweredByHeader: false,
  images: {
    // El rewrite de Vercel Services devuelve 404 para /_next/image.
    // Servir las imágenes originales evita activar el placeholder por error.
    unoptimized: true,
    remotePatterns: imageHosts.map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};
export default config;
