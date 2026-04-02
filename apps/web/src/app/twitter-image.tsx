import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 68px",
          background:
            "radial-gradient(circle at 20% 0%, rgba(124,58,237,0.7), transparent 36%), radial-gradient(circle at 100% 100%, rgba(255,42,95,0.62), transparent 42%), #0b0b15",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.02em" }}>
          Vybx
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div
            style={{
              fontSize: 66,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            Tu próxima experiencia empieza aquí
          </div>
          <div style={{ fontSize: 30, color: "rgba(255,255,255,0.84)" }}>
            Compra tickets sin filas y sin complicaciones.
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}

