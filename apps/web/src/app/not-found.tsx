import Link from "next/link";
import { Zap, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      textAlign: "center",
      gap: "1.5rem",
    }}>
      <div style={{
        fontFamily: "var(--font-heading)",
        fontSize: "clamp(5rem, 20vw, 12rem)",
        fontWeight: 900,
        letterSpacing: "-4px",
        lineHeight: 1,
        background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }}>
        404
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Zap size={20} color="var(--accent-primary)" />
        <span style={{ fontFamily: "var(--font-heading)", fontSize: "1.4rem", fontWeight: 800, color: "var(--text-light)" }}>
          Evento no encontrado
        </span>
      </div>

      <p style={{ color: "var(--text-muted)", fontSize: "1rem", maxWidth: 380, lineHeight: 1.6 }}>
        El evento que buscas no existe o fue eliminado. Vuelve al inicio para explorar otros eventos.
      </p>

      <Link href="/" className="btn-primary" style={{ textDecoration: "none" }}>
        <ArrowLeft size={16} />
        Volver al inicio
      </Link>
    </div>
  );
}
