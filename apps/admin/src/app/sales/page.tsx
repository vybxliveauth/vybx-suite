"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowRight, RotateCcw, TrendingUp, Ticket, CreditCard, Eye, ShoppingCart, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@vybx/ui";
import { PromoterShell } from "@/components/layout/PromoterShell";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { useAdminAnalyticsOverview, useAdminEvents, useAdminRefunds, useAdminStats, useAdminTransactions } from "@/lib/queries";
import { fmtCurrency, fmtDateShort as fmtDate, fmtDateTime } from "@/lib/format";

const CHART_TICK_COLOR = "hsl(var(--muted-foreground))";
const CHART_GRID_COLOR = "hsl(var(--border) / 0.55)";
const CHART_TOOLTIP_BG = "hsl(var(--popover))";
const CHART_TOOLTIP_BORDER = "1px solid hsl(var(--border))";
const CHART_SERIES_COLOR = "hsl(var(--primary))";

function txStatusBadge(status: string) {
  if (status === "SUCCESS") {
    return (
      <Badge variant="outline" className="text-emerald-300 border-emerald-400/40 bg-emerald-500/10">
        Exitoso
      </Badge>
    );
  }
  if (status === "FAILED") {
    return (
      <Badge variant="outline" className="text-red-300 border-red-400/40 bg-red-500/10">
        Fallido
      </Badge>
    );
  }
  if (status === "CANCELLED") {
    return (
      <Badge variant="outline" className="text-zinc-300 border-zinc-500/40 bg-zinc-500/10">
        Cancelado
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-amber-300 border-amber-400/40 bg-amber-500/10">
      Pendiente
    </Badge>
  );
}

function buildSparkline(values: Array<{ v: number }>) {
  return values.map((entry, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (values.length - 1 - i));
    return { date: d.toISOString().slice(0, 10), revenue: entry.v };
  });
}

function buildEstimatedSparkline(grossRevenue: number) {
  const weights = [0.066, 0.085, 0.079, 0.116, 0.149, 0.132, 0.102];
  return weights.map((w, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { date: d.toISOString().slice(0, 10), revenue: Math.round(grossRevenue * w) };
  });
}

function fmtPct(value: number) {
  return `${Number(value || 0).toFixed(2)}%`;
}

export default function SalesPage() {
  const [selectedEventId, setSelectedEventId] = useState<string>("ALL");

  const statsQuery = useAdminStats();
  const eventsQuery = useAdminEvents(1, 100, "ALL");
  const analyticsQuery = useAdminAnalyticsOverview(7);
  const refundsQuery = useAdminRefunds(1, 100, "REQUESTED");
  const transactionsQuery = useAdminTransactions(1, 25);

  const events = useMemo(
    () =>
      [...(eventsQuery.data?.data ?? [])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [eventsQuery.data?.data]
  );
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;
  const isEventMode = Boolean(selectedEvent);

  const totalRevenue = isEventMode
    ? selectedEvent?.metrics?.grossRevenue ?? 0
    : statsQuery.data?.revenue.estimated ?? 0;
  const successfulPayments = isEventMode
    ? selectedEvent?.metrics?.successfulPayments ?? 0
    : statsQuery.data?.revenue.successfulPayments ?? 0;
  const soldTickets = isEventMode
    ? selectedEvent?.metrics?.totalSold ?? 0
    : statsQuery.data?.tickets.sold ?? 0;
  const pendingRefunds = refundsQuery.data?.total ?? 0;
  const occupancyRate = selectedEvent?.metrics?.occupancyRate ?? 0;
  const sparkline = isEventMode
    ? buildEstimatedSparkline(totalRevenue)
    : buildSparkline(statsQuery.data?.sparklines.revenue ?? []);
  const transactions = transactionsQuery.data?.data ?? [];
  const selectedEventKey = selectedEvent?.id ?? null;
  const filteredTransactions = selectedEventKey
    ? transactions.filter((tx) => tx.eventId === selectedEventKey)
    : transactions;
  const analytics = analyticsQuery.data;
  const funnel = analytics?.funnel;
  const topCategories = analytics?.topCategories.slice(0, 5) ?? [];
  const topPromoters = analytics?.topPromoters.slice(0, 5) ?? [];
  const failuresByFlow = analytics?.failuresByFlow.slice(0, 5) ?? [];

  const kpis = isEventMode
    ? [
        { label: "Ingresos del evento", value: fmtCurrency(totalRevenue), icon: TrendingUp },
        { label: "Pagos exitosos", value: successfulPayments.toLocaleString("es-DO"), icon: CreditCard },
        { label: "Boletos vendidos", value: soldTickets.toLocaleString("es-DO"), icon: Ticket },
        { label: "Capacidad ocupada", value: `${Number(occupancyRate || 0).toFixed(1)}%`, icon: RotateCcw },
      ]
    : [
        { label: "Ingresos totales", value: fmtCurrency(totalRevenue), icon: TrendingUp },
        { label: "Pagos exitosos", value: successfulPayments.toLocaleString("es-DO"), icon: CreditCard },
        { label: "Boletos vendidos", value: soldTickets.toLocaleString("es-DO"), icon: Ticket },
        { label: "Reembolsos pendientes", value: pendingRefunds.toLocaleString("es-DO"), icon: RotateCcw },
      ];

  return (
    <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Ventas" }]} />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Ventas</h1>
          <p className="text-sm text-muted-foreground">
            {isEventMode
              ? `Vista de ventas para ${selectedEvent?.title ?? "evento seleccionado"}.`
              : "Ingresos y actividad de toda la plataforma."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="w-full md:w-[360px]">
              <SelectValue placeholder="Seleccionar evento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los eventos</SelectItem>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedEvent && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/events/${selectedEvent.id}`}>Ver evento</Link>
            </Button>
          )}
        </div>

        {(statsQuery.isError || transactionsQuery.isError || eventsQuery.isError) && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Error al cargar datos de ventas: {(statsQuery.error ?? transactionsQuery.error ?? eventsQuery.error) instanceof Error ? (statsQuery.error ?? transactionsQuery.error ?? eventsQuery.error)?.message : "No se pudo conectar con el servidor."}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsQuery.isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="kpi-card">
                  <CardHeader className="pb-2">
                    <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-7 w-20 bg-white/5 rounded animate-pulse" />
                  </CardContent>
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
              ))}
        </div>

        {!isEventMode && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Semana 1: Embudo de conversión</CardTitle>
              <CardDescription>
                Vista → Inicio de compra → Pago aprobado, con tasa de fallo por flujo.
                {analytics?.source === "fallback" ? " Fuente: respaldo multipunto." : " Fuente: endpoint combinado."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border/70 bg-card/40 p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Eye className="size-3.5" /> Evento visto
                </p>
                <p className="text-xl font-semibold tabular-nums mt-1">
                  {(funnel?.eventViewed ?? 0).toLocaleString("es-DO")}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-card/40 p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <ShoppingCart className="size-3.5" /> Inicio de compra
                </p>
                <p className="text-xl font-semibold tabular-nums mt-1">
                  {(funnel?.checkoutStarted ?? 0).toLocaleString("es-DO")}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Vista → Inicio de compra: {fmtPct(funnel?.viewToCheckoutRatePct ?? 0)}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-card/40 p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5" /> Compra completada
                </p>
                <p className="text-xl font-semibold tabular-nums mt-1">
                  {(funnel?.checkoutCompleted ?? 0).toLocaleString("es-DO")}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Inicio de compra → Pago: {fmtPct(funnel?.checkoutToApprovedPaymentRatePct ?? 0)}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-card/40 p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5" /> Pago fallido
                </p>
                <p className="text-xl font-semibold tabular-nums mt-1">
                  {(funnel?.paymentFailed ?? 0).toLocaleString("es-DO")}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Fallo de pago: {fmtPct(funnel?.paymentFailureRatePct ?? 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {!isEventMode && (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Top categorías que convierten</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {topCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin datos disponibles.</p>
                ) : (
                  topCategories.map((row) => (
                    <div key={row.categoryId} className="rounded-md border border-border/70 px-3 py-2">
                      <p className="text-sm font-medium">{row.categoryName}</p>
                      <p className="text-xs text-muted-foreground">
                        vistas {row.eventViewed.toLocaleString("es-DO")} · compras {row.checkoutCompleted.toLocaleString("es-DO")} · conv. {fmtPct(row.conversionRatePct)}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Top promotores con ventas reales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {topPromoters.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin datos disponibles.</p>
                ) : (
                  topPromoters.map((row) => (
                    <div key={row.promoterId} className="rounded-md border border-border/70 px-3 py-2">
                      <p className="text-sm font-medium">{row.promoterName}</p>
                      <p className="text-xs text-muted-foreground">
                        eventos {row.eventsCreated.toLocaleString("es-DO")} · compras {row.checkoutCompleted.toLocaleString("es-DO")} · {fmtCurrency(row.grossRevenue)}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Fallos por flujo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {failuresByFlow.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin datos disponibles.</p>
                ) : (
                  failuresByFlow.map((row) => (
                    <div key={row.flow} className="rounded-md border border-border/70 px-3 py-2">
                      <p className="text-sm font-medium">{row.flow}</p>
                      <p className="text-xs text-muted-foreground">
                        fallos {row.failed.toLocaleString("es-DO")} / total {row.total.toLocaleString("es-DO")} · {fmtPct(row.failureRatePct)}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isEventMode ? "Ingresos estimados del evento (últimos 7 días)" : "Ingresos (últimos 7 días)"}
            </CardTitle>
            <CardDescription>
              {isEventMode ? "Distribución estimada basada en métricas del evento seleccionado." : "Serie real basada en `admin/stats`."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={sparkline} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_SERIES_COLOR} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_SERIES_COLOR} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtDate}
                  tick={{ fontSize: 11, fill: CHART_TICK_COLOR }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: CHART_TICK_COLOR }}
                  axisLine={false}
                  tickLine={false}
                  width={42}
                />
                <Tooltip
                  formatter={(v) => [fmtCurrency(Number(v ?? 0)), "Ingresos"]}
                  labelFormatter={(label) => (typeof label === "string" ? fmtDate(label) : String(label ?? ""))}
                  contentStyle={{
                    background: CHART_TOOLTIP_BG,
                    border: CHART_TOOLTIP_BORDER,
                    borderRadius: "0.5rem",
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke={CHART_SERIES_COLOR} strokeWidth={2} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {!isEventMode && pendingRefunds > 0 && (
          <Card>
            <CardContent className="flex items-center justify-between py-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/10">
                  <RotateCcw className="size-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">Reembolsos pendientes</p>
                  <p className="text-xs text-muted-foreground">
                    {pendingRefunds} solicitud{pendingRefunds === 1 ? "" : "es"} esperando revisión
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isEventMode ? "Transacciones del evento" : "Transacciones recientes"}
            </CardTitle>
            <CardDescription>
              {isEventMode
                ? "Vista filtrada de las últimas transacciones cargadas para el evento seleccionado."
                : "Tabla conectada al endpoint `/admin/transactions`."}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Orden</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Comprador</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionsQuery.isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6} className="py-3">
                        <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      {isEventMode ? "No hay transacciones para este evento en el lote cargado." : "No hay transacciones recientes."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-xs">{tx.orderNumber}</TableCell>
                      <TableCell>
                        <p className="text-sm">{tx.event?.title ?? "Evento no disponible"}</p>
                        <p className="text-xs text-muted-foreground uppercase">{tx.provider}</p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {tx.user?.email ?? tx.userId}
                      </TableCell>
                      <TableCell className="font-semibold text-sm">
                        {fmtCurrency(tx.amount)}
                      </TableCell>
                      <TableCell>{txStatusBadge(tx.status)}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {fmtDateTime(tx.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PromoterShell>
  );
}
