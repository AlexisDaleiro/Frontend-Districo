import { ImageResponse } from "next/og";

export const alt = "DISTRICO · Marcas que acompañan";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        color: "white",
        background: "#204f5f",
      }}
    >
      <div
        style={{
          fontSize: 40,
          fontWeight: 800,
          letterSpacing: 6,
          color: "#b1ca00",
        }}
      >
        DISTRICO
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05 }}>
          Marcas que acompañan.
        </div>
        <div style={{ fontSize: 32, color: "#c9d6da" }}>
          Catálogo y acceso mayorista para comercios de Uruguay.
        </div>
      </div>
    </div>,
    size,
  );
}
