"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays, CheckCircle2, Clock, XCircle,
  ToggleLeft, ToggleRight, Eye, Search,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, CardHeader, CardTitle,
  Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@vybx/ui";
import { BackofficeShell } from "@/components/layout/BackofficeShell";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/page-states";
import { Pagination } from "@/components/shared/pagination";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import type { EventRecord, EventStatus, Paginated } from "@/lib/types";
import { useNotificationsStore } from "@/store/notifications";

// ── Status helpers ─────────────────────────────────────────────────────────────
function statusClass(s: EventStatus) {
  if (s === "APPROVED") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (s === "PENDING")  return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  return "bg-red-500/10 text-red-400 border-red-500/20";
}

function statusLabel(s: EventStatus) {
  if (s === "APPROVED") return "Aprobado";
  if (s === "PENDING")  return "Pendiente";
  return "Rechazado";
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function EventsPage() {
  const [result, setResult]     = useState<Paginated<EventRecord>>({ data: [], total: 0, page: 1, pageSize: 20 });
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [page, setPage]         = useState(1);
  const [statusFilter, setStatusFilter] = useState<EventStatus | "ALL">("ALL");
  const [search, setSearch]     = useState("");
  const [acting, setActing]     = useState<string | null>(null);
  const refreshNotifs = useNotificationsStore((s) => s.refresh);

  function load(p = page) {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ page: String(p), limit: "20" });
    if (statusFilter !== "ALL") qs.set("status", statusFilter);
    if (search.trim()) qs.set("search", search.trim());
    api
      .get<Paginated<EventRecord>>(`/admin/events?${qs}`)
      .then(setResult)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(1);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);


  const events = result.data;

  // Client-side filter on mock data
  const visible = events.filter((e) => {
    const matchStatus = statusFilter === "ALL" || e.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      e.title.toLowerCase().includes(q) ||
      e.owner.email.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  // Stats
  const total    = events.length;
  const active   = events.filter((e) => e.isActive).length;
  const pending  = events.filter((e) => e.status === "PENDING").length;
  const rejected = events.filter((e) => e.status === "REJECTED").length;

  async function handleApproval(id: string, status: "APPROVED" | "REJECTED") {
    setActing(id);
    try {
      await api.patch(`/events/${id}/approval`, { status });
      setResult((prev) => ({
        ...prev,
        data: prev.data.map((e) => (e.id === id ? { ...e, status } : e)),
      }));
      void refreshNotifs();
    } catch {
      // ignore
    } finally {
      setActing(null);
    }
  }

  async function handleToggleActive(ev: EventRecord) {
    setActing(ev.id);
    try {
      await api.patch(`/events/${ev.id}/status`, { isActive: !ev.isActive });
      setResult((prev) => ({
        ...prev,
        data: prev.data.map((e) =>
          e.id === ev.id ? { ...e, isActive: !e.isActive } : e
        ),
      }));
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
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Eventos</h1>
          <p className="text-sm text-slate-500">Gestión y aprobación de eventos de la plataforma</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total eventos",        value: total,    icon: CalendarDays,  color: "text-violet-400" },
            { label: "Activos",              value: active,   icon: ToggleRight,   color: "text-emerald-400" },
            { label: "Pendientes aprobación",value: pending,  icon: Clock,         color: "text-amber-400" },
            { label: "Rechazados",           value: rejected, icon: XCircle,       color: "text-red-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="bg-[#030014]/40 border-white/5 backdrop-blur-xl shadow-2xl">
              <CardHeader className="pb-1 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-400">
                  {label}
                </CardTitle>
                <Icon className={`size-4 ${color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-100">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-[#030014]/40 border border-white/5 backdrop-blur-xl rounded-xl p-4 flex flex-wrap gap-3 items-center">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as EventStatus | "ALL")}
          >
            <SelectTrigger className="w-44 bg-white/5 border-white/10 text-slate-200">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="bg-[#030014]/95 backdrop-blur-xl border-white/10 shadow-2xl">
              <SelectItem value="ALL">Todos los estados</SelectItem>
              <SelectItem value="PENDING">Pendiente</SelectItem>
              <SelectItem value="APPROVED">Aprobado</SelectItem>
              <SelectItem value="REJECTED">Rechazado</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-600" />
            <Input
              placeholder="Buscar por título o promotor…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* Table */}
        <Card className="bg-[#030014]/40 border-white/5 backdrop-blur-xl shadow-2xl">
          <CardContent className="p-0">
            {error ? (
              <ErrorState message={error} onRetry={() => load(page)} />
            ) : loading ? (
              <TableSkeleton rows={6} cols={6} />
            ) : visible.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <div className="rounded-xl border border-white/5 bg-[#030014]/60 overflow-hidden shadow-inner">
                  <Table>
                    <TableHeader className="bg-white/5">
                      <TableRow className="border-white/5 hover:bg-transparent text-[11px] text-slate-400 uppercase tracking-wide">
                        <TableHead className="text-slate-400 font-medium h-10">Título</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10 hidden md:table-cell">Fecha</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10 hidden lg:table-cell">Promotor</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10">Estado</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10">Activo</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10 text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visible.map((ev) => (
                        <TableRow
                          key={ev.id}
                          className="border-white/5 hover:bg-white/[0.02] transition-colors"
                        >
                          <TableCell className="py-4">
                            <p className="text-slate-200 font-medium truncate max-w-[200px]">
                              {ev.title}
                            </p>
                            <p className="text-xs text-slate-400 truncate max-w-[200px]">
                              {ev.location ?? "—"}
                            </p>
                          </TableCell>
                          <TableCell className="py-4 text-slate-400 text-xs hidden md:table-cell whitespace-nowrap">
                            {fmtDate(ev.date)}
                          </TableCell>
                          <TableCell className="py-4 text-slate-400 text-xs hidden lg:table-cell">
                            {ev.owner.email}
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant="outline" className={statusClass(ev.status)}>
                              {statusLabel(ev.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4">
                            <button
                              disabled={acting === ev.id}
                              onClick={() => handleToggleActive(ev)}
                              className="text-slate-500 hover:text-slate-200 transition-colors disabled:opacity-40"
                              title={ev.isActive ? "Desactivar" : "Activar"}
                            >
                              {ev.isActive ? (
                                <ToggleRight className="size-5 text-emerald-400" />
                              ) : (
                                <ToggleLeft className="size-5 text-slate-500" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center justify-end gap-1.5">
                              {ev.status === "PENDING" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={acting === ev.id}
                                    onClick={() => handleApproval(ev.id, "APPROVED")}
                                    className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                  >
                                    <CheckCircle2 className="size-3.5 mr-1" />
                                    Aprobar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={acting === ev.id}
                                    onClick={() => handleApproval(ev.id, "REJECTED")}
                                    className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  >
                                    <XCircle className="size-3.5 mr-1" />
                                    Rechazar
                                  </Button>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs text-slate-500 hover:text-slate-200"
                                onClick={() =>
                                  window.open(`/events/${ev.id}`, "_blank")
                                }
                              >
                                <Eye className="size-3.5 mr-1" />
                                Ver
                              </Button>
                            </div>
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
    </BackofficeShell>
  );
}
