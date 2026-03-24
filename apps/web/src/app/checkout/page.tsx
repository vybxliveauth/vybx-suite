"use client";

import { useEffect, useState, useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCartStore } from "@/store/useCartStore";
import { formatPrice, formatCountdown, formatEventDate } from "@/lib/utils";
import { login, fetchProfile, type AuthUser } from "@/lib/api";
import {
  Zap,
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
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  icon?: React.ElementType;
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
            padding: Icon ? "0.7rem 0.9rem 0.7rem 2.4rem" : "0.7rem 0.9rem",
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

function OrderSummary() {
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
      position: "sticky",
      top: 100,
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
            <strong style={{ fontFamily: "var(--font-heading)", color: isUrgent ? "#fda4af" : "var(--text-light)" }}>
              {formatCountdown(seconds)}
            </strong>
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
        <div>
          <InputField
            label="Contraseña"
            icon={Lock}
            type={showPass ? "text" : "password"}
            {...register("password")}
            error={errors.password?.message}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            style={{ position: "absolute", right: "0.9rem", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
          >
            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        {state.error && (
          <div style={{ padding: "0.65rem 0.9rem", borderRadius: "var(--radius-md)", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", color: "#fda4af", fontSize: "0.82rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <AlertCircle size={14} /> {state.error}
          </div>
        )}

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

      {/* Payment — placeholder */}
      <div style={{
        background: "var(--card-bg)",
        border: "1px solid var(--glass-border)",
        borderRadius: "var(--radius-2xl)",
        padding: "1.75rem",
      }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.1rem", fontWeight: 800, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-light)" }}>
          <Lock size={16} color="var(--accent-primary)" />
          Método de pago
        </h2>

        <div style={{
          padding: "1rem",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid var(--glass-border)",
          borderRadius: "var(--radius-xl)",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}>
          <CreditCard size={22} color="var(--accent-secondary)" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-light)", marginBottom: "0.15rem" }}>
              Tarjeta de crédito / débito
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Serás redirigido al gateway de pago seguro.
            </p>
          </div>
          <ShieldCheck size={16} color="#4ade80" style={{ marginLeft: "auto", flexShrink: 0 }} />
        </div>
      </div>

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
        Al confirmar aceptas los <a href="#" style={{ color: "var(--accent-secondary)" }}>términos y condiciones</a>.
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

  // Check if user is already logged in
  useEffect(() => {
    fetchProfile()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoadingUser(false));
  }, []);

  const [submitState, submitAction, submitPending] = useActionState(
    async (_prev: { error: string | null }, _data: BuyerFields) => {
      try {
        const items = session?.items ?? [];
        if (items.length === 0) throw new Error("Carrito vacío");

        const csrfToken = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/)?.[1] ?? "";
        const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3004";

        // Create a payment intent for every cart item
        const checkoutUrls: string[] = [];
        for (const item of items) {
          const res = await fetch(`${API_URL}/payments/create-intent`, {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              "x-csrf-token": csrfToken,
              "idempotency-key": crypto.randomUUID(),
            },
            body: JSON.stringify({
              ticketTypeId: item.tierId,
              quantity: item.quantity,
              eventId: item.eventId,
              turnstileToken: "1x00000000000000000000AA",
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(Array.isArray(err.message) ? err.message.join(", ") : err.message ?? "Error creando el pago");
          }
          const intent = await res.json();
          checkoutUrls.push(intent.checkoutUrl);
        }

        // Queue remaining checkout URLs so the result page can chain them
        if (checkoutUrls.length > 1) {
          sessionStorage.setItem("vybx_checkout_queue", JSON.stringify(checkoutUrls.slice(1)));
          sessionStorage.setItem("vybx_checkout_total", String(checkoutUrls.length));
        } else {
          sessionStorage.removeItem("vybx_checkout_queue");
          sessionStorage.removeItem("vybx_checkout_total");
        }

        window.location.href = checkoutUrls[0];
        return { error: null };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Error al procesar el pago" };
      }
    },
    { error: null }
  );

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
        background: "rgba(10,10,18,0.85)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--glass-border)",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
          <Zap size={20} color="var(--accent-primary)" />
          <span style={{ fontFamily: "var(--font-heading)", fontSize: "1.4rem", fontWeight: 900, color: "var(--text-light)" }}>vybx</span>
        </Link>
        <Link href="/" className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.45rem 1rem", fontSize: "0.85rem", textDecoration: "none" }}>
          <ChevronLeft size={14} /> Volver
        </Link>
      </nav>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "3rem 5% 6rem" }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.8rem,4vw,2.5rem)", fontWeight: 900, letterSpacing: "-1px", marginBottom: "2.5rem", color: "var(--text-light)" }}>
          Checkout
        </h1>

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
                  onSubmit={(data) => submitAction(data)}
                  pending={submitPending}
                />
              </>
            )}

            {submitState.error && (
              <div style={{ marginTop: "1rem", padding: "0.85rem 1rem", borderRadius: "var(--radius-xl)", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", color: "#fda4af", fontSize: "0.85rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <AlertCircle size={15} /> {submitState.error}
              </div>
            )}
          </div>

          {/* Right: order summary */}
          <OrderSummary />
        </div>

      </main>
    </>
  );
}
