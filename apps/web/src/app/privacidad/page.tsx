import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 840, margin: "0 auto", padding: "5rem var(--page-inline) 6rem" }}>
      <Link href="/" className="btn-secondary" style={{ textDecoration: "none", marginBottom: "1.5rem" }}>
        Volver al inicio
      </Link>

      <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.9rem, 4vw, 2.6rem)", fontWeight: 900, marginTop: "1rem", marginBottom: "1rem" }}>
        Política de Privacidad
      </h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
        Versión beta: este documento puede actualizarse antes del lanzamiento oficial.
      </p>

      <section style={{ display: "grid", gap: "1rem", color: "var(--text-secondary)" }}>
        <p>Recolectamos únicamente los datos necesarios para registro, compra de tickets y soporte al usuario.</p>
        <p>No vendemos datos personales a terceros. Solo compartimos información con proveedores de pago y servicios necesarios para operar la plataforma.</p>
        <p>Puedes solicitar actualización o eliminación de tus datos escribiendo a soporte@vybxlive.com.</p>
      </section>
    </main>
  );
}
