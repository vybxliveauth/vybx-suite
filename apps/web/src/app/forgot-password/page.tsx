"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Zap, Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Send } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3004";

const schema = z.object({
  email: z.string().email("Email inválido"),
});
type Fields = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<Fields>({
    resolver: zodResolver(schema),
  });

  const [state, action, pending] = useActionState(
    async (_prev: { error: string | null; sent: boolean }, data: Fields) => {
      try {
        const res = await fetch(`${API}/auth/request-password-reset`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: data.email }),
        });
        // Backend always returns 200 (security: doesn't reveal if email exists)
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message ?? "Error enviando email");
        }
        return { error: null, sent: true };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Error inesperado", sent: false };
      }
    },
    { error: null, sent: false }
  );

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}>
        <div style={{ width: "100%", maxWidth: 440 }}>
          {/* Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none", marginBottom: "2.5rem", justifyContent: "center" }}>
            <Zap size={22} color="var(--accent-primary)" />
            <span style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", fontWeight: 900, color: "var(--text-light)" }}>vybx</span>
          </Link>

          <div style={{
            background: "var(--card-bg)",
            border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius-2xl)",
            padding: "2rem",
          }}>
            {state.sent ? (
              /* ── Success state ── */
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem", textAlign: "center" }}>
                <div style={{
                  width: 72, height: 72, borderRadius: "50%",
                  background: "rgba(34,197,94,0.12)",
                  border: "2px solid rgba(34,197,94,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <CheckCircle2 size={32} color="#4ade80" />
                </div>
                <div>
                  <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.4rem", fontWeight: 900, color: "var(--text-light)", marginBottom: "0.5rem" }}>
                    Revisa tu email
                  </h1>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>
                    Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña. El enlace expira en 30 minutos.
                  </p>
                </div>
                <Link href="/" className="btn-secondary" style={{ textDecoration: "none", marginTop: "0.5rem" }}>
                  <ArrowLeft size={15} /> Volver al inicio
                </Link>
              </div>
            ) : (
              /* ── Form ── */
              <>
                <div style={{ marginBottom: "1.75rem" }}>
                  <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", fontWeight: 900, color: "var(--text-light)", marginBottom: "0.4rem" }}>
                    ¿Olvidaste tu contraseña?
                  </h1>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
                    Ingresa tu email y te enviaremos un enlace para restablecerla.
                  </p>
                </div>

                <form onSubmit={handleSubmit((d) => action(d))} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {/* Email field */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Email
                    </label>
                    <div style={{ position: "relative" }}>
                      <Mail size={15} color="var(--text-muted)" style={{ position: "absolute", left: "0.9rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                      <input
                        {...register("email")}
                        type="email"
                        placeholder="tu@email.com"
                        autoComplete="email"
                        style={{
                          width: "100%",
                          padding: "0.7rem 0.9rem 0.7rem 2.4rem",
                          background: "rgba(255,255,255,0.04)",
                          border: `1px solid ${errors.email ? "rgba(244,63,94,0.6)" : "var(--glass-border)"}`,
                          borderRadius: "var(--radius-lg)",
                          color: "var(--text-light)",
                          fontSize: "0.92rem",
                          fontFamily: "var(--font-body)",
                          outline: "none",
                        }}
                        onFocus={e => { e.target.style.borderColor = "rgba(124,58,237,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.12)"; }}
                        onBlur={e => { e.target.style.borderColor = errors.email ? "rgba(244,63,94,0.6)" : "var(--glass-border)"; e.target.style.boxShadow = "none"; }}
                      />
                    </div>
                    {errors.email && (
                      <span style={{ fontSize: "0.75rem", color: "#f43f5e", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <AlertCircle size={12} /> {errors.email.message}
                      </span>
                    )}
                  </div>

                  {state.error && (
                    <div style={{ padding: "0.65rem 0.9rem", borderRadius: "var(--radius-md)", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", color: "#fda4af", fontSize: "0.82rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <AlertCircle size={14} /> {state.error}
                    </div>
                  )}

                  <button type="submit" disabled={pending} className="btn-primary" style={{ justifyContent: "center", marginTop: "0.25rem" }}>
                    {pending
                      ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Enviando...</>
                      : <><Send size={15} /> Enviar enlace</>
                    }
                  </button>
                </form>

                <div style={{ marginTop: "1.25rem", textAlign: "center" }}>
                  <Link href="/" style={{ fontSize: "0.85rem", color: "var(--text-muted)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--text-light)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
                  >
                    <ArrowLeft size={13} /> Volver al inicio
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
