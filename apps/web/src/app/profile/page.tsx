"use client";

import { useEffect, useState, useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/store/useAuthStore";
import { fetchProfile, api } from "@/lib/api";
import {
  Zap, ChevronLeft, User, Mail, Phone, Lock,
  Eye, EyeOff, CheckCircle2, AlertCircle, Loader2,
  Save, ShieldCheck, Ticket,
} from "lucide-react";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  firstName: z.string().min(2, "Mínimo 2 caracteres").max(80),
  lastName:  z.string().min(2, "Mínimo 2 caracteres").max(80),
  email:     z.string().email("Email inválido"),
  country:   z.string().max(80).optional().or(z.literal("")),
  city:      z.string().max(120).optional().or(z.literal("")),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Requerido"),
  newPassword: z
    .string()
    .min(12, "Mínimo 12 caracteres")
    .regex(/[A-Z]/, "Debe tener mayúscula")
    .regex(/\d/, "Debe tener un número")
    .regex(/[^A-Za-z\d]/, "Debe tener un símbolo"),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type ProfileFields  = z.infer<typeof profileSchema>;
type PasswordFields = z.infer<typeof passwordSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({
  label, error, icon: Icon, suffix, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string; error?: string; icon?: React.ElementType; suffix?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        {Icon && <Icon size={14} color="var(--text-muted)" style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />}
        <input
          {...props}
          style={{
            width: "100%",
            padding: `0.65rem ${suffix ? "2.5rem" : "0.85rem"} 0.65rem ${Icon ? "2.3rem" : "0.85rem"}`,
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${error ? "rgba(244,63,94,0.5)" : "var(--glass-border)"}`,
            borderRadius: "var(--radius-lg)",
            color: "var(--text-light)",
            fontSize: "0.9rem",
            fontFamily: "var(--font-body)",
            outline: "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
          onFocus={e => { e.target.style.borderColor = "rgba(124,58,237,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
          onBlur={e => { e.target.style.borderColor = error ? "rgba(244,63,94,0.5)" : "var(--glass-border)"; e.target.style.boxShadow = "none"; }}
        />
        {suffix && <div style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)" }}>{suffix}</div>}
      </div>
      {error && <span style={{ fontSize: "0.72rem", color: "#f43f5e", display: "flex", alignItems: "center", gap: "0.3rem" }}><AlertCircle size={11} />{error}</span>}
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-2xl)", overflow: "hidden" }}>
      <div style={{ padding: "1.25rem 1.75rem", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <Icon size={16} color="var(--accent-primary)" />
        <span style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", fontWeight: 800, color: "var(--text-light)" }}>{title}</span>
      </div>
      <div style={{ padding: "1.75rem" }}>{children}</div>
    </div>
  );
}

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div style={{
      padding: "0.7rem 1rem",
      borderRadius: "var(--radius-xl)",
      background: type === "success" ? "rgba(34,197,94,0.1)" : "rgba(244,63,94,0.1)",
      border: `1px solid ${type === "success" ? "rgba(34,197,94,0.3)" : "rgba(244,63,94,0.3)"}`,
      color: type === "success" ? "#4ade80" : "#fda4af",
      fontSize: "0.82rem",
      display: "flex", alignItems: "center", gap: "0.5rem",
    }}>
      {type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
      {msg}
    </div>
  );
}

// ─── Profile Section ──────────────────────────────────────────────────────────

function ProfileSection() {
  const { user, setUser } = useAuthStore();
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProfileFields>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName:  user?.lastName ?? "",
      email:     user?.email ?? "",
    },
  });

  // Reset form when user loads
  useEffect(() => {
    if (user) reset({ firstName: user.firstName, lastName: user.lastName, email: user.email });
  }, [user, reset]);

  const [state, action, pending] = useActionState(
    async (_prev: { error: string | null; success: boolean }, data: ProfileFields) => {
      try {
        await api.patch("/users/me", {
          firstName: data.firstName,
          lastName:  data.lastName,
          email:     data.email,
          country:   data.country || undefined,
          city:      data.city    || undefined,
        });
        const updated = await fetchProfile();
        setUser(updated);
        return { error: null, success: true };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Error desconocido", success: false };
      }
    },
    { error: null, success: false }
  );

  return (
    <Card title="Datos personales" icon={User}>
      <form onSubmit={handleSubmit((data) => action(data))} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div className="grid-2col">
          <Field label="Nombre"   icon={User} {...register("firstName")} error={errors.firstName?.message} placeholder="Juan" />
          <Field label="Apellido"            {...register("lastName")}  error={errors.lastName?.message}  placeholder="Pérez" />
        </div>
        <Field label="Email" icon={Mail} type="email" {...register("email")} error={errors.email?.message} placeholder="tu@email.com" />
        <div className="grid-2col">
          <Field label="País"   icon={Phone} {...register("country")} placeholder="República Dominicana" />
          <Field label="Ciudad"              {...register("city")}    placeholder="Santo Domingo" />
        </div>

        {state.error   && <Toast msg={state.error}              type="error" />}
        {state.success && <Toast msg="Perfil actualizado ✓"     type="success" />}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
          <button type="submit" disabled={pending} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.65rem 1.5rem" }}>
            {pending ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Guardando...</> : <><Save size={15} /> Guardar cambios</>}
          </button>
        </div>
      </form>
    </Card>
  );
}

// ─── Password Section ─────────────────────────────────────────────────────────

function PasswordSection() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<PasswordFields>({
    resolver: zodResolver(passwordSchema),
  });

  const [state, action, pending] = useActionState(
    async (_prev: { error: string | null; success: boolean }, data: PasswordFields) => {
      try {
        await api.patch("/users/me/password", {
          currentPassword: data.currentPassword,
          newPassword:     data.newPassword,
        });
        reset();
        return { error: null, success: true };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Error desconocido", success: false };
      }
    },
    { error: null, success: false }
  );

  return (
    <Card title="Cambiar contraseña" icon={Lock}>
      <form onSubmit={handleSubmit((data) => action(data))} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <Field
          label="Contraseña actual" icon={Lock} type={showCurrent ? "text" : "password"}
          {...register("currentPassword")} error={errors.currentPassword?.message}
          placeholder="••••••••" autoComplete="current-password"
          suffix={
            <button type="button" onClick={() => setShowCurrent(!showCurrent)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
              {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          }
        />
        <Field
          label="Nueva contraseña" icon={Lock} type={showNew ? "text" : "password"}
          {...register("newPassword")} error={errors.newPassword?.message}
          placeholder="Mín. 12 caracteres" autoComplete="new-password"
          suffix={
            <button type="button" onClick={() => setShowNew(!showNew)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
              {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          }
        />
        <Field
          label="Confirmar nueva contraseña" icon={Lock} type={showNew ? "text" : "password"}
          {...register("confirmPassword")} error={errors.confirmPassword?.message}
          placeholder="Repite la contraseña" autoComplete="new-password"
        />
        <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
          Mínimo 12 caracteres · una mayúscula · un número · un símbolo
        </p>

        {state.error   && <Toast msg={state.error}                    type="error" />}
        {state.success && <Toast msg="Contraseña actualizada ✓"       type="success" />}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
          <button type="submit" disabled={pending} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.65rem 1.5rem" }}>
            {pending ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Actualizando...</> : <><ShieldCheck size={15} /> Actualizar contraseña</>}
          </button>
        </div>
      </form>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router  = useRouter();
  const { user, setUser, logout } = useAuthStore();
  const [loading, setLoading] = useState(!user);

  useEffect(() => {
    if (user) { setLoading(false); return; }
    fetchProfile()
      .then((u) => { setUser(u); setLoading(false); })
      .catch(() => router.replace("/"));
  }, [user, setUser, router]);

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={28} color="var(--accent-secondary)" style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Navbar */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1rem 5%",
        background: "rgba(10,10,18,0.9)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--glass-border)",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
          <Zap size={20} color="var(--accent-primary)" />
          <span style={{ fontFamily: "var(--font-heading)", fontSize: "1.4rem", fontWeight: 900, color: "var(--text-light)" }}>vybx</span>
        </Link>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <Link href="/my-tickets" style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", color: "var(--text-muted)", textDecoration: "none", transition: "color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text-light)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            <Ticket size={14} /> Mis tickets
          </Link>
          <Link href="/" className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.45rem 1rem", fontSize: "0.85rem", textDecoration: "none" }}>
            <ChevronLeft size={14} /> Volver
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "3rem 5% 6rem" }}>
        {/* Header — avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", marginBottom: "2.5rem" }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.5rem", fontWeight: 900, color: "#fff",
            fontFamily: "var(--font-heading)",
            flexShrink: 0,
          }}>
            {user?.firstName?.[0]?.toUpperCase() ?? user?.email[0].toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", fontWeight: 900, color: "var(--text-light)", letterSpacing: "-0.5px" }}>
              {user?.firstName} {user?.lastName}
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>{user?.email}</p>
          </div>
        </div>

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <ProfileSection />
          <PasswordSection />

          {/* Danger zone */}
          <div style={{
            padding: "1.25rem 1.75rem",
            border: "1px solid rgba(244,63,94,0.2)",
            borderRadius: "var(--radius-2xl)",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
            flexWrap: "wrap",
          }}>
            <div>
              <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-light)", marginBottom: "0.2rem" }}>Cerrar sesión</p>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Salir de tu cuenta en este dispositivo.</p>
            </div>
            <button
              onClick={() => { logout(); router.push("/"); }}
              style={{
                padding: "0.55rem 1.25rem",
                borderRadius: "var(--radius-pill)",
                border: "1px solid rgba(244,63,94,0.4)",
                background: "rgba(244,63,94,0.08)",
                color: "#fda4af",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(244,63,94,0.15)"; e.currentTarget.style.borderColor = "rgba(244,63,94,0.6)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(244,63,94,0.08)"; e.currentTarget.style.borderColor = "rgba(244,63,94,0.4)"; }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
