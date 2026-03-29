"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Ban, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { PromoterShell } from "@/components/layout/PromoterShell";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import {
  useAdminFraudSignals,
  useBlockFraudUser,
  useUnblockFraudUser,
} from "@/lib/queries";

function fmtDate(input?: string | null) {
  if (!input) return "-";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-DO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
  return `${Math.ceil(seconds / 3600)}h`;
}

function severityBadge(level: "low" | "medium" | "high") {
  if (level === "high") {
    return <Badge className="bg-red-500/10 text-red-300 border border-red-500/30">Alto</Badge>;
  }
  if (level === "medium") {
    return <Badge className="bg-amber-500/10 text-amber-300 border border-amber-500/30">Medio</Badge>;
  }
  return <Badge className="bg-zinc-500/10 text-zinc-300 border border-zinc-500/30">Bajo</Badge>;
}

export default function SecurityPage() {
  const [dimension, setDimension] = useState<"ALL" | "IP" | "USER" | "DEVICE">("ALL");
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fraudQuery = useAdminFraudSignals(120, dimension);
  const blockMutation = useBlockFraudUser();
  const unblockMutation = useUnblockFraudUser();

  const summary = fraudQuery.data?.summary;

  const topCases = useMemo(
    () => (fraudQuery.data?.checkoutCases ?? []).slice(0, 30),
    [fraudQuery.data?.checkoutCases]
  );

  async function handleBlockUser(userId: string) {
    const reason = window.prompt(
      "Motivo del bloqueo (min 8 caracteres):",
      "Actividad sospechosa de checkout desde multiples intentos"
    );
    if (!reason) return;
    const cleanedReason = reason.trim();
    if (cleanedReason.length < 8) {
      setActionError("El motivo debe tener al menos 8 caracteres.");
      return;
    }

    const durationRaw = window.prompt("Duracion en minutos (opcional, default 1440):", "1440");
    const durationMinutes = durationRaw && durationRaw.trim() ? Number(durationRaw) : 1440;

    setBusyId(`block:${userId}`);
    setActionError(null);
    try {
      await blockMutation.mutateAsync({
        id: userId,
        reason: cleanedReason,
        durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : 1440,
      });
      await fraudQuery.refetch();
    } catch (error) {
      setActionError((error as Error).message || "No fue posible bloquear el usuario.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleUnblockUser(userId: string) {
    const confirmed = window.confirm("Quitar bloqueo de seguridad a este usuario?");
    if (!confirmed) return;

    setBusyId(`unblock:${userId}`);
    setActionError(null);
    try {
      await unblockMutation.mutateAsync({ id: userId });
      await fraudQuery.refetch();
    } catch (error) {
      setActionError((error as Error).message || "No fue posible desbloquear el usuario.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Seguridad" }]} />}>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <ShieldAlert className="size-5 text-primary" /> Seguridad y Fraude
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitoreo de señales anti-abuso en checkout y bloqueo operativo de cuentas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dimension} onValueChange={(v) => setDimension(v as typeof dimension)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas señales</SelectItem>
                <SelectItem value="USER">Usuario</SelectItem>
                <SelectItem value="IP">IP</SelectItem>
                <SelectItem value="DEVICE">Dispositivo</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => void fraudQuery.refetch()}>
              <RefreshCw className={`size-3.5 mr-1.5 ${fraudQuery.isFetching ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>
        </div>

        {actionError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {actionError}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="kpi-card">
            <CardHeader className="pb-2">
              <CardDescription>Locks activos</CardDescription>
              <CardTitle className="text-2xl">{summary?.checkoutLocksCount ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="kpi-card">
            <CardHeader className="pb-2">
              <CardDescription>Riesgo alto</CardDescription>
              <CardTitle className="text-2xl text-red-300">{summary?.highRiskCount ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="kpi-card">
            <CardHeader className="pb-2">
              <CardDescription>Usuarios bloqueados</CardDescription>
              <CardTitle className="text-2xl text-amber-300">{summary?.managedUserBlocksCount ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="kpi-card">
            <CardHeader className="pb-2">
              <CardDescription>Eventos afectados</CardDescription>
              <CardTitle className="text-2xl">{summary?.distinctEvents ?? 0}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Casos de checkout sospechoso</CardTitle>
            <CardDescription>
              Señales activas detectadas por protección anti-abuso. Prioriza severidad alta.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>Riesgo</TableHead>
                  <TableHead>TTL</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fraudQuery.isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6} className="py-3">
                        <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : topCases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      No hay casos activos para este filtro.
                    </TableCell>
                  </TableRow>
                ) : (
                  topCases.map((row) => {
                    const canBlockUser = row.recommendedAction === "BLOCK_USER" && !!row.user?.id;
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Badge variant="outline" className="uppercase text-[10px] tracking-wide">
                            {row.dimension}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{row.event?.title ?? "Evento no disponible"}</p>
                          <p className="text-xs text-muted-foreground">{row.event?.id ?? "-"}</p>
                        </TableCell>
                        <TableCell>
                          {row.user ? (
                            <>
                              <p className="text-sm">{row.user.email}</p>
                              <p className="text-xs text-muted-foreground">{row.user.id}</p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-mono">{row.identifier.slice(0, 14)}...</p>
                              <p className="text-xs text-muted-foreground">Hash parcial</p>
                            </>
                          )}
                        </TableCell>
                        <TableCell>{severityBadge(row.severity)}</TableCell>
                        <TableCell className="text-sm">{fmtDuration(row.lockTtlSeconds)}</TableCell>
                        <TableCell className="text-right">
                          {canBlockUser ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busyId === `block:${row.user!.id}`}
                              onClick={() => void handleBlockUser(row.user!.id)}
                              className="h-7 px-2 text-xs text-amber-300 hover:text-amber-200 hover:bg-amber-500/10"
                            >
                              <Ban className="size-3.5 mr-1" />
                              {busyId === `block:${row.user!.id}` ? "..." : "Bloquear"}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Monitorear</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usuarios bloqueados por seguridad</CardTitle>
            <CardDescription>Bloqueos manuales aplicados desde operaciones.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead>Expira</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(fraudQuery.data?.blockedUsers ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      Sin usuarios bloqueados actualmente.
                    </TableCell>
                  </TableRow>
                ) : (
                  (fraudQuery.data?.blockedUsers ?? []).map((row) => (
                    <TableRow key={row.userId}>
                      <TableCell>
                        <p className="text-sm font-medium">{row.user?.email ?? row.userId}</p>
                        <p className="text-xs text-muted-foreground">{row.userId}</p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.reason ?? "Sin motivo registrado"}
                      </TableCell>
                      <TableCell className="text-sm">{fmtDate(row.blockedAt)}</TableCell>
                      <TableCell className="text-sm">
                        {row.isPermanent ? (
                          <Badge className="bg-zinc-500/10 text-zinc-300 border border-zinc-500/30">Permanente</Badge>
                        ) : (
                          row.expiresInSeconds !== null ? fmtDuration(row.expiresInSeconds) : fmtDate(row.expiresAt)
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busyId === `unblock:${row.userId}`}
                          onClick={() => void handleUnblockUser(row.userId)}
                          className="h-7 px-2 text-xs text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10"
                        >
                          <ShieldCheck className="size-3.5 mr-1" />
                          {busyId === `unblock:${row.userId}` ? "..." : "Desbloquear"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4 text-xs text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="size-3.5 text-amber-300" />
            Módulo en modo operativo sin pasarela: las acciones marcan y contienen riesgo a nivel de plataforma.
          </CardContent>
        </Card>
      </div>
    </PromoterShell>
  );
}
