"use client";

import { useEffect, useState, useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/store/useAuthStore";
import { PasswordStrengthMeter } from "@/components/features/PasswordStrengthMeter";
import {
  fetchProfile,
  api,
  apiDeleteMyAccount,
  apiExportMyData,
  apiUpdateEmailPreferences,
} from "@/lib/api";
import {
  actionErrorState,
  actionSuccessState,
  uiActionInitialState,
  type UiActionState,
} from "@/lib/action-state";
import { ActionFeedback } from "@vybx/ui";
import { VybxLogo } from "@/components/ui/VybxLogo";
import {
  ChevronLeft, User, Mail, Lock,
  Eye, EyeOff, AlertCircle, Loader2,
  Save, ShieldCheck, Ticket, Download, Trash2,
  Globe, MapPin, LogOut, Settings, Bell,
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
type TabId = "profile" | "security" | "privacy";

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
            padding: `0.7rem ${suffix ? "2.5rem" : "0.9rem"} 0.7rem ${Icon ? "2.4rem" : "0.9rem"}`,
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.05rem", fontWeight: 800, color: "var(--text-light)", marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--glass-border)" }}>
      {children}
    </h3>
  );
}

// ─── Profile Section ──────────────────────────────────────────────────────────

function ProfileSection() {
  const { user, setUser } = useAuthStore();
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProfileFields>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: user?.firstName ?? "", lastName: user?.lastName ?? "", email: user?.email ?? "" },
  });

  useEffect(() => {
    if (user) reset({ firstName: user.firstName, lastName: user.lastName, email: user.email });
  }, [user, reset]);

  const [state, action, pending] = useActionState<UiActionState, ProfileFields>(
    async (_prev, data) => {
      try {
        await api.patch("/users/me", { firstName: data.firstName, lastName: data.lastName, email: data.email, country: data.country || undefined, city: data.city || undefined });
        const updated = await fetchProfile();
        setUser(updated);
        return actionSuccessState("Perfil actualizado correctamente.");
      } catch (e) {
        return actionErrorState(e, "Error desconocido");
      }
    },
    uiActionInitialState,
  );

  return (
    <form onSubmit={handleSubmit((data) => action(data))} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <SectionTitle>Información personal</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
        <Field label="Nombre" icon={User} {...register("firstName")} error={errors.firstName?.message} placeholder="Juan" />
        <Field label="Apellido" {...register("lastName")} error={errors.lastName?.message} placeholder="Pérez" />
      </div>
      <Field label="Correo electrónico" icon={Mail} type="email" {...register("email")} error={errors.email?.message} placeholder="tu@email.com" />

      <div style={{ marginTop: "0.5rem", paddingTop: "1.25rem", borderTop: "1px solid var(--glass-border)" }}>
        <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.85rem" }}>Ubicación</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
          <Field label="País" icon={Globe} {...register("country")} placeholder="República Dominicana" />
          <Field label="Ciudad" icon={MapPin} {...register("city")} placeholder="Santo Domingo" />
        </div>
      </div>

      <ActionFeedback status={state.status} message={state.message} />

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
        <button type="submit" disabled={pending} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.65rem 1.5rem" }}>
          {pending ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Guardando...</> : <><Save size={15} /> Guardar cambios</>}
        </button>
      </div>
    </form>
  );
}

// ─── Security Section ─────────────────────────────────────────────────────────

function SecuritySection() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset, control } = useForm<PasswordFields>({
    resolver: zodResolver(passwordSchema),
  });
  const newPasswordValue = useWatch({ control, name: "newPassword", defaultValue: "" });

  const [state, action, pending] = useActionState<UiActionState, PasswordFields>(
    async (_prev, data) => {
      try {
        await api.patch("/users/me/password", { currentPassword: data.currentPassword, newPassword: data.newPassword });
        reset();
        return actionSuccessState("Contraseña actualizada correctamente.");
      } catch (e) {
        return actionErrorState(e, "Error desconocido");
      }
    },
    uiActionInitialState,
  );

  return (
    <form onSubmit={handleSubmit((data) => action(data))} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <SectionTitle>Cambiar contraseña</SectionTitle>
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
      <PasswordStrengthMeter value={newPasswordValue} />
      <ActionFeedback status={state.status} message={state.message} />
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" disabled={pending} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.65rem 1.5rem" }}>
          {pending ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Actualizando...</> : <><ShieldCheck size={15} /> Actualizar contraseña</>}
        </button>
      </div>
    </form>
  );
}

// ─── Privacy Section ──────────────────────────────────────────────────────────

function PrivacySection() {
  const router = useRouter();
  const { user, setUser, logout } = useAuthStore();
  const [marketingEnabled, setMarketingEnabled] = useState(user?.marketingEmailOptIn ?? true);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [status, setStatus] = useState<UiActionState>(uiActionInitialState);

  useEffect(() => { setMarketingEnabled(user?.marketingEmailOptIn ?? true); }, [user?.marketingEmailOptIn]);

  async function handleSavePreferences() {
    setStatus(uiActionInitialState); setSavingPreferences(true);
    try {
      const res = await apiUpdateEmailPreferences(marketingEnabled);
      setUser({ ...(user ?? { id: "", email: "", firstName: "", lastName: "", role: "USER", emailVerified: true, profileImageUrl: null }), marketingEmailOptIn: res.marketingEmailOptIn });
      setStatus(actionSuccessState("Preferencias actualizadas."));
    } catch (error) { setStatus(actionErrorState(error, "No pudimos actualizar tus preferencias.")); }
    finally { setSavingPreferences(false); }
  }

  async function handleExportData() {
    setStatus(uiActionInitialState); setExportingData(true);
    try {
      const exportPayload = await apiExportMyData();
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `vybx-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
      setStatus(actionSuccessState("Exportación lista. Descargando..."));
    } catch (error) { setStatus(actionErrorState(error, "No pudimos exportar tus datos.")); }
    finally { setExportingData(false); }
  }

  async function handleDeleteAccount() {
    if (!deletePassword.trim()) { setStatus(actionErrorState(new Error("Ingresa tu contraseña actual."))); return; }
    const confirmed = window.confirm("Esta acción elimina tu cuenta permanentemente. ¿Deseas continuar?");
    if (!confirmed) return;
    setStatus(uiActionInitialState); setDeletingAccount(true);
    try {
      await apiDeleteMyAccount({ currentPassword: deletePassword.trim(), reason: deleteReason.trim() || undefined });
      await logout(); setStatus(actionSuccessState("Cuenta eliminada.")); router.replace("/");
    } catch (error) { setStatus(actionErrorState(error, "No pudimos eliminar tu cuenta.")); }
    finally { setDeletingAccount(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <SectionTitle>Privacidad y datos</SectionTitle>

      {/* Marketing toggle */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "1.1rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <Bell size={16} color="var(--accent-primary)" />
          <div>
            <p style={{ color: "var(--text-light)", fontSize: "0.9rem", fontWeight: 700 }}>Correos promocionales</p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Novedades de eventos y campañas exclusivas</p>
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer" }}>
          <div
            onClick={() => setMarketingEnabled(!marketingEnabled)}
            style={{
              width: 44, height: 24, borderRadius: 999, cursor: "pointer",
              background: marketingEnabled ? "linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))" : "rgba(255,255,255,0.1)",
              position: "relative", transition: "background 0.25s",
            }}
          >
            <div style={{
              position: "absolute", top: 3, left: marketingEnabled ? 23 : 3,
              width: 18, height: 18, borderRadius: "50%", background: "#fff",
              transition: "left 0.25s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
            }} />
          </div>
          <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", minWidth: 60 }}>
            {marketingEnabled ? "Activado" : "Desactivado"}
          </span>
        </label>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" disabled={savingPreferences} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.45rem", padding: "0.6rem 1.25rem", fontSize: "0.85rem" }} onClick={() => void handleSavePreferences()}>
          {savingPreferences ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Guardando...</> : <><Save size={14} /> Guardar</>}
        </button>
      </div>

      {/* Export */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "1.1rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <Download size={16} color="var(--accent-primary)" />
          <div>
            <p style={{ color: "var(--text-light)", fontSize: "0.9rem", fontWeight: 700 }}>Exportar mis datos (GDPR)</p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Descarga una copia de tu información en JSON</p>
          </div>
        </div>
        <button type="button" disabled={exportingData} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.45rem", padding: "0.55rem 1rem", fontSize: "0.84rem", flexShrink: 0 }} onClick={() => void handleExportData()}>
          {exportingData ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Preparando...</> : <><Download size={14} /> Exportar</>}
        </button>
      </div>

      <ActionFeedback status={status.status} message={status.message} />

      {/* Delete account */}
      <div style={{ border: "1px solid rgba(244,63,94,0.2)", borderRadius: "var(--radius-xl)", padding: "1.25rem", background: "rgba(244,63,94,0.04)", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <Trash2 size={16} color="#f43f5e" />
          <div>
            <p style={{ color: "#fda4af", fontSize: "0.9rem", fontWeight: 700 }}>Eliminar cuenta</p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Acción permanente e irreversible</p>
          </div>
        </div>
        <Field label="Contraseña actual" icon={Lock} type="password" autoComplete="current-password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="••••••••" />
        <Field label="Motivo (opcional)" value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} placeholder="Cuéntanos brevemente" maxLength={280} />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" disabled={deletingAccount}
            style={{ padding: "0.55rem 1.25rem", borderRadius: "var(--radius-pill)", border: "1px solid rgba(244,63,94,0.45)", background: "rgba(244,63,94,0.12)", color: "#fda4af", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)", display: "inline-flex", alignItems: "center", gap: "0.45rem", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(244,63,94,0.22)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(244,63,94,0.12)"; }}
            onClick={() => void handleDeleteAccount()}
          >
            {deletingAccount ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Eliminando...</> : <><Trash2 size={14} /> Eliminar cuenta</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Nav ──────────────────────────────────────────────────────────────

const NAV_TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "profile",  label: "Mi perfil",  icon: User },
  { id: "security", label: "Seguridad",  icon: ShieldCheck },
  { id: "privacy",  label: "Privacidad", icon: Settings },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser, logout } = useAuthStore();
  const [loading, setLoading] = useState(!user);
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (user) { setLoading(false); return; }
    fetchProfile()
      .then((u) => { setUser(u); setLoading(false); })
      .catch(() => router.replace("/"));
  }, [user, setUser, router]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const initials = user
    ? (user.firstName?.[0] ?? user.email[0]).toUpperCase() + (user.lastName?.[0] ?? "").toUpperCase()
    : "?";

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
        background: "var(--nav-bg)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--glass-border)",
      }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <VybxLogo size={24} textSize="1.4rem" />
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

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "2.5rem 5% 6rem", display: "flex", gap: "2rem", alignItems: "flex-start", flexDirection: isMobile ? "column" : "row" }}>

        {/* ── Sidebar / Mobile Tabs ── */}
        {isMobile ? (
          /* Mobile: horizontal tab bar */
          <div style={{ width: "100%", display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
            {NAV_TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{
                  display: "flex", alignItems: "center", gap: "0.4rem",
                  padding: "0.55rem 1rem", borderRadius: "var(--radius-lg)", border: "none",
                  cursor: "pointer", whiteSpace: "nowrap", fontSize: "0.84rem", fontWeight: 600,
                  fontFamily: "var(--font-body)",
                  background: activeTab === id ? "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))" : "rgba(255,255,255,0.05)",
                  color: activeTab === id ? "#fff" : "var(--text-muted)",
                  transition: "all 0.2s",
                }}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        ) : (
          /* Desktop: sidebar */
          <aside style={{ width: 230, flexShrink: 0, position: "sticky", top: 90 }}>
            {/* Avatar card */}
            <div style={{
              background: "var(--card-bg)", border: "1px solid var(--glass-border)",
              borderRadius: "var(--radius-2xl)", padding: "1.5rem 1.25rem",
              marginBottom: "0.75rem", textAlign: "center",
            }}>
              <div style={{
                width: 76, height: 76, borderRadius: "50%", margin: "0 auto 0.85rem",
                background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.6rem", fontWeight: 900, color: "#fff",
                fontFamily: "var(--font-heading)",
                boxShadow: "0 0 0 4px rgba(124,58,237,0.2), 0 8px 24px rgba(0,0,0,0.3)",
              }}>
                {initials}
              </div>
              <p style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", fontWeight: 800, color: "var(--text-light)", marginBottom: "0.2rem" }}>
                {user?.firstName} {user?.lastName}
              </p>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", wordBreak: "break-all" }}>{user?.email}</p>
            </div>

            {/* Nav links */}
            <nav style={{ background: "var(--card-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-2xl)", overflow: "hidden" }}>
              {NAV_TABS.map(({ id, label, icon: Icon }, idx) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.65rem",
                    width: "100%", padding: "0.85rem 1.25rem",
                    background: activeTab === id ? "rgba(124,58,237,0.12)" : "transparent",
                    border: "none",
                    borderTop: idx > 0 ? "1px solid var(--glass-border)" : "none",
                    borderLeft: activeTab === id ? "3px solid var(--accent-primary)" : "3px solid transparent",
                    cursor: "pointer", textAlign: "left",
                    color: activeTab === id ? "var(--text-light)" : "var(--text-muted)",
                    fontSize: "0.88rem", fontWeight: activeTab === id ? 700 : 500,
                    fontFamily: "var(--font-body)",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { if (activeTab !== id) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { if (activeTab !== id) e.currentTarget.style.background = "transparent"; }}
                >
                  <Icon size={15} color={activeTab === id ? "var(--accent-primary)" : "var(--text-muted)"} />
                  {label}
                </button>
              ))}

              {/* Separator */}
              <div style={{ borderTop: "1px solid var(--glass-border)", margin: "0" }} />

              {/* Logout */}
              <button
                onClick={() => { logout(); router.push("/"); }}
                style={{
                  display: "flex", alignItems: "center", gap: "0.65rem",
                  width: "100%", padding: "0.85rem 1.25rem",
                  background: "transparent", border: "none",
                  cursor: "pointer", textAlign: "left",
                  color: "#fda4af", fontSize: "0.88rem", fontWeight: 500,
                  fontFamily: "var(--font-body)", transition: "all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(244,63,94,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                <LogOut size={15} color="#fda4af" /> Cerrar sesión
              </button>
            </nav>

            {/* Tickets shortcut */}
            <Link
              href="/my-tickets"
              style={{
                display: "flex", alignItems: "center", gap: "0.65rem",
                marginTop: "0.75rem", padding: "0.85rem 1.25rem",
                background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)",
                borderRadius: "var(--radius-xl)", textDecoration: "none",
                color: "var(--text-muted)", fontSize: "0.86rem", fontWeight: 500,
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(124,58,237,0.12)"; e.currentTarget.style.color = "var(--text-light)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(124,58,237,0.06)"; e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              <Ticket size={15} color="var(--accent-primary)" /> Mis tickets
            </Link>
          </aside>
        )}

        {/* ── Main Content ── */}
        <div style={{
          flex: 1, minWidth: 0,
          background: "var(--card-bg)", border: "1px solid var(--glass-border)",
          borderRadius: "var(--radius-2xl)", padding: "1.75rem 2rem",
        }}>
          {/* Mobile: avatar header */}
          {isMobile && (
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", paddingBottom: "1.25rem", borderBottom: "1px solid var(--glass-border)" }}>
              <div style={{
                width: 54, height: 54, borderRadius: "50%",
                background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.2rem", fontWeight: 900, color: "#fff", fontFamily: "var(--font-heading)",
                boxShadow: "0 0 0 3px rgba(124,58,237,0.2)",
                flexShrink: 0,
              }}>
                {initials}
              </div>
              <div>
                <p style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", fontWeight: 800, color: "var(--text-light)" }}>{user?.firstName} {user?.lastName}</p>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{user?.email}</p>
              </div>
            </div>
          )}

          {activeTab === "profile"  && <ProfileSection />}
          {activeTab === "security" && <SecuritySection />}
          {activeTab === "privacy"  && <PrivacySection />}

          {/* Mobile logout */}
          {isMobile && (
            <button
              onClick={() => { logout(); router.push("/"); }}
              style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                marginTop: "1.5rem", padding: "0.65rem 1.25rem",
                borderRadius: "var(--radius-pill)", border: "1px solid rgba(244,63,94,0.3)",
                background: "rgba(244,63,94,0.07)", color: "#fda4af",
                fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
                fontFamily: "var(--font-body)",
              }}
            >
              <LogOut size={14} /> Cerrar sesión
            </button>
          )}
        </div>
      </main>
    </>
  );
}
