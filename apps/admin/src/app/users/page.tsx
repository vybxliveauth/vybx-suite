"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@vybx/ui";
import { Loader2, RefreshCw, ShieldAlert, UserPlus, Users } from "lucide-react";
import { PromoterShell } from "@/components/layout/PromoterShell";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { useAdminActionDialog } from "@/components/shared/use-admin-action-dialog";
import { useAuthUser } from "@/lib/auth";
import {
  useBlockFraudUser,
  useCreateUser,
  useDeleteUserAccount,
  useSendUserPasswordReset,
  useUnblockFraudUser,
  useUpdateUserRole,
  useUsers,
  useAdminFraudSignals,
} from "@/lib/queries";
import type { AdminUserManageRecord, UserRole } from "@/lib/types";
import { fmtDateTimeSafe } from "@/lib/format";
import { tracker, AnalyticsEvents } from "@/lib/analytics";

const ALL_ROLES: UserRole[] = ["USER", "PROMOTER", "ADMIN", "SUPER_ADMIN"];
const SAFE_ROLES: UserRole[] = ["USER", "PROMOTER"];
const USERS_PAGE_SIZE = 100;

function roleBadge(role: string) {
  if (role === "SUPER_ADMIN") {
    return <Badge className="bg-violet-500/15 text-violet-200 border border-violet-400/40">SUPER_ADMIN</Badge>;
  }
  if (role === "ADMIN") {
    return <Badge className="bg-blue-500/15 text-blue-200 border border-blue-400/40">ADMIN</Badge>;
  }
  if (role === "PROMOTER") {
    return <Badge className="bg-emerald-500/15 text-emerald-200 border border-emerald-400/40">PROMOTER</Badge>;
  }
  return (
    <Badge variant="outline" className="text-zinc-300 border-zinc-500/40 bg-zinc-500/10">
      USER
    </Badge>
  );
}

function fullName(user: AdminUserManageRecord) {
  const raw = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return raw.length > 0 ? raw : "Sin nombre";
}

export default function UsersPage() {
  const sessionUser = useAuthUser();
  const canManagePrivileged = sessionUser?.role === "SUPER_ADMIN";
  const assignableRoles = canManagePrivileged ? ALL_ROLES : SAFE_ROLES;

  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<UserRole>(assignableRoles[0] ?? "USER");
  const actionDialog = useAdminActionDialog();

  const authReady = sessionUser !== null;
  const usersQuery = useUsers(page, USERS_PAGE_SIZE, roleFilter, search, { enabled: authReady });
  const fraudQuery = useAdminFraudSignals(200, "ALL", { enabled: authReady });

  const createUser = useCreateUser();
  const updateRole = useUpdateUserRole();
  const deleteUser = useDeleteUserAccount();
  const blockUser = useBlockFraudUser();
  const unblockUser = useUnblockFraudUser();
  const sendReset = useSendUserPasswordReset();

  const users = usersQuery.data?.data ?? [];
  const total = usersQuery.data?.total ?? 0;
  const pageSize = usersQuery.data?.pageSize ?? USERS_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const blockedSet = useMemo(
    () => new Set((fraudQuery.data?.blockedUsers ?? []).map((row) => row.userId)),
    [fraudQuery.data?.blockedUsers]
  );

  const countsByRole = useMemo(() => {
    return users.reduce(
      (acc, item) => {
        if (item.role === "PROMOTER") acc.promoters += 1;
        else if (item.role === "ADMIN" || item.role === "SUPER_ADMIN") acc.admins += 1;
        else acc.users += 1;
        return acc;
      },
      { users: 0, promoters: 0, admins: 0 }
    );
  }, [users]);

  async function runAction(key: string, fn: () => Promise<unknown>, successText: string) {
    setBusyKey(key);
    setNotice(null);
    try {
      await fn();
      setNotice({ tone: "success", text: successText });
    } catch (error) {
      setNotice({
        tone: "error",
        text: (error as Error)?.message || "No fue posible completar la accion.",
      });
    } finally {
      setBusyKey(null);
    }
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchDraft.trim());
  }

  async function handleCreateUser() {
    const email = newEmail.trim().toLowerCase();
    const password = newPassword.trim();
    if (!email || password.length < 8) {
      setNotice({
        tone: "error",
        text: "Para crear usuario, ingresa email valido y password de al menos 8 caracteres.",
      });
      return;
    }

    await runAction(
      "create-user",
      async () => {
        await createUser.mutateAsync({
          email,
          password,
          role: newRole,
        });
        const emailDomain = email.includes("@") ? email.split("@")[1] : "unknown";
        tracker.track(AnalyticsEvents.ADMIN_USER_CREATED, { emailDomain, role: newRole });
        setNewEmail("");
        setNewPassword("");
        setPage(1);
      },
      `Usuario ${email} creado correctamente.`
    );
  }

  async function handleUpdateRole(user: AdminUserManageRecord, role: UserRole) {
    if (user.role === role) return;
    if (user.id === sessionUser?.userId) {
      const selfConfirmed = await actionDialog.confirm({
        title: "Cambiar tu propio rol",
        description: "Estas cambiando tu propio rol. ¿Deseas continuar?",
        confirmLabel: "Continuar",
      });
      if (!selfConfirmed) return;
    }

    await runAction(
      `role:${user.id}`,
      () =>
        updateRole.mutateAsync({
          id: user.id,
          role,
        }),
      `Rol actualizado para ${user.email}.`
    );
  }

  async function handleBlock(user: AdminUserManageRecord) {
    const reason = await actionDialog.prompt({
      title: "Bloquear usuario",
      description: `Define el motivo del bloqueo para ${user.email}.`,
      label: "Motivo del bloqueo",
      defaultValue: "Bloqueo operativo desde modulo de usuarios por revision de seguridad.",
      multiline: true,
      required: true,
      minLength: 8,
      confirmLabel: "Aplicar bloqueo",
      tone: "destructive",
    });
    if (!reason) return;
    const cleaned = reason.trim();
    if (cleaned.length < 8) {
      setNotice({ tone: "error", text: "El motivo debe tener al menos 8 caracteres." });
      return;
    }

    const rawDuration = await actionDialog.prompt({
      title: "Duración del bloqueo",
      description: "Deja vacío para bloqueo permanente.",
      label: "Duración en minutos",
      defaultValue: "1440",
      inputType: "number",
      validate: (value) => {
        if (!value.trim()) return null;
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          return "Ingresa un número mayor que 0 o deja el campo vacío.";
        }
        return null;
      },
      confirmLabel: "Continuar",
    });
    if (rawDuration === null) return;
    const parsedDuration = rawDuration?.trim() ? Number(rawDuration) : undefined;

    await runAction(
      `block:${user.id}`,
      async () => {
        await blockUser.mutateAsync({
          id: user.id,
          reason: cleaned,
          durationMinutes: Number.isFinite(parsedDuration) ? parsedDuration : undefined,
        });
        await Promise.all([usersQuery.refetch(), fraudQuery.refetch()]);
      },
      `Usuario ${user.email} bloqueado.`
    );
  }

  async function handleUnblock(user: AdminUserManageRecord) {
    const confirmed = await actionDialog.confirm({
      title: "Desbloquear usuario",
      description: `¿Desbloquear a ${user.email}?`,
      confirmLabel: "Desbloquear",
    });
    if (!confirmed) return;

    await runAction(
      `unblock:${user.id}`,
      async () => {
        await unblockUser.mutateAsync({ id: user.id });
        await Promise.all([usersQuery.refetch(), fraudQuery.refetch()]);
      },
      `Usuario ${user.email} desbloqueado.`
    );
  }

  async function handleResetPassword(user: AdminUserManageRecord) {
    const confirmed = await actionDialog.confirm({
      title: "Enviar recuperación de contraseña",
      description: `Se enviará un email de recuperación a ${user.email}.`,
      confirmLabel: "Enviar email",
    });
    if (!confirmed) return;

    await runAction(
      `reset:${user.id}`,
      () => sendReset.mutateAsync(user.email),
      `Email de recuperacion enviado a ${user.email}.`
    );
  }

  async function handleDeleteUser(user: AdminUserManageRecord) {
    const confirmed = await actionDialog.confirm({
      title: "Eliminar usuario",
      description: `Esta acción elimina permanentemente la cuenta ${user.email}.`,
      confirmLabel: "Eliminar",
      tone: "destructive",
    });
    if (!confirmed) return;

    await runAction(
      `delete:${user.id}`,
      () => deleteUser.mutateAsync(user.id),
      `Usuario ${user.email} eliminado.`
    );
  }

  return (
    <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Usuarios" }]} />}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Users className="size-5 text-primary" />
              Usuarios y Acceso
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestion operativa de cuentas: rol, bloqueo, recuperacion de acceso y ciclo de vida.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void Promise.all([usersQuery.refetch(), fraudQuery.refetch()])}>
            <RefreshCw className={`size-3.5 mr-1.5 ${(usersQuery.isFetching || fraudQuery.isFetching) ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>

        {notice && (
          <div
            className={
              notice.tone === "success"
                ? "rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
                : notice.tone === "info"
                  ? "rounded-lg border border-blue-400/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-200"
                  : "rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            }
          >
            {notice.text}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="kpi-card">
            <CardHeader className="pb-2">
              <CardDescription>Total visible</CardDescription>
              <CardTitle className="text-2xl">{total}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="kpi-card">
            <CardHeader className="pb-2">
              <CardDescription>Usuarios</CardDescription>
              <CardTitle className="text-2xl">{countsByRole.users}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="kpi-card">
            <CardHeader className="pb-2">
              <CardDescription>Promotores</CardDescription>
              <CardTitle className="text-2xl">{countsByRole.promoters}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="kpi-card">
            <CardHeader className="pb-2">
              <CardDescription>Bloqueados</CardDescription>
              <CardTitle className="text-2xl text-amber-300">{fraudQuery.data?.summary.managedUserBlocksCount ?? 0}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="size-4 text-primary" />
              Crear usuario
            </CardTitle>
            <CardDescription>Alta manual para operaciones, soporte o cuentas de prueba internas.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <Input
              placeholder="correo@empresa.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
            <Input
              placeholder="Password temporal"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assignableRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => void handleCreateUser()}
              disabled={busyKey === "create-user" || createUser.isPending}
            >
              {(busyKey === "create-user" || createUser.isPending) && (
                <Loader2 className="size-4 mr-2 animate-spin" />
              )}
              Crear
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Directorio de usuarios</CardTitle>
            <CardDescription>
              Incluye controles de rol, seguridad y recuperación de acceso por cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={onSearchSubmit} className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Buscar por email o nombre"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
              />
              <Select
                value={roleFilter}
                onValueChange={(value) => {
                  setRoleFilter(value as UserRole | "ALL");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los roles</SelectItem>
                  {ALL_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" variant="outline">
                Buscar
              </Button>
            </form>

            <div className="rounded-xl border border-white/10 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Registro</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersQuery.isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5} className="py-3">
                          <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : usersQuery.isError ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center">
                        <p className="text-sm text-destructive font-medium">Error al cargar usuarios</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {usersQuery.error instanceof Error ? usersQuery.error.message : "No se pudo conectar con el servidor."}
                        </p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => void usersQuery.refetch()}>
                          <RefreshCw className="size-3.5 mr-1.5" /> Reintentar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                        No se encontraron usuarios para este filtro.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => {
                      const isBlocked = blockedSet.has(user.id);
                      const roleIsPrivileged = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
                      const canDelete = canManagePrivileged || !roleIsPrivileged;
                      const rowBusy =
                        busyKey === `role:${user.id}` ||
                        busyKey === `block:${user.id}` ||
                        busyKey === `unblock:${user.id}` ||
                        busyKey === `reset:${user.id}` ||
                        busyKey === `delete:${user.id}`;

                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <p className="text-sm font-medium">{fullName(user)}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                            <p className="text-[11px] text-muted-foreground">{user.id}</p>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              {roleBadge(user.role)}
                              {!canManagePrivileged && roleIsPrivileged ? (
                                <p className="text-[11px] text-muted-foreground">Solo SUPER_ADMIN puede cambiar este rol.</p>
                              ) : (
                                <Select
                                  value={user.role}
                                  onValueChange={(value) => void handleUpdateRole(user, value as UserRole)}
                                  disabled={rowBusy}
                                >
                                  <SelectTrigger className="h-8 w-[160px] text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {assignableRoles.map((role) => (
                                      <SelectItem key={role} value={role}>
                                        {role}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {isBlocked ? (
                              <Badge className="bg-amber-500/15 text-amber-200 border border-amber-400/40">
                                <ShieldAlert className="size-3 mr-1" />
                                Bloqueado
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-500/15 text-emerald-200 border border-emerald-400/40">
                                Activo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{fmtDateTimeSafe(user.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end flex-wrap gap-1.5">
                              {isBlocked ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10"
                                  onClick={() => void handleUnblock(user)}
                                  disabled={rowBusy}
                                >
                                  Desbloquear
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs text-amber-300 hover:text-amber-200 hover:bg-amber-500/10"
                                  onClick={() => void handleBlock(user)}
                                  disabled={rowBusy}
                                >
                                  Bloquear
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={() => void handleResetPassword(user)}
                                disabled={rowBusy}
                              >
                                Reset pass
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                                onClick={() => void handleDeleteUser(user)}
                                disabled={rowBusy || !canDelete}
                                title={!canDelete ? "Solo SUPER_ADMIN puede eliminar ADMIN/SUPER_ADMIN" : undefined}
                              >
                                Eliminar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                Pagina {page} de {totalPages} · mostrando {users.length} de {total} registros
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || usersQuery.isFetching}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || usersQuery.isFetching}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {actionDialog.dialog}
    </PromoterShell>
  );
}
