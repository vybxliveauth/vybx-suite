import Link from "next/link";

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 840, margin: "0 auto", padding: "5rem 5% 6rem" }}>
      <Link href="/" className="btn-secondary" style={{ textDecoration: "none", marginBottom: "1.5rem" }}>
        Volver al inicio
      </Link>

      <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.9rem, 4vw, 2.6rem)", fontWeight: 900, marginTop: "1rem", marginBottom: "1rem" }}>
        Términos y Condiciones
      </h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
        Versión beta: estas condiciones están sujetas a ajustes legales finales.
      </p>

      <section style={{ display: "grid", gap: "1rem", color: "var(--text-secondary)" }}>
        <p>El acceso a Vybx implica uso responsable de la cuenta y protección de credenciales de acceso.</p>
        <p>Las compras de tickets están sujetas a disponibilidad, políticas de cada evento y validación del procesador de pagos.</p>
        <p>Las solicitudes de cancelación o reembolso se gestionan conforme a las reglas del promotor y la normativa aplicable.</p>
      </section>
    </main>
  );
}
