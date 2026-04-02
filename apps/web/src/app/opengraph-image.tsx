import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 74px",
          background:
            "radial-gradient(circle at 16% -8%, rgba(124,58,237,0.72), transparent 42%), radial-gradient(circle at 86% 112%, rgba(255,42,95,0.58), transparent 44%), #090913",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "14px",
            fontSize: 42,
            fontWeight: 800,
            letterSpacing: "-0.03em",
          }}
        >
          <span style={{ color: "#ff2a5f" }}>⚡</span>
          Vybx
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              fontSize: 74,
              fontWeight: 900,
              lineHeight: 1.02,
              letterSpacing: "-0.04em",
              maxWidth: "920px",
            }}
          >
            Tickets para experiencias en vivo
          </div>
          <div
            style={{
              fontSize: 30,
              color: "rgba(255,255,255,0.84)",
              maxWidth: "760px",
              lineHeight: 1.3,
            }}
          >
            Descubre conciertos, festivales y eventos en segundos.
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}

