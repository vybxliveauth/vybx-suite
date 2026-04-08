"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  ArrowRight,
  ChevronDown,
  CreditCard,
  Loader2,
  RotateCcw,
  TrendingUp,
  Ticket,
} from "lucide-react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, Button,
} from "@vybx/ui";
import { PromoterShell } from "@/components/layout/PromoterShell";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { useDashboard, useEventCharts, useEvents } from "@/lib/queries";

const RANGES = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency", currency: "MXN", maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-DO", { month: "short", day: "numeric" });
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
  const [selectedEventId, setSelectedEventId] = useState<string>("ALL");
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [days, setDays] = useState(30);

  const { data, isLoading } = useDashboard();
  const { data: eventsData, isLoading: isLoadingEvents } = useEvents(1, 100);
  const events = eventsData?.data ?? [];
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;
  const eventChartsQuery = useEventCharts(selectedEvent?.id ?? "", days);
  const eventCharts = eventChartsQuery.data;
  const isEventMode = Boolean(selectedEvent);

  const summary = data?.summary;
  const sparkline = buildSparkline(summary?.grossRevenue ?? 0);
  const chartData = isEventMode ? (eventCharts?.revenueByDay ?? []) : sparkline;

  const selectedEventRevenue = useMemo(() => {
    if (!selectedEvent) return 0;
    if (selectedEvent.metrics?.grossRevenue !== undefined) {
      return selectedEvent.metrics.grossRevenue;
    }
    return (eventCharts?.revenueByDay ?? []).reduce((acc, row) => acc + row.revenue, 0);
  }, [selectedEvent, eventCharts?.revenueByDay]);

  const kpis = isEventMode
    ? [
        {
          label: "Ingresos del evento",
          value: fmtCurrency(selectedEventRevenue),
          icon: TrendingUp,
        },
        {
          label: "Pagos exitosos",
          value: (selectedEvent?.metrics?.successfulPayments ?? 0).toLocaleString("es-DO"),
          icon: CreditCard,
        },
        {
          label: "Boletos vendidos",
          value: (selectedEvent?.metrics?.totalSold ?? 0).toLocaleString("es-DO"),
          icon: Ticket,
        },
        {
          label: "Capacidad ocupada",
          value: `${Number(selectedEvent?.metrics?.occupancyRate ?? 0).toFixed(1)}%`,
          icon: RotateCcw,
        },
      ]
    : [
        { label: "Ingresos totales", value: fmtCurrency(summary?.grossRevenue ?? 0), icon: TrendingUp },
        { label: "Pagos exitosos", value: (summary?.successfulPayments ?? 0).toLocaleString("es-DO"), icon: CreditCard },
        { label: "Boletos vendidos", value: (summary?.soldTickets ?? 0).toLocaleString("es-DO"), icon: Ticket },
        { label: "Boletos cancelados", value: (summary?.cancelledTickets ?? 0).toLocaleString("es-DO"), icon: RotateCcw },
      ];

  return (
    <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Ventas" }]} />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Ventas</h1>
          <p className="text-sm text-muted-foreground">
            {isEventMode
              ? `Vista operativa de ${selectedEvent?.title ?? "evento"}`
              : "Ingresos y actividad de todos tus eventos."}
          </p>
        </div>

        {/* Event picker + range */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <button
              onClick={() => setShowEventPicker((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/30 text-sm font-medium hover:bg-muted/60 transition-colors max-w-[320px] truncate"
            >
              <span className="truncate">
                {selectedEvent ? selectedEvent.title : "Todos los eventos"}
              </span>
              <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
            </button>
            {showEventPicker && (
              <div className="absolute top-full left-0 mt-1 z-50 w-80 rounded-xl border border-border bg-background shadow-xl overflow-hidden">
                <div className="max-h-64 overflow-y-auto p-1">
                  <button
                    onClick={() => {
                      setSelectedEventId("ALL");
                      setShowEventPicker(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedEventId === "ALL"
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted/60 text-foreground"
                    }`}
                  >
                    <p className="truncate font-medium">Todos los eventos</p>
                    <p className="text-xs text-muted-foreground">Vista agregada de tu cuenta promoter</p>
                  </button>
                  {events.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => {
                        setSelectedEventId(event.id);
                        setShowEventPicker(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedEventId === event.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted/60 text-foreground"
                      }`}
                    >
                      <p className="truncate font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.date).toLocaleDateString("es-DO", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
            {RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => setDays(range.value)}
                className={`px-3 py-1.5 transition-colors ${
                  days === range.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {selectedEvent && (
            <Link href={`/events/${selectedEvent.id}`} className="text-xs text-primary hover:underline ml-auto">
              Ver evento completo →
            </Link>
          )}
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading || (isEventMode && (isLoadingEvents || eventChartsQuery.isLoading))
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
            <CardTitle className="text-base">
              {isEventMode
                ? `Ingresos del evento (${days} días)`
                : "Ingresos estimados (últimos 7 días)"}
            </CardTitle>
            <CardDescription>
              {isEventMode
                ? `Evolución de ingresos de ${selectedEvent?.title ?? "evento seleccionado"}`
                : `Distribución aproximada de ${fmtCurrency(summary?.grossRevenue ?? 0)} en ingresos totales`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEventMode && eventChartsQuery.isLoading ? (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground gap-2">
                <Loader2 className="size-4 animate-spin" /> Cargando métricas del evento…
              </div>
            ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(262.1 83.3% 57.8%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(262.1 83.3% 57.8%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 27.9% 16.9%)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtDate}
                  tick={{ fontSize: 11, fill: "hsl(217.9 10.6% 54.9%)" }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: "hsl(217.9 10.6% 54.9%)" }}
                  axisLine={false} tickLine={false} width={42}
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
                  fill="url(#salesGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Refunds shortcut */}
        {!isEventMode && (summary?.refundRequestsPending ?? 0) > 0 && (
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
