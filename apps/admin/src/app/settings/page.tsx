"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CheckCircle2,
  Loader2,
  Monitor,
  Moon,
  Plus,
  Save,
  ShieldAlert,
  Sun,
  Trash2,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Switch,
} from "@vybx/ui";
import { PromoterShell } from "@/components/layout/PromoterShell";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { api } from "@/lib/api";
import { setUser, displayName, useAuthUser } from "@/lib/auth";
import { usePromoters } from "@/lib/queries";
import {
  readAdminThemePreference,
  setAdminThemePreference,
  type AdminThemePreference,
} from "@/lib/theme";

type ConfigRecord = {
  key: string;
  value: string;
  description?: string | null;
};

type VipFeeOverride = {
  promoterId: string;
  promoterLabel: string;
  feePercent: number;
};

type PlatformConfigCache = {
  maintenanceMode: boolean;
  waitingRoomMode: boolean;
  opsAlertsEnabled: boolean;
  platformFeePercent: number;
  vipOverrides: VipFeeOverride[];
};

const PLATFORM_CONFIG_CACHE_KEY_PREFIX = "vybx.admin.platform-config.v2";
const CONFIG_KEY_MAINTENANCE_MODE = "MAINTENANCE_MODE";
const CONFIG_KEY_WAITING_ROOM_MODE = "WAITING_ROOM_MODE";
const CONFIG_KEY_OPS_ALERTS_ENABLED = "OPS_ALERTS_ENABLED";
const CONFIG_KEY_PLATFORM_FEE = "PLATFORM_FEE";
const CONFIG_KEY_VIP_PROMOTER_FEES = "VIP_PROMOTER_FEES";

function parseBoolean(input: unknown, fallback = false): boolean {
  if (typeof input === "boolean") return input;
  if (typeof input === "string") {
    if (input.toLowerCase() === "true") return true;
    if (input.toLowerCase() === "false") return false;
  }
  return fallback;
}

function clampFeePercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Number(value.toFixed(2))));
}

function resolvePlatformConfigCacheKey(userId?: string): string {
  return `${PLATFORM_CONFIG_CACHE_KEY_PREFIX}:${userId ?? "anonymous"}`;
}

function readPlatformConfigCache(storageKey: string): PlatformConfigCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlatformConfigCache>;
    return {
      maintenanceMode: Boolean(parsed.maintenanceMode),
      waitingRoomMode: Boolean(parsed.waitingRoomMode),
      opsAlertsEnabled: parseBoolean(parsed.opsAlertsEnabled, true),
      platformFeePercent: clampFeePercent(Number(parsed.platformFeePercent ?? 0)),
      vipOverrides: Array.isArray(parsed.vipOverrides)
        ? parsed.vipOverrides
            .map((item) => ({
              promoterId: String(item.promoterId ?? ""),
              promoterLabel: String(item.promoterLabel ?? "Promotor"),
              feePercent: clampFeePercent(Number(item.feePercent ?? 0)),
            }))
            .filter((item) => item.promoterId.length > 0)
        : [],
    };
  } catch {
    return null;
  }
}

function writePlatformConfigCache(storageKey: string, payload: PlatformConfigCache): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(payload));
}

// Password: mínimo 12 chars, una mayúscula, un número y un símbolo (política del backend)
const profileSchema = z.object({
  firstName: z.string().min(2, "Mínimo 2 caracteres").max(80),
  lastName: z.string().max(80).optional(),
  email: z.string().email("Email inválido"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Requerido"),
    newPassword: z
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

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const user = useAuthUser();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [waitingRoomMode, setWaitingRoomMode] = useState(false);
  const [opsAlertsEnabled, setOpsAlertsEnabled] = useState(true);
  const [platformFeePercentInput, setPlatformFeePercentInput] = useState("10");
  const [vipOverrides, setVipOverrides] = useState<VipFeeOverride[]>([]);

  const [opsSaving, setOpsSaving] = useState(false);
  const [opsNotice, setOpsNotice] = useState<string | null>(null);
  const [opsError, setOpsError] = useState<string | null>(null);

  const [feesSaving, setFeesSaving] = useState(false);
  const [feesNotice, setFeesNotice] = useState<string | null>(null);
  const [feesError, setFeesError] = useState<string | null>(null);

  const [themePreference, setThemePreference] = useState<AdminThemePreference>("system");

  const [selectedPromoterId, setSelectedPromoterId] = useState("");
  const [selectedPromoterFeeInput, setSelectedPromoterFeeInput] = useState("8");
  const platformConfigCacheKey = useMemo(
    () => resolvePlatformConfigCacheKey(user?.userId),
    [user?.userId]
  );

  const promotersQuery = usePromoters();
  const promoters = promotersQuery.data?.data ?? [];

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName ?? displayName(user),
      lastName: user?.lastName ?? "",
      email: user?.email ?? "",
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

  const platformSnapshot = useMemo<PlatformConfigCache>(
    () => ({
      maintenanceMode,
      waitingRoomMode,
      opsAlertsEnabled,
      platformFeePercent: clampFeePercent(Number(platformFeePercentInput)),
      vipOverrides,
    }),
    [maintenanceMode, opsAlertsEnabled, platformFeePercentInput, vipOverrides, waitingRoomMode]
  );

  useEffect(() => {
    setThemePreference(readAdminThemePreference());
  }, []);

  useEffect(() => {
    const firstPromoter = promoters[0];
    if (!selectedPromoterId && firstPromoter) {
      setSelectedPromoterId(firstPromoter.id);
    }
  }, [promoters, selectedPromoterId]);

  useEffect(() => {
    const cached = readPlatformConfigCache(platformConfigCacheKey);
    if (cached) {
      setMaintenanceMode(cached.maintenanceMode);
      setWaitingRoomMode(cached.waitingRoomMode);
      setOpsAlertsEnabled(cached.opsAlertsEnabled);
      setPlatformFeePercentInput(String(cached.platformFeePercent));
      setVipOverrides(cached.vipOverrides);
    }

    let cancelled = false;
    (async () => {
      try {
        const endpoint = isSuperAdmin ? "/config/internal/all" : "/config";
        const entries = await api.get<ConfigRecord[]>(endpoint);
        if (cancelled || !Array.isArray(entries)) return;

        const lookup = new Map(entries.map((item) => [item.key, item.value]));
        const remoteMaintenance = lookup.get(CONFIG_KEY_MAINTENANCE_MODE);
        const remoteWaitingRoom = lookup.get(CONFIG_KEY_WAITING_ROOM_MODE);
        const remoteOpsAlerts = lookup.get(CONFIG_KEY_OPS_ALERTS_ENABLED);
        const remoteFee = lookup.get(CONFIG_KEY_PLATFORM_FEE);
        const remoteOverridesRaw = lookup.get(CONFIG_KEY_VIP_PROMOTER_FEES);

        const nextMaintenance = parseBoolean(
          remoteMaintenance,
          cached?.maintenanceMode ?? false
        );
        const nextWaitingRoom = parseBoolean(
          remoteWaitingRoom,
          cached?.waitingRoomMode ?? false
        );
        const nextOpsAlerts = parseBoolean(
          remoteOpsAlerts,
          cached?.opsAlertsEnabled ?? true
        );
        const nextFee = clampFeePercent(Number(remoteFee ?? cached?.platformFeePercent ?? 10));

        let nextOverrides = cached?.vipOverrides ?? [];
        if (typeof remoteOverridesRaw === "string" && remoteOverridesRaw.trim().length > 0) {
          try {
            const parsed = JSON.parse(remoteOverridesRaw) as Array<{
              promoterId: string;
              promoterLabel?: string;
              feePercent: number;
            }>;
            if (Array.isArray(parsed)) {
              nextOverrides = parsed
                .map((item) => ({
                  promoterId: String(item.promoterId ?? ""),
                  promoterLabel: String(item.promoterLabel ?? "Promotor"),
                  feePercent: clampFeePercent(Number(item.feePercent ?? 0)),
                }))
                .filter((item) => item.promoterId.length > 0);
            }
          } catch {
            // ignore malformed JSON from backend config
          }
        }

        setMaintenanceMode(nextMaintenance);
        setWaitingRoomMode(nextWaitingRoom);
        setOpsAlertsEnabled(nextOpsAlerts);
        setPlatformFeePercentInput(String(nextFee));
        setVipOverrides(nextOverrides);

        writePlatformConfigCache(platformConfigCacheKey, {
          maintenanceMode: nextMaintenance,
          waitingRoomMode: nextWaitingRoom,
          opsAlertsEnabled: nextOpsAlerts,
          platformFeePercent: nextFee,
          vipOverrides: nextOverrides,
        });
      } catch {
        // Backend may hide non-public settings on GET /config; local cache remains the source of truth.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin, platformConfigCacheKey]);

  async function onSaveProfile(values: ProfileValues) {
    setProfileError(null);
    try {
      const updated = await api.patch<typeof user>("/users/me", {
        firstName: values.firstName,
        lastName: values.lastName || undefined,
        email: values.email,
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
        newPassword: values.newPassword,
      });
      setPasswordSaved(true);
      passwordForm.reset();
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (err: unknown) {
      setPasswordError(
        err instanceof Error ? err.message : "Error al cambiar contraseña"
      );
    }
  }

  async function saveOperationsSettings() {
    if (!isSuperAdmin) {
      setOpsError("Solo SUPER_ADMIN puede guardar estos ajustes globales.");
      return;
    }

    setOpsSaving(true);
    setOpsNotice(null);
    setOpsError(null);

    try {
      await Promise.all([
        api.patch("/config", {
          key: CONFIG_KEY_MAINTENANCE_MODE,
          value: String(maintenanceMode),
          description: "Global maintenance mode for public and internal surfaces",
        }),
        api.patch("/config", {
          key: CONFIG_KEY_WAITING_ROOM_MODE,
          value: String(waitingRoomMode),
          description: "Global waiting-room pre-gate for high traffic windows",
        }),
        api.patch("/config", {
          key: CONFIG_KEY_OPS_ALERTS_ENABLED,
          value: String(opsAlertsEnabled),
          description: "Enable or disable operational alert dispatch channels",
        }),
      ]);

      writePlatformConfigCache(platformConfigCacheKey, platformSnapshot);
      setOpsNotice("Ajustes de operación global guardados correctamente.");
    } catch (error) {
      setOpsError((error as Error).message || "No se pudieron guardar los ajustes.");
    } finally {
      setOpsSaving(false);
    }
  }

  function addOrUpdateVipOverride() {
    setFeesError(null);

    if (!selectedPromoterId) {
      setFeesError("Selecciona un promotor antes de agregar override VIP.");
      return;
    }

    const feeValue = clampFeePercent(Number(selectedPromoterFeeInput));
    if (!Number.isFinite(Number(selectedPromoterFeeInput))) {
      setFeesError("El fee VIP debe ser un número válido.");
      return;
    }

    const promoter = promoters.find((item) => item.id === selectedPromoterId);
    const promoterLabel = promoter
      ? `${promoter.firstName ?? ""} ${promoter.lastName ?? ""}`.trim() ||
        promoter.email
      : selectedPromoterId;

    setVipOverrides((prev) => {
      const next = [...prev];
      const existingIdx = next.findIndex((entry) => entry.promoterId === selectedPromoterId);
      const entry: VipFeeOverride = {
        promoterId: selectedPromoterId,
        promoterLabel,
        feePercent: feeValue,
      };

      if (existingIdx >= 0) next[existingIdx] = entry;
      else next.push(entry);

      return next.sort((a, b) => a.promoterLabel.localeCompare(b.promoterLabel, "es"));
    });
  }

  function removeVipOverride(promoterId: string) {
    setVipOverrides((prev) => prev.filter((item) => item.promoterId !== promoterId));
  }

  async function saveFeeConfiguration() {
    if (!isSuperAdmin) {
      setFeesError("Solo SUPER_ADMIN puede guardar configuración de comisiones.");
      return;
    }

    const normalizedPlatformFee = clampFeePercent(Number(platformFeePercentInput));
    if (!Number.isFinite(Number(platformFeePercentInput))) {
      setFeesError("La comisión global debe ser un número válido.");
      return;
    }

    setFeesSaving(true);
    setFeesNotice(null);
    setFeesError(null);

    try {
      const normalizedOverrides = vipOverrides.map((entry) => ({
        promoterId: entry.promoterId,
        promoterLabel: entry.promoterLabel,
        feePercent: clampFeePercent(entry.feePercent),
      }));

      await Promise.all([
        api.patch("/config", {
          key: CONFIG_KEY_PLATFORM_FEE,
          value: String(normalizedPlatformFee),
          description: "Global VybeTickets fee percentage",
        }),
        api.patch("/config", {
          key: CONFIG_KEY_VIP_PROMOTER_FEES,
          value: JSON.stringify(normalizedOverrides),
          description: "Per-promoter VIP fee overrides in JSON",
        }),
      ]);

      const snapshot: PlatformConfigCache = {
        maintenanceMode,
        waitingRoomMode,
        opsAlertsEnabled,
        platformFeePercent: normalizedPlatformFee,
        vipOverrides: normalizedOverrides,
      };

      writePlatformConfigCache(platformConfigCacheKey, snapshot);
      setFeesNotice("Configuración de comisiones guardada correctamente.");
    } catch (error) {
      setFeesError(
        (error as Error).message || "No se pudo guardar la configuración de comisiones."
      );
    } finally {
      setFeesSaving(false);
    }
  }

  function handleThemeChange(nextTheme: AdminThemePreference) {
    setThemePreference(nextTheme);
    setAdminThemePreference(nextTheme);
  }

  return (
    <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Configuración" }]} />}>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-xl font-semibold">Configuración</h1>
          <p className="text-sm text-muted-foreground">
            Cuenta, seguridad y módulos estratégicos del panel admin.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
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
                      <p className="text-xs text-destructive">
                        {profileForm.formState.errors.firstName.message}
                      </p>
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
                    <p className="text-xs text-destructive">
                      {profileForm.formState.errors.email.message}
                    </p>
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

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Cambiar contraseña</CardTitle>
              <CardDescription className="text-xs">
                Mínimo 12 caracteres, una mayúscula, un número y un símbolo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={passwordForm.handleSubmit(onSavePassword)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="currentPassword">Contraseña actual</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    {...passwordForm.register("currentPassword")}
                  />
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-xs text-destructive">
                      {passwordForm.formState.errors.currentPassword.message}
                    </p>
                  )}
                </div>
                <Separator />
                <div className="space-y-1.5">
                  <Label htmlFor="newPassword">Nueva contraseña</Label>
                  <Input id="newPassword" type="password" {...passwordForm.register("newPassword")} />
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-xs text-destructive">
                      {passwordForm.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...passwordForm.register("confirmPassword")}
                  />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-xs text-destructive">
                      {passwordForm.formState.errors.confirmPassword.message}
                    </p>
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
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldAlert className="size-4 text-primary" />
              Modo Operación: Maintenance + Waiting Room
            </CardTitle>
            <CardDescription>
              Control global para mantenimiento y sala de espera en eventos de alto tráfico.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Maintenance Mode</p>
                <p className="text-xs text-muted-foreground">
                  Si está activo, la plataforma pública entra en modo mantenimiento.
                </p>
              </div>
              <Switch
                checked={maintenanceMode}
                onCheckedChange={setMaintenanceMode}
                disabled={!isSuperAdmin || opsSaving}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Waiting Room Mode</p>
                <p className="text-xs text-muted-foreground">
                  Habilita sala de espera previa para ventanas de tráfico masivo.
                </p>
              </div>
              <Switch
                checked={waitingRoomMode}
                onCheckedChange={setWaitingRoomMode}
                disabled={!isSuperAdmin || opsSaving}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Alertas Operativas</p>
                <p className="text-xs text-muted-foreground">
                  Activa o pausa envío de alertas de observabilidad y conciliación.
                </p>
              </div>
              <Switch
                checked={opsAlertsEnabled}
                onCheckedChange={setOpsAlertsEnabled}
                disabled={!isSuperAdmin || opsSaving}
              />
            </div>

            {!isSuperAdmin && (
              <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10">
                Solo SUPER_ADMIN puede guardar cambios globales.
              </Badge>
            )}

            {opsNotice && (
              <p className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded px-3 py-2">
                {opsNotice}
              </p>
            )}
            {opsError && (
              <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
                {opsError}
              </p>
            )}

            <Button size="sm" onClick={() => void saveOperationsSettings()} disabled={!isSuperAdmin || opsSaving}>
              {opsSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Guardar operación global
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Fee Configurator</CardTitle>
            <CardDescription>
              Configura comisión global y overrides por promotor VIP.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5 md:col-span-1">
                <Label htmlFor="platformFee">Comisión global (%)</Label>
                <Input
                  id="platformFee"
                  inputMode="decimal"
                  value={platformFeePercentInput}
                  onChange={(e) => setPlatformFeePercentInput(e.target.value)}
                  disabled={!isSuperAdmin || feesSaving}
                />
                <p className="text-xs text-muted-foreground">
                  Rango recomendado: 0 a 100. Ejemplo: 10 = 10%.
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium">Overrides VIP por promotor</p>
              <div className="grid gap-2 md:grid-cols-4">
                <div className="md:col-span-2">
                  <Select
                    value={selectedPromoterId}
                    onValueChange={setSelectedPromoterId}
                    disabled={!isSuperAdmin || feesSaving || promoters.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona promotor" />
                    </SelectTrigger>
                    <SelectContent>
                      {promoters.map((promoter) => {
                        const label =
                          `${promoter.firstName ?? ""} ${promoter.lastName ?? ""}`.trim() ||
                          promoter.email;
                        return (
                          <SelectItem key={promoter.id} value={promoter.id}>
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  inputMode="decimal"
                  placeholder="Fee VIP (%)"
                  value={selectedPromoterFeeInput}
                  onChange={(e) => setSelectedPromoterFeeInput(e.target.value)}
                  disabled={!isSuperAdmin || feesSaving}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addOrUpdateVipOverride}
                  disabled={!isSuperAdmin || feesSaving}
                >
                  <Plus className="size-4" />
                  Agregar / Actualizar
                </Button>
              </div>

              <div className="rounded-lg border border-border/60 divide-y divide-border/50">
                {vipOverrides.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-muted-foreground">
                    Sin overrides VIP definidos.
                  </div>
                ) : (
                  vipOverrides.map((entry) => (
                    <div key={entry.promoterId} className="flex items-center justify-between gap-3 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{entry.promoterLabel}</p>
                        <p className="text-xs text-muted-foreground">{entry.promoterId}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-primary/35 bg-primary/10 text-primary">
                          {entry.feePercent}%
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => removeVipOverride(entry.promoterId)}
                          disabled={!isSuperAdmin || feesSaving}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {!isSuperAdmin && (
              <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10">
                Solo SUPER_ADMIN puede guardar configuración de fees.
              </Badge>
            )}

            {feesNotice && (
              <p className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded px-3 py-2">
                {feesNotice}
              </p>
            )}
            {feesError && (
              <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
                {feesError}
              </p>
            )}

            <Button size="sm" onClick={() => void saveFeeConfiguration()} disabled={!isSuperAdmin || feesSaving}>
              {feesSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Guardar comisiones
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tema del Panel</CardTitle>
            <CardDescription>
              Sincroniza el look del admin con la preferencia del sistema o fuerza modo oscuro/claro.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={themePreference}
              onValueChange={(value) => handleThemeChange(value as AdminThemePreference)}
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
