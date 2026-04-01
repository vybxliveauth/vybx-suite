"use client";

import { useState, useActionState, useEffect, useRef, useCallback } from "react";
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
import { PasswordStrengthMeter } from "@/components/features/PasswordStrengthMeter";
import { ActionFeedback } from "@vybx/ui";
import { VybxLogo } from "@/components/ui/VybxLogo";
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
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Globe,
} from "lucide-react";

const API_BASE_URL = resolveApiBaseUrl(
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3004/api/v1",
);

// ─── Schemas ──────────────────────────────────────────────────────────────────

const emailSchema = z.object({
  email: z.string().email("Email inválido"),
});

const loginSchema = z.object({
  password: z.string().min(1, "Requerido"),
});

const registerSchema = z.object({
  firstName: z.string().min(2, "Mínimo 2 caracteres"),
  lastName: z.string().min(2, "Mínimo 2 caracteres"),
  password: z
    .string()
    .min(12, "Mínimo 12 caracteres")
    .regex(/[A-Z]/, "Debe tener mayúscula")
    .regex(/\d/, "Debe tener un número")
    .regex(/[^A-Za-z\d]/, "Debe tener un símbolo"),
  confirmPassword: z.string(),
  country: z.string().optional(),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Debes aceptar los términos" }) }),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type EmailFields = z.infer<typeof emailSchema>;
type LoginFields = z.infer<typeof loginSchema>;
type RegisterFields = z.infer<typeof registerSchema>;

type Step = "email" | "login" | "register" | "verify" | "2fa";

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
            padding: `0.7rem ${suffix ? "2.5rem" : "0.9rem"} 0.7rem ${Icon ? "2.4rem" : "0.9rem"}`,
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${error ? "rgba(244,63,94,0.6)" : "var(--glass-border)"}`,
            borderRadius: "var(--radius-lg)",
            color: "var(--text-light)",
            fontSize: "0.92rem",
            fontFamily: "var(--font-body)",
            outline: "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
          onFocus={e => {
            e.target.style.borderColor = "rgba(124,58,237,0.7)";
            e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.12)";
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

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepDots({ current }: { current: 1 | 2 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
      {[1, 2].map((n) => (
        <div
          key={n}
          style={{
            width: n === current ? 20 : 7,
            height: 7,
            borderRadius: 999,
            background: n === current
              ? "linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))"
              : "rgba(255,255,255,0.15)",
            transition: "all 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}

// ─── Email Step ───────────────────────────────────────────────────────────────

function EmailStep({
  onLogin,
  onRegister,
}: {
  onLogin: (email: string) => void;
  onRegister: (email: string) => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<EmailFields>({
    resolver: zodResolver(emailSchema),
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.35rem", fontWeight: 900, color: "var(--text-light)", marginBottom: "0.3rem" }}>
          Bienvenido a vybx
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Ingresa tu correo para continuar
        </p>
      </div>

      <form
        onSubmit={handleSubmit((d) => onLogin(d.email))}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <Field
          label="Correo electrónico"
          icon={Mail}
          type="email"
          {...register("email")}
          error={errors.email?.message}
          placeholder="tu@email.com"
          autoComplete="email"
          autoFocus
        />

        <button
          type="submit"
          className="btn-primary"
          style={{ justifyContent: "center", padding: "0.85rem", width: "100%", fontSize: "0.95rem", gap: "0.5rem" }}
        >
          Continuar <ArrowRight size={16} />
        </button>
      </form>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{ flex: 1, height: 1, background: "var(--glass-border)" }} />
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>o</span>
        <div style={{ flex: 1, height: 1, background: "var(--glass-border)" }} />
      </div>

      <button
        type="button"
        onClick={handleSubmit((d) => onRegister(d.email))}
        className="btn-secondary"
        style={{ justifyContent: "center", padding: "0.8rem", width: "100%", fontSize: "0.9rem" }}
      >
        Crear cuenta nueva
      </button>

      <p style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
        Al continuar aceptas nuestros{" "}
        <Link href="/terminos" style={{ color: "var(--accent-secondary)", textDecoration: "none" }}>Términos</Link>
        {" "}y{" "}
        <Link href="/privacidad" style={{ color: "var(--accent-secondary)", textDecoration: "none" }}>Política de privacidad</Link>
      </p>
    </div>
  );
}

// ─── Login Step ───────────────────────────────────────────────────────────────

function LoginStep({
  email,
  onBack,
  onSuccess,
  onTwoFactor,
}: {
  email: string;
  onBack: () => void;
  onSuccess: (user: AuthUser) => void;
  onTwoFactor: (challengeId: string, expiresIn: number, message: string) => void;
}) {
  const [showPass, setShowPass] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
  });

  const [state, action, pending] = useActionState<UiActionState, LoginFields>(
    async (_prev, data) => {
      try {
        const result = await login({ email, password: data.password });
        if (!("user" in result)) {
          onTwoFactor(result.challengeId, result.expiresInSeconds, result.message ?? "");
          return uiActionInitialState;
        }
        onSuccess(result.user);
        return actionSuccessState("Sesión iniciada.");
      } catch (e) {
        return actionErrorState(e, "Credenciales incorrectas");
      }
    },
    uiActionInitialState,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <button
          type="button"
          onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", padding: 0, marginBottom: "0.75rem" }}
        >
          <ArrowLeft size={14} /> Cambiar email
        </button>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.35rem", fontWeight: 900, color: "var(--text-light)", marginBottom: "0.2rem" }}>
          Ingresa tu contraseña
        </h2>
        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <Mail size={13} /> {email}
        </p>
      </div>

      <form
        onSubmit={handleSubmit((data) => action(data))}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <Field
          label="Contraseña"
          icon={Lock}
          type={showPass ? "text" : "password"}
          {...register("password")}
          error={errors.password?.message}
          placeholder="••••••••"
          autoComplete="current-password"
          autoFocus
          suffix={
            <button type="button" onClick={() => setShowPass(!showPass)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          }
        />

        <ActionFeedback status={state.status} message={state.message} />

        <button
          type="submit"
          disabled={pending}
          className="btn-primary"
          style={{ justifyContent: "center", padding: "0.85rem", width: "100%", fontSize: "0.95rem" }}
        >
          {pending ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Ingresando...</> : "Ingresar"}
        </button>

        <div style={{ textAlign: "center" }}>
          <Link
            href="/forgot-password"
            style={{ fontSize: "0.8rem", color: "var(--text-muted)", textDecoration: "none" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--accent-secondary)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </form>
    </div>
  );
}

// ─── Register Step ────────────────────────────────────────────────────────────

function RegisterStep({
  email,
  onBack,
  onSuccess,
}: {
  email: string;
  onBack: () => void;
  onSuccess: (registeredEmail: string) => void;
}) {
  const [showPass, setShowPass] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterFields>({
    resolver: zodResolver(registerSchema),
  });
  const passwordValue = watch("password", "");

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
            email,
            password: data.password,
            firstName: data.firstName,
            lastName: data.lastName,
            country: data.country || undefined,
            turnstileToken,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(Array.isArray(err.message) ? err.message.join(", ") : err.message ?? "Error al registrar");
        }
        onSuccess(email);
        return actionSuccessState("Revisa tu email para verificar tu cuenta.");
      } catch (e) {
        return actionErrorState(e, "Error al registrar");
      }
    },
    uiActionInitialState,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <button
          type="button"
          onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", padding: 0, marginBottom: "0.75rem" }}
        >
          <ArrowLeft size={14} /> Atrás
        </button>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.35rem", fontWeight: 900, color: "var(--text-light)", marginBottom: "0.2rem" }}>
          Crea tu cuenta
        </h2>
        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <Mail size={13} /> {email}
        </p>
      </div>

      <form
        onSubmit={handleSubmit((data) => action(data))}
        style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}
      >
        {/* Name row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <Field
            label="Nombre"
            icon={User}
            {...register("firstName")}
            error={errors.firstName?.message}
            placeholder="Juan"
            autoComplete="given-name"
            autoFocus
          />
          <Field
            label="Apellido"
            {...register("lastName")}
            error={errors.lastName?.message}
            placeholder="Pérez"
            autoComplete="family-name"
          />
        </div>

        {/* Password */}
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
        <PasswordStrengthMeter value={passwordValue} />

        {/* Confirm password */}
        <Field
          label="Confirmar contraseña"
          icon={Lock}
          type={showPass ? "text" : "password"}
          {...register("confirmPassword")}
          error={errors.confirmPassword?.message}
          placeholder="Repite la contraseña"
          autoComplete="new-password"
        />

        {/* Country (optional) */}
        <Field
          label="País (opcional)"
          icon={Globe}
          {...register("country")}
          placeholder="United States"
          autoComplete="country-name"
        />

        {/* Terms */}
        <label style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", cursor: "pointer" }}>
          <input
            type="checkbox"
            {...register("acceptTerms")}
            style={{ marginTop: "0.15rem", accentColor: "var(--accent-primary)", flexShrink: 0 }}
          />
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            Acepto los{" "}
            <Link href="/terminos" target="_blank" style={{ color: "var(--accent-secondary)", textDecoration: "none" }}>Términos de uso</Link>
            {" "}y la{" "}
            <Link href="/privacidad" target="_blank" style={{ color: "var(--accent-secondary)", textDecoration: "none" }}>Política de privacidad</Link>
          </span>
        </label>
        {errors.acceptTerms && (
          <span style={{ fontSize: "0.72rem", color: "#f43f5e", display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "-0.4rem" }}>
            <AlertCircle size={11} /> {errors.acceptTerms.message}
          </span>
        )}

        {/* Turnstile */}
        <TurnstileWidget action="register" />

        <ActionFeedback status={state.status} message={state.message} />

        <button
          type="submit"
          disabled={pending}
          className="btn-primary"
          style={{ justifyContent: "center", padding: "0.85rem", width: "100%", fontSize: "0.95rem" }}
        >
          {pending ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Creando cuenta...</> : "Crear cuenta"}
        </button>
      </form>
    </div>
  );
}

// ─── Verify Step ──────────────────────────────────────────────────────────────

function VerifyStep({ email }: { email: string }) {
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  async function handleResend() {
    setResending(true);
    setResendNotice(null);
    setResendError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.message ?? "Error al reenviar");
      setResendNotice(typeof payload?.message === "string" ? payload.message : "Correo reenviado.");
    } catch (err) {
      setResendError(err instanceof Error ? err.message : "No pudimos reenviar.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div style={{ textAlign: "center", padding: "1rem 0" }}>
      <div style={{
        width: 72, height: 72, borderRadius: "50%", margin: "0 auto 1.25rem",
        background: "linear-gradient(135deg, rgba(74,222,128,0.15), rgba(74,222,128,0.05))",
        border: "1px solid rgba(74,222,128,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <CheckCircle2 size={36} color="#4ade80" />
      </div>
      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.35rem", fontWeight: 900, color: "var(--text-light)", marginBottom: "0.5rem" }}>
        ¡Cuenta creada!
      </h2>
      <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
        Enviamos un enlace de verificación a
      </p>
      <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-light)", marginBottom: "1.5rem" }}>
        {email}
      </p>
      <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.6 }}>
        Revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta. También revisa la carpeta de spam.
      </p>
      <button
        type="button"
        onClick={() => void handleResend()}
        disabled={resending}
        className="btn-secondary"
        style={{ justifyContent: "center", padding: "0.7rem 1.5rem", margin: "0 auto" }}
      >
        {resending ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Reenviando...</> : "Reenviar correo"}
      </button>
      {resendNotice && <p style={{ fontSize: "0.78rem", color: "#9ff3c3", marginTop: "0.75rem" }}>{resendNotice}</p>}
      {resendError && <p style={{ fontSize: "0.78rem", color: "#fda4af", marginTop: "0.75rem" }}>{resendError}</p>}
    </div>
  );
}

// ─── 2FA Step ─────────────────────────────────────────────────────────────────

function TwoFactorStep({
  challengeId,
  notice,
  onSuccess,
  onBack,
}: {
  challengeId: string;
  notice: string;
  onSuccess: (user: AuthUser) => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");
  const [state, setState] = useState<UiActionState>(uiActionInitialState);
  const [verifying, setVerifying] = useState(false);

  async function handleVerify() {
    const normalized = code.trim();
    if (normalized.length < 4) {
      setState(actionErrorState(new Error("Ingresa el código 2FA de tu correo.")));
      return;
    }
    setVerifying(true);
    setState(uiActionInitialState);
    try {
      const user = await verifyLoginTwoFactor({ challengeId, code: normalized });
      setState(actionSuccessState("Verificación 2FA completada."));
      onSuccess(user);
    } catch (err) {
      setState(actionErrorState(err, "Código 2FA inválido."));
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <button
          type="button"
          onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", padding: 0, marginBottom: "0.75rem" }}
        >
          <ArrowLeft size={14} /> Volver
        </button>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.35rem", fontWeight: 900, color: "var(--text-light)", marginBottom: "0.3rem" }}>
          Verificación en dos pasos
        </h2>
        <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
          {notice || "Te enviamos un código de 6 dígitos a tu correo."}
        </p>
      </div>

      <Field
        label="Código de verificación"
        icon={Lock}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="000000"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={10}
        autoFocus
      />

      <ActionFeedback status={state.status} message={state.message} />

      <button
        type="button"
        onClick={() => void handleVerify()}
        disabled={verifying}
        className="btn-primary"
        style={{ justifyContent: "center", padding: "0.85rem", width: "100%" }}
      >
        {verifying ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Verificando...</> : "Verificar código"}
      </button>
    </div>
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
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [twoFactorData, setTwoFactorData] = useState<{ challengeId: string; expiresIn: number; message: string } | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const { setUser } = useAuthStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(defaultTab === "register" ? "email" : "email");
      setEmail("");
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

  const stepNumber = step === "email" ? 1 : (step === "login" || step === "register") ? 2 : null;

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: "fixed", inset: 0, zIndex: 1300,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(8px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s ease",
        }}
      />

      {/* Modal */}
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
          width: "min(460px, 96vw)",
          maxHeight: isMobileViewport
            ? "calc(100dvh - 1rem - env(safe-area-inset-top))"
            : "min(820px, 94dvh)",
          background: "var(--bg-dark)",
          border: "1px solid var(--glass-border)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset",
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
        {/* Modal Header */}
        <div style={{
          padding: "1.25rem 1.75rem 1rem",
          borderBottom: step !== "email" && step !== "verify" && step !== "2fa" ? "1px solid var(--glass-border)" : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(180deg, rgba(124,58,237,0.06) 0%, transparent 100%)",
          flexShrink: 0,
        }}>
          <VybxLogo size={22} textSize="1.1rem" />
          <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
            {stepNumber && <StepDots current={stepNumber as 1 | 2} />}
            <button
              onClick={onClose}
              aria-label="Cerrar"
              style={{
                background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
                borderRadius: "50%", width: 32, height: 32,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "var(--text-muted)",
                transition: "background 0.2s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
              onMouseLeave={e => (e.currentTarget.style.background = "var(--glass-bg)")}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div style={{ padding: "1.75rem", flex: 1 }}>
          {step === "email" && (
            <EmailStep
              onLogin={(e) => { setEmail(e); setStep("login"); }}
              onRegister={(e) => { setEmail(e); setStep("register"); }}
            />
          )}
          {step === "login" && (
            <LoginStep
              email={email}
              onBack={() => setStep("email")}
              onSuccess={handleLoginSuccess}
              onTwoFactor={handleTwoFactor}
            />
          )}
          {step === "register" && (
            <RegisterStep
              email={email}
              onBack={() => setStep("email")}
              onSuccess={handleRegisterSuccess}
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
