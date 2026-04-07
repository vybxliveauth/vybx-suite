"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";
import { X } from "lucide-react";
import { fetchProfile, type AuthUser } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { VybxLogo } from "@/components/ui/VybxLogo";
import { tracker, AnalyticsEvents } from "@/lib/analytics";
import {
  API_BASE_URL,
  buildPublicKeyRequestOptions,
  getCsrfTokenFromCookie,
  getErrorMessage,
  lookupEmailIntent,
  serializeAssertionCredential,
} from "./auth-modal/helpers";

import {
  EmailStep,
  ForgotPasswordStep,
  IntentFallbackStep,
  LoginStep,
  RegisterStep,
  TwoFactorStep,
  VerifyStep,
} from "./auth-modal/steps";

type Step = "email" | "intent" | "login" | "register" | "verify" | "2fa" | "forgot";

export function AuthModal({
  open,
  onClose,
  defaultTab = "login",
}: {
  open: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register";
}) {
  const { resolvedTheme } = useTheme();
  const isLightTheme = resolvedTheme === "light";
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [emailNotice, setEmailNotice] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [resolvingEmail, setResolvingEmail] = useState(false);
  const [passkeyPending, setPasskeyPending] = useState(false);
  const [twoFactorData, setTwoFactorData] = useState<{ challengeId: string; expiresIn: number; message: string } | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const { setUser } = useAuthStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      tracker.track(AnalyticsEvents.AUTH_MODAL_OPENED);
      setStep(defaultTab === "register" ? "email" : "email");
      setEmail("");
      setEmailNotice(null);
      setEmailError(null);
      setResolvingEmail(false);
      setPasskeyPending(false);
      setTwoFactorData(null);
      setVerifiedEmail("");
    }
  }, [open, defaultTab]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const onChange = () => setIsMobileViewport(media.matches);
    onChange();
    if (media.addEventListener) {
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    }
    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, []);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      requestAnimationFrame(() => modalRef.current?.focus());
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab" || !modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    },
    [onClose],
  );

  useEffect(() => {
    if (open) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function handleLoginSuccess(user: AuthUser) {
    setUser(user);
    onClose();
  }

  function handleTwoFactor(challengeId: string, expiresIn: number, message: string) {
    setTwoFactorData({ challengeId, expiresIn, message });
    setStep("2fa");
  }

  function handleRegisterSuccess(registeredEmail: string) {
    setVerifiedEmail(registeredEmail);
    setStep("verify");
  }

  async function handleEmailContinue(nextEmail: string) {
    const normalizedEmail = nextEmail.trim().toLowerCase();
    setEmail(normalizedEmail);
    setEmailNotice(null);
    setEmailError(null);
    setResolvingEmail(true);

    try {
      const result = await lookupEmailIntent(normalizedEmail);
      if (result.intent === "register") {
        setEmailNotice("No encontramos una cuenta con ese correo. Te ayudamos a crearla.");
        setStep("register");
        return;
      }
      if (result.intent === "login") {
        setStep("login");
        return;
      }

      if (result.status === "unavailable") {
        setEmailNotice("Validación automática no disponible ahora. Elige cómo deseas continuar.");
      } else {
        setEmailNotice("No pudimos interpretar la respuesta del correo. Elige cómo deseas continuar.");
      }
      setStep("intent");
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "No pudimos validar el correo.");
    } finally {
      setResolvingEmail(false);
    }
  }

  async function handlePasskeySignIn(nextEmail: string) {
    const normalizedEmail = nextEmail.trim().toLowerCase();
    setEmail(normalizedEmail);
    setEmailNotice(null);
    setEmailError(null);

    if (
      typeof window === "undefined" ||
      typeof navigator === "undefined" ||
      typeof window.PublicKeyCredential === "undefined" ||
      typeof navigator.credentials?.get !== "function"
    ) {
      setEmailError("Este dispositivo o navegador no soporta passkeys.");
      return;
    }

    setPasskeyPending(true);
    try {
      // 1. Get authentication challenge from backend (no email needed — discoverable credential)
      const optionsRes = await fetch(`${API_BASE_URL}/auth/passkey/authenticate/options`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": getCsrfTokenFromCookie(),
          Accept: "application/json",
        },
        body: JSON.stringify({}),
      });

      const optionsPayload = await optionsRes.json().catch(() => null);
      if (!optionsRes.ok) {
        throw new Error(getErrorMessage(optionsPayload, "No pudimos iniciar la autenticación con passkey."));
      }

      const publicKey = buildPublicKeyRequestOptions(optionsPayload);
      if (!publicKey) {
        setEmailError("La configuración de passkey no es válida en este momento.");
        return;
      }

      // 2. Prompt biometric / device authentication
      const assertion = await navigator.credentials.get({ publicKey });
      if (!(assertion instanceof PublicKeyCredential)) {
        setEmailError("No se pudo completar la autenticación con passkey.");
        return;
      }

      // 3. Verify on backend — sets access_token / refresh_token / csrf_token cookies
      const verifyRes = await fetch(`${API_BASE_URL}/auth/passkey/authenticate/verify`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": getCsrfTokenFromCookie(),
          Accept: "application/json",
        },
        body: JSON.stringify({ credential: serializeAssertionCredential(assertion) }),
      });

      const verifyPayload = await verifyRes.json().catch(() => null);
      if (!verifyRes.ok) {
        throw new Error(getErrorMessage(verifyPayload, "No pudimos verificar tu passkey."));
      }

      const user = await fetchProfile();
      handleLoginSuccess(user);
    } catch (err: unknown) {
      // User cancelled the browser prompt — suppress noisy DOMException
      if (err instanceof Error && err.name === "NotAllowedError") {
        setEmailError("Autenticación cancelada. Vuelve a intentarlo.");
      } else {
        setEmailError(err instanceof Error ? err.message : "Falló la autenticación con passkey.");
      }
    } finally {
      setPasskeyPending(false);
    }
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: "fixed", inset: 0, zIndex: 1300,
          background: isLightTheme ? "rgba(15,23,42,0.28)" : "rgba(2,6,23,0.58)",
          backdropFilter: isLightTheme ? "blur(5px)" : "blur(7px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s ease",
        }}
      />

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Autenticación"
        tabIndex={-1}
        style={{
          position: "fixed",
          top: isMobileViewport ? "max(0.75rem, env(safe-area-inset-top))" : "50%",
          left: "50%",
          transform: isMobileViewport
            ? `translate(-50%, ${open ? "0" : "10px"})`
            : `translate(-50%, ${open ? "-50%" : "-46%"})`,
          zIndex: 1400,
          width: isMobileViewport ? "min(460px, 96vw)" : "min(520px, 94vw)",
          maxHeight: isMobileViewport
            ? "calc(100dvh - 1rem - env(safe-area-inset-top))"
            : "min(860px, 93dvh)",
          background: isLightTheme
            ? "linear-gradient(160deg, rgba(255,255,255,0.97), rgba(248,250,252,0.94))"
            : "linear-gradient(160deg, color-mix(in oklab, var(--bg-dark) 90%, transparent), color-mix(in oklab, var(--bg-fade) 96%, transparent))",
          border: isLightTheme
            ? "1px solid rgba(15,23,42,0.14)"
            : "1px solid color-mix(in oklab, var(--glass-border) 78%, transparent)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: isLightTheme
            ? "0 22px 60px rgba(15,23,42,0.2)"
            : "0 34px 90px rgba(0,0,0,0.58)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s ease, transform 0.35s cubic-bezier(0.16,1,0.3,1)",
          overflowX: "hidden",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "-34% -12% auto",
            height: 220,
            background: isLightTheme
              ? "radial-gradient(ellipse at top, rgba(109,40,217,0.18) 0%, rgba(225,29,72,0.1) 34%, rgba(8,145,178,0.06) 50%, rgba(248,250,252,0) 74%)"
              : "radial-gradient(ellipse at top, rgba(124,58,237,0.3) 0%, rgba(255,42,95,0.16) 34%, rgba(8,145,178,0.1) 50%, rgba(7,11,22,0) 74%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        <div style={{
          position: "relative",
          zIndex: 1,
          padding: isMobileViewport ? "1.05rem 1.2rem 0.9rem" : "1.15rem 1.45rem 0.9rem",
          borderBottom: "1px solid color-mix(in oklab, var(--glass-border) 78%, transparent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <VybxLogo size={22} textSize="1.1rem" />
          <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              style={{
                background: isLightTheme ? "rgba(15,23,42,0.05)" : "rgba(255,255,255,0.04)",
                border: isLightTheme ? "1px solid rgba(15,23,42,0.14)" : "1px solid var(--glass-border)",
                borderRadius: "50%", width: 32, height: 32,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "var(--text-muted)",
                transition: "background 0.2s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = isLightTheme ? "rgba(15,23,42,0.1)" : "rgba(255,255,255,0.1)")}
              onMouseLeave={e => (e.currentTarget.style.background = isLightTheme ? "rgba(15,23,42,0.05)" : "rgba(255,255,255,0.04)")}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 1, padding: isMobileViewport ? "1.15rem 1.2rem 1.25rem" : "1.45rem 1.45rem 1.55rem", flex: 1 }}>
          {step === "email" && (
            <EmailStep
              onContinue={handleEmailContinue}
              onPasskey={handlePasskeySignIn}
              pending={resolvingEmail}
              passkeyPending={passkeyPending}
              notice={emailNotice}
              error={emailError}
              isLightTheme={isLightTheme}
            />
          )}
          {step === "intent" && (
            <IntentFallbackStep
              email={email}
              onBack={() => setStep("email")}
              onLogin={() => setStep("login")}
              onRegister={() => setStep("register")}
            />
          )}
          {step === "login" && (
            <LoginStep
              email={email}
              onBack={() => setStep("email")}
              onForgotPassword={() => setStep("forgot")}
              onCreateAccount={() => setStep("register")}
              onSuccess={handleLoginSuccess}
              onTwoFactor={handleTwoFactor}
            />
          )}
          {step === "forgot" && (
            <ForgotPasswordStep
              email={email}
              onBack={() => setStep("login")}
            />
          )}
          {step === "register" && (
            <RegisterStep
              email={email}
              onBack={() => setStep("email")}
              onSuccess={handleRegisterSuccess}
              onAccountExists={(existingEmail) => {
                setEmail(existingEmail);
                setEmailNotice("Este correo ya tiene cuenta. Ingresa tu contraseña para continuar.");
                setEmailError(null);
                setStep("login");
              }}
            />
          )}
          {step === "verify" && <VerifyStep email={verifiedEmail} />}
          {step === "2fa" && twoFactorData && (
            <TwoFactorStep
              challengeId={twoFactorData.challengeId}
              notice={twoFactorData.message}
              onSuccess={handleLoginSuccess}
              onBack={() => setStep("login")}
            />
          )}
        </div>
      </div>
    </>
  );
}
