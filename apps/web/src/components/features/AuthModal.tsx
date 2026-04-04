"use client";

import { useState, useActionState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/store/useAuthStore";
import { api, fetchProfile, login, verifyLoginTwoFactor, type AuthUser } from "@/lib/api";
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
import { useTheme } from "next-themes";
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
  Send,
  ArrowRight,
  ArrowLeft,
  Globe,
  KeyRound,
  CircleHelp,
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
type ForgotPasswordFields = z.infer<typeof emailSchema>;

type Step = "email" | "login" | "register" | "verify" | "2fa" | "forgot";
type EmailIntent = "login" | "register";

function toRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readBooleanKey(record: Record<string, unknown>, keys: string[]): boolean | null {
  for (const key of keys) {
    if (typeof record[key] === "boolean") return record[key] as boolean;
  }
  return null;
}

function getErrorMessage(payload: unknown, fallback: string): string {
  const record = toRecord(payload);
  if (!record) return fallback;
  const message = record.message;
  if (typeof message === "string" && message.trim().length > 0) return message;
  if (Array.isArray(message) && message.length > 0) return message.map((item) => String(item)).join(", ");
  return fallback;
}

function getCsrfTokenFromCookie(): string {
  return document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/)?.[1] ?? "";
}

async function lookupEmailIntent(email: string): Promise<EmailIntent | null> {
  const encoded = encodeURIComponent(email);

  const res = await fetch(`${API_BASE_URL}/auth/email-intent?email=${encoded}`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  // Endpoint not deployed yet — let caller fall back gracefully.
  if (res.status === 404) return null;

  // Server only accepts POST — retry with body.
  if (res.status === 405) {
    const postRes = await fetch(`${API_BASE_URL}/auth/email-intent`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfTokenFromCookie(),
        Accept: "application/json",
      },
      body: JSON.stringify({ email }),
    });
    if (postRes.status === 404) return null;
    if (postRes.status === 409) return "login";
    const postPayload = await postRes.json().catch(() => null);
    if (!postRes.ok) {
      throw new Error(getErrorMessage(postPayload, "No pudimos validar el correo ahora mismo."));
    }
    const postData = toRecord(postPayload);
    if (!postData) return null;
    const exists = readBooleanKey(postData, ["exists", "registered", "hasAccount", "userExists"]);
    if (typeof exists === "boolean") return exists ? "login" : "register";
    const intent = typeof postData.intent === "string" ? postData.intent.toLowerCase() : "";
    if (intent.includes("register") || intent.includes("signup")) return "register";
    if (intent.includes("login") || intent.includes("signin")) return "login";
    return null;
  }

  if (res.status === 409) return "login";

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(getErrorMessage(payload, "No pudimos validar el correo ahora mismo."));
  }

  const data = toRecord(payload);
  if (!data) return null;
  const exists = readBooleanKey(data, ["exists", "registered", "hasAccount", "userExists"]);
  if (typeof exists === "boolean") return exists ? "login" : "register";
  const intent = typeof data.intent === "string" ? data.intent.toLowerCase() : "";
  if (intent.includes("register") || intent.includes("signup")) return "register";
  if (intent.includes("login") || intent.includes("signin")) return "login";
  return null;
}

function decodeBase64Url(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function encodeBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function buildPublicKeyRequestOptions(payload: unknown): PublicKeyCredentialRequestOptions | null {
  const raw = toRecord(payload);
  if (!raw) return null;
  const source = toRecord(raw.publicKey ?? raw.requestOptions ?? raw.options ?? raw);
  if (!source || typeof source.challenge !== "string") return null;

  const allowCredentialsRaw = Array.isArray(source.allowCredentials)
    ? source.allowCredentials
    : [];

  const validTransports: AuthenticatorTransport[] = [
    "ble",
    "hybrid",
    "internal",
    "nfc",
    "usb",
  ];
  const allowCredentials: PublicKeyCredentialDescriptor[] = [];
  allowCredentialsRaw.forEach((item) => {
    const cred = toRecord(item);
    if (!cred || typeof cred.id !== "string") return;
    const transportList = Array.isArray(cred.transports)
      ? cred.transports.filter(
          (value): value is AuthenticatorTransport =>
            typeof value === "string" && validTransports.includes(value as AuthenticatorTransport),
        )
      : undefined;
    allowCredentials.push({
      type: "public-key",
      id: decodeBase64Url(cred.id),
      transports: transportList,
    });
  });

  const options: PublicKeyCredentialRequestOptions = {
    challenge: decodeBase64Url(source.challenge),
    timeout: typeof source.timeout === "number" ? source.timeout : undefined,
    rpId: typeof source.rpId === "string" ? source.rpId : undefined,
    userVerification:
      source.userVerification === "required" ||
      source.userVerification === "preferred" ||
      source.userVerification === "discouraged"
        ? source.userVerification
        : "preferred",
    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
  };

  return options;
}

function serializeAssertionCredential(credential: PublicKeyCredential) {
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: encodeBase64Url(credential.rawId),
    type: credential.type,
    response: {
      authenticatorData: encodeBase64Url(response.authenticatorData),
      clientDataJSON: encodeBase64Url(response.clientDataJSON),
      signature: encodeBase64Url(response.signature),
      userHandle: response.userHandle ? encodeBase64Url(response.userHandle) : null,
    },
  };
}

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
      <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>
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
            background: "color-mix(in oklab, var(--input-surface) 84%, transparent)",
            border: `1px solid ${error ? "rgba(244,63,94,0.56)" : "color-mix(in oklab, var(--glass-border) 82%, transparent)"}`,
            borderRadius: "var(--radius-lg)",
            color: "var(--text-light)",
            fontSize: "0.92rem",
            fontFamily: "var(--font-body)",
            outline: "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
          onFocus={e => {
            e.target.style.borderColor = "rgba(124,58,237,0.52)";
            e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.10)";
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
        <span style={{ fontSize: "0.72rem", color: "#fb7185", display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <AlertCircle size={11} /> {error}
        </span>
      )}
    </div>
  );
}

// ─── Email Step ───────────────────────────────────────────────────────────────

function EmailStep({
  onContinue,
  onPasskey,
  pending,
  passkeyPending,
  notice,
  error,
  isLightTheme,
}: {
  onContinue: (email: string) => Promise<void>;
  onPasskey: (email: string) => Promise<void>;
  pending: boolean;
  passkeyPending: boolean;
  notice: string | null;
  error: string | null;
  isLightTheme: boolean;
}) {
  const [showPasskeyGuide, setShowPasskeyGuide] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<EmailFields>({
    resolver: zodResolver(emailSchema),
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <h2 style={{
          fontFamily: "var(--font-heading)",
          fontSize: "1.45rem",
          fontWeight: 900,
          color: "var(--text-light)",
          marginBottom: "0.45rem",
          letterSpacing: "-0.03em",
          textTransform: "uppercase",
          lineHeight: 1.1,
        }}>
          Inicia sesión o crea tu cuenta
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
          Si tu correo ya está registrado te pediremos la contraseña. Si no, te llevamos directo a crear tu cuenta.
        </p>
      </div>

      <form
        onSubmit={handleSubmit((d) => onContinue(d.email))}
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
          disabled={pending || passkeyPending}
          className="btn-primary"
          style={{
            justifyContent: "center",
            padding: "0.88rem",
            width: "100%",
            fontSize: "0.94rem",
            letterSpacing: "0.01em",
            gap: "0.5rem",
          }}
        >
          {pending
            ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Validando...</>
            : <>Continuar <ArrowRight size={16} /></>}
        </button>
      </form>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.08rem" }}>
        <div style={{ flex: 1, height: 1, background: "color-mix(in oklab, var(--glass-border) 80%, transparent)" }} />
        <span style={{ fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.08em", color: "var(--text-muted)" }}>OR</span>
        <div style={{ flex: 1, height: 1, background: "color-mix(in oklab, var(--glass-border) 80%, transparent)" }} />
      </div>

      <button
        type="button"
        onClick={handleSubmit((d) => onPasskey(d.email))}
        disabled={pending || passkeyPending}
        style={{
          width: "100%",
          padding: "0.78rem 0.95rem",
          borderRadius: "var(--radius-lg)",
          background: "color-mix(in oklab, var(--input-surface) 65%, transparent)",
          border: "1px solid color-mix(in oklab, var(--glass-border) 85%, transparent)",
          color: "var(--text-light)",
          fontSize: "0.9rem",
          fontWeight: 700,
          cursor: "pointer",
          display: "inline-flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "0.45rem",
        }}
      >
        {passkeyPending
          ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Preparando passkey...</>
          : <><KeyRound size={15} /> Sign in with Passkey</>}
      </button>

      <button
        type="button"
        onClick={() => setShowPasskeyGuide((prev) => !prev)}
        style={{
          width: "fit-content",
          margin: "0 auto",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--accent-secondary)",
          fontSize: "0.83rem",
          fontWeight: 700,
          textDecoration: "underline",
          textUnderlineOffset: "3px",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem",
        }}
      >
        <CircleHelp size={14} />
        {showPasskeyGuide ? "Ocultar guía de passkey" : "Cómo agregar una passkey"}
      </button>

      {showPasskeyGuide && (
        <div style={{
          border: isLightTheme
            ? "1px solid rgba(15,23,42,0.14)"
            : "1px solid color-mix(in oklab, var(--glass-border) 84%, transparent)",
          background: isLightTheme
            ? "rgba(15,23,42,0.04)"
            : "rgba(255,255,255,0.03)",
          borderRadius: "var(--radius-lg)",
          padding: "0.72rem 0.82rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.42rem",
        }}>
          <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-light)" }}>
            Activarla toma menos de 1 minuto:
          </p>
          <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
            1. Entra con contraseña.
          </p>
          <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
            2. Ve a Perfil y Seguridad.
          </p>
          <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
            3. Elige “Agregar passkey” y confirma con biometría o PIN.
          </p>
        </div>
      )}

      {notice && (
        <p style={{
          margin: 0,
          fontSize: "0.78rem",
          color: isLightTheme ? "#0c4a6e" : "#bfdbfe",
          lineHeight: 1.45,
          border: isLightTheme ? "1px solid rgba(2,132,199,0.28)" : "1px solid rgba(125,211,252,0.26)",
          background: isLightTheme ? "rgba(56,189,248,0.16)" : "rgba(14,116,144,0.15)",
          borderRadius: "var(--radius-md)",
          padding: "0.52rem 0.62rem",
        }}>
          {notice}
        </p>
      )}
      {error && (
        <p style={{
          margin: 0,
          fontSize: "0.78rem",
          color: isLightTheme ? "#9f1239" : "#fda4af",
          lineHeight: 1.45,
          border: isLightTheme ? "1px solid rgba(225,29,72,0.34)" : "1px solid rgba(244,63,94,0.35)",
          background: isLightTheme ? "rgba(251,113,133,0.14)" : "rgba(244,63,94,0.12)",
          borderRadius: "var(--radius-md)",
          padding: "0.52rem 0.62rem",
        }}>
          {error}
        </p>
      )}

      <p style={{ textAlign: "left", fontSize: "0.73rem", color: "var(--text-muted)", lineHeight: 1.52, marginTop: "0.1rem" }}>
        Al continuar, reconoces que leíste y aceptas nuestros{" "}
        <Link href="/terminos" style={{ color: "var(--accent-secondary)", textDecoration: "none" }}>Términos</Link>
        {" "}y{" "}
        <Link href="/privacidad" style={{ color: "var(--accent-secondary)", textDecoration: "none" }}>Política de privacidad</Link>
        . También podremos enviarte novedades y promociones; puedes desactivarlas cuando quieras.
      </p>
    </div>
  );
}

// ─── Login Step ───────────────────────────────────────────────────────────────

function LoginStep({
  email,
  onBack,
  onForgotPassword,
  onCreateAccount,
  onSuccess,
  onTwoFactor,
}: {
  email: string;
  onBack: () => void;
  onForgotPassword: () => void;
  onCreateAccount: () => void;
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
            <button
              type="button"
              aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
              onClick={() => setShowPass(!showPass)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}
            >
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
          <button
            type="button"
            onClick={onForgotPassword}
            style={{ fontSize: "0.8rem", color: "var(--text-muted)", textDecoration: "none" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--accent-secondary)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        <button
          type="button"
          onClick={onCreateAccount}
          style={{
            background: "transparent",
            border: "none",
            padding: 0,
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            cursor: "pointer",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
          }}
        >
          ¿No tienes cuenta? Crear una
        </button>
      </form>
    </div>
  );
}

// ─── Forgot Password Step ─────────────────────────────────────────────────────

function ForgotPasswordStep({
  email,
  onBack,
}: {
  email: string;
  onBack: () => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFields>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email },
  });

  const [state, action, pending] = useActionState<UiActionState, ForgotPasswordFields>(
    async (_prev, data) => {
      try {
        await api.post("/auth/request-password-reset", { email: data.email });
        return actionSuccessState(
          "Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña.",
        );
      } catch (err) {
        return actionErrorState(err, "No pudimos enviar el enlace ahora mismo.");
      }
    },
    uiActionInitialState,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
      <div>
        <button
          type="button"
          onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", padding: 0, marginBottom: "0.75rem" }}
        >
          <ArrowLeft size={14} /> Volver al login
        </button>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.3rem", fontWeight: 900, color: "var(--text-light)", marginBottom: "0.35rem" }}>
          Restablecer contraseña
        </h2>
        <p style={{ fontSize: "0.83rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
          Te enviaremos un enlace seguro para crear una nueva contraseña.
        </p>
      </div>

      {state.status === "success" && (
        <div style={{
          border: "1px solid rgba(74,222,128,0.34)",
          background: "rgba(34,197,94,0.14)",
          borderRadius: "var(--radius-lg)",
          padding: "0.7rem 0.8rem",
          display: "flex",
          alignItems: "flex-start",
          gap: "0.55rem",
        }}>
          <CheckCircle2 size={16} color="#4ade80" style={{ marginTop: 1, flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-light)", lineHeight: 1.5 }}>
            {state.message} El enlace expira en 30 minutos.
          </p>
        </div>
      )}

      <form
        onSubmit={handleSubmit((data) => action(data))}
        style={{ display: "flex", flexDirection: "column", gap: "0.95rem" }}
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

        {state.status !== "success" && (
          <ActionFeedback status={state.status} message={state.message} />
        )}

        <button
          type="submit"
          disabled={pending}
          className="btn-primary"
          style={{ justifyContent: "center", padding: "0.85rem", width: "100%", fontSize: "0.92rem", gap: "0.45rem" }}
        >
          {pending
            ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Enviando...</>
            : <><Send size={15} /> Enviar enlace</>}
        </button>
      </form>
    </div>
  );
}

// ─── Register Step ────────────────────────────────────────────────────────────

function RegisterStep({
  email,
  onBack,
  onSuccess,
  onAccountExists,
}: {
  email: string;
  onBack: () => void;
  onSuccess: (registeredEmail: string) => void;
  onAccountExists: (existingEmail: string) => void;
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
        if (res.status === 409) {
          onAccountExists(email);
          return uiActionInitialState;
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const message = Array.isArray(err.message) ? err.message.join(", ") : String(err.message ?? "Error al registrar");
          const normalizedMessage = message.toLowerCase();
          if (
            normalizedMessage.includes("ya existe") ||
            normalizedMessage.includes("already exists")
          ) {
            onAccountExists(email);
            return uiActionInitialState;
          }
          throw new Error(message);
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
            <button
              type="button"
              aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
              onClick={() => setShowPass(!showPass)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}
            >
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

  // Reset on open
  useEffect(() => {
    if (open) {
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
      const intent = await lookupEmailIntent(normalizedEmail);
      if (intent === "register") {
        setEmailNotice("No encontramos una cuenta con ese correo. Te ayudamos a crearla.");
        setStep("register");
        return;
      }
      if (intent === "login") {
        setStep("login");
        return;
      }

      // Backend sin endpoint de lookup: fallback seguro a contraseña.
      setEmailNotice("Continuemos con tu acceso. Si no tienes cuenta, te la creamos después.");
      setStep("login");
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

    const passkeyEndpoints = [
      { optionsPath: "/auth/passkey/login/options", verifyPath: "/auth/passkey/login/verify" },
      { optionsPath: "/auth/passkeys/login/options", verifyPath: "/auth/passkeys/login/verify" },
    ];

    setPasskeyPending(true);
    try {
      let selected:
        | { payload: unknown; verifyPath: string }
        | null = null;

      for (const candidate of passkeyEndpoints) {
        const response = await fetch(`${API_BASE_URL}${candidate.optionsPath}`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": getCsrfTokenFromCookie(),
            Accept: "application/json",
          },
          body: JSON.stringify({ email: normalizedEmail }),
        });

        if (response.status === 404 || response.status === 405) continue;
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(getErrorMessage(payload, "No pudimos iniciar passkey ahora mismo."));
        }
        selected = { payload, verifyPath: candidate.verifyPath };
        break;
      }

      if (!selected) {
        setEmailError("Passkeys todavía no están habilitadas en esta plataforma.");
        return;
      }

      const publicKey = buildPublicKeyRequestOptions(selected.payload);
      if (!publicKey) {
        setEmailError("La configuración de passkey no es válida en este momento.");
        return;
      }

      const assertion = await navigator.credentials.get({ publicKey });
      if (!(assertion instanceof PublicKeyCredential)) {
        setEmailError("No se pudo completar la autenticación con passkey.");
        return;
      }

      const verifyResponse = await fetch(`${API_BASE_URL}${selected.verifyPath}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": getCsrfTokenFromCookie(),
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          assertion: serializeAssertionCredential(assertion),
        }),
      });

      const verifyPayload = await verifyResponse.json().catch(() => null);
      if (!verifyResponse.ok) {
        throw new Error(getErrorMessage(verifyPayload, "No pudimos verificar tu passkey."));
      }

      const user = await fetchProfile();
      handleLoginSuccess(user);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Falló la autenticación con passkey.");
    } finally {
      setPasskeyPending(false);
    }
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Backdrop */}
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

        {/* Modal Header */}
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

        {/* Modal Content */}
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
