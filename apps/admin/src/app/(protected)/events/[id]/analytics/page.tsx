"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, AlertTriangle, TrendingUp, Ticket, Users, RotateCcw, BarChart2,
} from "lucide-react";
import {
  Card, CardContent, CardHeader, CardTitle,
  Badge,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@vybx/ui";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { BackofficeShell } from "@/components/layout/BackofficeShell";
import { api } from "@/lib/api";
import { fmtCurrency, fmtDate } from "@/lib/utils";
import type { EventRecord, TransactionRecord, Paginated } from "@/lib/types";

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string;
  icon: React.ComponentType<{ className?: string }>; color: string;
}) {
  return (
    <Card className="bo-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">{label}</p>
            <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
            {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-lg ${color}`}>
            <Icon className="size-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function EventAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [event, setEvent]   = useState<EventRecord | null>(null);
  const [txs, setTxs]       = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<{ data: EventRecord[] }>(`/events/admin/all?limit=200`),
      api.get<Paginated<TransactionRecord>>(`/admin/transactions?eventId=${id}&limit=100&status=SUCCESS`),
    ])
      .then(([evRes, txRes]) => {
        const ev = evRes.data.find((e) => e.id === id);
        if (!ev) { setError("Evento no encontrado"); return; }
        setEvent(ev);
        setTxs(txRes.data);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return (
    <BackofficeShell>
      <div className="flex items-center justify-center py-32 text-slate-500 gap-2">
        <Loader2 className="size-5 animate-spin" /> Cargando analíticas…
      </div>
    </BackofficeShell>
  );

  if (error || !event) return (
    <BackofficeShell>
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-500">
        <AlertTriangle className="size-10 opacity-40" />
        <p className="text-sm">{error ?? "Evento no encontrado"}</p>
        <button onClick={() => router.back()} className="text-xs text-blue-400 hover:underline">Volver</button>
      </div>
    </BackofficeShell>
  );

  // ── Derived metrics ─────────────────────────────────────────────────────────
  const grossRevenue   = txs.reduce((acc, t) => acc + t.amount, 0);
  const totalCapacity  = event.ticketTypes.reduce((acc, t) => acc + t.quantity, 0);
  const totalSold      = event.ticketTypes.reduce((acc, t) => acc + t.sold, 0);
  const occupancy      = totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0;

  const tierChartData = event.ticketTypes.map((tt) => ({
    name:     tt.name,
    sold:     tt.sold,
    capacity: tt.quantity,
    pct:      tt.quantity > 0 ? Math.round((tt.sold / tt.quantity) * 100) : 0,
    revenue:  txs.length > 0
      ? Math.round((tt.sold / Math.max(totalSold, 1)) * grossRevenue)
      : tt.sold * tt.price,
  }));

  const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

  return (
    <BackofficeShell>
      <div className="space-y-7">
        {/* Header */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-300 transition-colors">
                <ArrowLeft className="size-4" />
              </button>
              <h1 className="text-2xl font-bold text-white tracking-tight truncate max-w-[500px]">{event.title}</h1>
            </div>
            <p className="text-sm text-slate-400 ml-6">{fmtDate(event.date)}{event.location ? ` · ${event.location}` : ""}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Badge variant="outline" className={event.isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20"}>
              {event.isActive ? "Activo" : "Inactivo"}
            </Badge>
            <Badge variant="outline" className={
              event.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
              event.status === "PENDING"  ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
              "bg-red-500/10 text-red-400 border-red-500/20"
            }>
              {event.status === "APPROVED" ? "Aprobado" : event.status === "PENDING" ? "Pendiente" : "Rechazado"}
            </Badge>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Ingresos brutos" value={fmtCurrency(grossRevenue)} sub={`${txs.length} transacciones`} icon={TrendingUp} color="bg-blue-500/20" />
          <KpiCard label="Boletos vendidos" value={String(totalSold)} sub={`de ${totalCapacity} disponibles`} icon={Ticket} color="bg-purple-500/20" />
          <KpiCard label="Ocupación" value={`${occupancy}%`} sub={`${totalCapacity - totalSold} restantes`} icon={Users} color="bg-emerald-500/20" />
          <KpiCard label="Precio promedio" value={totalSold > 0 ? fmtCurrency(grossRevenue / totalSold) : "—"} sub="por boleto vendido" icon={BarChart2} color="bg-amber-500/20" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tier breakdown chart */}
          <Card className="bo-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-300">Ventas por tipo de boleto</CardTitle>
            </CardHeader>
            <CardContent>
              {tierChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={tierChartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                    <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "#0c121a", border: "1px solid #243243", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "#e8edf3" }}
                      itemStyle={{ color: "#94a3b8" }}
                    />
                    <Bar dataKey="sold" radius={[4, 4, 0, 0]} name="Vendidos">
                      {tierChartData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-slate-600 text-sm">Sin datos de venta</div>
              )}
            </CardContent>
          </Card>

          {/* Tier detail table */}
          <Card className="bo-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                <RotateCcw className="size-4" /> Desglose por tier
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="bo-table-wrap">
                <Table>
                  <TableHeader className="bg-[#121b27]">
                    <TableRow className="border-[#1f2b3a] hover:bg-transparent">
                      <TableHead className="text-slate-400 text-xs uppercase tracking-wide h-9">Tipo</TableHead>
                      <TableHead className="text-slate-400 text-xs uppercase tracking-wide h-9 text-right">Precio</TableHead>
                      <TableHead className="text-slate-400 text-xs uppercase tracking-wide h-9 text-right">Vendidos</TableHead>
                      <TableHead className="text-slate-400 text-xs uppercase tracking-wide h-9 text-right">Capacidad</TableHead>
                      <TableHead className="text-slate-400 text-xs uppercase tracking-wide h-9 text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {event.ticketTypes.map((tt) => {
                      const pct = tt.quantity > 0 ? Math.round((tt.sold / tt.quantity) * 100) : 0;
                      return (
                        <TableRow key={tt.id} className="border-[#1f2b3a] hover:bg-[#131e2c]">
                          <TableCell className="text-slate-200 text-sm py-3">{tt.name}</TableCell>
                          <TableCell className="text-slate-400 text-sm py-3 text-right tabular-nums">{fmtCurrency(tt.price)}</TableCell>
                          <TableCell className="text-slate-200 text-sm py-3 text-right tabular-nums font-medium">{tt.sold}</TableCell>
                          <TableCell className="text-slate-400 text-sm py-3 text-right tabular-nums">{tt.quantity}</TableCell>
                          <TableCell className="py-3 text-right">
                            <span className={`text-xs font-semibold tabular-nums ${pct >= 80 ? "text-emerald-400" : pct >= 40 ? "text-amber-400" : "text-slate-400"}`}>
                              {pct}%
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent transactions */}
        {txs.length > 0 && (
          <Card className="bo-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-300">Transacciones recientes ({txs.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="bo-table-wrap">
                <Table>
                  <TableHeader className="bg-[#121b27]">
                    <TableRow className="border-[#1f2b3a] hover:bg-transparent">
                      <TableHead className="text-slate-400 text-xs uppercase tracking-wide h-9">Usuario</TableHead>
                      <TableHead className="text-slate-400 text-xs uppercase tracking-wide h-9 text-right">Monto</TableHead>
                      <TableHead className="text-slate-400 text-xs uppercase tracking-wide h-9 hidden md:table-cell">Proveedor</TableHead>
                      <TableHead className="text-slate-400 text-xs uppercase tracking-wide h-9 hidden md:table-cell text-right">Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {txs.slice(0, 20).map((tx) => (
                      <TableRow key={tx.id} className="border-[#1f2b3a] hover:bg-[#131e2c]">
                        <TableCell className="py-3 text-sm text-slate-300">{tx.user?.email ?? "—"}</TableCell>
                        <TableCell className="py-3 text-sm text-emerald-400 font-semibold tabular-nums text-right">{fmtCurrency(tx.amount)}</TableCell>
                        <TableCell className="py-3 text-xs text-slate-500 hidden md:table-cell">{tx.provider}</TableCell>
                        <TableCell className="py-3 text-xs text-slate-500 hidden md:table-cell text-right whitespace-nowrap">{fmtDate(tx.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </BackofficeShell>
  );
}
