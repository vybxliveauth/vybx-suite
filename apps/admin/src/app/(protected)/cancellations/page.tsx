"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2, XCircle,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
  Textarea, Label,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@vybx/ui";
import { BackofficeShell } from "@/components/layout/BackofficeShell";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/page-states";
import { Pagination } from "@/components/shared/pagination";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import type { CancellationRecord, CancellationStatus, RefundStatus, Paginated } from "@/lib/types";
import { useNotificationsStore } from "@/store/notifications";

// ── Helpers ───────────────────────────────────────────────────────────────────
function cancellationStatusClass(s: CancellationStatus) {
  if (s === "APPROVED")  return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (s === "REQUESTED") return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  return "bg-red-500/10 text-red-400 border-red-500/20";
}

function cancellationStatusLabel(s: CancellationStatus) {
  if (s === "APPROVED")  return "Aprobada";
  if (s === "REQUESTED") return "Solicitada";
  return "Rechazada";
}

function refundStatusClass(s: RefundStatus) {
  if (s === "REFUNDED") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (s === "PENDING")  return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  if (s === "FAILED")   return "bg-red-500/10 text-red-400 border-red-500/20";
  return "bg-slate-500/10 text-slate-300 border-slate-500/20";
}

function refundStatusLabel(s: RefundStatus) {
  if (s === "REFUNDED") return "Reembolsado";
  if (s === "PENDING")  return "Pendiente";
  if (s === "FAILED")   return "Fallido";
  return "Ninguno";
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CancellationsPage() {
  const [result, setResult]         = useState<Paginated<CancellationRecord>>({ data: [], total: 0, page: 1, pageSize: 20 });
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [page, setPage]             = useState(1);

  const [statusFilter, setStatusFilter]             = useState<CancellationStatus | "ALL">("ALL");
  const [refundFilter, setRefundFilter]             = useState<RefundStatus | "ALL">("ALL");

  // Approve dialog
  const [approveTarget, setApproveTarget]           = useState<CancellationRecord | null>(null);
  const [approveNotes, setApproveNotes]             = useState("");
  const [approving, setApproving]                   = useState(false);

  // Reject dialog
  const [rejectTarget, setRejectTarget]             = useState<CancellationRecord | null>(null);
  const [rejectNotes, setRejectNotes]               = useState("");
  const [rejecting, setRejecting]                   = useState(false);
  const refreshNotifs = useNotificationsStore((s) => s.refresh);

  function load(p = page) {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ page: String(p), limit: "20" });
    if (statusFilter !== "ALL") qs.set("status", statusFilter);
    if (refundFilter !== "ALL") qs.set("refundStatus", refundFilter);
    api
      .get<Paginated<CancellationRecord>>(`/tickets/cancellations/admin?${qs}`)
      .then(setResult)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load(1);
    setPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, refundFilter]);

  const visible = result.data.filter((c) => {
    const matchStatus = statusFilter === "ALL" || c.status === statusFilter;
    const matchRefund = refundFilter === "ALL" || c.refundStatus === refundFilter;
    return matchStatus && matchRefund;
  });

  async function handleApprove() {
    if (!approveTarget) return;
    setApproving(true);
    try {
      await api.patch(`/tickets/cancellations/${approveTarget.id}/review`, {
        status: "APPROVED",
        refundStatus: "PENDING",
        reviewNotes: approveNotes.trim() || undefined,
      });
      setResult((prev) => ({
        ...prev,
        data: prev.data.map((c) =>
          c.id === approveTarget.id
            ? { ...c, status: "APPROVED" as CancellationStatus, refundStatus: "PENDING" as RefundStatus, reviewNotes: approveNotes.trim() || null, reviewedAt: new Date().toISOString() }
            : c
        ),
      }));
      setApproveTarget(null);
      setApproveNotes("");
      void refreshNotifs();
    } catch {
      // ignore
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    if (!rejectTarget) return;
    setRejecting(true);
    try {
      await api.patch(`/tickets/cancellations/${rejectTarget.id}/review`, {
        status: "REJECTED",
        reviewNotes: rejectNotes.trim(),
      });
      setResult((prev) => ({
        ...prev,
        data: prev.data.map((c) =>
          c.id === rejectTarget.id
            ? { ...c, status: "REJECTED" as CancellationStatus, reviewNotes: rejectNotes.trim(), reviewedAt: new Date().toISOString() }
            : c
        ),
      }));
      setRejectTarget(null);
      setRejectNotes("");
      void refreshNotifs();
    } catch {
      // ignore
    } finally {
      setRejecting(false);
    }
  }

  return (
    <BackofficeShell>
      <div className="space-y-7">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Cancelaciones</h1>
          <p className="text-sm text-slate-400">Gestión de solicitudes de cancelación y reembolso</p>
        </div>

        {/* Filters */}
        <div className="bo-filters">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as CancellationStatus | "ALL")}
          >
            <SelectTrigger className="w-44 bg-[#101722] border-[#243243] text-[#e8edf3]">
              <SelectValue placeholder="Estado solicitud" />
            </SelectTrigger>
            <SelectContent className="bg-[#0c121a] border-[#243243] shadow-lg">
              <SelectItem value="ALL">Todos los estados</SelectItem>
              <SelectItem value="REQUESTED">Solicitada</SelectItem>
              <SelectItem value="APPROVED">Aprobada</SelectItem>
              <SelectItem value="REJECTED">Rechazada</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={refundFilter}
            onValueChange={(v) => setRefundFilter(v as RefundStatus | "ALL")}
          >
            <SelectTrigger className="w-44 bg-[#101722] border-[#243243] text-[#e8edf3]">
              <SelectValue placeholder="Estado reembolso" />
            </SelectTrigger>
            <SelectContent className="bg-[#0c121a] border-[#243243] shadow-lg">
              <SelectItem value="ALL">Todos los reembolsos</SelectItem>
              <SelectItem value="NONE">Ninguno</SelectItem>
              <SelectItem value="PENDING">Pendiente</SelectItem>
              <SelectItem value="REFUNDED">Reembolsado</SelectItem>
              <SelectItem value="FAILED">Fallido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="bo-card">
          <CardContent className="p-0">
            {error ? (
              <ErrorState message={error} onRetry={() => load(page)} />
            ) : loading ? (
              <TableSkeleton rows={6} cols={7} />
            ) : visible.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <div className="bo-table-wrap">
                  <Table>
                    <TableHeader className="bg-[#121b27]">
                      <TableRow className="border-[#1f2b3a] hover:bg-transparent">
                        <TableHead className="text-slate-400 font-medium h-10">Fecha</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10">Evento</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10 hidden md:table-cell">Usuario</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10">Solicitud</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10 hidden sm:table-cell">Reembolso</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10 hidden lg:table-cell">Motivo</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10 text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visible.map((c) => (
                        <TableRow key={c.id} className="border-[#1f2b3a] hover:bg-[#131e2c] transition-colors align-top">
                          <TableCell className="py-4 text-slate-500 text-xs whitespace-nowrap">
                            {fmtDate(c.requestedAt)}
                          </TableCell>
                          <TableCell className="py-4">
                            <p className="text-slate-200 text-xs font-medium truncate max-w-[140px]">
                              {c.ticket.ticketType.event.title}
                            </p>
                            <p className="text-[11px] text-slate-400">{c.ticket.ticketType.name}</p>
                          </TableCell>
                          <TableCell className="py-4 text-slate-400 text-xs hidden md:table-cell">
                            {c.requester.firstName
                              ? `${c.requester.firstName} ${c.requester.lastName ?? ""}`
                              : c.requester.email}
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant="outline" className={cancellationStatusClass(c.status)}>
                              {cancellationStatusLabel(c.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 hidden sm:table-cell">
                            <Badge variant="outline" className={refundStatusClass(c.refundStatus)}>
                              {refundStatusLabel(c.refundStatus)}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 text-slate-500 text-xs hidden lg:table-cell max-w-[180px]">
                            <p className="line-clamp-2">{c.reason ?? "—"}</p>
                          </TableCell>
                          <TableCell className="py-4 text-right">
                            {c.status === "REQUESTED" && (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button size="sm" variant="ghost"
                                  onClick={() => { setApproveTarget(c); setApproveNotes(""); }}
                                  className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10">
                                  <CheckCircle2 className="size-3.5 mr-1" /> Aprobar
                                </Button>
                                <Button size="sm" variant="ghost"
                                  onClick={() => { setRejectTarget(c); setRejectNotes(""); }}
                                  className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10">
                                  <XCircle className="size-3.5 mr-1" /> Rechazar
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="px-4">
                  <Pagination
                    page={page}
                    pageSize={result.pageSize}
                    total={result.total}
                    onPageChange={(p) => {
                      setPage(p);
                      load(p);
                    }}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Approve dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(o) => { if (!o) setApproveTarget(null); }}>
        <DialogContent className="bg-[#0c121a] border-[#243243] shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Aprobar cancelación</DialogTitle>
            <DialogDescription className="text-slate-400">
              Se aprobará la cancelación del boleto de{" "}
              <span className="text-white font-medium">
                {approveTarget?.ticket.ticketType.event.title}
              </span>{" "}
              y se marcará el reembolso como pendiente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label className="text-xs text-slate-500">Notas internas (opcional)</Label>
            <Textarea
              rows={3}
              value={approveNotes}
              onChange={(e) => setApproveNotes(e.target.value)}
              placeholder="Ej. Reembolso procesado por transferencia bancaria…"
              className="bg-[#101722] border-[#243243] text-[#e8edf3] placeholder:text-slate-600 text-sm resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setApproveTarget(null)}
              className="border-white/10 text-slate-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              disabled={approving}
              onClick={handleApprove}
              className="bg-emerald-600/80 hover:bg-emerald-500/80 text-white border-0"
            >
              {approving ? "Aprobando…" : "Aprobar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) setRejectTarget(null); }}>
        <DialogContent className="bg-[#0c121a] border-[#243243] shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Rechazar cancelación</DialogTitle>
            <DialogDescription className="text-slate-400">
              Indica el motivo del rechazo. Este mensaje será visible para el usuario.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label className="text-xs text-slate-500">Notas de revisión *</Label>
            <Textarea
              rows={3}
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Ej. Solicitud fuera del plazo de 48 horas establecido en los términos…"
              className="bg-[#101722] border-[#243243] text-[#e8edf3] placeholder:text-slate-600 text-sm resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRejectTarget(null)}
              className="border-white/10 text-slate-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={rejecting || !rejectNotes.trim()}
              onClick={handleReject}
            >
              {rejecting ? "Rechazando…" : "Rechazar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BackofficeShell>
  );
}
