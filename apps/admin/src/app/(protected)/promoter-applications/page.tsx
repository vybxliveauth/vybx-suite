"use client";

import { useEffect, useState } from "react";
import {
  ClipboardCheck, CheckCircle2, XCircle, Instagram,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent,
  Textarea,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@vybx/ui";
import { BackofficeShell } from "@/components/layout/BackofficeShell";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/page-states";
import { Pagination } from "@/components/shared/pagination";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import type { UserRecord, Paginated } from "@/lib/types";
import { useNotificationsStore } from "@/store/notifications";


// ── Page ──────────────────────────────────────────────────────────────────────
export default function PromoterApplicationsPage() {
  const [result, setResult]       = useState<Paginated<UserRecord>>({ data: [], total: 0, page: 1, pageSize: 20 });
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [page, setPage]           = useState(1);

  // Per-row feedback textarea state
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [acting, setActing]       = useState<string | null>(null);
  const refreshNotifs = useNotificationsStore((s) => s.refresh);

  function load(p = page) {
    setLoading(true);
    setError(null);
    api
      .get<Paginated<UserRecord>>(`/admin/users?role=USER&promoterStatus=PENDING_APPROVAL&page=${p}&limit=20`)
      .then(setResult)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applications = result.data.filter(
    (u) => u.promoterApplicationStatus === "PENDING_APPROVAL"
  );

  async function handleApprove(userId: string) {
    setActing(userId);
    try {
      await api.post(`/admin/users/${userId}/approve-promoter`, {});
      setResult((prev) => ({
        ...prev,
        data: prev.data.filter((u) => u.id !== userId),
        total: prev.total - 1,
      }));
      void refreshNotifs();
    } catch {
      // ignore
    } finally {
      setActing(null);
    }
  }

  async function handleReject(userId: string) {
    const feedback = (feedbacks[userId] ?? "").trim();
    if (feedback.length < 8) return;
    setActing(userId);
    try {
      await api.post(`/admin/users/${userId}/reject-promoter`, { feedback });
      setResult((prev) => ({
        ...prev,
        data: prev.data.filter((u) => u.id !== userId),
        total: prev.total - 1,
      }));
      void refreshNotifs();
    } catch {
      // ignore
    } finally {
      setActing(null);
    }
  }

  return (
    <BackofficeShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Solicitudes de Promotor
              {applications.length > 0 && (
                <span className="flex items-center justify-center size-6 rounded-full bg-amber-500/80 text-[11px] font-bold text-white">
                  {applications.length}
                </span>
              )}
            </h1>
            <p className="text-sm text-slate-500">
              Revisión de solicitudes pendientes para acceso como promotor
            </p>
          </div>
        </div>

        {/* Table / cards */}
        <Card className="bg-[#030014]/40 border-white/5 backdrop-blur-xl shadow-2xl">
          <CardContent className="p-0">
            {error ? (
              <ErrorState message={error} onRetry={() => load(page)} />
            ) : loading ? (
              <TableSkeleton rows={3} cols={6} />
            ) : applications.length === 0 ? (
              <EmptyState
                title="Sin solicitudes pendientes"
                message="No hay solicitudes de promotor esperando revisión en este momento."
              />
            ) : (
              <>
                <div className="rounded-xl border border-white/5 bg-[#030014]/60 overflow-hidden shadow-inner">
                  <Table>
                    <TableHeader className="bg-white/5">
                      <TableRow className="border-white/5 hover:bg-transparent text-[11px] text-slate-400 uppercase tracking-wide">
                        <TableHead className="text-slate-400 font-medium h-10">Solicitante</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10 hidden md:table-cell">Datos legales</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10 hidden lg:table-cell">Instagram</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10">Descripción</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10 hidden sm:table-cell">Enviada</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map((user) => {
                        const feedback       = feedbacks[user.id] ?? "";
                        const canReject      = feedback.trim().length >= 8;
                        const isActing       = acting === user.id;
                        return (
                          <TableRow
                            key={user.id}
                            className="border-white/5 hover:bg-white/[0.02] transition-colors align-top"
                          >
                            <TableCell className="py-4">
                              <p className="text-slate-200 font-medium">
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-xs text-slate-400">{user.email}</p>
                            </TableCell>
                            <TableCell className="py-4 hidden md:table-cell">
                              <p className="text-slate-400 text-xs font-medium">
                                {user.promoterLegalName ?? "—"}
                              </p>
                              <p className="text-[11px] text-slate-500 font-mono">
                                {user.promoterDocumentId ?? "—"}
                              </p>
                            </TableCell>
                            <TableCell className="py-4 hidden lg:table-cell">
                              {user.promoterInstagram ? (
                                <div className="flex items-center gap-1 text-xs text-cyan-400">
                                  <Instagram className="size-3" />
                                  {user.promoterInstagram}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="py-4 max-w-[240px]">
                              <p
                                className="text-slate-400 text-xs line-clamp-3"
                                title={user.promoterEventDescription ?? ""}
                              >
                                {user.promoterEventDescription ?? "—"}
                              </p>
                            </TableCell>
                            <TableCell className="py-4 text-slate-500 text-xs whitespace-nowrap hidden sm:table-cell">
                              {user.promoterApplicationSubmittedAt
                                ? fmtDate(user.promoterApplicationSubmittedAt)
                                : "—"}
                            </TableCell>
                            <TableCell className="py-4 min-w-[240px]">
                              <div className="space-y-2">
                                <Textarea
                                  rows={2}
                                  placeholder="Motivo de rechazo (mín. 8 caracteres)…"
                                  value={feedback}
                                  onChange={(e) =>
                                    setFeedbacks((prev) => ({
                                      ...prev,
                                      [user.id]: e.target.value,
                                    }))
                                  }
                                  className="text-xs bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-600 resize-none"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    disabled={isActing}
                                    onClick={() => handleApprove(user.id)}
                                    className="flex-1 h-8 text-xs bg-emerald-600/80 hover:bg-emerald-500/80 text-white border-0"
                                  >
                                    <CheckCircle2 className="size-3.5 mr-1" />
                                    Aprobar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={isActing || !canReject}
                                    onClick={() => handleReject(user.id)}
                                    className="flex-1 h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-30"
                                    title={!canReject ? "Escribe un motivo de al menos 8 caracteres" : undefined}
                                  >
                                    <XCircle className="size-3.5 mr-1" />
                                    Rechazar
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
    </BackofficeShell>
  );
}
