"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, MailCheck, Zap } from "lucide-react";
import { resolveApiBaseUrl } from "@vybx/api-client";

const API_BASE_URL = resolveApiBaseUrl(
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3004/api/v1",
);

type VerifyState = "loading" | "success" | "error" | "missing-token";

function getTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  const hashToken = hashParams.get("token");
  if (hashToken) return hashToken;

  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get("token");
}

function parseErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const message = (payload as { message?: unknown }).message;
  if (typeof message === "string" && message.trim().length > 0) return message;
  if (Array.isArray(message)) {
    const merged = message.map((item) => String(item)).join(", ").trim();
    if (merged.length > 0) return merged;
  }
  if (message && typeof message === "object") {
    const nested = (message as { message?: unknown }).message;
    if (typeof nested === "string" && nested.trim().length > 0) return nested;
  }
  return fallback;
}

export default function VerifyEmailPage() {
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<VerifyState>("loading");
  const [message, setMessage] = useState("Verificando tu correo...");

  useEffect(() => {
    const parsed = getTokenFromUrl();
    setToken(parsed);
    if (!parsed) {
      setState("missing-token");
      setMessage("El enlace de verificación no es válido o está incompleto.");
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    async function verify() {
      setState("loading");
      setMessage("Verificando tu correo...");

      try {
        const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(parseErrorMessage(payload, "No se pudo verificar tu correo. Solicita un nuevo enlace."));
        }

        const successMessage = parseErrorMessage(
          payload,
          "Gracias por verificar tu correo. Ya puedes iniciar sesión."
        );
        if (!cancelled) {
          setState("success");
          setMessage(successMessage);
        }
      } catch (error) {
        if (!cancelled) {
          setState("error");
          setMessage(
            error instanceof Error
              ? error.message
              : "No se pudo verificar tu correo. Solicita un nuevo enlace."
          );
        }
      }
    }

    void verify();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const icon = useMemo(() => {
    if (state === "success") return <CheckCircle2 size={34} color="#4ade80" />;
    if (state === "loading") return <Loader2 size={30} color="#a78bfa" style={{ animation: "spin 1s linear infinite" }} />;
    return <AlertCircle size={34} color="#f43f5e" />;
  }, [state]);

  const title = useMemo(() => {
    if (state === "success") return "Correo verificado";
    if (state === "loading") return "Estamos verificando tu cuenta";
    return "No se pudo verificar";
  }, [state]);

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div style={{ width: "100%", maxWidth: 440 }}>
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              textDecoration: "none",
              marginBottom: "2.25rem",
            }}
          >
            <Zap size={22} color="var(--accent-primary)" />
            <span
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "1.5rem",
                fontWeight: 900,
                color: "var(--text-light)",
              }}
            >
              vybx
            </span>
          </Link>

          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--glass-border)",
              borderRadius: "var(--radius-2xl)",
              padding: "2rem",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.15rem", textAlign: "center" }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background:
                    state === "success"
                      ? "rgba(34,197,94,0.12)"
                      : state === "loading"
                        ? "rgba(167,139,250,0.12)"
                        : "rgba(244,63,94,0.12)",
                  border:
                    state === "success"
                      ? "2px solid rgba(74,222,128,0.35)"
                      : state === "loading"
                        ? "2px solid rgba(167,139,250,0.35)"
                        : "2px solid rgba(244,63,94,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {icon}
              </div>

              <div>
                <h1
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "1.35rem",
                    fontWeight: 900,
                    color: "var(--text-light)",
                    marginBottom: "0.45rem",
                  }}
                >
                  {title}
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.55 }}>{message}</p>
              </div>

              {state === "success" ? (
                <Link href="/" className="btn-primary" style={{ textDecoration: "none" }}>
                  <MailCheck size={15} />
                  Iniciar sesión
                </Link>
              ) : state === "loading" ? null : (
                <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", justifyContent: "center" }}>
                  <Link href="/forgot-password" className="btn-primary" style={{ textDecoration: "none" }}>
                    Solicitar nuevo enlace
                  </Link>
                  <Link
                    href="/"
                    style={{
                      textDecoration: "none",
                      color: "var(--text-muted)",
                      fontSize: "0.85rem",
                      padding: "0.65rem 0.8rem",
                    }}
                  >
                    Volver al inicio
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
