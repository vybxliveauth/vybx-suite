"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Promoter route error:", error);
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
          borderRadius: "1rem",
          background: "var(--card-bg)",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "0.85rem", color: "#fda4af", marginBottom: "0.5rem" }}>
          Error 500
        </p>
        <h1
          style={{
            margin: 0,
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
          }}
        >
          Reintenta la accion. Si persiste, vuelve al dashboard.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem" }}>
          <button type="button" onClick={reset} className="btn-primary">
            Reintentar
          </button>
          <Link href="/dashboard" className="btn-secondary" style={{ textDecoration: "none" }}>
            Ir al dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
