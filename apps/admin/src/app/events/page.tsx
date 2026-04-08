"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { Badge, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@vybx/ui";
import { PromoterShell } from "@/components/layout/PromoterShell";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { ProDataTable } from "@/components/pro/ProDataTable";
import { BulkActionBar } from "@/components/pro/BulkActionBar";
import { useAdminActionDialog } from "@/components/shared/use-admin-action-dialog";
import {
  useAdminEvents,
  useDeleteEvent,
  useToggleEvent,
  useUpdateEventApproval,
  useUpdateEventFeatured,
} from "@/lib/queries";
import { tracker, AnalyticsEvents } from "@/lib/analytics";
import type { Event, EventStatus } from "@/lib/types";
import { fmtCurrency, fmtDate } from "@/lib/format";

function statusBadge(ev: Event) {
  if (!ev.isActive && ev.status === "APPROVED") {
    return (
      <Badge variant="outline" className="text-slate-300 border-slate-400/30 bg-slate-500/10">
        Pausado
      </Badge>
    );
  }
  if (ev.status === "APPROVED") {
    return <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-400/30">Publicado</Badge>;
  }
  if (ev.status === "REJECTED") {
    return <Badge variant="destructive">Rechazado</Badge>;
  }
  return (
    <Badge variant="outline" className="text-amber-300 border-amber-400/40 bg-amber-500/10">
      Pendiente
    </Badge>
  );
}

function featuredBadge(ev: Event) {
  if (ev.isFeatured) {
    return <Badge className="bg-blue-500/15 text-blue-200 border-blue-400/40">Destacado</Badge>;
  }
  return (
    <Badge variant="outline" className="text-slate-300 border-slate-400/30 bg-slate-500/10">
      Normal
    </Badge>
  );
}

function eventRevenue(ev: Event) {
  if (!Array.isArray((ev as unknown as { ticketTypes?: Array<{ price: number; sold: number }> }).ticketTypes)) return 0;
  return (ev as unknown as { ticketTypes: Array<{ price: number; sold: number }> }).ticketTypes.reduce(
    (sum, tt) => sum + Number(tt.price || 0) * Number(tt.sold || 0),
    0
  );
}

function eventTicketSummary(ev: Event) {
  const ticketTypes = (ev as unknown as { ticketTypes?: Array<{ quantity: number; sold: number }> }).ticketTypes ?? [];
  const sold = ticketTypes.reduce((sum, tt) => sum + Number(tt.sold || 0), 0);
  const capacity = ticketTypes.reduce((sum, tt) => sum + Number(tt.quantity || 0), 0);
  if (capacity <= 0) return "—";
  return `${sold} / ${capacity}`;
}

export default function EventsPage() {
  const [selected, setSelected] = useState<Event[]>([]);
  const [statusFilter, setStatusFilter] = useState<EventStatus | "ALL">("ALL");
  const [bulkNotice, setBulkNotice] = useState<{
    tone: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const actionDialog = useAdminActionDialog();

  const listQuery = useAdminEvents(1, 100, statusFilter);
  const deleteEvent = useDeleteEvent();
  const toggleEvent = useToggleEvent();
  const approveMutation = useUpdateEventApproval();
  const featuredMutation = useUpdateEventFeatured();

  const rows = listQuery.data?.data ?? [];
  const pendingCount = rows.filter((x) => x.status === "PENDING").length;
  const activeCount = rows.filter((x) => x.isActive).length;
  const featuredCount = rows.filter((x) => x.isFeatured).length;

  const columns = useMemo<ColumnDef<Event>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            aria-label="Seleccionar todos"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="size-4 accent-primary"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label="Seleccionar fila"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="size-4 accent-primary"
          />
        ),
      },
      {
        accessorKey: "title",
        header: "Evento",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-sm">{row.original.title}</p>
            <p className="text-xs text-muted-foreground">{row.original.location ?? "Sin ubicacion"}</p>
          </div>
        ),
      },
      {
        accessorKey: "date",
        header: "Fecha",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{fmtDate(row.original.date)}</span>,
      },
      {
        id: "status",
        header: "Moderacion",
        cell: ({ row }) => statusBadge(row.original),
      },
      {
        id: "featured",
        header: "Destacado",
        cell: ({ row }) => featuredBadge(row.original),
      },
      {
        id: "tickets",
        header: "Tickets",
        cell: ({ row }) => <span className="text-sm tabular-nums">{eventTicketSummary(row.original)}</span>,
      },
      {
        id: "revenue",
        header: "Ingresos",
        cell: ({ row }) => <span className="font-mono text-sm">{fmtCurrency(eventRevenue(row.original))}</span>,
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <Button asChild size="sm" variant="outline">
              <Link href={`/events/${row.original.id}`}>Ver</Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={featuredMutation.isPending}
              onClick={() =>
                featuredMutation.mutate({
                  id: row.original.id,
                  isFeatured: !row.original.isFeatured,
                })
              }
            >
              {row.original.isFeatured ? "Quitar" : "Destacar"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={deleteEvent.isPending}
              onClick={async () => {
                const confirmed = await actionDialog.confirm({
                  title: "Eliminar evento",
                  description: `¿Eliminar ${row.original.title}?`,
                  confirmLabel: "Eliminar",
                  tone: "destructive",
                });
                if (!confirmed) return;
                deleteEvent.mutate(row.original.id);
              }}
            >
              Eliminar
            </Button>
          </div>
        ),
      },
    ],
    [actionDialog, deleteEvent, featuredMutation]
  );

  function settledStats(results: PromiseSettledResult<unknown>[]) {
    const success = results.filter((result) => result.status === "fulfilled").length;
    const failed = results.length - success;
    return { success, failed };
  }

  async function bulkApprove() {
    const toApprove = selected.filter((x) => x.status !== "APPROVED");
    const toActivate = selected.filter((x) => !x.isActive);
    if (toApprove.length === 0 && toActivate.length === 0) {
      setBulkNotice({
        tone: "info",
        text: "No hay cambios pendientes: los eventos seleccionados ya estaban publicados y activos.",
      });
      return;
    }

    const confirmed = await actionDialog.confirm({
      title: "Publicación masiva",
      description:
        `Publicar ${selected.length} evento(s)?\n` +
        `Aprobar: ${toApprove.length}\n` +
        `Activar ventas: ${toActivate.length}`,
      confirmLabel: "Publicar",
    });
    if (!confirmed) return;

    setBulkNotice(null);
    const [approveResults, activateResults] = await Promise.all([
      Promise.allSettled(
        toApprove.map((item) => approveMutation.mutateAsync({ id: item.id, status: "APPROVED" }))
      ),
      Promise.allSettled(
        toActivate.map((item) => toggleEvent.mutateAsync({ id: item.id, isActive: true }))
      ),
    ]);

    const approveStats = settledStats(approveResults);
    const activateStats = settledStats(activateResults);
    tracker.track(AnalyticsEvents.ADMIN_EVENT_APPROVED, {
      selectedCount: selected.length,
      approvedCount: approveStats.success,
      approveFailedCount: approveStats.failed,
      activatedCount: activateStats.success,
      activateFailedCount: activateStats.failed,
    });
    const tone = approveStats.failed + activateStats.failed > 0 ? "error" : "success";
    setBulkNotice({
      tone,
      text:
        `Resumen publicación masiva -> ` +
        `Aprobados: ${approveStats.success}/${toApprove.length}, ` +
        `Activados: ${activateStats.success}/${toActivate.length}, ` +
        `Errores: ${approveStats.failed + activateStats.failed}.`,
    });
    setSelected([]);
  }

  async function bulkPause() {
    const targets = selected.filter((x) => x.isActive);
    if (targets.length === 0) {
      setBulkNotice({
        tone: "info",
        text: "No hay eventos activos en la selección para pausar.",
      });
      return;
    }

    const confirmed = await actionDialog.confirm({
      title: "Pausar eventos",
      description: `Pausar ${targets.length} evento(s)? Esto detiene ventas temporalmente.`,
      confirmLabel: "Pausar",
      tone: "destructive",
    });
    if (!confirmed) return;

    setBulkNotice(null);
    const results = await Promise.allSettled(
      targets.map((item) => toggleEvent.mutateAsync({ id: item.id, isActive: false }))
    );
    const stats = settledStats(results);
    setBulkNotice({
      tone: stats.failed > 0 ? "error" : "success",
      text: `Resumen pausa masiva -> Pausados: ${stats.success}/${targets.length}, Errores: ${stats.failed}.`,
    });
    setSelected([]);
  }

  async function bulkFeature() {
    const targets = selected.filter((x) => !x.isFeatured && x.status === "APPROVED" && x.isActive);
    if (targets.length === 0) {
      setBulkNotice({
        tone: "info",
        text: "No hay eventos elegibles para destacar. Deben estar aprobados y activos.",
      });
      return;
    }

    const confirmed = await actionDialog.confirm({
      title: "Destacar eventos",
      description: `Destacar ${targets.length} evento(s)? Solo se destacan eventos aprobados y activos.`,
      confirmLabel: "Destacar",
    });
    if (!confirmed) return;

    setBulkNotice(null);
    const results = await Promise.allSettled(
      targets.map((item) => featuredMutation.mutateAsync({ id: item.id, isFeatured: true }))
    );
    const stats = settledStats(results);
    setBulkNotice({
      tone: stats.failed > 0 ? "error" : "success",
      text: `Resumen destacados -> Destacados: ${stats.success}/${targets.length}, Errores: ${stats.failed}.`,
    });
    setSelected([]);
  }

  async function bulkUnfeature() {
    const targets = selected.filter((x) => x.isFeatured);
    if (targets.length === 0) {
      setBulkNotice({
        tone: "info",
        text: "No hay eventos destacados en la selección.",
      });
      return;
    }

    const confirmed = await actionDialog.confirm({
      title: "Quitar destacados",
      description: `Quitar destacado a ${targets.length} evento(s)?`,
      confirmLabel: "Quitar",
      tone: "destructive",
    });
    if (!confirmed) return;

    setBulkNotice(null);
    const results = await Promise.allSettled(
      targets.map((item) => featuredMutation.mutateAsync({ id: item.id, isFeatured: false }))
    );
    const stats = settledStats(results);
    setBulkNotice({
      tone: stats.failed > 0 ? "error" : "success",
      text: `Resumen destacados -> Removidos: ${stats.success}/${targets.length}, Errores: ${stats.failed}.`,
    });
    setSelected([]);
  }

  async function bulkReject() {
    const toReject = selected.filter((x) => x.status !== "REJECTED");
    const toDeactivate = selected.filter((x) => x.isActive);
    if (toReject.length === 0 && toDeactivate.length === 0) {
      setBulkNotice({
        tone: "info",
        text: "No hay cambios pendientes: los eventos ya estaban rechazados e inactivos.",
      });
      return;
    }

    const confirmed = await actionDialog.confirm({
      title: "Rechazo masivo",
      description:
        `Rechazar ${selected.length} evento(s)?\n` +
        `Rechazar moderación: ${toReject.length}\n` +
        `Desactivar ventas: ${toDeactivate.length}`,
      confirmLabel: "Rechazar",
      tone: "destructive",
    });
    if (!confirmed) return;

    setBulkNotice(null);
    const [rejectResults, deactivateResults] = await Promise.all([
      Promise.allSettled(
        toReject.map((item) => approveMutation.mutateAsync({ id: item.id, status: "REJECTED" }))
      ),
      Promise.allSettled(
        toDeactivate.map((item) => toggleEvent.mutateAsync({ id: item.id, isActive: false }))
      ),
    ]);

    const rejectStats = settledStats(rejectResults);
    const deactivateStats = settledStats(deactivateResults);
    tracker.track(AnalyticsEvents.ADMIN_EVENT_REJECTED, {
      selectedCount: selected.length,
      rejectedCount: rejectStats.success,
      rejectFailedCount: rejectStats.failed,
      deactivatedCount: deactivateStats.success,
      deactivateFailedCount: deactivateStats.failed,
    });
    const tone = rejectStats.failed + deactivateStats.failed > 0 ? "error" : "success";
    setBulkNotice({
      tone,
      text:
        `Resumen rechazo masivo -> ` +
        `Rechazados: ${rejectStats.success}/${toReject.length}, ` +
        `Desactivados: ${deactivateStats.success}/${toDeactivate.length}, ` +
        `Errores: ${rejectStats.failed + deactivateStats.failed}.`,
    });
    setSelected([]);
  }

  return (
    <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Eventos" }]} />}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Oversight de Eventos</h1>
            <p className="text-sm text-muted-foreground">
              {rows.length} eventos · {activeCount} activos · {pendingCount} pendientes · {featuredCount} destacados
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as EventStatus | "ALL")}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="PENDING">Pendientes</SelectItem>
                <SelectItem value="APPROVED">Aprobados</SelectItem>
                <SelectItem value="REJECTED">Rechazados</SelectItem>
              </SelectContent>
            </Select>
            <Button asChild size="sm">
              <Link href="/events/new">
                <Plus className="size-4" />
                Nuevo evento
              </Link>
            </Button>
          </div>
        </div>

        {listQuery.isError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Error al cargar eventos: {listQuery.error instanceof Error ? listQuery.error.message : "No se pudo conectar con el servidor."}
          </div>
        )}
        <ProDataTable
          data={rows}
          columns={columns}
          enableRowSelection
          onSelectionChange={setSelected}
          searchPlaceholder={listQuery.isLoading ? "Cargando eventos..." : "Buscar evento o ubicacion..."}
          emptyMessage={listQuery.isLoading ? "Cargando..." : "No hay eventos para mostrar."}
        />
        {bulkNotice && (
          <div
            className={
              bulkNotice.tone === "success"
                ? "rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
                : bulkNotice.tone === "error"
                  ? "rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                  : "rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-200"
            }
          >
            {bulkNotice.text}
          </div>
        )}

        <BulkActionBar
          selectedCount={selected.length}
          onClear={() => setSelected([])}
          actions={[
            {
              id: "approve",
              label: approveMutation.isPending ? "Publicando..." : "Publicar seleccionados",
              variant: "default",
              onClick: () => void bulkApprove(),
            },
            {
              id: "pause",
              label: toggleEvent.isPending ? "Pausando..." : "Pausar",
              variant: "outline",
              onClick: () => void bulkPause(),
            },
            {
              id: "feature",
              label: featuredMutation.isPending ? "Destacando..." : "Destacar",
              variant: "secondary",
              onClick: () => void bulkFeature(),
            },
            {
              id: "unfeature",
              label: featuredMutation.isPending ? "Quitando..." : "Quitar destacado",
              variant: "outline",
              onClick: () => void bulkUnfeature(),
            },
            {
              id: "reject",
              label: approveMutation.isPending ? "Rechazando..." : "Rechazar",
              variant: "destructive",
              onClick: () => void bulkReject(),
            },
          ]}
        />
        {actionDialog.dialog}
      </div>
    </PromoterShell>
  );
}
