"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Web route error:", error);

    const message = `${error?.name ?? ""} ${error?.message ?? ""}`.toLowerCase();
    const looksLikeStaleChunk =
      message.includes("chunkloaderror") ||
      message.includes("loading chunk") ||
      message.includes("failed to fetch dynamically imported module") ||
      message.includes("css chunk");

    if (!looksLikeStaleChunk || typeof window === "undefined") return;

    const reloadFlag = "vybx.web.chunk-reload-once";
    if (window.sessionStorage.getItem(reloadFlag) === "1") return;

    window.sessionStorage.setItem(reloadFlag, "1");
    window.location.reload();
  }, [error]);

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 640,
          border: "1px solid rgba(244,63,94,0.35)",
          borderRadius: "var(--radius-2xl)",
          background: "var(--card-bg)",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <AlertCircle size={28} color="#fda4af" style={{ margin: "0 auto 0.75rem" }} />
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-heading)",
            fontSize: "1.8rem",
            fontWeight: 800,
            color: "var(--text-light)",
          }}
        >
          Ocurrio un error inesperado
        </h1>
        <p
          style={{
            marginTop: "0.75rem",
            marginBottom: "1.5rem",
            color: "var(--text-muted)",
            lineHeight: 1.6,
          }}
        >
          Intenta recargar esta vista. Si el error continua, vuelve al inicio.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem" }}>
          <button type="button" onClick={reset} className="btn-primary">
            <RotateCcw size={14} />
            Reintentar
          </button>
          <Link href="/" className="btn-secondary" style={{ textDecoration: "none" }}>
            Ir al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
