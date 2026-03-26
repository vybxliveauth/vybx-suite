"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck, Download, Search, X,
  User, CalendarDays, Globe, Monitor,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent,
  Input,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Separator,
  Sheet, SheetContent, SheetHeader, SheetTitle,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@vybx/ui";
import { BackofficeShell } from "@/components/layout/BackofficeShell";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/page-states";
import { Pagination } from "@/components/shared/pagination";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import type { AuditLogRecord, AuditAction, AuditEntityType, Paginated } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────
function actionLabel(a: AuditAction) {
  if (a === "USER_ROLE_UPDATED")                return "Rol actualizado";
  if (a === "EVENT_APPROVAL_STATUS_UPDATED")    return "Evento aprobado/rechazado";
  if (a === "PROMOTER_APPLICATION_APPROVED")    return "Promotor aprobado";
  if (a === "PROMOTER_APPLICATION_REJECTED")    return "Promotor rechazado";
  return a;
}

function actionClass(a: AuditAction) {
  if (a === "PROMOTER_APPLICATION_APPROVED" || a === "EVENT_APPROVAL_STATUS_UPDATED")
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (a === "PROMOTER_APPLICATION_REJECTED")
    return "bg-red-500/10 text-red-400 border-red-500/20";
  return "bg-amber-500/10 text-amber-500 border-amber-500/20";
}

// ── CSV export ────────────────────────────────────────────────────────────────
function exportCSV(rows: AuditLogRecord[]) {
  const headers = ["Fecha", "Acción", "Entidad", "Entity ID", "Actor", "Resumen", "IP"];
  const lines = rows.map((r) =>
    [
      fmtDate(r.createdAt),
      r.action,
      r.entityType,
      r.entityId,
      r.actor?.email ?? "—",
      `"${(r.summary ?? "").replace(/"/g, '""')}"`,
      r.ipAddress ?? "—",
    ].join(",")
  );
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AuditLogsPage() {
  const [result, setResult]       = useState<Paginated<AuditLogRecord>>({ data: [], total: 0, page: 1, pageSize: 20 });
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [page, setPage]           = useState(1);

  // Filters
  const [actionFilter, setActionFilter]       = useState<AuditAction | "ALL">("ALL");
  const [entityFilter, setEntityFilter]       = useState<AuditEntityType | "ALL">("ALL");
  const [search, setSearch]                   = useState("");
  const [dateFrom, setDateFrom]               = useState("");
  const [dateTo, setDateTo]                   = useState("");

  // Detail sheet
  const [selected, setSelected] = useState<AuditLogRecord | null>(null);

  function load(p = page) {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ page: String(p), limit: "20" });
    if (actionFilter !== "ALL") qs.set("action",     actionFilter);
    if (entityFilter !== "ALL") qs.set("entityType", entityFilter);
    if (search.trim())          qs.set("q", search.trim());
    if (dateFrom)               qs.set("from", dateFrom);
    if (dateTo)                 qs.set("to", dateTo);
    api
      .get<Paginated<AuditLogRecord>>(`/admin/audit-logs?${qs}`)
      .then(setResult)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearFilters() {
    setActionFilter("ALL");
    setEntityFilter("ALL");
    setSearch("");
    setDateFrom("");
    setDateTo("");
  }

  const hasFilters =
    actionFilter !== "ALL" ||
    entityFilter !== "ALL" ||
    !!search ||
    !!dateFrom ||
    !!dateTo;

  // Client-side filter on mock
  const visible = result.data.filter((r) => {
    const matchAction = actionFilter === "ALL" || r.action === actionFilter;
    const matchEntity = entityFilter === "ALL" || r.entityType === entityFilter;
    const q           = search.toLowerCase();
    const matchSearch =
      !q ||
      r.summary.toLowerCase().includes(q) ||
      (r.actor?.email ?? "").toLowerCase().includes(q) ||
      r.entityId.toLowerCase().includes(q);
    const matchFrom = !dateFrom || r.createdAt >= dateFrom;
    const matchTo   = !dateTo   || r.createdAt <= dateTo + "T23:59:59Z";
    return matchAction && matchEntity && matchSearch && matchFrom && matchTo;
  });

  return (
    <BackofficeShell>
      <div className="space-y-7">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="size-5 text-blue-400" />
              Bitácora de auditoría
            </h1>
            <p className="text-sm text-slate-400">
              Registro de todas las acciones administrativas realizadas en la plataforma
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => exportCSV(visible)}
            className="border border-white/10 text-slate-400 hover:text-white h-9 px-4 self-start"
          >
            <Download className="size-3.5 mr-1.5" />
            Exportar CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="bo-filters">
          <Select
            value={actionFilter}
            onValueChange={(v) => setActionFilter(v as AuditAction | "ALL")}
          >
            <SelectTrigger className="w-52 bg-[#101722] border-[#243243] text-[#e8edf3]">
              <SelectValue placeholder="Acción" />
            </SelectTrigger>
            <SelectContent className="bg-[#0c121a] border-[#243243] shadow-lg">
              <SelectItem value="ALL">Todas las acciones</SelectItem>
              <SelectItem value="USER_ROLE_UPDATED">Rol actualizado</SelectItem>
              <SelectItem value="EVENT_APPROVAL_STATUS_UPDATED">Evento aprobado/rechazado</SelectItem>
              <SelectItem value="PROMOTER_APPLICATION_APPROVED">Promotor aprobado</SelectItem>
              <SelectItem value="PROMOTER_APPLICATION_REJECTED">Promotor rechazado</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={entityFilter}
            onValueChange={(v) => setEntityFilter(v as AuditEntityType | "ALL")}
          >
            <SelectTrigger className="w-36 bg-[#101722] border-[#243243] text-[#e8edf3]">
              <SelectValue placeholder="Entidad" />
            </SelectTrigger>
            <SelectContent className="bg-[#0c121a] border-[#243243] shadow-lg">
              <SelectItem value="ALL">Todas</SelectItem>
              <SelectItem value="USER">Usuario</SelectItem>
              <SelectItem value="EVENT">Evento</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-600" />
            <Input
              placeholder="Buscar resumen, actor, ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 bg-[#101722] border-[#243243] text-[#e8edf3] placeholder:text-slate-600"
            />
          </div>

          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-38 bg-[#101722] border-[#243243] text-[#e8edf3] placeholder:text-slate-600"
            placeholder="Desde"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-38 bg-[#101722] border-[#243243] text-[#e8edf3] placeholder:text-slate-600"
            placeholder="Hasta"
          />

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 px-3 text-xs text-slate-400 hover:text-white border border-white/10"
            >
              <X className="size-3.5 mr-1" />
              Limpiar
            </Button>
          )}
        </div>

        {/* Table */}
        <Card className="bo-card">
          <CardContent className="p-0">
            {error ? (
              <ErrorState message={error} onRetry={() => load(page)} />
            ) : loading ? (
              <TableSkeleton rows={8} cols={6} />
            ) : visible.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <div className="bo-table-wrap">
                  <Table>
                    <TableHeader className="bg-[#121b27]">
                      <TableRow className="border-[#1f2b3a] hover:bg-transparent">
                        <TableHead className="text-slate-400 font-medium h-10">Fecha</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10">Acción</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10 hidden sm:table-cell">Entidad</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10 hidden md:table-cell">Actor</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10">Resumen</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10 hidden lg:table-cell">IP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visible.map((log) => (
                        <TableRow
                          key={log.id}
                          onClick={() => setSelected(log)}
                          className="border-[#1f2b3a] hover:bg-[#131e2c] transition-colors cursor-pointer"
                        >
                          <TableCell className="py-4 text-slate-500 text-xs whitespace-nowrap">
                            {fmtDate(log.createdAt)}
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant="outline" className={actionClass(log.action)}>
                              {actionLabel(log.action)}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 hidden sm:table-cell">
                            <Badge variant="outline" className="bg-white/5 text-slate-400 border-white/10">
                              {log.entityType}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 text-slate-400 text-xs hidden md:table-cell">
                            {log.actor?.email ?? "Sistema"}
                          </TableCell>
                          <TableCell className="py-4 text-slate-400 text-xs max-w-[240px]">
                            <p className="truncate">{log.summary}</p>
                          </TableCell>
                          <TableCell className="py-4 text-slate-500 text-xs font-mono hidden lg:table-cell">
                            {log.ipAddress ?? "—"}
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

      {/* Detail sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <SheetContent
          side="right"
          className="w-full sm:w-[480px] border-[#243243] overflow-y-auto" style={{ background: "#0c121a" }}
        >
          <SheetHeader className="pb-4">
            <SheetTitle className="text-white flex items-center gap-2">
              <ShieldCheck className="size-4 text-blue-400" />
              Detalle de entrada
            </SheetTitle>
          </SheetHeader>

          {selected && (
            <div className="space-y-5 text-sm">
              {/* Action */}
              <div className="space-y-1.5">
                <p className="text-[11px] text-slate-500 uppercase tracking-wide">Acción</p>
                <span
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${actionClass(selected.action)}`}
                >
                  {actionLabel(selected.action)}
                </span>
              </div>

              <Separator className="bg-[#243243]" />

              {/* Entity */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-[11px] text-slate-500 uppercase tracking-wide">Tipo entidad</p>
                  <p className="text-slate-200 font-medium">{selected.entityType}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-slate-500 uppercase tracking-wide">ID entidad</p>
                  <p className="text-slate-200 font-mono text-xs break-all">{selected.entityId}</p>
                </div>
              </div>

              <Separator className="bg-[#243243]" />

              {/* Actor */}
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                  <User className="size-3" /> Actor
                </p>
                {selected.actor ? (
                  <div className="rounded-lg px-3 py-2.5 space-y-0.5">
                    <p className="text-slate-200 text-sm">{selected.actor.email}</p>
                    <p className="text-slate-400 text-xs">Rol: {selected.actor.role}</p>
                    <p className="text-slate-500 text-xs font-mono">ID: {selected.actor.id}</p>
                  </div>
                ) : (
                  <p className="text-slate-500 text-xs">Sistema / sin actor</p>
                )}
              </div>

              <Separator className="bg-[#243243]" />

              {/* Resumen */}
              <div className="space-y-1.5">
                <p className="text-[11px] text-slate-500 uppercase tracking-wide">Resumen</p>
                <p className="text-slate-300 leading-relaxed">{selected.summary}</p>
              </div>

              <Separator className="bg-[#243243]" />

              {/* Network */}
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                  <Globe className="size-3" /> Red
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="text-slate-500 text-xs w-6 shrink-0 mt-0.5">IP</span>
                    <span className="text-slate-300 text-xs font-mono">
                      {selected.ipAddress ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Monitor className="size-3.5 text-white/30 shrink-0 mt-0.5" />
                    <span className="text-slate-400 text-xs break-all leading-relaxed">
                      {selected.userAgent ?? "—"}
                    </span>
                  </div>
                </div>
              </div>

              <Separator className="bg-[#243243]" />

              {/* Date */}
              <div className="space-y-1.5">
                <p className="text-[11px] text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                  <CalendarDays className="size-3" /> Fecha
                </p>
                <p className="text-slate-300 text-xs">{fmtDate(selected.createdAt)}</p>
              </div>

              <Separator className="bg-[#243243]" />

              {/* Metadata */}
              <div className="space-y-1.5">
                <p className="text-[11px] text-slate-500 uppercase tracking-wide">Metadata</p>
                <pre className="rounded-lg p-3 text-[11px] text-slate-400 overflow-x-auto leading-relaxed">
                  {JSON.stringify(selected.metadata, null, 2)}
                </pre>

              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </BackofficeShell>
  );
}
