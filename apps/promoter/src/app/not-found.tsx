import Link from "next/link";

export default function NotFound() {
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
          maxWidth: 560,
          border: "1px solid var(--glass-border)",
          borderRadius: "1rem",
          background: "var(--card-bg)",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
          Error 404
        </p>
        <h1
          style={{
            margin: 0,
            fontSize: "1.8rem",
            fontWeight: 800,
            color: "var(--text-light)",
          }}
        >
          Pagina no encontrada
        </h1>
        <p
          style={{
            marginTop: "0.75rem",
            marginBottom: "1.5rem",
            color: "var(--text-muted)",
          }}
        >
          La pagina solicitada no esta disponible.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem" }}>
          <Link href="/dashboard" className="btn-primary" style={{ textDecoration: "none" }}>
            Ir al dashboard
          </Link>
          <Link href="/login" className="btn-secondary" style={{ textDecoration: "none" }}>
            Ir a login
          </Link>
        </div>
      </section>
    </main>
  );
}
