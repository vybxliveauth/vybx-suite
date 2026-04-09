"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { getApiBaseUrl } from "@/lib/api";
import { buildWebAppUrl } from "@/lib/routing";

type VerifyState = "loading" | "success" | "error" | "missing-token";

function getTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;

  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  const hashToken = hashParams.get("token");
  if (hashToken) return hashToken;

  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get("token");
}

function parseMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const maybeMessage = (payload as { message?: unknown }).message;

  if (typeof maybeMessage === "string" && maybeMessage.trim().length > 0) {
    return maybeMessage;
  }

  if (Array.isArray(maybeMessage)) {
    const merged = maybeMessage.map((item) => String(item)).join(", ").trim();
    if (merged.length > 0) return merged;
  }

  if (maybeMessage && typeof maybeMessage === "object") {
    const nested = (maybeMessage as { message?: unknown }).message;
    if (typeof nested === "string" && nested.trim().length > 0) {
      return nested;
    }
  }

  return fallback;
}

export default function VerifyEmailPage() {
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<VerifyState>("loading");
  const [message, setMessage] = useState("Verificando tu correo...");
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const backToSiteUrl = useMemo(() => buildWebAppUrl("/"), []);

  useEffect(() => {
    const parsed = getTokenFromUrl();
    setToken(parsed);

    const searchParams = new URLSearchParams(window.location.search);
    const emailFromQuery = searchParams.get("email")?.trim() ?? "";
    if (emailFromQuery) setResendEmail(emailFromQuery);

    if (!parsed) {
      setState("missing-token");
      setMessage("El enlace de verificacion no es valido o esta incompleto.");
    }
  }, []);

  async function handleResendVerification() {
    const normalizedEmail = resendEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setResendError("Ingresa el correo con el que creaste tu cuenta.");
      setResendNotice(null);
      return;
    }

    setResending(true);
    setResendError(null);
    setResendNotice(null);

    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/resend-verification`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          parseMessage(payload, "No se pudo reenviar el correo de verificacion."),
        );
      }

      setResendNotice(parseMessage(payload, "Te enviamos un nuevo correo de verificacion."));
    } catch (error) {
      setResendError(
        error instanceof Error
          ? error.message
          : "No se pudo reenviar el correo de verificacion.",
      );
    } finally {
      setResending(false);
    }
  }

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function verifyEmailToken() {
      setState("loading");
      setMessage("Verificando tu correo...");

      try {
        const response = await fetch(`${getApiBaseUrl()}/auth/verify-email`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            parseMessage(payload, "No se pudo verificar tu correo. Solicita un nuevo enlace."),
          );
        }

        if (!cancelled) {
          setState("success");
          setMessage(parseMessage(payload, "Correo verificado. Ya puedes iniciar sesion."));
        }
      } catch (error) {
        if (!cancelled) {
          setState("error");
          setMessage(
            error instanceof Error
              ? error.message
              : "No se pudo verificar tu correo. Solicita un nuevo enlace.",
          );
        }
      }
    }

    void verifyEmailToken();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-xl border border-border/60 bg-card p-6 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-border/60 bg-secondary">
          {state === "loading" ? (
            <Loader2 className="size-7 animate-spin text-primary" />
          ) : state === "success" ? (
            <CheckCircle2 className="size-7 text-emerald-400" />
          ) : (
            <AlertCircle className="size-7 text-destructive" />
          )}
        </div>

        <div>
          <h1 className="text-xl font-semibold">
            {state === "success"
              ? "Correo verificado"
              : state === "loading"
                ? "Validando enlace"
                : "No se pudo verificar"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        </div>

        {state === "success" ? (
          <Link href="/auth?mode=login" className="text-sm text-primary underline underline-offset-4">
            Ir a iniciar sesion
          </Link>
        ) : state === "loading" ? null : (
          <div className="space-y-3">
            <input
              type="email"
              placeholder="tu@email.com"
              value={resendEmail}
              onChange={(event) => setResendEmail(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
            <button
              type="button"
              onClick={() => void handleResendVerification()}
              disabled={resending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {resending ? <Loader2 className="size-4 animate-spin" /> : null}
              {resending ? "Reenviando..." : "Reenviar verificacion"}
            </button>
            {resendNotice ? <p className="text-xs text-emerald-300">{resendNotice}</p> : null}
            {resendError ? <p className="text-xs text-destructive">{resendError}</p> : null}
          </div>
        )}

        <div className="flex flex-col gap-2 text-xs text-muted-foreground">
          <Link href="/auth?mode=login" className="underline underline-offset-4">
            Volver a iniciar sesion
          </Link>
          <Link href={backToSiteUrl} className="underline underline-offset-4">
            Volver a Vybx
          </Link>
        </div>
      </div>
    </main>
  );
}
