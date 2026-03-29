"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("Admin global error:", error);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          background: "#0b1020",
          color: "#e5e7eb",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <section
          style={{
            width: "100%",
            maxWidth: 640,
            border: "1px solid rgba(244,63,94,0.35)",
            borderRadius: "1rem",
            background: "rgba(15, 23, 42, 0.9)",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "0.85rem", color: "#fda4af", marginBottom: "0.5rem" }}>
            Error fatal
          </p>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800 }}>
            El panel se cayo de forma inesperada
          </h1>
          <p style={{ marginTop: "0.75rem", marginBottom: "1.5rem", color: "#94a3b8" }}>
            Puedes reintentar o volver al acceso principal del panel.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                border: 0,
                borderRadius: "999px",
                padding: "0.6rem 1rem",
                fontWeight: 700,
                cursor: "pointer",
                background: "#2563eb",
                color: "#fff",
              }}
            >
              Reintentar
            </button>
            <Link
              href="/login"
              style={{
                borderRadius: "999px",
                padding: "0.6rem 1rem",
                fontWeight: 700,
                textDecoration: "none",
                border: "1px solid rgba(148,163,184,0.4)",
                color: "#e5e7eb",
              }}
            >
              Ir a login
            </Link>
          </div>
        </section>
      </body>
    </html>
  );
}
