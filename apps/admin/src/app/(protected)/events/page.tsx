"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Pencil, EyeOff, Eye, Trash2, Search, BarChart2,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent,
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
  const router = useRouter();
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
    if (search.trim()) qs.set("q", search.trim());
    api
      .get<Paginated<EventRecord>>(`/events/admin/all?${qs}`)
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

  const visible = events.filter((e) => {
    const matchStatus = statusFilter === "ALL" || e.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      e.title.toLowerCase().includes(q) ||
      e.owner.email.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

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

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este evento? Esta acción no se puede deshacer.")) return;
    setActing(id);
    try {
      await api.delete(`/events/${id}`);
      setResult((prev) => ({
        ...prev,
        data: prev.data.filter((e) => e.id !== id),
        total: prev.total - 1,
      }));
      void refreshNotifs();
    } catch {
      // ignore
    } finally {
      setActing(null);
    }
  }

  const totalPages = Math.ceil(result.total / result.pageSize) || 1;

  return (
    <BackofficeShell>
      <div className="space-y-7">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Gestión de Eventos</h1>
            <p className="text-sm text-slate-400">Aprobar, editar, desactivar o eliminar eventos desde el backoffice privado.</p>
          </div>
          <Button
            onClick={() => router.push("/events/new")}
            className="shrink-0 self-start"
          >
            <Plus className="size-4 mr-1.5" />
            Nuevo evento
          </Button>
        </div>

        {/* Filters */}
        <div className="bo-filters">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as EventStatus | "ALL")}
          >
            <SelectTrigger className="w-44 bg-[#101722] border-[#243243] text-[#e8edf3]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="bg-[#0c121a] border-[#243243] shadow-lg">
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
              onKeyDown={(e) => e.key === "Enter" && load(1)}
              className="pl-8 bg-[#101722] border-[#243243] text-[#e8edf3] placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* Table */}
        <Card className="bo-card">
          <CardContent className="p-0">
            {error ? (
              <ErrorState message={error} onRetry={() => load(page)} />
            ) : loading ? (
              <TableSkeleton rows={6} cols={6} />
            ) : visible.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <div className="bo-table-wrap">
                  <Table>
                    <TableHeader className="bg-[#121b27]">
                      <TableRow className="border-[#1f2b3a] hover:bg-transparent">
                        <TableHead className="text-slate-400 font-medium h-11 text-xs uppercase tracking-wide">Título</TableHead>
                        <TableHead className="text-slate-400 font-medium h-11 text-xs uppercase tracking-wide hidden md:table-cell">Categoría</TableHead>
                        <TableHead className="text-slate-400 font-medium h-11 text-xs uppercase tracking-wide hidden md:table-cell">Fecha</TableHead>
                        <TableHead className="text-slate-400 font-medium h-11 text-xs uppercase tracking-wide">Estado</TableHead>
                        <TableHead className="text-slate-400 font-medium h-11 text-xs uppercase tracking-wide">Visible</TableHead>
                        <TableHead className="text-slate-400 font-medium h-11 text-xs uppercase tracking-wide text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visible.map((ev) => (
                        <TableRow
                          key={ev.id}
                          className="border-[#1f2b3a] hover:bg-[#131e2c] transition-colors"
                        >
                          <TableCell className="py-3.5">
                            <p className="text-slate-200 font-medium truncate max-w-[220px]">
                              {ev.title}
                            </p>
                            <p className="text-xs text-slate-500 truncate max-w-[220px] mt-0.5">
                              {ev.location ?? "—"}
                            </p>
                          </TableCell>
                          <TableCell className="py-3.5 text-slate-400 text-sm hidden md:table-cell">
                            {ev.category?.name ?? "Sin categoría"}
                          </TableCell>
                          <TableCell className="py-3.5 text-slate-400 text-sm hidden md:table-cell whitespace-nowrap">
                            {fmtDate(ev.date)}
                          </TableCell>
                          <TableCell className="py-3.5">
                            <Badge variant="outline" className={statusClass(ev.status)}>
                              {statusLabel(ev.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <Badge
                              variant="outline"
                              className={
                                ev.isActive
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                              }
                            >
                              {ev.isActive ? "Sí" : "No"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs text-slate-400 hover:text-slate-200"
                                onClick={() => router.push(`/events/${ev.id}/analytics`)}
                              >
                                <BarChart2 className="size-3.5 mr-1" />
                                Analytics
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs text-slate-400 hover:text-slate-200"
                                onClick={() => router.push(`/events/${ev.id}/edit`)}
                              >
                                <Pencil className="size-3.5 mr-1" />
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={acting === ev.id}
                                onClick={() => handleToggleActive(ev)}
                                className="h-7 px-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 disabled:opacity-40"
                                title={ev.isActive ? "Ocultar evento" : "Mostrar evento"}
                              >
                                {ev.isActive ? (
                                  <EyeOff className="size-3.5 mr-1" />
                                ) : (
                                  <Eye className="size-3.5 mr-1" />
                                )}
                                {ev.isActive ? "Ocultar" : "Mostrar"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={acting === ev.id}
                                onClick={() => handleDelete(ev.id)}
                                className="h-7 px-2 text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40"
                              >
                                <Trash2 className="size-3.5 mr-1" />
                                Eliminar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="px-4 py-2 flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    Página {page} de {totalPages} • Total {result.total} eventos
                  </p>
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
