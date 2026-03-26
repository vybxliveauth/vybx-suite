"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, CheckCircle2, User, KeyRound } from "lucide-react";
import {
  Button, Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription, Separator,
} from "@vybx/ui";
import { BackofficeShell } from "@/components/layout/BackofficeShell";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { Profile } from "@/lib/types";

// ── Schemas ──────────────────────────────────────────────────────────────────
const profileSchema = z.object({
  firstName: z.string().min(2, "Mínimo 2 caracteres").max(80),
  lastName:  z.string().max(80).optional(),
  email:     z.string().email("Email inválido"),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Requerido"),
  newPassword:     z.string()
    .min(12, "Mínimo 12 caracteres")
    .regex(/[A-Z]/, "Debe incluir una mayúscula")
    .regex(/\d/, "Debe incluir un número")
    .regex(/[^A-Za-z\d]/, "Debe incluir un símbolo"),
  confirmPassword: z.string().min(1, "Requerido"),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Las contraseñas no coinciden", path: ["confirmPassword"],
});

type ProfileValues  = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

function displayName(p: Profile | null) {
  if (!p) return "";
  return [p.firstName, p.lastName].filter(Boolean).join(" ") || p.email;
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AdminSettingsPage() {
  const { profile, init } = useAuthStore();

  const [profileSaved,  setProfileSaved]  = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [profileError,  setProfileError]  = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: profile?.firstName ?? displayName(profile),
      lastName:  profile?.lastName  ?? "",
      email:     profile?.email     ?? "",
    },
  });

  const passwordForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  async function onSaveProfile(values: ProfileValues) {
    setProfileError(null);
    try {
      await api.patch("/users/me", {
        firstName: values.firstName,
        lastName:  values.lastName || undefined,
        email:     values.email,
      });
      // Refresh auth store
      void init();
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  async function onSavePassword(values: PasswordValues) {
    setPasswordError(null);
    try {
      await api.patch("/users/me/password", {
        currentPassword: values.currentPassword,
        newPassword:     values.newPassword,
      });
      setPasswordSaved(true);
      passwordForm.reset();
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : "Error al cambiar contraseña");
    }
  }

  return (
    <BackofficeShell>
      <div className="mx-auto max-w-xl space-y-7">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Configuración</h1>
          <p className="text-sm text-slate-400">Administra tu cuenta y preferencias.</p>
        </div>

        {/* Profile info card */}
        <Card className="bo-card">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#1f2b3a] border border-[#243243] shrink-0">
                <User className="size-6 text-slate-400" />
              </div>
              <div>
                <p className="text-white font-semibold">{displayName(profile)}</p>
                <p className="text-sm text-slate-500">{profile?.email}</p>
                <span className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25">
                  {profile?.role ?? "ADMIN"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile form */}
        <Card className="bo-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              <User className="size-4" /> Perfil
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">Actualiza tu información personal</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Nombre</Label>
                  <Input {...profileForm.register("firstName")}
                    className="bg-[#101722] border-[#243243] text-[#e8edf3] placeholder:text-slate-600" />
                  {profileForm.formState.errors.firstName && (
                    <p className="text-xs text-red-400">{profileForm.formState.errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Apellido</Label>
                  <Input {...profileForm.register("lastName")}
                    className="bg-[#101722] border-[#243243] text-[#e8edf3] placeholder:text-slate-600" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Email</Label>
                <Input type="email" {...profileForm.register("email")}
                  className="bg-[#101722] border-[#243243] text-[#e8edf3] placeholder:text-slate-600" />
                {profileForm.formState.errors.email && (
                  <p className="text-xs text-red-400">{profileForm.formState.errors.email.message}</p>
                )}
              </div>
              {profileError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{profileError}</p>
              )}
              <Button type="submit" size="sm" disabled={profileForm.formState.isSubmitting}
                className="gap-2">
                {profileForm.formState.isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : profileSaved ? (
                  <CheckCircle2 className="size-4 text-emerald-400" />
                ) : (
                  <Save className="size-4" />
                )}
                {profileSaved ? "Guardado" : "Guardar perfil"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password form */}
        <Card className="bo-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              <KeyRound className="size-4" /> Cambiar contraseña
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Mínimo 12 caracteres, una mayúscula, un número y un símbolo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={passwordForm.handleSubmit(onSavePassword)} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300">Contraseña actual</Label>
                <Input type="password" {...passwordForm.register("currentPassword")}
                  className="bg-[#101722] border-[#243243] text-[#e8edf3]" />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-xs text-red-400">{passwordForm.formState.errors.currentPassword.message}</p>
                )}
              </div>
              <Separator className="bg-[#1f2b3a]" />
              <div className="space-y-1.5">
                <Label className="text-slate-300">Nueva contraseña</Label>
                <Input type="password" {...passwordForm.register("newPassword")}
                  className="bg-[#101722] border-[#243243] text-[#e8edf3]" />
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-xs text-red-400">{passwordForm.formState.errors.newPassword.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Confirmar contraseña</Label>
                <Input type="password" {...passwordForm.register("confirmPassword")}
                  className="bg-[#101722] border-[#243243] text-[#e8edf3]" />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-red-400">{passwordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
              {passwordError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{passwordError}</p>
              )}
              <Button type="submit" size="sm" disabled={passwordForm.formState.isSubmitting} className="gap-2">
                {passwordForm.formState.isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : passwordSaved ? (
                  <CheckCircle2 className="size-4 text-emerald-400" />
                ) : (
                  <Save className="size-4" />
                )}
                {passwordSaved ? "Actualizada" : "Cambiar contraseña"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </BackofficeShell>
  );
}
