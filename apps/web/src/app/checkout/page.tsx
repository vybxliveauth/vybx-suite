"use client";

import { useEffect, useState, useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Drawer } from "vaul";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCartStore } from "@/store/useCartStore";
import { formatPrice, formatEventDate } from "@/lib/utils";
import { login, verifyLoginTwoFactor, fetchProfile, type AuthUser } from "@/lib/api";
import {
  actionErrorState,
  actionSuccessState,
  uiActionInitialState,
  type UiActionState,
} from "@/lib/action-state";
import {
  checkoutInitialState,
  submitCheckoutAction,
  type CheckoutActionState,
} from "@/actions/checkout";
import { ActionFeedback } from "@vybx/ui";
import { getClientTurnstileToken } from "@/lib/turnstile";
import { FlipCountdown } from "@/components/features/FlipCountdown";
import { TurnstileWidget } from "@/components/features/TurnstileWidget";
import { VybxLogo } from "@/components/ui/VybxLogo";
import {
  ChevronLeft,
  Lock,
  ShieldCheck,
  Clock,
  Ticket,
  User,
  Mail,
  Phone,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CreditCard,
  ReceiptText,
  X,
} from "lucide-react";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const buyerSchema = z.object({
  firstName: z.string().min(2, "Mínimo 2 caracteres"),
  lastName: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(8, "Teléfono inválido").optional().or(z.literal("")),
});

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

type BuyerFields = z.infer<typeof buyerSchema>;
type LoginFields = z.infer<typeof loginSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function InputField({
  label,
  error,
  icon: Icon,
  rightAdornment,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  icon?: React.ElementType;
  rightAdornment?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        {Icon && (
          <Icon
            size={15}
            color="var(--text-muted)"
            style={{ position: "absolute", left: "0.9rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          />
        )}
        <input
          {...props}
          style={{
            width: "100%",
            padding:
              Icon && rightAdornment
                ? "0.7rem 2.8rem 0.7rem 2.4rem"
                : Icon
                  ? "0.7rem 0.9rem 0.7rem 2.4rem"
                  : rightAdornment
                    ? "0.7rem 2.8rem 0.7rem 0.9rem"
                    : "0.7rem 0.9rem",
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${error ? "rgba(244,63,94,0.6)" : "var(--glass-border)"}`,
            borderRadius: "var(--radius-lg)",
            color: "var(--text-light)",
            fontSize: "0.92rem",
            fontFamily: "var(--font-body)",
            outline: "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
            ...props.style,
          }}
          onFocus={e => {
            e.target.style.borderColor = "rgba(124,58,237,0.6)";
            e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.12)";
          }}
          onBlur={e => {
            e.target.style.borderColor = error ? "rgba(244,63,94,0.6)" : "var(--glass-border)";
            e.target.style.boxShadow = "none";
          }}
        />
        {rightAdornment && (
          <div
            style={{
              position: "absolute",
              right: "0.7rem",
              top: "50%",
              transform: "translateY(-50%)",
              display: "flex",
              alignItems: "center",
            }}
          >
            {rightAdornment}
          </div>
        )}
      </div>
      {error && (
        <span style={{ fontSize: "0.75rem", color: "#f43f5e", display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <AlertCircle size={12} /> {error}
        </span>
      )}
    </div>
  );
}

// ─── Order Summary ────────────────────────────────────────────────────────────

function OrderSummary({ mobile = false }: { mobile?: boolean }) {
  const { session, remainingSeconds } = useCartStore();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!session) return;
    setSeconds(remainingSeconds());
    const id = setInterval(() => setSeconds(remainingSeconds()), 500);
    return () => clearInterval(id);
  }, [session, remainingSeconds]);

  if (!session || session.items.length === 0) return null;

  const isUrgent = seconds < 120 && seconds > 0;
  const isExpired = session.isExpired;

  return (
    <div style={{
      background: "var(--card-bg)",
      backdropFilter: "blur(20px)",
      border: "1px solid var(--glass-border)",
      borderRadius: "var(--radius-2xl)",
      overflow: "hidden",
      position: mobile ? "relative" : "sticky",
      top: mobile ? undefined : 100,
    }}>
      {/* Header */}
      <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Ticket size={16} color="var(--accent-primary)" />
        <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "1rem", color: "var(--text-light)" }}>
          Tu pedido
        </span>
      </div>

      {/* Timer */}
      <div style={{
        padding: "0.65rem 1.5rem",
        background: isExpired ? "rgba(244,63,94,0.1)" : isUrgent ? "rgba(244,63,94,0.08)" : "rgba(124,58,237,0.07)",
        borderBottom: "1px solid var(--glass-border)",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
      }}>
        <Clock size={13} color={isExpired || isUrgent ? "#fda4af" : "var(--accent-secondary)"} />
        {isExpired ? (
          <span style={{ fontSize: "0.78rem", color: "#fda4af", fontWeight: 600 }}>Reserva expirada</span>
        ) : (
          <span style={{ fontSize: "0.78rem", color: isUrgent ? "#fda4af" : "var(--text-muted)" }}>
            Reserva expira en{" "}
            <FlipCountdown seconds={seconds} urgent={isUrgent} compact />
          </span>
        )}
      </div>

      {/* Items */}
      <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        {session.items.map((item) => (
          <div key={`${item.eventId}-${item.tierId}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-light)", marginBottom: "0.25rem", lineHeight: 1.3 }}>
                  {item.eventTitle}
                </p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {formatEventDate(item.eventDate)}
                </p>
                <span style={{
                  display: "inline-block",
                  marginTop: "0.35rem",
                  fontSize: "0.7rem",
                  background: "rgba(124,58,237,0.15)",
                  border: "1px solid rgba(124,58,237,0.3)",
                  color: "#c4b5fd",
                  borderRadius: "var(--radius-pill)",
                  padding: "0.1rem 0.5rem",
                  fontWeight: 600,
                }}>
                  {item.tierName} × {item.quantity}
                </span>
              </div>
              <p style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "0.95rem", color: "var(--text-light)", whiteSpace: "nowrap" }}>
                {formatPrice(item.unitPrice * item.quantity, item.currency)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Price breakdown */}
      <div style={{ padding: "1rem 1.5rem", borderTop: "1px dashed var(--glass-border)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Subtotal</span>
          <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{formatPrice(session.subtotal, session.currency)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Cargo por servicio (5%)</span>
          <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{formatPrice(session.fees, session.currency)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "0.65rem", borderTop: "1px solid var(--glass-border)", marginTop: "0.25rem" }}>
          <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-light)" }}>Total</span>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: "1.4rem", fontWeight: 800, color: "var(--text-light)" }}>
            {formatPrice(session.total, session.currency)}
          </span>
        </div>
      </div>

      {/* Security */}
      <div style={{ padding: "0.85rem 1.5rem", borderTop: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.02)" }}>
        <ShieldCheck size={14} color="var(--accent-secondary)" />
        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Pago 100% seguro · SSL cifrado</span>
      </div>
    </div>
  );
}

// ─── Login inline ─────────────────────────────────────────────────────────────

function LoginForm({ onSuccess }: { onSuccess: (user: AuthUser) => void }) {
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
        return actionSuccessState("Inicio de sesion completado.");
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
      setTwoFactorState(actionErrorState(new Error("Ingresa el codigo 2FA recibido por correo.")));
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
    <div style={{
      background: "rgba(124,58,237,0.06)",
      border: "1px solid rgba(124,58,237,0.2)",
      borderRadius: "var(--radius-2xl)",
      padding: "1.75rem",
      marginBottom: "1.5rem",
    }}>
      <p style={{ fontFamily: "var(--font-heading)", fontSize: "1.05rem", fontWeight: 800, color: "var(--text-light)", marginBottom: "0.35rem" }}>
        Inicia sesión para continuar
      </p>
      <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
        Necesitas una cuenta para completar tu compra.
      </p>

      <form action={(fd) => {
        const data = { email: fd.get("email") as string, password: fd.get("password") as string };
        handleSubmit(() => action(data))();
      }} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        <InputField label="Email" icon={Mail} type="email" {...register("email")} error={errors.email?.message} placeholder="tu@email.com" />
        <InputField
          label="Contraseña"
          icon={Lock}
          type={showPass ? "text" : "password"}
          {...register("password")}
          error={errors.password?.message}
          placeholder="••••••••"
          rightAdornment={(
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 2,
              }}
            >
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          )}
        />

        {twoFactorChallengeId && (
          <div
            style={{
              border: "1px solid rgba(124,58,237,0.35)",
              background: "rgba(124,58,237,0.1)",
              borderRadius: "var(--radius-lg)",
              padding: "0.9rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              {twoFactorNotice ?? "Te enviamos un codigo 2FA a tu correo para confirmar el acceso."}
            </p>
            <InputField
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
          style={{ justifyContent: "center", padding: "0.8rem", marginTop: "0.25rem" }}
        >
          {pending ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Lock size={15} />}
          {pending ? "Iniciando sesión..." : "Iniciar sesión"}
        </button>
      </form>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Checkout Steps ──────────────────────────────────────────────────────────

function CheckoutSteps({ currentStep }: { currentStep: number }) {
  const steps = [
    { label: "Iniciar sesión", icon: User },
    { label: "Datos", icon: ReceiptText },
    { label: "Pagar", icon: CreditCard },
  ];

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0",
      marginBottom: "2.5rem",
    }}>
      {steps.map((step, i) => {
        const isActive = i === currentStep;
        const isComplete = i < currentStep;
        const StepIcon = step.icon;

        return (
          <div key={step.label} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", minWidth: 80 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isComplete
                  ? "var(--accent-secondary)"
                  : isActive
                    ? "rgba(124,58,237,0.15)"
                    : "rgba(255,255,255,0.04)",
                border: `2px solid ${isComplete ? "var(--accent-secondary)" : isActive ? "var(--accent-secondary)" : "var(--glass-border)"}`,
                transition: "all 0.3s ease",
              }}>
                {isComplete ? (
                  <CheckCircle2 size={16} color="#fff" />
                ) : (
                  <StepIcon size={15} color={isActive ? "var(--accent-secondary)" : "var(--text-muted)"} />
                )}
              </div>
              <span style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                color: isActive || isComplete ? "var(--text-light)" : "var(--text-muted)",
                textAlign: "center",
                transition: "color 0.3s",
              }}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                width: 48,
                height: 2,
                background: isComplete ? "var(--accent-secondary)" : "var(--glass-border)",
                marginBottom: "1.4rem",
                marginInline: "0.25rem",
                borderRadius: 1,
                transition: "background 0.3s",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Payment Method Card ──────────────────────────────────────────────────────
// Provider-aware: reads NEXT_PUBLIC_PAYMENT_PROVIDER to show the right badge.
// Stripe Checkout is the primary provider for the US market.

const PAYMENT_PROVIDER =
  (process.env.NEXT_PUBLIC_PAYMENT_PROVIDER ?? "STRIPE") as
    | "RD_REDIRECT"
    | "STRIPE"
    | "AZUL";

const PROVIDER_LABELS: Record<typeof PAYMENT_PROVIDER, { name: string; detail: string }> = {
  RD_REDIRECT: {
    name: "Credit / Debit Card",
    detail: "Secure payment · Visa, Mastercard and more.",
  },
  STRIPE: {
    name: "Credit / Debit Card",
    detail: "Secure payment via Stripe · Visa, Mastercard, Amex and more.",
  },
  AZUL: {
    name: "Credit / Debit Card",
    detail: "Secure payment · Visa and Mastercard.",
  },
};

function PaymentMethodCard() {
  const provider = PROVIDER_LABELS[PAYMENT_PROVIDER] ?? PROVIDER_LABELS.STRIPE;
  return (
    <div style={{
      background: "var(--card-bg)",
      border: "1px solid var(--glass-border)",
      borderRadius: "var(--radius-2xl)",
      padding: "1.75rem",
    }}>
      <h2 style={{
        fontFamily: "var(--font-heading)", fontSize: "1.1rem", fontWeight: 800,
        marginBottom: "1.25rem", display: "flex", alignItems: "center",
        gap: "0.5rem", color: "var(--text-light)",
      }}>
        <Lock size={16} color="var(--accent-primary)" />
        Método de pago
      </h2>

      <div style={{
        padding: "1rem",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--glass-border)",
        borderRadius: "var(--radius-xl)",
        display: "flex", alignItems: "center", gap: "0.75rem",
      }}>
        <CreditCard size={22} color="var(--accent-secondary)" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-light)", marginBottom: "0.15rem" }}>
            {provider.name}
          </p>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {provider.detail}
          </p>
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
            Serás redirigido al gateway al confirmar.
          </p>
        </div>
        <ShieldCheck size={16} color="#4ade80" style={{ flexShrink: 0 }} />
      </div>
    </div>
  );
}

// ─── Buyer Form ───────────────────────────────────────────────────────────────

function BuyerForm({ user, onSubmit, pending }: {
  user: AuthUser;
  onSubmit: (data: BuyerFields) => void;
  pending: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<BuyerFields>({
    resolver: zodResolver(buyerSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Buyer info */}
      <div style={{
        background: "var(--card-bg)",
        border: "1px solid var(--glass-border)",
        borderRadius: "var(--radius-2xl)",
        padding: "1.75rem",
      }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.1rem", fontWeight: 800, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-light)" }}>
          <User size={16} color="var(--accent-primary)" />
          Datos del comprador
        </h2>

        <div className="grid-2col">
          <InputField label="Nombre" icon={User} {...register("firstName")} error={errors.firstName?.message} placeholder="Juan" />
          <InputField label="Apellido" {...register("lastName")} error={errors.lastName?.message} placeholder="Pérez" />
        </div>
        <div className="grid-2col" style={{ marginTop: "0.85rem" }}>
          <InputField label="Email" icon={Mail} type="email" {...register("email")} error={errors.email?.message} placeholder="tu@email.com" />
          <InputField label="Teléfono (opcional)" icon={Phone} type="tel" {...register("phone")} error={errors.phone?.message} placeholder="+1 809 000 0000" />
        </div>
      </div>

      {/* Payment method */}
      <PaymentMethodCard />

      <TurnstileWidget action="checkout" />

      {/* Submit */}
      <button
        type="submit"
        disabled={pending}
        className="btn-primary btn-lg"
        style={{ justifyContent: "center" }}
      >
        {pending
          ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Redirigiendo...</>
          : <><Lock size={18} /> Proceder al pago</>
        }
      </button>

      <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "-0.5rem" }}>
        Al confirmar aceptas los{" "}
        <Link href="/terminos" style={{ color: "var(--accent-secondary)" }}>
          términos y condiciones
        </Link>.
      </p>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter();
  const { session } = useCartStore();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [turnstileError, setTurnstileError] = useState<string | null>(null);

  // Check if user is already logged in
  useEffect(() => {
    fetchProfile()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoadingUser(false));
  }, []);

  const [submitState, submitAction, submitPending] = useActionState<
    CheckoutActionState,
    FormData
  >(submitCheckoutAction, checkoutInitialState);

  useEffect(() => {
    if (submitState.status !== "success" || !submitState.checkoutUrl) return;
    sessionStorage.removeItem("vybx_checkout_queue");
    sessionStorage.removeItem("vybx_checkout_total");
    window.location.href = submitState.checkoutUrl;
  }, [submitState]);

  const submitCheckout = (data: BuyerFields) => {
    const items = session?.items ?? [];
    if (items.length === 0) return;
    const queueToken = (sessionStorage.getItem("vybx_queue_token") ?? "").trim();

    let turnstileToken = "";
    try {
      turnstileToken = getClientTurnstileToken("checkout");
      setTurnstileError(null);
    } catch (e) {
      if (!queueToken) {
        setTurnstileError(
          e instanceof Error
            ? e.message
            : "Error de verificación anti-bot.",
        );
        return;
      }
      // If queue token already exists, continue checkout and let backend validate it.
      setTurnstileError(null);
    }

    const formData = new FormData();

    formData.set("sessionId", session?.id ?? "");
    formData.set("agreedToTerms", "true");
    formData.set("promoCode", "");
    formData.set("attendee.firstName", data.firstName);
    formData.set("attendee.lastName", data.lastName);
    formData.set("attendee.email", data.email);
    formData.set("attendee.phone", data.phone ?? "");
    // Server-side TTL guard — server action rejects expired carts immediately
    if (session?.expiresAt) {
      formData.set("cartExpiresAt", String(session.expiresAt));
    }
    formData.set(
      "items",
      JSON.stringify(
        items.map((item) => ({
          eventId: item.eventId,
          tierId: item.tierId,
          quantity: item.quantity,
        })),
      ),
    );
    if (turnstileToken) formData.set("turnstileToken", turnstileToken);
    if (queueToken) formData.set("queueToken", queueToken);

    submitAction(formData);
  };

  // Redirect if cart is empty
  useEffect(() => {
    if (!loadingUser && (!session || session.items.length === 0)) {
      router.replace("/");
    }
  }, [session, loadingUser, router]);

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Navbar */}
      <nav style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "1rem 5%",
        background: "var(--nav-bg)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--glass-border)",
      }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <VybxLogo size={24} textSize="1.4rem" />
        </Link>
        <Link href="/" className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.45rem 1rem", fontSize: "0.85rem", textDecoration: "none" }}>
          <ChevronLeft size={14} /> Volver
        </Link>
      </nav>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "3rem 5% 7.25rem" }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.8rem,4vw,2.5rem)", fontWeight: 900, letterSpacing: "-1px", marginBottom: "1.75rem", color: "var(--text-light)" }}>
          Checkout
        </h1>

        <CheckoutSteps currentStep={loadingUser ? 0 : !user ? 0 : submitPending ? 2 : 1} />

        <div className="checkout-grid" style={{ display: "grid", gridTemplateColumns: "1fr min(400px, 100%)", gap: "2.5rem", alignItems: "start" }}>
          {/* Left: forms */}
          <div>
            {loadingUser ? (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Loader2 size={28} color="var(--accent-secondary)" style={{ animation: "spin 1s linear infinite" }} />
              </div>
            ) : !user ? (
              <LoginForm onSuccess={setUser} />
            ) : (
              <>
                {/* Logged in indicator */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.65rem 1rem", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: "var(--radius-xl)", marginBottom: "1.5rem" }}>
                  <CheckCircle2 size={15} color="#4ade80" />
                  <span style={{ fontSize: "0.82rem", color: "#86efac" }}>
                    Conectado como <strong>{user.email}</strong>
                  </span>
                </div>
                <BuyerForm
                  user={user}
                  onSubmit={submitCheckout}
                  pending={submitPending}
                />
              </>
            )}

            {turnstileError && (
              <div style={{ marginTop: "1rem" }}>
                <ActionFeedback status="error" message={turnstileError} />
              </div>
            )}

            {(submitState.status === "error" ||
              submitState.status === "validation_error") && (
              <div style={{ marginTop: "1rem" }}>
                <ActionFeedback status={submitState.status} message={submitState.message} />
              </div>
            )}
          </div>

          {/* Right: order summary */}
          <div className="checkout-summary-desktop">
            <OrderSummary />
          </div>
        </div>

      </main>

      <div className="checkout-summary-mobile">
        <button
          type="button"
          className="btn-primary"
          onClick={() => setSummaryOpen(true)}
          style={{
            width: "100%",
            justifyContent: "space-between",
            padding: "0.85rem 1.15rem",
            textAlign: "left",
          }}
          disabled={!session || session.items.length === 0}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
            <ReceiptText size={16} />
            Ver resumen
          </span>
          <strong style={{ fontFamily: "var(--font-heading)", fontWeight: 800 }}>
            {session ? formatPrice(session.total, session.currency) : "$0.00"}
          </strong>
        </button>
      </div>

      <Drawer.Root open={summaryOpen} onOpenChange={setSummaryOpen}>
        <Drawer.Portal>
          <Drawer.Overlay
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1500,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(3px)",
            }}
          />
          <Drawer.Content
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1501,
              background: "var(--bg-dark)",
              borderTop: "1px solid var(--glass-border)",
              borderTopLeftRadius: "1.2rem",
              borderTopRightRadius: "1.2rem",
              maxHeight: "86vh",
              overflowY: "auto",
              padding: "0.65rem 1rem calc(1rem + env(safe-area-inset-bottom))",
              boxShadow: "0 -20px 60px rgba(0,0,0,0.55)",
            }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 999, background: "rgba(255,255,255,0.2)", margin: "0.35rem auto 0.55rem" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <Drawer.Title style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", fontWeight: 800, color: "var(--text-light)" }}>
                Resumen del pedido
              </Drawer.Title>
              <Drawer.Close asChild>
                <button
                  aria-label="Cerrar resumen"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    border: "1px solid var(--glass-border)",
                    background: "var(--glass-bg)",
                    color: "var(--text-muted)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <X size={14} />
                </button>
              </Drawer.Close>
            </div>

            <OrderSummary mobile />
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
