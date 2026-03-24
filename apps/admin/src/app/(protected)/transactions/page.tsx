"use client";

import { useEffect, useState } from "react";
import {
  ReceiptText, CheckCircle2, DollarSign, Hash,
  Search, X,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, CardHeader, CardTitle,
  Input,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@vybx/ui";
import { BackofficeShell } from "@/components/layout/BackofficeShell";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/page-states";
import { Pagination } from "@/components/shared/pagination";
import { api } from "@/lib/api";
import { fmtCurrency, fmtDate } from "@/lib/utils";
import type { TransactionRecord, TxStatus, Paginated } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusClass(s: TxStatus) {
  if (s === "SUCCESS")   return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (s === "PENDING")   return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  if (s === "FAILED")    return "bg-red-500/10 text-red-400 border-red-500/20";
  return "bg-slate-500/10 text-slate-300 border-slate-500/20";
}

function statusLabel(s: TxStatus) {
  if (s === "SUCCESS")   return "Exitosa";
  if (s === "PENDING")   return "Pendiente";
  if (s === "FAILED")    return "Fallida";
  return "Cancelada";
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TransactionsPage() {
  const [result, setResult]       = useState<Paginated<TransactionRecord>>({ data: [], total: 0, page: 1, pageSize: 20 });
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [page, setPage]           = useState(1);

  // Filters
  const [statusFilter, setStatusFilter]     = useState<TxStatus | "ALL">("ALL");
  const [providerFilter, setProviderFilter] = useState<string>("ALL");
  const [search, setSearch]                 = useState("");
  const [dateFrom, setDateFrom]             = useState("");
  const [dateTo, setDateTo]                 = useState("");

  function load(p = page) {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ page: String(p), limit: "20" });
    if (statusFilter   !== "ALL") qs.set("status",   statusFilter);
    if (providerFilter !== "ALL") qs.set("provider", providerFilter);
    if (search.trim())            qs.set("search",   search.trim());
    if (dateFrom)                 qs.set("dateFrom", dateFrom);
    if (dateTo)                   qs.set("dateTo",   dateTo);
    api
      .get<Paginated<TransactionRecord>>(`/admin/transactions?${qs}`)
      .then(setResult)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearFilters() {
    setStatusFilter("ALL");
    setProviderFilter("ALL");
    setSearch("");
    setDateFrom("");
    setDateTo("");
  }

  const hasFilters =
    statusFilter !== "ALL" ||
    providerFilter !== "ALL" ||
    !!search ||
    !!dateFrom ||
    !!dateTo;

  // Client-side filter on mock data
  const visible = result.data.filter((tx) => {
    const matchStatus   = statusFilter   === "ALL" || tx.status === statusFilter;
    const matchProvider = providerFilter === "ALL" || tx.provider === providerFilter;
    const q             = search.toLowerCase();
    const matchSearch   =
      !q ||
      tx.orderId.toLowerCase().includes(q) ||
      (tx.user?.email ?? "").toLowerCase().includes(q) ||
      (tx.event?.title ?? "").toLowerCase().includes(q);
    const matchFrom = !dateFrom || tx.createdAt >= dateFrom;
    const matchTo   = !dateTo   || tx.createdAt <= dateTo + "T23:59:59Z";
    return matchStatus && matchProvider && matchSearch && matchFrom && matchTo;
  });

  // Summary computed from filtered visible data
  const totalCount     = visible.length;
  const totalAmount    = visible.reduce((s, t) => s + t.amount, 0);
  const successCount   = visible.filter((t) => t.status === "SUCCESS").length;
  const successAmount  = visible.filter((t) => t.status === "SUCCESS").reduce((s, t) => s + t.amount, 0);

  return (
    <BackofficeShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Transacciones</h1>
          <p className="text-sm text-slate-500">Historial completo de pagos procesados en la plataforma</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total transacciones", value: String(totalCount),         icon: Hash,        color: "text-violet-400" },
            { label: "Monto total",          value: fmtCurrency(totalAmount),   icon: DollarSign,  color: "text-cyan-400" },
            { label: "Exitosas",             value: String(successCount),        icon: CheckCircle2,color: "text-emerald-400" },
            { label: "Monto exitoso",        value: fmtCurrency(successAmount), icon: ReceiptText, color: "text-emerald-400" },
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
            onValueChange={(v) => setStatusFilter(v as TxStatus | "ALL")}
          >
            <SelectTrigger className="w-40 bg-white/5 border-white/10 text-slate-200">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="bg-[#030014]/95 backdrop-blur-xl border-white/10 shadow-2xl">
              <SelectItem value="ALL">Todos los estados</SelectItem>
              <SelectItem value="PENDING">Pendiente</SelectItem>
              <SelectItem value="SUCCESS">Exitosa</SelectItem>
              <SelectItem value="FAILED">Fallida</SelectItem>
              <SelectItem value="CANCELLED">Cancelada</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={providerFilter}
            onValueChange={(v) => setProviderFilter(v)}
          >
            <SelectTrigger className="w-40 bg-white/5 border-white/10 text-slate-200">
              <SelectValue placeholder="Proveedor" />
            </SelectTrigger>
            <SelectContent className="bg-[#030014]/95 backdrop-blur-xl border-white/10 shadow-2xl">
              <SelectItem value="ALL">Todos los proveedores</SelectItem>
              <SelectItem value="RD_REDIRECT">RD Redirect</SelectItem>
              <SelectItem value="AZUL">Azul</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-white/30" />
            <Input
              placeholder="Orden, usuario, evento…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-600"
            />
          </div>

          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-38 bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-600"
            placeholder="Desde"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-38 bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-600"
            placeholder="Hasta"
          />

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 px-3 text-xs text-slate-400 hover:text-white/90 border border-white/10"
            >
              <X className="size-3.5 mr-1" />
              Limpiar
            </Button>
          )}
        </div>

        {/* Table */}
        <Card className="bg-[#030014]/40 border-white/5 backdrop-blur-xl shadow-2xl">
          <CardContent className="p-0">
            {error ? (
              <ErrorState message={error} onRetry={() => load(page)} />
            ) : loading ? (
              <TableSkeleton rows={10} cols={7} />
            ) : visible.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <div className="rounded-xl border border-white/5 bg-[#030014]/60 overflow-hidden shadow-inner">
                  <Table>
                    <TableHeader className="bg-white/5">
                      <TableRow className="border-white/5 hover:bg-transparent text-[11px] text-slate-400 uppercase tracking-wide">
                        <TableHead className="text-slate-400 font-medium h-10">Fecha</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10">Orden</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10 hidden md:table-cell">Evento</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10 hidden lg:table-cell">Usuario</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10 hidden sm:table-cell">Proveedor</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10">Estado</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10 text-right">Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visible.map((tx) => (
                        <TableRow
                          key={tx.id}
                          className="border-white/5 hover:bg-white/[0.02] transition-colors"
                        >
                          <TableCell className="py-4 text-slate-500 text-xs whitespace-nowrap">
                            {fmtDate(tx.createdAt)}
                          </TableCell>
                          <TableCell className="py-4 font-mono text-xs text-slate-400">
                            {tx.orderId}
                          </TableCell>
                          <TableCell className="py-4 text-slate-400 text-xs hidden md:table-cell truncate max-w-[160px]">
                            {tx.event?.title ?? "—"}
                          </TableCell>
                          <TableCell className="py-4 text-slate-400 text-xs hidden lg:table-cell truncate max-w-[160px]">
                            {tx.user?.email ?? "—"}
                          </TableCell>
                          <TableCell className="py-4 hidden sm:table-cell">
                            <Badge variant="outline" className="bg-white/5 text-slate-400 border-white/10">
                              {tx.provider}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant="outline" className={statusClass(tx.status)}>
                              {statusLabel(tx.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 text-right font-mono text-sm text-slate-200 whitespace-nowrap">
                            {fmtCurrency(tx.amount)}
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
