"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, RefreshCw, RotateCcw, Search, XCircle } from "lucide-react";
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
import { PromoterShell } from "@/components/layout/PromoterShell";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { BulkActionBar } from "@/components/pro/BulkActionBar";
import { useAdminActionDialog } from "@/components/shared/use-admin-action-dialog";
import {
  useAdminRefunds,
  useReviewAdminRefund,
  useUpdateAdminRefundDispute,
  useUpdateAdminRefundExecution,
} from "@/lib/queries";
import { tracker, AnalyticsEvents } from "@/lib/analytics";
import { fmtCurrency, fmtDate } from "@/lib/format";

type UiStatus = "REQUESTED" | "APPROVED" | "REJECTED";
type UiRefundStatus = "NONE" | "PENDING" | "REFUNDED" | "FAILED";
type UiDisputeStatus = "NONE" | "OPEN" | "RESOLVED" | "DISMISSED";

const STATUS_COLOR: Record<UiStatus, string> = {
  REQUESTED: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  APPROVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
};

const STATUS_LABEL: Record<UiStatus, string> = {
  REQUESTED: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
};

const REFUND_COLOR: Record<UiRefundStatus, string> = {
  NONE: "bg-zinc-500/10 text-zinc-300 border-zinc-500/20",
  PENDING: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  REFUNDED: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  FAILED: "bg-red-500/10 text-red-300 border-red-500/20",
};

const REFUND_LABEL: Record<UiRefundStatus, string> = {
  NONE: "Sin aplica",
  PENDING: "Pendiente",
  REFUNDED: "Reembolsado",
  FAILED: "Fallido",
};

const DISPUTE_COLOR: Record<UiDisputeStatus, string> = {
  NONE: "bg-zinc-500/10 text-zinc-300 border-zinc-500/20",
  OPEN: "bg-orange-500/10 text-orange-300 border-orange-500/20",
  RESOLVED: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  DISMISSED: "bg-sky-500/10 text-sky-300 border-sky-500/20",
};

const DISPUTE_LABEL: Record<UiDisputeStatus, string> = {
  NONE: "Sin disputa",
  OPEN: "Abierta",
  RESOLVED: "Resuelta",
  DISMISSED: "Descartada",
};

export default function RefundsPage() {
  const [statusFilter, setStatusFilter] = useState<UiStatus | "ALL">("REQUESTED");
  const [search, setSearch] = useState("");
  const [localStatuses, setLocalStatuses] = useState<Record<string, UiStatus>>({});
  const [localRefundStatuses, setLocalRefundStatuses] = useState<
    Record<string, UiRefundStatus>
  >({});
  const [localDisputeStatuses, setLocalDisputeStatuses] = useState<
    Record<string, UiDisputeStatus>
  >({});
  const [processing, setProcessing] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBusyAction, setBulkBusyAction] = useState<"APPROVE" | "REJECT" | null>(null);
  const [bulkNotice, setBulkNotice] = useState<{
    tone: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const actionDialog = useAdminActionDialog();

  const refundsQuery = useAdminRefunds(1, 100, statusFilter);
  const reviewMutation = useReviewAdminRefund();
  const refundExecutionMutation = useUpdateAdminRefundExecution();
  const disputeMutation = useUpdateAdminRefundDispute();

  const refunds = useMemo(() => {
    const list = refundsQuery.data?.data ?? [];
    return list
      .map((r) => ({
        ...r,
        status: localStatuses[r.id] ?? r.status,
        refundStatus: localRefundStatuses[r.id] ?? r.refundStatus,
        disputeStatus: localDisputeStatuses[r.id] ?? r.disputeStatus,
      }))
      .filter((r) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        const eventTitle = r.ticket?.ticketType?.event?.title?.toLowerCase() ?? "";
        const tierName = r.ticket?.ticketType?.name?.toLowerCase() ?? "";
        const buyerEmail = r.requester?.email?.toLowerCase() ?? "";
        const dispute = r.disputeStatus?.toLowerCase() ?? "";
        const txId = (r.paymentTransactionId ?? r.ticket?.paymentTransactionId ?? "").toLowerCase();
        return (
          eventTitle.includes(q) ||
          tierName.includes(q) ||
          buyerEmail.includes(q) ||
          dispute.includes(q) ||
          txId.includes(q)
        );
      });
  }, [localDisputeStatuses, localRefundStatuses, localStatuses, refundsQuery.data?.data, search]);

  const pendingCount = useMemo(
    () => refunds.filter((r) => (localStatuses[r.id] ?? r.status) === "REQUESTED").length,
    [refunds, localStatuses]
  );

  const selectableIds = useMemo(
    () => refunds.filter((r) => (localStatuses[r.id] ?? r.status) === "REQUESTED").map((r) => r.id),
    [refunds, localStatuses]
  );

  const allSelectableChecked =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));

  const selectedPending = useMemo(
    () =>
      refunds.filter(
        (r) => selectedIds.includes(r.id) && (localStatuses[r.id] ?? r.status) === "REQUESTED"
      ),
    [refunds, selectedIds, localStatuses]
  );

  const isBulkBusy = bulkBusyAction !== null;

  useEffect(() => {
    const visible = new Set(refunds.map((r) => r.id));
    setSelectedIds((prev) => {
      const next = prev.filter((id) => visible.has(id));
      if (next.length === prev.length && next.every((id, i) => id === prev[i])) return prev;
      return next;
    });
  }, [refunds]);

  function setStatusForSuccessful(
    ids: string[],
    results: PromiseSettledResult<unknown>[],
    nextStatus: UiStatus
  ) {
    setLocalStatuses((prev) => {
      const draft = { ...prev };
      ids.forEach((id, index) => {
        if (results[index]?.status === "fulfilled") {
          draft[id] = nextStatus;
        }
      });
      return draft;
    });
  }

  async function handleReview(id: string, decision: "APPROVE" | "REJECT") {
    if (isBulkBusy) return;
    setProcessing(id);
    setActionError(null);
    try {
      const reviewNotes =
        decision === "REJECT"
          ? (
              await actionDialog.prompt({
                title: "Rechazar solicitud",
                description: "Opcional: agrega notas para justificar el rechazo.",
                label: "Notas de rechazo",
                defaultValue: "No cumple condiciones de reembolso.",
                multiline: true,
                confirmLabel: "Aplicar rechazo",
                tone: "destructive",
              })
            ) ?? undefined
          : undefined;
      await reviewMutation.mutateAsync({ id, decision, reviewNotes });
      setLocalStatuses((prev) => ({
        ...prev,
        [id]: decision === "APPROVE" ? "APPROVED" : "REJECTED",
      }));
      tracker.track(AnalyticsEvents.ADMIN_REFUND_REVIEWED, {
        action: decision,
        refundId: id,
      });
    } catch (err) {
      setActionError((err as Error).message || "Error al procesar la solicitud.");
    } finally {
      setProcessing(null);
    }
  }

  async function handleRefundAction(
    id: string,
    action: "MARK_PENDING" | "MARK_REFUNDED" | "MARK_FAILED",
    defaultRefundAmount?: number
  ) {
    if (isBulkBusy) return;
    setProcessing(id);
    setActionError(null);
    try {
      let note: string | undefined;
      let providerReference: string | undefined;
      let refundAmount: number | undefined;
      if (action === "MARK_REFUNDED") {
        providerReference =
          (
            await actionDialog.prompt({
              title: "Referencia de pasarela",
              description: "Opcional",
              label: "Referencia",
              defaultValue: "manual-refund",
              confirmLabel: "Continuar",
            })
          )?.trim() || undefined;
        const suggestedAmount =
          typeof defaultRefundAmount === "number" && Number.isFinite(defaultRefundAmount)
            ? defaultRefundAmount
            : undefined;
        const amountInput = await actionDialog.prompt({
          title: "Monto exacto de reembolso",
          description: "Ingresa el monto exacto en USD.",
          label: "Monto (USD)",
          defaultValue: suggestedAmount !== undefined ? suggestedAmount.toFixed(2) : "",
          inputType: "number",
          required: true,
          validate: (value) => {
            const parsed = Number(value);
            if (!Number.isFinite(parsed) || parsed <= 0) {
              return "Ingresa un monto válido mayor que 0.";
            }
            return null;
          },
          confirmLabel: "Marcar reembolsado",
        });
        if (amountInput === null) {
          return;
        }
        const parsedAmount = Number(amountInput);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
          setActionError("Ingresa un monto válido mayor que 0 para completar el reembolso.");
          return;
        }
        refundAmount = Math.round((parsedAmount + Number.EPSILON) * 100) / 100;
      }
      if (action === "MARK_FAILED") {
        const failure =
          (await actionDialog.prompt({
            title: "Marcar reembolso fallido",
            description: "Este motivo se registrará para auditoría.",
            label: "Motivo del fallo",
            defaultValue: "Error de pasarela",
            multiline: true,
            required: true,
            minLength: 8,
            confirmLabel: "Marcar fallido",
            tone: "destructive",
          })) ?? "";
        if (failure.trim().length < 8) {
          setActionError("El motivo del fallo debe tener al menos 8 caracteres.");
          return;
        }
        note = failure.trim();
      }
      await refundExecutionMutation.mutateAsync({
        id,
        action,
        refundAmount,
        providerReference,
        note,
      });
      setLocalRefundStatuses((prev) => ({
        ...prev,
        [id]:
          action === "MARK_REFUNDED"
            ? "REFUNDED"
            : action === "MARK_FAILED"
              ? "FAILED"
              : "PENDING",
      }));
    } catch (err) {
      setActionError((err as Error).message || "No fue posible actualizar el estado del reembolso.");
    } finally {
      setProcessing(null);
    }
  }

  async function handleDisputeAction(
    id: string,
    action: "OPEN" | "RESOLVE" | "DISMISS"
  ) {
    if (isBulkBusy) return;
    setProcessing(id);
    setActionError(null);
    try {
      let note: string | undefined;
      if (action === "OPEN") {
        const reason =
          (await actionDialog.prompt({
            title: "Abrir disputa",
            description: "Indica el motivo principal de la disputa.",
            label: "Motivo",
            defaultValue: "Cliente reporta incidencia",
            multiline: true,
            required: true,
            minLength: 8,
            confirmLabel: "Abrir",
            tone: "destructive",
          })) ?? "";
        if (reason.trim().length < 8) {
          setActionError("El motivo de disputa debe tener al menos 8 caracteres.");
          return;
        }
        note = reason.trim();
      } else {
        const closeNotes = await actionDialog.prompt({
          title: action === "RESOLVE" ? "Resolver disputa" : "Descartar disputa",
          description: "Opcional: agrega notas de cierre.",
          label: "Notas",
          defaultValue: "",
          multiline: true,
          confirmLabel: "Guardar",
        });
        if (closeNotes === null) return;
        note = closeNotes.trim() || undefined;
      }
      await disputeMutation.mutateAsync({ id, action, note });
      setLocalDisputeStatuses((prev) => ({
        ...prev,
        [id]: action === "OPEN" ? "OPEN" : action === "RESOLVE" ? "RESOLVED" : "DISMISSED",
      }));
    } catch (err) {
      setActionError((err as Error).message || "No fue posible actualizar la disputa.");
    } finally {
      setProcessing(null);
    }
  }

  async function bulkApproveSelected() {
    const targets = selectedPending;
    if (targets.length === 0) {
      setBulkNotice({
        tone: "info",
        text: "No hay solicitudes pendientes seleccionadas para aprobar.",
      });
      return;
    }

    const confirmed = await actionDialog.confirm({
      title: "Aprobar solicitudes",
      description: `¿Aprobar ${targets.length} solicitud(es) de reembolso?`,
      confirmLabel: "Aprobar",
    });
    if (!confirmed) return;

    setBulkBusyAction("APPROVE");
    setActionError(null);
    setBulkNotice(null);
    try {
      const results = await Promise.allSettled(
        targets.map((target) => reviewMutation.mutateAsync({ id: target.id, decision: "APPROVE" }))
      );
      const success = results.filter((result) => result.status === "fulfilled").length;
      const failed = results.length - success;
      tracker.track(AnalyticsEvents.ADMIN_REFUND_REVIEWED, {
        action: "APPROVE",
        attemptedCount: targets.length,
        successCount: success,
        failedCount: failed,
      });
      setStatusForSuccessful(
        targets.map((target) => target.id),
        results,
        "APPROVED"
      );
      setBulkNotice({
        tone: failed > 0 ? "error" : "success",
        text: `Resumen aprobación masiva -> Aprobadas: ${success}/${targets.length}, Errores: ${failed}.`,
      });
      setSelectedIds([]);
    } catch (err) {
      setActionError((err as Error).message || "Error al procesar la acción masiva.");
    } finally {
      setBulkBusyAction(null);
    }
  }

  async function bulkRejectSelected() {
    const targets = selectedPending;
    if (targets.length === 0) {
      setBulkNotice({
        tone: "info",
        text: "No hay solicitudes pendientes seleccionadas para rechazar.",
      });
      return;
    }

    const confirmed = await actionDialog.confirm({
      title: "Rechazar solicitudes",
      description: `¿Rechazar ${targets.length} solicitud(es) de reembolso?`,
      confirmLabel: "Rechazar",
      tone: "destructive",
    });
    if (!confirmed) return;

    const reviewNotesRaw = await actionDialog.prompt({
      title: "Notas de rechazo en lote",
      description: "Opcional: se aplicará a todas las solicitudes seleccionadas.",
      label: "Notas",
      defaultValue: "No cumple condiciones de reembolso.",
      multiline: true,
      confirmLabel: "Continuar",
    });
    if (reviewNotesRaw === null) return;
    const reviewNotes = reviewNotesRaw.trim().length > 0 ? reviewNotesRaw.trim() : undefined;

    setBulkBusyAction("REJECT");
    setActionError(null);
    setBulkNotice(null);
    try {
      const results = await Promise.allSettled(
        targets.map((target) =>
          reviewMutation.mutateAsync({ id: target.id, decision: "REJECT", reviewNotes })
        )
      );
      const success = results.filter((result) => result.status === "fulfilled").length;
      const failed = results.length - success;
      tracker.track(AnalyticsEvents.ADMIN_REFUND_REVIEWED, {
        action: "REJECT",
        attemptedCount: targets.length,
        successCount: success,
        failedCount: failed,
      });
      setStatusForSuccessful(
        targets.map((target) => target.id),
        results,
        "REJECTED"
      );
      setBulkNotice({
        tone: failed > 0 ? "error" : "success",
        text: `Resumen rechazo masivo -> Rechazadas: ${success}/${targets.length}, Errores: ${failed}.`,
      });
      setSelectedIds([]);
    } catch (err) {
      setActionError((err as Error).message || "Error al procesar la acción masiva.");
    } finally {
      setBulkBusyAction(null);
    }
  }

  return (
    <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Reembolsos" }]} />}>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <RotateCcw className="size-5 text-primary" /> Reembolsos y Disputas
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
            onClick={() => void refundsQuery.refetch()}
            disabled={refundsQuery.isLoading || isBulkBusy}
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${refundsQuery.isLoading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>

        {actionError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {actionError}
          </div>
        )}
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
        {refundsQuery.isError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            No se pudo cargar el listado de reembolsos.
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="ml-3 h-7"
              onClick={() => void refundsQuery.refetch()}
            >
              Reintentar
            </Button>
          </div>
        )}

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
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as UiStatus | "ALL")}>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Solicitudes de reembolso</CardTitle>
            <CardDescription>{refundsQuery.data?.total ?? 0} solicitudes en total</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Seleccionar todas las pendientes"
                      checked={allSelectableChecked}
                      disabled={selectableIds.length === 0 || isBulkBusy}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSelectedIds((prev) => {
                          const current = new Set(prev);
                          if (checked) {
                            selectableIds.forEach((id) => current.add(id));
                          } else {
                            selectableIds.forEach((id) => current.delete(id));
                          }
                          return Array.from(current);
                        });
                      }}
                      className="size-4 accent-primary"
                    />
                  </TableHead>
                  <TableHead>Evento / Tier</TableHead>
                  <TableHead>Comprador</TableHead>
                  <TableHead className="hidden md:table-cell">Monto pagado</TableHead>
                  <TableHead className="hidden xl:table-cell">Transacción</TableHead>
                  <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden md:table-cell">Reembolso</TableHead>
                  <TableHead className="hidden lg:table-cell">Disputa</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refundsQuery.isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={10} className="py-3">
                        <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : refunds.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-12 text-center text-sm text-muted-foreground">
                      No hay solicitudes con los filtros actuales.
                    </TableCell>
                  </TableRow>
                ) : (
                  refunds.map((r) => {
                    const status = (r.status as UiStatus) ?? "REQUESTED";
                    const refundStatus = (r.refundStatus as UiRefundStatus) ?? "PENDING";
                    const disputeStatus = (r.disputeStatus as UiDisputeStatus) ?? "NONE";
                    const isPending = status === "REQUESTED";
                    const isActing = processing === r.id || isBulkBusy;
                    const buyerName =
                      [r.requester?.firstName, r.requester?.lastName].filter(Boolean).join(" ") ||
                      r.requester?.email ||
                      "—";

                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            aria-label="Seleccionar solicitud"
                            checked={selectedIds.includes(r.id)}
                            disabled={!isPending || isActing}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSelectedIds((prev) => {
                                if (checked) return Array.from(new Set([...prev, r.id]));
                                return prev.filter((id) => id !== r.id);
                              });
                            }}
                            className="size-4 accent-primary"
                          />
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-sm">{r.ticket.ticketType.event.title}</p>
                          <p className="text-xs text-muted-foreground">{r.ticket.ticketType.name}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{buyerName}</p>
                          <p className="text-xs text-muted-foreground">{r.requester?.email ?? "—"}</p>
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-semibold text-sm">
                          {fmtCurrency(
                            r.ticket.paidAmount ?? r.ticket.ticketType.price
                          )}
                          <p className="text-[11px] text-muted-foreground font-normal">
                            {r.ticket.paidAmount != null ? "Monto transaccionado" : "Fallback ticketType.price"}
                          </p>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <p className="text-xs font-mono">
                            {(r.paymentTransactionId ?? r.ticket.paymentTransactionId ?? "—").slice(0, 14)}
                            {(r.paymentTransactionId ?? r.ticket.paymentTransactionId ?? "").length > 14 ? "..." : ""}
                          </p>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {fmtDate(r.requestedAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_COLOR[status]}>
                            {STATUS_LABEL[status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className={REFUND_COLOR[refundStatus]}>
                            {REFUND_LABEL[refundStatus]}
                          </Badge>
                          {r.refundAmount != null && (
                            <p className="text-[11px] text-muted-foreground mt-1">
                              {fmtCurrency(r.refundAmount)}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant="outline" className={DISPUTE_COLOR[disputeStatus]}>
                            {DISPUTE_LABEL[disputeStatus]}
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
                          ) : status === "APPROVED" ? (
                            <div className="flex items-center justify-end gap-1">
                              {refundStatus !== "REFUNDED" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={isActing}
                                  onClick={() =>
                                    void handleRefundAction(
                                      r.id,
                                      "MARK_REFUNDED",
                                      r.ticket.paidAmount ?? r.ticket.ticketType.price
                                    )
                                  }
                                  className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                >
                                  {isActing ? "…" : "Reembolsar"}
                                </Button>
                              )}
                              {refundStatus === "PENDING" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={isActing}
                                  onClick={() => void handleRefundAction(r.id, "MARK_FAILED")}
                                  className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                >
                                  {isActing ? "…" : "Marcar fallo"}
                                </Button>
                              )}
                              {refundStatus === "FAILED" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={isActing}
                                  onClick={() => void handleRefundAction(r.id, "MARK_PENDING")}
                                  className="h-7 px-2 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                                >
                                  {isActing ? "…" : "Volver pendiente"}
                                </Button>
                              )}
                              {disputeStatus === "OPEN" ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={isActing}
                                  onClick={() => void handleDisputeAction(r.id, "RESOLVE")}
                                  className="h-7 px-2 text-xs text-sky-300 hover:text-sky-200 hover:bg-sky-500/10"
                                >
                                  {isActing ? "…" : "Resolver disputa"}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={isActing}
                                  onClick={() => void handleDisputeAction(r.id, "OPEN")}
                                  className="h-7 px-2 text-xs text-orange-300 hover:text-orange-200 hover:bg-orange-500/10"
                                >
                                  {isActing ? "…" : "Abrir disputa"}
                                </Button>
                              )}
                            </div>
                          ) : disputeStatus === "OPEN" ? (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={isActing}
                                onClick={() => void handleDisputeAction(r.id, "RESOLVE")}
                                className="h-7 px-2 text-xs text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10"
                              >
                                {isActing ? "…" : "Resolver"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={isActing}
                                onClick={() => void handleDisputeAction(r.id, "DISMISS")}
                                className="h-7 px-2 text-xs text-zinc-300 hover:text-zinc-200 hover:bg-zinc-500/10"
                              >
                                {isActing ? "…" : "Descartar"}
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={isActing}
                                onClick={() => void handleDisputeAction(r.id, "OPEN")}
                                className="h-7 px-2 text-xs text-orange-300 hover:text-orange-200 hover:bg-orange-500/10"
                              >
                                {isActing ? "…" : "Abrir disputa"}
                              </Button>
                            </div>
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

        <BulkActionBar
          selectedCount={selectedPending.length}
          onClear={() => setSelectedIds([])}
          actions={[
            {
              id: "approve-selected",
              label:
                bulkBusyAction === "APPROVE"
                  ? "Aprobando..."
                  : "Aprobar seleccionadas",
              variant: "default",
              onClick: () => void bulkApproveSelected(),
            },
            {
              id: "reject-selected",
              label:
                bulkBusyAction === "REJECT"
                  ? "Rechazando..."
                  : "Rechazar seleccionadas",
              variant: "destructive",
              onClick: () => void bulkRejectSelected(),
            },
          ]}
        />
        {actionDialog.dialog}
      </div>
    </PromoterShell>
  );
}
