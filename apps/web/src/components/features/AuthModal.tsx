"use client";

import { useState, useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/store/useAuthStore";
import { login, verifyLoginTwoFactor, type AuthUser } from "@/lib/api";
import { resolveApiBaseUrl } from "@vybx/api-client";
import {
  actionErrorState,
  actionSuccessState,
  uiActionInitialState,
  type UiActionState,
} from "@/lib/action-state";
import { getClientTurnstileToken } from "@/lib/turnstile";
import { TurnstileWidget } from "@/components/features/TurnstileWidget";
import { ActionFeedback } from "@/components/ui/action-feedback";
import Link from "next/link";
import {
  X,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Zap,
  CheckCircle2,
} from "lucide-react";

const API_BASE_URL = resolveApiBaseUrl(
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3004/api/v1",
);

// ─── Schemas ──────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Requerido"),
});

const registerSchema = z.object({
  firstName: z.string().min(2, "Mínimo 2 caracteres"),
  lastName: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z
    .string()
    .min(12, "Mínimo 12 caracteres")
    .regex(/[A-Z]/, "Debe tener mayúscula")
    .regex(/\d/, "Debe tener un número")
    .regex(/[^A-Za-z\d]/, "Debe tener un símbolo"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type LoginFields = z.infer<typeof loginSchema>;
type RegisterFields = z.infer<typeof registerSchema>;

// ─── Input Field ──────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  icon: Icon,
  suffix,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  icon?: React.ElementType;
  suffix?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        {Icon && (
          <Icon size={14} color="var(--text-muted)" style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        )}
        <input
          {...props}
          style={{
            width: "100%",
            padding: `0.65rem ${suffix ? "2.5rem" : "0.85rem"} 0.65rem ${Icon ? "2.3rem" : "0.85rem"}`,
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${error ? "rgba(244,63,94,0.6)" : "var(--glass-border)"}`,
            borderRadius: "var(--radius-lg)",
            color: "var(--text-light)",
            fontSize: "0.9rem",
            fontFamily: "var(--font-body)",
            outline: "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
          onFocus={e => {
            e.target.style.borderColor = "rgba(124,58,237,0.6)";
            e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)";
          }}
          onBlur={e => {
            e.target.style.borderColor = error ? "rgba(244,63,94,0.6)" : "var(--glass-border)";
            e.target.style.boxShadow = "none";
          }}
        />
        {suffix && (
          <div style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)" }}>
            {suffix}
          </div>
        )}
      </div>
      {error && (
        <span style={{ fontSize: "0.72rem", color: "#f43f5e", display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <AlertCircle size={11} /> {error}
        </span>
      )}
    </div>
  );
}

// ─── Login Tab ────────────────────────────────────────────────────────────────

function LoginTab({ onSuccess }: { onSuccess: (user: AuthUser) => void }) {
  const [showPass, setShowPass] = useState(false);
  const [twoFactorChallengeId, setTwoFactorChallengeId] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorNotice, setTwoFactorNotice] = useState<string | null>(null);
  const [twoFactorState, setTwoFactorState] = useState<UiActionState>(uiActionInitialState);
  const [verifyingTwoFactor, setVerifyingTwoFactor] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
  });

  const [state, action, pending] = useActionState<UiActionState, LoginFields>(
    async (_prev, data) => {
      try {
        const result = await login(data);
        if (!("user" in result)) {
          setTwoFactorChallengeId(result.challengeId);
          setTwoFactorCode("");
          setTwoFactorNotice(
            result.message ||
              `Codigo 2FA enviado. Expira en ${Math.max(1, Math.ceil(result.expiresInSeconds / 60))} min.`,
          );
          setTwoFactorState(uiActionInitialState);
          return uiActionInitialState;
        }
        setTwoFactorChallengeId(null);
        setTwoFactorCode("");
        setTwoFactorNotice(null);
        setTwoFactorState(uiActionInitialState);
        onSuccess(result.user);
        return actionSuccessState("Sesion iniciada.");
      } catch (e) {
        return actionErrorState(e, "Credenciales incorrectas");
      }
    },
    uiActionInitialState,
  );

  async function handleVerifyTwoFactor() {
    if (!twoFactorChallengeId) return;

    const normalizedCode = twoFactorCode.trim();
    if (normalizedCode.length < 4) {
      setTwoFactorState(actionErrorState(new Error("Ingresa el codigo 2FA de tu correo.")));
      return;
    }

    setVerifyingTwoFactor(true);
    setTwoFactorState(uiActionInitialState);
    try {
      const user = await verifyLoginTwoFactor({
        challengeId: twoFactorChallengeId,
        code: normalizedCode,
      });
      setTwoFactorState(actionSuccessState("Verificacion 2FA completada."));
      onSuccess(user);
    } catch (error) {
      setTwoFactorState(actionErrorState(error, "Codigo 2FA invalido."));
    } finally {
      setVerifyingTwoFactor(false);
    }
  }

  function resetTwoFactorFlow() {
    setTwoFactorChallengeId(null);
    setTwoFactorCode("");
    setTwoFactorNotice(null);
    setTwoFactorState(uiActionInitialState);
  }

  return (
    <form
      onSubmit={handleSubmit((data) => action(data))}
      style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}
    >
      <Field label="Email" icon={Mail} type="email" {...register("email")} error={errors.email?.message} placeholder="tu@email.com" autoComplete="email" />
      <Field
        label="Contraseña"
        icon={Lock}
        type={showPass ? "text" : "password"}
        {...register("password")}
        error={errors.password?.message}
        placeholder="••••••••"
        autoComplete="current-password"
        suffix={
          <button type="button" onClick={() => setShowPass(!showPass)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        }
      />

      {twoFactorChallengeId && (
        <div
          style={{
            border: "1px solid rgba(124,58,237,0.35)",
            background: "rgba(124,58,237,0.08)",
            borderRadius: "var(--radius-lg)",
            padding: "0.9rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            {twoFactorNotice ?? "Te enviamos un codigo de verificacion 2FA a tu correo."}
          </p>
          <Field
            label="Codigo 2FA"
            icon={Lock}
            value={twoFactorCode}
            onChange={(event) => setTwoFactorCode(event.target.value)}
            placeholder="000000"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={10}
          />
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => void handleVerifyTwoFactor()}
              disabled={verifyingTwoFactor}
              className="btn-primary"
              style={{ justifyContent: "center", minWidth: 180 }}
            >
              {verifyingTwoFactor
                ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Verificando...</>
                : "Validar codigo"
              }
            </button>
            <button
              type="button"
              onClick={resetTwoFactorFlow}
              className="btn-secondary"
              style={{ justifyContent: "center" }}
            >
              Cambiar cuenta
            </button>
          </div>
          <ActionFeedback status={twoFactorState.status} message={twoFactorState.message} />
        </div>
      )}

      <ActionFeedback status={state.status} message={state.message} />

      <button
        type="submit"
        disabled={pending}
        className="btn-primary"
        style={{ justifyContent: "center", padding: "0.8rem", marginTop: "0.25rem", width: "100%" }}
      >
        {pending
          ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Ingresando...</>
          : <><Lock size={15} /> Ingresar</>
        }
      </button>

      <div style={{ textAlign: "center", marginTop: "0.85rem" }}>
        <Link href="/forgot-password" style={{ fontSize: "0.82rem", color: "var(--text-muted)", textDecoration: "none" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--accent-secondary)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
    </form>
  );
}

// ─── Register Tab ─────────────────────────────────────────────────────────────

function RegisterTab({ onSuccess }: { onSuccess: () => void }) {
  const [showPass, setShowPass] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string>("");
  const [resendingVerification, setResendingVerification] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFields>({
    resolver: zodResolver(registerSchema),
  });

  const [state, action, pending] = useActionState<UiActionState, RegisterFields>(
    async (_prev, data) => {
      try {
        const csrfToken = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/)?.[1] ?? "";
        const turnstileToken = getClientTurnstileToken("register");
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
          body: JSON.stringify({
            email: data.email,
            password: data.password,
            firstName: data.firstName,
            lastName: data.lastName,
            turnstileToken,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(Array.isArray(err.message) ? err.message.join(", ") : err.message ?? "Error al registrar");
        }
        setRegisteredEmail(data.email);
        setResendNotice(null);
        setResendError(null);
        onSuccess();
        return actionSuccessState("Revisa tu email para verificar tu cuenta.");
      } catch (e) {
        return actionErrorState(e, "Error al registrar");
      }
    },
    uiActionInitialState,
  );

  async function handleResendVerification() {
    if (!registeredEmail.trim()) return;

    setResendingVerification(true);
    setResendNotice(null);
    setResendError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registeredEmail.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          typeof payload?.message === "string"
            ? payload.message
            : "No pudimos reenviar el correo de verificación.";
        throw new Error(message);
      }
      setResendNotice(
        typeof payload?.message === "string"
          ? payload.message
          : "Te enviamos un nuevo correo de verificación.",
      );
    } catch (error) {
      setResendError(
        error instanceof Error
          ? error.message
          : "No pudimos reenviar el correo de verificación.",
      );
    } finally {
      setResendingVerification(false);
    }
  }

  if (state.status === "success") {
    return (
      <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
        <CheckCircle2 size={40} color="#4ade80" style={{ margin: "0 auto 1rem" }} />
        <p style={{ fontFamily: "var(--font-heading)", fontSize: "1.1rem", fontWeight: 800, color: "var(--text-light)", marginBottom: "0.5rem" }}>
          ¡Cuenta creada!
        </p>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{state.message}</p>
        {registeredEmail ? (
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
            Correo enviado a <strong style={{ color: "var(--text-light)" }}>{registeredEmail}</strong>
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => void handleResendVerification()}
          disabled={resendingVerification}
          className="btn-secondary"
          style={{ justifyContent: "center", padding: "0.72rem", marginTop: "0.9rem", width: "100%" }}
        >
          {resendingVerification
            ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Reenviando...</>
            : "Reenviar verificación"
          }
        </button>
        {resendNotice ? (
          <p style={{ fontSize: "0.78rem", color: "#9ff3c3", marginTop: "0.55rem" }}>{resendNotice}</p>
        ) : null}
        {resendError ? (
          <p style={{ fontSize: "0.78rem", color: "#fda4af", marginTop: "0.55rem" }}>{resendError}</p>
        ) : null}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((data) => action(data))}
      style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}
    >
      <div className="grid-2col" style={{ gap: "0.75rem" }}>
        <Field label="Nombre" icon={User} {...register("firstName")} error={errors.firstName?.message} placeholder="Juan" autoComplete="given-name" />
        <Field label="Apellido" {...register("lastName")} error={errors.lastName?.message} placeholder="Pérez" autoComplete="family-name" />
      </div>
      <Field label="Email" icon={Mail} type="email" {...register("email")} error={errors.email?.message} placeholder="tu@email.com" autoComplete="email" />
      <Field
        label="Contraseña"
        icon={Lock}
        type={showPass ? "text" : "password"}
        {...register("password")}
        error={errors.password?.message}
        placeholder="Mín. 12 caracteres"
        autoComplete="new-password"
        suffix={
          <button type="button" onClick={() => setShowPass(!showPass)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        }
      />
      <Field
        label="Confirmar contraseña"
        icon={Lock}
        type={showPass ? "text" : "password"}
        {...register("confirmPassword")}
        error={errors.confirmPassword?.message}
        placeholder="Repite la contraseña"
        autoComplete="new-password"
      />
      <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
        La contraseña debe tener mínimo 12 caracteres, una mayúscula, un número y un símbolo.
      </p>

      <TurnstileWidget action="register" />

      <ActionFeedback status={state.status} message={state.message} />

      <button
        type="submit"
        disabled={pending}
        className="btn-primary"
        style={{ justifyContent: "center", padding: "0.8rem", marginTop: "0.25rem", width: "100%" }}
      >
        {pending
          ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Creando cuenta...</>
          : "Crear cuenta"
        }
      </button>
    </form>
  );
}

// ─── Auth Modal ───────────────────────────────────────────────────────────────

export function AuthModal({
  open,
  onClose,
  defaultTab = "login",
}: {
  open: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register";
}) {
  const [tab, setTab] = useState<"login" | "register">(defaultTab);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const { setUser } = useAuthStore();

  useEffect(() => { if (open) setTab(defaultTab); }, [open, defaultTab]);

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
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function handleLoginSuccess(user: AuthUser) {
    setUser(user);
    onClose();
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 1300,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(6px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s ease",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: isMobileViewport ? "max(0.75rem, env(safe-area-inset-top))" : "50%",
          left: "50%",
          transform: isMobileViewport
            ? `translate(-50%, ${open ? "0" : "8px"})`
            : `translate(-50%, ${open ? "-50%" : "-45%"})`,
          zIndex: 1400,
          width: "min(460px, 96vw)",
          maxHeight: isMobileViewport
            ? "calc(100dvh - 1rem - env(safe-area-inset-top))"
            : "min(780px, 92dvh)",
          background: "var(--bg-dark)",
          border: "1px solid var(--glass-border)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s ease, transform 0.3s cubic-bezier(0.16,1,0.3,1)",
          overflowX: "hidden",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Header */}
        <div style={{ padding: "1.5rem 1.75rem 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Zap size={18} color="var(--accent-primary)" />
            <span style={{ fontFamily: "var(--font-heading)", fontSize: "1.25rem", fontWeight: 900, color: "var(--text-light)" }}>vybx</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-muted)" }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", padding: "1.25rem 1.75rem 0", gap: "0.25rem" }}>
          {(["login", "register"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: "0.55rem",
                borderRadius: "var(--radius-lg)",
                border: "none",
                cursor: "pointer",
                fontSize: "0.88rem",
                fontWeight: 700,
                fontFamily: "var(--font-body)",
                transition: "all 0.2s ease",
                background: tab === t ? "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))" : "rgba(255,255,255,0.04)",
                color: tab === t ? "#fff" : "var(--text-muted)",
              }}
            >
              {t === "login" ? "Ingresar" : "Crear cuenta"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="auth-modal-content" style={{ padding: "1.5rem 1.75rem 1.75rem" }}>
          {tab === "login"
            ? <LoginTab onSuccess={handleLoginSuccess} />
            : <RegisterTab onSuccess={() => setTab("login")} />
          }
        </div>
      </div>
    </>
  );
}
