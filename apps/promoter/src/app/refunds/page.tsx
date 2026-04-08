"use client";

import { useMemo, useState } from "react";
import { RefreshCw, Search, RotateCcw, CheckCircle2, XCircle } from "lucide-react";
import {
  Badge,
  Button,
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Input,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@vybx/ui";
import { PromoterShell } from "@/components/layout/PromoterShell";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { useRefunds } from "@/lib/queries";
import type { RefundStatus } from "@/lib/types";
import { api } from "@/lib/api";
import { tracker, AnalyticsEvents } from "@/lib/analytics";

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency", currency: "MXN", maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-DO", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

const STATUS_COLOR: Record<RefundStatus, string> = {
  REQUESTED: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  APPROVED:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  REJECTED:  "bg-red-500/10 text-red-400 border-red-500/20",
};

const STATUS_LABEL: Record<RefundStatus, string> = {
  REQUESTED: "Pendiente",
  APPROVED:  "Aprobado",
  REJECTED:  "Rechazado",
};

export default function RefundsPage() {
  const [statusFilter, setStatusFilter] = useState<RefundStatus | "ALL">("REQUESTED");
  const [search,       setSearch]       = useState("");
  const [processing,   setProcessing]   = useState<string | null>(null);
  const [actionError,  setActionError]  = useState<string | null>(null);

  const { data, isLoading, refetch } = useRefunds(1, 200);

  const [localStatuses, setLocalStatuses] = useState<Record<string, RefundStatus>>({});

  const refunds = useMemo(() => {
    const list = data?.data ?? [];
    return list
      .map((r) => ({ ...r, status: localStatuses[r.id] ?? r.status }))
      .filter((r) => {
        if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          r.ticket.ticketType.event.title.toLowerCase().includes(q) ||
          r.ticket.ticketType.name.toLowerCase().includes(q) ||
          r.requester.email.toLowerCase().includes(q)
        );
      });
  }, [data, localStatuses, statusFilter, search]);

  const pendingCount = useMemo(
    () => (data?.data ?? []).filter(
      (r) => (localStatuses[r.id] ?? r.status) === "REQUESTED"
    ).length,
    [data, localStatuses]
  );

  async function handleReview(id: string, action: "APPROVE" | "REJECT") {
    setProcessing(id);
    setActionError(null);
    try {
      await api.patch(`/promoter/refunds/${id}/review`, { action });
      setLocalStatuses((prev) => ({
        ...prev,
        [id]: action === "APPROVE" ? "APPROVED" : "REJECTED",
      }));
      tracker.track(AnalyticsEvents.PROMOTER_REFUND_REVIEWED, {
        refundId: id,
        action,
      });
    } catch (err) {
      setActionError((err as Error).message || "Error al procesar la solicitud.");
    } finally {
      setProcessing(null);
    }
  }

  return (
    <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Reembolsos" }]} />}>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <RotateCcw className="size-5 text-primary" /> Reembolsos
            </h1>
            <p className="text-sm text-muted-foreground">
              {pendingCount > 0
                ? `${pendingCount} solicitud${pendingCount === 1 ? "" : "es"} pendiente${pendingCount === 1 ? "" : "s"} de revisión`
                : "Sin solicitudes pendientes"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>

        {/* Error */}
        {actionError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {actionError}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por evento, tier o comprador…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="REQUESTED">Pendientes</SelectItem>
              <SelectItem value="APPROVED">Aprobados</SelectItem>
              <SelectItem value="REJECTED">Rechazados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Solicitudes de reembolso</CardTitle>
            <CardDescription>{data?.total ?? 0} solicitudes en total</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento / Tier</TableHead>
                  <TableHead>Comprador</TableHead>
                  <TableHead className="hidden sm:table-cell">Monto</TableHead>
                  <TableHead className="hidden md:table-cell">Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6} className="py-3">
                        <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : refunds.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                      No hay solicitudes con los filtros actuales.
                    </TableCell>
                  </TableRow>
                ) : (
                  refunds.map((r) => {
                    const isPending   = r.status === "REQUESTED";
                    const isActing    = processing === r.id;
                    const buyerName   = [r.requester.firstName, r.requester.lastName]
                      .filter(Boolean).join(" ") || r.requester.email;

                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <p className="font-medium text-sm">
                            {r.ticket.ticketType.event.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {r.ticket.ticketType.name}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{buyerName}</p>
                          <p className="text-xs text-muted-foreground">{r.requester.email}</p>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell font-semibold text-sm">
                          {fmtCurrency(r.ticket.ticketType.price)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {fmtDate(r.requestedAt ?? r.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_COLOR[r.status]}>
                            {STATUS_LABEL[r.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={isActing}
                                onClick={() => void handleReview(r.id, "APPROVE")}
                                className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                              >
                                <CheckCircle2 className="size-3.5 mr-1" />
                                {isActing ? "…" : "Aprobar"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={isActing}
                                onClick={() => void handleReview(r.id, "REJECT")}
                                className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                <XCircle className="size-3.5 mr-1" />
                                {isActing ? "…" : "Rechazar"}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
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

      </div>
    </PromoterShell>
  );
}
