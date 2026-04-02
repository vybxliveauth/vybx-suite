"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiUnsubscribeByToken } from "@/lib/api";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { VybxLogo } from "@/components/ui/VybxLogo";

function UnsubscribeContent() {
  const params = useSearchParams();
  const token = params.get("token")?.trim() || "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Procesando tu solicitud...");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!token) {
        if (!cancelled) {
          setStatus("error");
          setMessage("Enlace inválido. Falta el token de baja.");
        }
        return;
      }

      try {
        const response = await apiUnsubscribeByToken(token);
        if (!cancelled) {
          setStatus("success");
          setMessage(
            response.message ||
              "Tu correo quedó removido de comunicaciones promocionales.",
          );
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          setMessage(
            error instanceof Error
              ? error.message
              : "No pudimos procesar la baja en este momento.",
          );
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main id="main-content" className="auth-shell">
      <section className="auth-card" style={{ width: "100%", maxWidth: 520, textAlign: "center" }}>
        <Link href="/" className="auth-brand" style={{ marginBottom: "1rem" }} aria-label="Volver al inicio">
          <VybxLogo size={24} textSize="1.3rem" />
        </Link>

        {status === "loading" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
            <Loader2 size={26} style={{ animation: "spin 1s linear infinite" }} />
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{message}</p>
          </div>
        )}

        {status === "success" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
            <CheckCircle2 size={28} color="#4ade80" />
            <p style={{ color: "var(--text-light)", fontWeight: 700 }}>Baja confirmada</p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{message}</p>
          </div>
        )}

        {status === "error" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
            <AlertCircle size={28} color="#fb7185" />
            <p style={{ color: "var(--text-light)", fontWeight: 700 }}>No se pudo completar</p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{message}</p>
          </div>
        )}

        <div style={{ marginTop: "1.25rem" }}>
          <Link href="/" className="btn-secondary" style={{ textDecoration: "none", padding: "0.55rem 1rem" }}>
            Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem 1rem",
          }}
        >
          <Loader2 size={26} style={{ animation: "spin 1s linear infinite" }} />
        </main>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
