"use client";

import { useState, useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/store/useAuthStore";
import { login, type AuthUser } from "@/lib/api";
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
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
  });

  const [state, action, pending] = useActionState(
    async (_prev: { error: string | null }, data: LoginFields) => {
      try {
        const user = await login(data);
        onSuccess(user);
        return { error: null };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Credenciales incorrectas" };
      }
    },
    { error: null }
  );

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

      {state.error && (
        <div style={{ padding: "0.6rem 0.85rem", borderRadius: "var(--radius-md)", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", color: "#fda4af", fontSize: "0.8rem", display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <AlertCircle size={13} /> {state.error}
        </div>
      )}

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
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFields>({
    resolver: zodResolver(registerSchema),
  });

  const [state, action, pending] = useActionState(
    async (_prev: { error: string | null; success: boolean }, data: RegisterFields) => {
      try {
        const csrfToken = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/)?.[1] ?? "";
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3004"}/auth/register`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
          body: JSON.stringify({
            email: data.email,
            password: data.password,
            firstName: data.firstName,
            lastName: data.lastName,
            // Cloudflare Turnstile test token (always passes in dev with test secret key)
            turnstileToken: "1x00000000000000000000AA",
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(Array.isArray(err.message) ? err.message.join(", ") : err.message ?? "Error al registrar");
        }
        onSuccess();
        return { error: null, success: true };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Error al registrar", success: false };
      }
    },
    { error: null, success: false }
  );

  if (state.success) {
    return (
      <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
        <CheckCircle2 size={40} color="#4ade80" style={{ margin: "0 auto 1rem" }} />
        <p style={{ fontFamily: "var(--font-heading)", fontSize: "1.1rem", fontWeight: 800, color: "var(--text-light)", marginBottom: "0.5rem" }}>
          ¡Cuenta creada!
        </p>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Revisa tu email para verificar tu cuenta.
        </p>
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

      {state.error && (
        <div style={{ padding: "0.6rem 0.85rem", borderRadius: "var(--radius-md)", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", color: "#fda4af", fontSize: "0.8rem", display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <AlertCircle size={13} /> {state.error}
        </div>
      )}

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
  const { setUser } = useAuthStore();

  useEffect(() => { if (open) setTab(defaultTab); }, [open, defaultTab]);

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
          top: "50%",
          left: "50%",
          transform: `translate(-50%, ${open ? "-50%" : "-45%"})`,
          zIndex: 1400,
          width: "min(460px, 96vw)",
          background: "var(--bg-dark)",
          border: "1px solid var(--glass-border)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s ease, transform 0.3s cubic-bezier(0.16,1,0.3,1)",
          overflow: "hidden",
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
