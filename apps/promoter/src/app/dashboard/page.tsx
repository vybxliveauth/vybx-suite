"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Ticket, CalendarCheck, ArrowUpRight, AlertCircle, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
} from "@vybx/ui";
import { PromoterShell } from "@/components/layout/PromoterShell";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { useDashboard } from "@/lib/queries";

// Synthetic 7-day sparkline from grossRevenue
function buildSparkline(grossRevenue: number) {
  const weights = [0.066, 0.085, 0.079, 0.116, 0.149, 0.132, 0.102];
  return weights.map((w, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toISOString().slice(0, 10),
      revenue: Math.round(grossRevenue * w),
    };
  });
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { month: "short", day: "numeric" });
}

export default function DashboardPage() {
  const { data, isLoading, isError } = useDashboard();

  if (isLoading) {
    return (
      <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Dashboard" }]} />}>
        <div className="flex items-center justify-center py-32 text-muted-foreground gap-2">
          <Loader2 className="size-5 animate-spin" /> Cargando dashboard…
        </div>
      </PromoterShell>
    );
  }

  if (isError || !data) {
    return (
      <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Dashboard" }]} />}>
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-muted-foreground">
          <AlertCircle className="size-10 opacity-40" />
          <p className="text-sm">No se pudieron cargar los datos del dashboard.</p>
        </div>
      </PromoterShell>
    );
  }

  const { summary, topEvents } = data;
  const sparkline = buildSparkline(summary.grossRevenue);

  const kpis = [
    {
      label: "Ingresos totales",
      value: fmtCurrency(summary.grossRevenue),
      icon: TrendingUp,
      sub: `${summary.successfulPayments} pagos exitosos`,
    },
    {
      label: "Boletos vendidos",
      value: summary.soldTickets.toLocaleString("es-MX"),
      icon: Ticket,
      sub: `${summary.cancelledTickets} cancelados`,
    },
    {
      label: "Eventos activos",
      value: String(summary.activeEvents),
      icon: CalendarCheck,
      sub: `${summary.upcomingEvents} próximos`,
    },
    {
      label: "Eventos pendientes",
      value: String(summary.pendingEvents),
      icon: AlertCircle,
      sub:
        summary.refundRequestsPending > 0
          ? `${summary.refundRequestsPending} reembolsos pendientes`
          : "Sin reembolsos pendientes",
    },
  ];

  return (
    <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Dashboard" }]} />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Resumen de tus ventas e ingresos</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(({ label, value, icon: Icon, sub }) => (
            <Card key={label} className="kpi-card">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {label}
                </CardTitle>
                <Icon className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">{value}</p>
                {sub && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <ArrowUpRight className="size-3" />
                    {sub}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Revenue sparkline */}
        <Card>
          <CardHeader>
            <CardTitle>Ingresos estimados (últimos 7 días)</CardTitle>
            <CardDescription>Distribución aproximada de {fmtCurrency(summary.grossRevenue)} en ingresos totales</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={sparkline} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(262.1 83.3% 57.8%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(262.1 83.3% 57.8%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 27.9% 16.9%)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtDate}
                  tick={{ fontSize: 11, fill: "hsl(217.9 10.6% 54.9%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: "hsl(217.9 10.6% 54.9%)" }}
                  axisLine={false}
                  tickLine={false}
                  width={42}
                />
                <Tooltip
                  formatter={(v) => [fmtCurrency(Number(v ?? 0)), "Ingresos"]}
                  labelFormatter={(label) => (typeof label === "string" ? fmtDate(label) : String(label ?? ""))}
                  contentStyle={{
                    background: "hsl(224 71.4% 6%)",
                    border: "1px solid hsl(215 27.9% 16.9%)",
                    borderRadius: "0.5rem",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(262.1 83.3% 57.8%)"
                  strokeWidth={2}
                  fill="url(#revenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Events */}
        <Card>
          <CardHeader>
            <CardTitle>Top eventos</CardTitle>
            <CardDescription>Por ingresos generados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aún no hay eventos con ventas.
              </p>
            ) : (
              topEvents.map((ev, i) => (
                <div key={ev.eventId} className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {ev.soldTickets.toLocaleString("es-MX")} boletos · {ev.successfulPayments} pagos
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 font-mono text-xs">
                    {fmtCurrency(ev.revenue)}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </PromoterShell>
  );
}
