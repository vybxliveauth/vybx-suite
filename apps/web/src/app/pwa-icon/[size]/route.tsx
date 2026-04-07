import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const ALLOWED = new Set([192, 512]);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size: sizeStr } = await params;
  const size = parseInt(sizeStr, 10);
  if (!ALLOWED.has(size)) return new Response("Not found", { status: 404 });

  const r = Math.round(size * 0.22); // border-radius
  const pad = Math.round(size * 0.18);
  const innerR = Math.round(size * 0.15);
  const fs = Math.round(size * 0.42);

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #13062a 0%, #090913 100%)",
          borderRadius: r,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #7c3aed 0%, #ff2a5f 100%)",
            borderRadius: innerR,
            padding: pad,
          }}
        >
          <span
            style={{
              fontFamily: "sans-serif",
              fontWeight: 900,
              fontSize: fs,
              color: "#ffffff",
              letterSpacing: "-0.04em",
              lineHeight: 1,
            }}
          >
            V
          </span>
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
      headers: {
        "Cache-Control": "public, max-age=86400, immutable",
        "Content-Type": "image/png",
      },
    },
  );
}
