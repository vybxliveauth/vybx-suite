"use client";

import { useEffect, useState, useActionState } from "react";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Zap, Lock, Eye, EyeOff, CheckCircle2,
  AlertCircle, Loader2, ShieldCheck, ArrowLeft,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  actionErrorState,
  actionSuccessState,
  uiActionInitialState,
  type UiActionState,
} from "@/lib/action-state";
import { ActionFeedback } from "@/components/ui/action-feedback";
import { resolveApiBaseUrl } from "@vybx/api-client";

const API_BASE_URL = resolveApiBaseUrl(
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3004/api/v1",
);

const schema = z.object({
  password: z
    .string()
    .min(12, "Mínimo 12 caracteres")
    .regex(/[A-Z]/, "Debe tener mayúscula")
    .regex(/\d/, "Debe tener un número")
    .regex(/[^A-Za-z\d]/, "Debe tener un símbolo"),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: "Las contraseñas no coinciden",
  path: ["confirm"],
});

type Fields = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [verifiedByRecovery, setVerifiedByRecovery] = useState(false);
  const [verifyingEmailToken, setVerifyingEmailToken] = useState(false);

  // Token arrives as hash fragment to avoid server-side logging
  useEffect(() => {
    const hash = window.location.hash.slice(1); // remove "#"
    const params = new URLSearchParams(hash);
    const hashToken = params.get("token");
    if (hashToken?.trim()) {
      setToken(hashToken.trim());
      return;
    }

    const search = new URLSearchParams(window.location.search);
    const queryToken = search.get("token");
    setToken(queryToken?.trim() || null);
  }, []);

  // Recovery guard: if a verification token reaches this reset route by mistake,
  // attempt email verification first to avoid showing a confusing reset-expired error.
  useEffect(() => {
    if (!token || verifiedByRecovery) return;

    let cancelled = false;
    async function tryVerifyEmailToken() {
      setVerifyingEmailToken(true);
      try {
        const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        if (!cancelled && response.ok) {
          setVerifiedByRecovery(true);
        }
      } catch {
        // Ignore errors here: this is a best-effort safety check.
      } finally {
        if (!cancelled) {
          setVerifyingEmailToken(false);
        }
      }
    }

    void tryVerifyEmailToken();
    return () => {
      cancelled = true;
    };
  }, [token, verifiedByRecovery]);

  const { register, handleSubmit, formState: { errors } } = useForm<Fields>({
    resolver: zodResolver(schema),
  });

  const [state, action, pending] = useActionState<UiActionState, Fields>(
    async (_prev, data) => {
      if (!token) {
        return actionErrorState(new Error("Token inválido o expirado"));
      }
      try {
        await api.post("/auth/reset-password", { token, password: data.password });
        return actionSuccessState("Tu contraseña fue actualizada correctamente.");
      } catch (e) {
        return actionErrorState(e, "Error inesperado");
      }
    },
    uiActionInitialState,
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
            {state.status === "success" ? (
              /* ── Success ── */
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
                    Contraseña actualizada
                  </h1>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    {state.message}
                  </p>
                </div>
                <Link href="/" className="btn-primary" style={{ textDecoration: "none" }}>
                  Ir al inicio
                </Link>
              </div>
            ) : verifiedByRecovery ? (
              /* ── Recovered verification token ── */
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
                    Correo verificado
                  </h1>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    Detectamos un enlace de verificación en la ruta de contraseña. Ya verificamos tu cuenta correctamente.
                  </p>
                </div>
                <Link href="/" className="btn-primary" style={{ textDecoration: "none" }}>
                  Ir al inicio
                </Link>
              </div>
            ) : !token ? (
              /* ── No token ── */
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", textAlign: "center" }}>
                <AlertCircle size={40} color="#f43f5e" style={{ opacity: 0.7 }} />
                <div>
                  <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.3rem", fontWeight: 900, color: "var(--text-light)", marginBottom: "0.4rem" }}>
                    Enlace inválido
                  </h1>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
                    Este enlace no es válido o ya expiró. Solicita uno nuevo.
                  </p>
                </div>
                <Link href="/forgot-password" className="btn-primary" style={{ textDecoration: "none" }}>
                  Solicitar nuevo enlace
                </Link>
              </div>
            ) : verifyingEmailToken ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", textAlign: "center" }}>
                <Loader2 size={34} color="#a78bfa" style={{ animation: "spin 1s linear infinite" }} />
                <div>
                  <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.3rem", fontWeight: 900, color: "var(--text-light)", marginBottom: "0.4rem" }}>
                    Validando enlace
                  </h1>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
                    Estamos revisando si este enlace corresponde a verificación de correo o cambio de contraseña.
                  </p>
                </div>
              </div>
            ) : (
              /* ── Form ── */
              <>
                <div style={{ marginBottom: "1.75rem" }}>
                  <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", fontWeight: 900, color: "var(--text-light)", marginBottom: "0.4rem" }}>
                    Nueva contraseña
                  </h1>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
                    Elige una contraseña segura para tu cuenta.
                  </p>
                </div>

                <form onSubmit={handleSubmit((d) => action(d))} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {/* Password field */}
                  {(["password", "confirm"] as const).map((field) => (
                    <div key={field} style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        {field === "password" ? "Nueva contraseña" : "Confirmar contraseña"}
                      </label>
                      <div style={{ position: "relative" }}>
                        <Lock size={15} color="var(--text-muted)" style={{ position: "absolute", left: "0.9rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                        <input
                          {...register(field)}
                          type={showPass ? "text" : "password"}
                          placeholder="••••••••••••"
                          autoComplete={field === "password" ? "new-password" : "new-password"}
                          style={{
                            width: "100%",
                            padding: "0.7rem 2.5rem 0.7rem 2.4rem",
                            background: "rgba(255,255,255,0.04)",
                            border: `1px solid ${errors[field] ? "rgba(244,63,94,0.6)" : "var(--glass-border)"}`,
                            borderRadius: "var(--radius-lg)",
                            color: "var(--text-light)",
                            fontSize: "0.92rem",
                            fontFamily: "var(--font-body)",
                            outline: "none",
                          }}
                          onFocus={e => { e.target.style.borderColor = "rgba(124,58,237,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.12)"; }}
                          onBlur={e => { e.target.style.borderColor = errors[field] ? "rgba(244,63,94,0.6)" : "var(--glass-border)"; e.target.style.boxShadow = "none"; }}
                        />
                        {field === "password" && (
                          <button
                            type="button"
                            onClick={() => setShowPass(!showPass)}
                            style={{ position: "absolute", right: "0.9rem", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}
                          >
                            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        )}
                      </div>
                      {errors[field] && (
                        <span style={{ fontSize: "0.75rem", color: "#f43f5e", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <AlertCircle size={12} /> {errors[field]?.message}
                        </span>
                      )}
                    </div>
                  ))}

                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                    Mínimo 12 caracteres · una mayúscula · un número · un símbolo
                  </p>

                  <ActionFeedback status={state.status} message={state.message} />

                  <button type="submit" disabled={pending} className="btn-primary" style={{ justifyContent: "center", marginTop: "0.25rem" }}>
                    {pending
                      ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Actualizando...</>
                      : <><ShieldCheck size={15} /> Actualizar contraseña</>
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
