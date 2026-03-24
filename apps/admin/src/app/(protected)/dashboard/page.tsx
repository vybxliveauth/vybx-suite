"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AlertTriangle, CheckCircle2, Clock3, Circle, ExternalLink } from "lucide-react";
import {
  Badge, Card, CardContent, CardHeader, CardTitle, CardDescription, Button,
  Skeleton,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@vybx/ui";
import { BackofficeShell } from "@/components/layout/BackofficeShell";
import { api } from "@/lib/api";
import { fmtCurrency, fmtDate } from "@/lib/utils";
import type { DashboardStats, OpsChecklistResponse, TransactionRecord } from "@/lib/types";
import Link from "next/link";


// ── Helpers ───────────────────────────────────────────────────────────────────
const TX_COLORS: Record<string, string> = {
  SUCCESS:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PENDING:   "bg-amber-500/10 text-amber-500 border-amber-500/20",
  FAILED:    "bg-red-500/10 text-red-400 border-red-500/20",
  CANCELLED: "bg-slate-500/10 text-slate-300 border-slate-500/20",
};

function slaLevel(item: OpsChecklistResponse["items"][number]): "ok" | "warning" | "breach" {
  if (item.count === 0) return "ok";
  if (item.oldestAgeHours === null) return "ok";
  if (item.oldestAgeHours >= item.targetHours) return "breach";
  if (item.oldestAgeHours >= item.targetHours * 0.75) return "warning";
  return "ok";
}

function slaBadgeClass(level: "ok" | "warning" | "breach") {
  if (level === "breach") return "bg-red-500/10 text-red-300 border-red-500/30";
  if (level === "warning") return "bg-amber-500/10 text-amber-300 border-amber-500/30";
  return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
}

function slaLabelText(level: "ok" | "warning" | "breach") {
  if (level === "breach") return "SLA vencido";
  if (level === "warning") return "SLA en riesgo";
  return "SLA OK";
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [stats,     setStats]     = useState<DashboardStats | null>(null);
  const [checklist, setChecklist] = useState<OpsChecklistResponse | null>(null);
  const [txList,    setTxList]    = useState<TransactionRecord[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get<DashboardStats>("/admin/dashboard"),
      api.get<OpsChecklistResponse>("/admin/ops-checklist"),
      api.get<{ data: TransactionRecord[] }>("/admin/transactions?limit=5"),
    ]).then(([s, c, t]) => {
      if (s.status === "fulfilled") setStats(s.value);
      if (c.status === "fulfilled") setChecklist(c.value);
      if (t.status === "fulfilled") setTxList(t.value.data);
    }).finally(() => setLoading(false));
  }, []);

  const kpis = [
    { label: "Ingresos Totales",     value: fmtCurrency(stats?.totalRevenue ?? 0) },
    { label: "Tickets Vendidos",     value: (stats?.ticketsSold ?? 0).toLocaleString("es-MX") },
    { label: "Eventos Activos",      value: String(stats?.activeEvents ?? 0) },
    { label: "Tasa de Pago Exitoso", value: `${(stats?.successRate ?? 0).toFixed(1)}%` },
  ];

  const checklistItems = checklist?.items ?? [];
  const completedItems = checklistItems.filter((i) => i.count === 0).length;
  const breachedItems  = checklistItems.filter((i) => slaLevel(i) === "breach").length;
  const warningItems   = checklistItems.filter((i) => slaLevel(i) === "warning").length;

  return (
    <BackofficeShell>
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="bg-[#030014]/40 border-white/5 backdrop-blur-xl shadow-2xl">
                  <CardHeader className="pb-1">
                    <Skeleton className="h-4 w-28" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-24" />
                  </CardContent>
                </Card>
              ))
            : kpis.map(({ label, value }) => (
                <Card key={label} className="bg-[#030014]/40 border-white/5 backdrop-blur-xl shadow-2xl">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm font-medium text-slate-400">{label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-100">{value}</div>
                  </CardContent>
                </Card>
              ))
          }
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <Card className="lg:col-span-2 bg-[#030014]/40 border-white/5 backdrop-blur-xl overflow-hidden shadow-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white tracking-tight">
                Actividad (últimos 14 días)
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Ingresos acumulados por día
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={stats?.sparklines ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="adminFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#ffffff" strokeOpacity={0.05} strokeDasharray="4 4" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v: string) => v.slice(5)}
                    stroke="#64748b"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    dy={10}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                    stroke="#64748b"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    width={44}
                  />
                  <Tooltip
                    formatter={(v: number) => [fmtCurrency(v), "Ingresos"]}
                    contentStyle={{
                      background: "#030014",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10,
                      color: "#f1f5f9",
                      fontSize: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={3} fill="url(#adminFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Ops checklist (compact) */}
          <Card className="bg-[#030014]/40 border-white/5 backdrop-blur-xl shadow-2xl">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <Clock3 className="size-4 text-white/30" /> Checklist Operativo
                </CardTitle>
                <Badge
                  variant="outline"
                  className={
                    breachedItems > 0
                      ? "bg-red-500/10 text-red-300 border-red-500/30 text-[10px]"
                      : warningItems > 0
                      ? "bg-amber-500/10 text-amber-300 border-amber-500/30 text-[10px]"
                      : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 text-[10px]"
                  }
                >
                  {completedItems}/{checklistItems.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {checklistItems.map((item) => {
                const level = slaLevel(item);
                const done = item.count === 0;
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#030014]/50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {done
                        ? <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                        : <Circle className="size-3.5 text-amber-300 shrink-0" />
                      }
                      <p className="text-xs text-slate-200 truncate">{item.label}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className={`${slaBadgeClass(level)} text-[10px] px-1.5 py-0`}>
                        {slaLabelText(level)}
                      </Badge>
                      {!done && (
                        <Link href={item.href} className="flex items-center gap-0.5 text-[10px] text-violet-400 hover:text-violet-300">
                          <ExternalLink className="size-2.5" /> {item.count}
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Recent transactions */}
        <Card className="bg-[#030014]/40 border-white/5 backdrop-blur-xl overflow-hidden shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-white tracking-tight">
                Transacciones Recientes
              </CardTitle>
              <CardDescription className="text-slate-400">
                Últimas 5 transacciones del sistema
              </CardDescription>
            </div>
            <Button asChild size="sm" variant="outline" className="border-white/10 text-slate-200">
              <Link href="/transactions" className="flex items-center gap-1">
                Ver todas <ExternalLink className="size-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-white/5 bg-[#030014]/60 overflow-hidden shadow-inner">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-slate-400 font-medium h-10">Orden</TableHead>
                    <TableHead className="text-slate-400 font-medium h-10 hidden sm:table-cell">Cliente</TableHead>
                    <TableHead className="text-slate-400 font-medium h-10 hidden md:table-cell">Fecha</TableHead>
                    <TableHead className="text-slate-400 font-medium h-10">Estado</TableHead>
                    <TableHead className="text-slate-400 font-medium h-10 text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="border-white/5">
                        <TableCell colSpan={5} className="py-3">
                          <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : txList.map((tx) => (
                    <TableRow key={tx.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                      <TableCell className="font-mono text-xs text-slate-500 py-4">{tx.orderId}</TableCell>
                      <TableCell className="py-4 hidden sm:table-cell">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold tracking-tight text-slate-200">
                            {tx.user?.email ?? "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-400 py-4 hidden md:table-cell">
                        {fmtDate(tx.createdAt)}
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className={TX_COLORS[tx.status] ?? ""}>
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold tracking-tight text-slate-200 py-4">
                        {fmtCurrency(tx.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

      </div>
    </BackofficeShell>
  );
}
