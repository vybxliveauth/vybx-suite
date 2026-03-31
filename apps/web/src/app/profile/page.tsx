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
import {
  Zap, ChevronLeft, User, Mail, Phone, Lock,
  Eye, EyeOff, AlertCircle, Loader2,
  Save, ShieldCheck, Ticket, Download, Trash2,
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
          onFocus={e => { e.target.style.borderColor = "rgba(124,58,237,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.12)"; }}
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

  const [state, action, pending] = useActionState<UiActionState, ProfileFields>(
    async (_prev, data) => {
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
        return actionSuccessState("Perfil actualizado correctamente.");
      } catch (e) {
        return actionErrorState(e, "Error desconocido");
      }
    },
    uiActionInitialState,
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

        <ActionFeedback status={state.status} message={state.message} />

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
  const { register, handleSubmit, formState: { errors }, reset, control } = useForm<PasswordFields>({
    resolver: zodResolver(passwordSchema),
  });
  const newPasswordValue = useWatch({ control, name: "newPassword", defaultValue: "" });

  const [state, action, pending] = useActionState<UiActionState, PasswordFields>(
    async (_prev, data) => {
      try {
        await api.patch("/users/me/password", {
          currentPassword: data.currentPassword,
          newPassword:     data.newPassword,
        });
        reset();
        return actionSuccessState("Contraseña actualizada correctamente.");
      } catch (e) {
        return actionErrorState(e, "Error desconocido");
      }
    },
    uiActionInitialState,
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
        <PasswordStrengthMeter value={newPasswordValue} />

        <ActionFeedback status={state.status} message={state.message} />

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
          <button type="submit" disabled={pending} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.65rem 1.5rem" }}>
            {pending ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Actualizando...</> : <><ShieldCheck size={15} /> Actualizar contraseña</>}
          </button>
        </div>
      </form>
    </Card>
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

  useEffect(() => {
    setMarketingEnabled(user?.marketingEmailOptIn ?? true);
  }, [user?.marketingEmailOptIn]);

  async function handleSavePreferences() {
    setStatus(uiActionInitialState);
    setSavingPreferences(true);
    try {
      const response = await apiUpdateEmailPreferences(marketingEnabled);
      setUser({
        ...(user ?? {
          id: "",
          email: "",
          firstName: "",
          lastName: "",
          role: "USER",
          emailVerified: true,
          profileImageUrl: null,
        }),
        marketingEmailOptIn: response.marketingEmailOptIn,
      });
      setStatus(actionSuccessState("Preferencias de correo actualizadas."));
    } catch (error) {
      setStatus(actionErrorState(error, "No pudimos actualizar tus preferencias."));
    } finally {
      setSavingPreferences(false);
    }
  }

  async function handleExportData() {
    setStatus(uiActionInitialState);
    setExportingData(true);
    try {
      const exportPayload = await apiExportMyData();
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `vybx-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setStatus(actionSuccessState("Exportación lista. Se descargó tu archivo JSON."));
    } catch (error) {
      setStatus(actionErrorState(error, "No pudimos exportar tus datos."));
    } finally {
      setExportingData(false);
    }
  }

  async function handleDeleteAccount() {
    if (!deletePassword.trim()) {
      setStatus(actionErrorState(new Error("Ingresa tu contraseña actual.")));
      return;
    }

    const confirmed = window.confirm(
      "Esta acción elimina tu cuenta y no se puede deshacer. ¿Deseas continuar?",
    );
    if (!confirmed) return;

    setStatus(uiActionInitialState);
    setDeletingAccount(true);
    try {
      await apiDeleteMyAccount({
        currentPassword: deletePassword.trim(),
        reason: deleteReason.trim() || undefined,
      });
      await logout();
      setStatus(actionSuccessState("Cuenta eliminada. Cerramos tu sesión."));
      router.replace("/");
    } catch (error) {
      setStatus(actionErrorState(error, "No pudimos eliminar tu cuenta."));
    } finally {
      setDeletingAccount(false);
    }
  }

  return (
    <Card title="Privacidad y datos" icon={ShieldCheck}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div
          style={{
            border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius-lg)",
            padding: "1rem",
            background: "rgba(255,255,255,0.02)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p style={{ color: "var(--text-light)", fontSize: "0.9rem", fontWeight: 700 }}>
              Correos promocionales
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
              Activa o desactiva campañas y novedades.
            </p>
          </div>
          <label style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={marketingEnabled}
              onChange={(event) => setMarketingEnabled(event.target.checked)}
            />
            <span style={{ color: "var(--text-light)", fontSize: "0.85rem" }}>
              {marketingEnabled ? "Activado" : "Desactivado"}
            </span>
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            disabled={savingPreferences}
            className="btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 1.2rem" }}
            onClick={() => void handleSavePreferences()}
          >
            {savingPreferences ? (
              <>
                <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Guardando...
              </>
            ) : (
              <>
                <Save size={15} /> Guardar preferencias
              </>
            )}
          </button>
        </div>

        <div
          style={{
            border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius-lg)",
            padding: "1rem",
            background: "rgba(255,255,255,0.02)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p style={{ color: "var(--text-light)", fontSize: "0.9rem", fontWeight: 700 }}>
              Exportar mis datos (GDPR)
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
              Descarga una copia de tu información.
            </p>
          </div>
          <button
            type="button"
            disabled={exportingData}
            className="btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: "0.45rem", padding: "0.55rem 1rem" }}
            onClick={() => void handleExportData()}
          >
            {exportingData ? (
              <>
                <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Preparando...
              </>
            ) : (
              <>
                <Download size={15} /> Exportar
              </>
            )}
          </button>
        </div>

        <div
          style={{
            border: "1px solid rgba(244,63,94,0.25)",
            borderRadius: "var(--radius-lg)",
            padding: "1rem",
            background: "rgba(244,63,94,0.06)",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <div>
            <p style={{ color: "var(--text-light)", fontSize: "0.9rem", fontWeight: 700 }}>
              Eliminar cuenta
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
              Acción irreversible. Requiere contraseña actual.
            </p>
          </div>

          <Field
            label="Contraseña actual"
            icon={Lock}
            type="password"
            autoComplete="current-password"
            value={deletePassword}
            onChange={(event) => setDeletePassword(event.target.value)}
            placeholder="••••••••"
          />

          <Field
            label="Motivo (opcional)"
            value={deleteReason}
            onChange={(event) => setDeleteReason(event.target.value)}
            placeholder="Cuéntanos brevemente"
            maxLength={280}
          />

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              disabled={deletingAccount}
              style={{
                padding: "0.55rem 1.25rem",
                borderRadius: "var(--radius-pill)",
                border: "1px solid rgba(244,63,94,0.45)",
                background: "rgba(244,63,94,0.14)",
                color: "#fda4af",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
              }}
              onClick={() => void handleDeleteAccount()}
            >
              {deletingAccount ? (
                <>
                  <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Eliminando...
                </>
              ) : (
                <>
                  <Trash2 size={14} /> Eliminar cuenta
                </>
              )}
            </button>
          </div>
        </div>

        <ActionFeedback status={status.status} message={status.message} />
      </div>
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
        background: "var(--nav-bg)",
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
          <PrivacySection />

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
