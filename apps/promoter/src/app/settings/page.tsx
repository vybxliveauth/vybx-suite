"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, CheckCircle2, Monitor, Moon, Sun } from "lucide-react";
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from "@vybx/ui";
import { PromoterShell } from "@/components/layout/PromoterShell";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { api } from "@/lib/api";
import { setUser, displayName, useAuthUser } from "@/lib/auth";
import {
  readPromoterThemePreference,
  setPromoterThemePreference,
  type PromoterThemePreference,
} from "@/lib/theme";

// Password: mínimo 12 chars, una mayúscula, un número y un símbolo (política del backend)
const profileSchema = z.object({
  firstName: z.string().min(2, "Mínimo 2 caracteres").max(80),
  lastName:  z.string().max(80).optional(),
  email:     z.string().email("Email inválido"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Requerido"),
    newPassword:     z
      .string()
      .min(12, "Mínimo 12 caracteres")
      .regex(/[A-Z]/, "Debe incluir una mayúscula")
      .regex(/\d/, "Debe incluir un número")
      .regex(/[^A-Za-z\d]/, "Debe incluir un símbolo"),
    confirmPassword: z.string().min(1, "Requerido"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type ProfileValues  = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const user = useAuthUser();
  const [profileSaved,  setProfileSaved]  = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [profileError,  setProfileError]  = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [themePreference, setThemePreference] = useState<PromoterThemePreference>("system");

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName ?? displayName(user),
      lastName:  user?.lastName  ?? "",
      email:     user?.email     ?? "",
    },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
  });

  useEffect(() => {
    if (!user) return;
    profileForm.reset(
      {
        firstName: user.firstName ?? displayName(user),
        lastName: user.lastName ?? "",
        email: user.email ?? "",
      },
      { keepDirtyValues: true }
    );
  }, [profileForm, user]);

  useEffect(() => {
    setThemePreference(readPromoterThemePreference());
  }, []);

  async function onSaveProfile(values: ProfileValues) {
    setProfileError(null);
    try {
      const updated = await api.patch<typeof user>("/users/me", {
        firstName: values.firstName,
        lastName:  values.lastName || undefined,
        email:     values.email,
      });
      if (updated) {
        const current = user ?? null;
        setUser(current ? { ...current, ...updated } : updated);
      }
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

  function handleThemeChange(nextTheme: PromoterThemePreference) {
    setThemePreference(nextTheme);
    setPromoterThemePreference(nextTheme);
  }

  return (
    <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Configuración" }]} />}>
      <div className="space-y-6 max-w-xl">
        <div>
          <h1 className="text-xl font-semibold">Configuración</h1>
          <p className="text-sm text-muted-foreground">Administra tu cuenta y preferencias</p>
        </div>

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Perfil</CardTitle>
            <CardDescription>Actualiza tu información personal</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input id="firstName" {...profileForm.register("firstName")} />
                  {profileForm.formState.errors.firstName && (
                    <p className="text-xs text-destructive">{profileForm.formState.errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input id="lastName" {...profileForm.register("lastName")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...profileForm.register("email")} />
                {profileForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{profileForm.formState.errors.email.message}</p>
                )}
              </div>
              {profileError && (
                <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
                  {profileError}
                </p>
              )}
              <Button type="submit" size="sm" disabled={profileForm.formState.isSubmitting}>
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

        {/* Password */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cambiar contraseña</CardTitle>
            <CardDescription className="text-xs">Mínimo 12 caracteres, una mayúscula, un número y un símbolo.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={passwordForm.handleSubmit(onSavePassword)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword">Contraseña actual</Label>
                <Input id="currentPassword" type="password" {...passwordForm.register("currentPassword")} />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-xs text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>
                )}
              </div>
              <Separator />
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">Nueva contraseña</Label>
                <Input id="newPassword" type="password" {...passwordForm.register("newPassword")} />
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-xs text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <Input id="confirmPassword" type="password" {...passwordForm.register("confirmPassword")} />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
              {passwordError && (
                <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
                  {passwordError}
                </p>
              )}
              <Button type="submit" size="sm" disabled={passwordForm.formState.isSubmitting}>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tema del Panel</CardTitle>
            <CardDescription>
              Sincroniza con el sistema o selecciona modo oscuro/claro manual.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={themePreference}
              onValueChange={(value) => handleThemeChange(value as PromoterThemePreference)}
            >
              <SelectTrigger className="w-full md:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">
                  <span className="inline-flex items-center gap-2">
                    <Monitor className="size-4" /> Sistema
                  </span>
                </SelectItem>
                <SelectItem value="dark">
                  <span className="inline-flex items-center gap-2">
                    <Moon className="size-4" /> Oscuro
                  </span>
                </SelectItem>
                <SelectItem value="light">
                  <span className="inline-flex items-center gap-2">
                    <Sun className="size-4" /> Claro
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Preferencia activa: <strong>{themePreference}</strong>
            </p>
          </CardContent>
        </Card>
      </div>
    </PromoterShell>
  );
}
