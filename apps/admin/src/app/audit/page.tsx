"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@vybx/ui";
import { PromoterShell } from "@/components/layout/PromoterShell";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { AuditTimeline, type AuditItem } from "@/components/pro/AuditTimeline";
import { ProDataTable } from "@/components/pro/ProDataTable";
import { useAdminAuditLogs } from "@/lib/queries";
import type { AdminAuditLog } from "@/lib/types";
import { fmtDateTime } from "@/lib/format";

function severityFromAction(action: string): "info" | "warning" | "success" {
  if (action.includes("REJECTED")) return "warning";
  if (action.includes("APPROVED") || action.includes("UPDATED")) return "success";
  return "info";
}

function severityBadge(value: "info" | "warning" | "success") {
  if (value === "warning") {
    return (
      <Badge variant="outline" className="text-amber-300 border-amber-400/40 bg-amber-500/10">
        warning
      </Badge>
    );
  }
  if (value === "success") {
    return (
      <Badge variant="outline" className="text-emerald-300 border-emerald-400/40 bg-emerald-500/10">
        success
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-sky-300 border-sky-400/40 bg-sky-500/10">
      info
    </Badge>
  );
}

export default function AuditPage() {
  const auditQuery = useAdminAuditLogs(1, 100);
  const rows = auditQuery.data?.data ?? [];

  const timelineItems = useMemo<AuditItem[]>(
    () =>
      rows.map((row) => ({
        id: row.id,
        actor: row.actor?.email ?? row.actorRole ?? "system",
        action: row.action,
        target: row.summary ?? `${row.entityType}:${row.entityId}`,
        at: row.createdAt,
        severity: severityFromAction(row.action),
      })),
    [rows]
  );

  const columns = useMemo<ColumnDef<AdminAuditLog>[]>(
    () => [
      {
        id: "actor",
        header: "Actor",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.actor?.email ?? row.original.actorRole ?? "system"}
          </span>
        ),
      },
      { accessorKey: "action", header: "Accion" },
      {
        id: "target",
        header: "Target",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.summary ?? `${row.original.entityType}:${row.original.entityId}`}
          </span>
        ),
      },
      {
        id: "severity",
        header: "Severidad",
        cell: ({ row }) => severityBadge(severityFromAction(row.original.action)),
      },
      {
        accessorKey: "createdAt",
        header: "Fecha",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{fmtDateTime(row.original.createdAt)}</span>,
      },
    ],
    []
  );

  return (
    <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Audit Logs" }]} />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">
            Trazabilidad real desde backend: acciones administrativas y cambios críticos.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <AuditTimeline title="Timeline Operativa" items={timelineItems} />
          <ProDataTable
            data={rows}
            columns={columns}
            searchPlaceholder={auditQuery.isLoading ? "Cargando logs..." : "Filtrar logs..."}
            emptyMessage={auditQuery.isLoading ? "Cargando..." : "Sin logs en este periodo."}
          />
        </div>
      </div>
    </PromoterShell>
  );
}
