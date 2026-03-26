"use client";

import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { ArrowRight, RotateCcw, TrendingUp, Ticket, CreditCard } from "lucide-react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, Button,
} from "@vybx/ui";
import { PromoterShell } from "@/components/layout/PromoterShell";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { useDashboard } from "@/lib/queries";

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN", maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { month: "short", day: "numeric" });
}

function buildSparkline(grossRevenue: number) {
  const weights = [0.066, 0.085, 0.079, 0.116, 0.149, 0.132, 0.102];
  return weights.map((w, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { date: d.toISOString().slice(0, 10), revenue: Math.round(grossRevenue * w) };
  });
}

export default function SalesPage() {
  const { data, isLoading } = useDashboard();
  const summary = data?.summary;
  const sparkline = buildSparkline(summary?.grossRevenue ?? 0);

  const kpis = [
    { label: "Ingresos totales",   value: fmtCurrency(summary?.grossRevenue ?? 0),             icon: TrendingUp },
    { label: "Pagos exitosos",     value: (summary?.successfulPayments ?? 0).toLocaleString("es-MX"), icon: CreditCard },
    { label: "Boletos vendidos",   value: (summary?.soldTickets ?? 0).toLocaleString("es-MX"),        icon: Ticket },
    { label: "Boletos cancelados", value: (summary?.cancelledTickets ?? 0).toLocaleString("es-MX"),   icon: RotateCcw },
  ];

  return (
    <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Ventas" }]} />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Ventas</h1>
          <p className="text-sm text-muted-foreground">Ingresos y actividad de todos tus eventos.</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="kpi-card">
                  <CardHeader className="pb-2"><div className="h-3 w-24 bg-white/5 rounded animate-pulse" /></CardHeader>
                  <CardContent><div className="h-7 w-20 bg-white/5 rounded animate-pulse" /></CardContent>
                </Card>
              ))
            : kpis.map(({ label, value, icon: Icon }) => (
                <Card key={label} className="kpi-card">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {label}
                    </CardTitle>
                    <Icon className="size-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold tabular-nums">{value}</p>
                  </CardContent>
                </Card>
              ))
          }
        </div>

        {/* Revenue chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ingresos estimados (últimos 7 días)</CardTitle>
            <CardDescription>
              Distribución aproximada de {fmtCurrency(summary?.grossRevenue ?? 0)} en ingresos totales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={sparkline} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(262.1 83.3% 57.8%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(262.1 83.3% 57.8%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtDate}
                  tick={{ fontSize: 11, fill: "hsl(240 5% 64.9%)" }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: "hsl(240 5% 64.9%)" }}
                  axisLine={false} tickLine={false} width={42}
                />
                <Tooltip
                  formatter={(v: number) => [fmtCurrency(v), "Ingresos"]}
                  labelFormatter={fmtDate}
                  contentStyle={{
                    background: "rgba(20,20,25,0.9)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "0.5rem",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(262.1 83.3% 57.8%)"
                  strokeWidth={2}
                  fill="url(#salesGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Refunds shortcut */}
        {(summary?.refundRequestsPending ?? 0) > 0 && (
          <Card>
            <CardContent className="flex items-center justify-between py-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/10">
                  <RotateCcw className="size-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">Reembolsos pendientes</p>
                  <p className="text-xs text-muted-foreground">
                    {summary?.refundRequestsPending} solicitud{summary?.refundRequestsPending === 1 ? "" : "es"} esperando revisión
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/refunds" className="flex items-center gap-1.5">
                  Revisar <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

      </div>
    </PromoterShell>
  );
}
