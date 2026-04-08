"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Activity, Ticket, Wallet, RotateCcw, Loader2, AlertCircle, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@vybx/ui";
import { PromoterShell } from "@/components/layout/PromoterShell";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { ActivityFeed, type ActivityItem } from "@/components/pro/ActivityFeed";
import { AuditTimeline, type AuditItem } from "@/components/pro/AuditTimeline";
import {
  useAdminAnalyticsOverview,
  useAdminAuditLogs,
  useAdminObservability,
  useAdminOpsChecklist,
  useAdminPayoutReconciliation,
  useAdminRefunds,
  useAdminStats,
  useAdminTransactions,
} from "@/lib/queries";
import { api } from "@/lib/api";
import { fmtCurrency, fmtDateShort as fmtDate } from "@/lib/format";

const CHART_TICK_COLOR = "hsl(var(--muted-foreground))";
const CHART_GRID_COLOR = "hsl(var(--border) / 0.6)";
const CHART_TOOLTIP_BG = "hsl(var(--popover))";
const CHART_TOOLTIP_BORDER = "1px solid hsl(var(--border))";
const CHART_SERIES_COLOR = "hsl(var(--primary))";


function buildTrend(values: Array<{ v: number }>) {
  return values.map((entry, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (values.length - 1 - i));
    return {
      date: d.toISOString().slice(0, 10),
      revenue: entry.v,
    };
  });
}

function deltaPct(current: number, prev: number) {
  if (prev <= 0) return 0;
  return ((current - prev) / prev) * 100;
}

function resolvePlatformFeePercent(raw: number | undefined): number {
  if (!Number.isFinite(raw)) return 10;
  return Math.max(0, Math.min(100, Number((raw as number).toFixed(2))));
}

export default function DashboardPage() {
  const statsQuery = useAdminStats();
  const analyticsQuery = useAdminAnalyticsOverview(7);
  const auditQuery = useAdminAuditLogs(1, 8);
  const observabilityQuery = useAdminObservability(60);
  const opsChecklistQuery = useAdminOpsChecklist();
  const payoutReconciliationQuery = useAdminPayoutReconciliation();
  const txQuery = useAdminTransactions(1, 8);
  const refundsQuery = useAdminRefunds(1, 8, "REQUESTED");

  const isLoading =
    statsQuery.isLoading ||
    auditQuery.isLoading ||
    observabilityQuery.isLoading ||
    opsChecklistQuery.isLoading;
  const hasError = statsQuery.isError;

  const stats = statsQuery.data;
  const observability = observabilityQuery.data;
  const checklist = opsChecklistQuery.data;
  const payoutReconciliation = payoutReconciliationQuery.data;
  const funnel = analyticsQuery.data?.funnel;

  const trend = useMemo(
    () => buildTrend(stats?.sparklines.revenue ?? []),
    [stats?.sparklines.revenue]
  );

  const todayRevenue = trend.at(-1)?.revenue ?? 0;
  const yesterdayRevenue = trend.at(-2)?.revenue ?? 0;
  const revenueDelta = deltaPct(todayRevenue, yesterdayRevenue);
  const platformFeePercent = resolvePlatformFeePercent(stats?.revenue.platformFeePercent);
  const vybeCommissionEstimate = Number.isFinite(stats?.revenue.vybeCommissionEstimated)
    ? Number(stats?.revenue.vybeCommissionEstimated)
    : Number(((stats?.revenue.estimated ?? 0) * (platformFeePercent / 100)).toFixed(2));

  const todayTickets = stats?.sparklines.tickets.at(-1)?.v ?? 0;
  const yesterdayTickets = stats?.sparklines.tickets.at(-2)?.v ?? 0;
  const ticketsDelta = deltaPct(todayTickets, yesterdayTickets);

  const pendingCancellations = checklist?.items?.pendingCancellations?.pendingCount ?? 0;
  const refundRate = (stats?.tickets.sold ?? 0) > 0 ? (pendingCancellations / (stats?.tickets.sold ?? 1)) * 100 : 0;

  const timelineItems = useMemo<AuditItem[]>(
    () =>
      (auditQuery.data?.data ?? []).map((row) => ({
        id: row.id,
        actor: row.actor?.email ?? row.actorRole ?? "system",
        action: row.action,
        target: row.summary ?? `${row.entityType}:${row.entityId}`,
        at: row.createdAt,
        severity: row.action.includes("REJECTED")
          ? "warning"
          : row.action.includes("APPROVED") || row.action.includes("UPDATED")
            ? "success"
            : "info",
      })),
    [auditQuery.data?.data]
  );

  const initialFeedItems = useMemo<ActivityItem[]>(() => {
    const txItems = (txQuery.data?.data ?? []).slice(0, 5).map<ActivityItem>((tx) => ({
      id: `tx:${tx.id}`,
      type: "sale",
      title: `Pago ${tx.status} (${tx.provider})`,
      subtitle: `${tx.event?.title ?? "Evento"} · ${fmtCurrency(tx.amount)}`,
      at: tx.createdAt,
    }));

    const rfItems = (refundsQuery.data?.data ?? []).slice(0, 3).map<ActivityItem>((rf) => ({
      id: `rf:${rf.id}`,
      type: "refund",
      title: "Nueva solicitud de reembolso",
      subtitle: `${rf.ticket.ticketType.event.title} · ${rf.requester?.email ?? "usuario"}`,
      at: rf.requestedAt,
    }));

    return [...txItems, ...rfItems].sort((a, b) => +new Date(b.at) - +new Date(a.at));
  }, [refundsQuery.data?.data, txQuery.data?.data]);

  const feedSource = useMemo(
    () => async () => {
      const [txRes, rfRes] = await Promise.all([
        api.get<{
          data: Array<{
            id: string;
            status: string;
            provider: string;
            amount: number;
            createdAt: string;
            event?: { title?: string };
          }>;
        }>("/admin/transactions?page=1&limit=6"),
        api.get<{
          data: Array<{
            id: string;
            requestedAt: string;
            requester?: { email?: string };
            ticket: { ticketType: { event: { title: string } } };
          }>;
        }>("/tickets/cancellations/admin?page=1&limit=4&status=REQUESTED"),
      ]);

      const txItems = (txRes.data ?? []).map<ActivityItem>((tx) => ({
        id: `tx:${tx.id}`,
        type: "sale",
        title: `Pago ${tx.status} (${tx.provider})`,
        subtitle: `${tx.event?.title ?? "Evento"} · ${fmtCurrency(tx.amount)}`,
        at: tx.createdAt,
      }));
      const rfItems = (rfRes.data ?? []).map<ActivityItem>((rf) => ({
        id: `rf:${rf.id}`,
        type: "refund",
        title: "Nueva solicitud de reembolso",
        subtitle: `${rf.ticket.ticketType.event.title} · ${rf.requester?.email ?? "usuario"}`,
        at: rf.requestedAt,
      }));
      return [...txItems, ...rfItems].sort((a, b) => +new Date(b.at) - +new Date(a.at));
    },
    []
  );

  if (isLoading) {
    return (
      <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Global Command Center" }]} />}>
        <div className="flex items-center justify-center py-32 text-muted-foreground gap-2">
          <Loader2 className="size-5 animate-spin" /> Cargando command center...
        </div>
      </PromoterShell>
    );
  }

  if (hasError || !stats) {
    return (
      <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Global Command Center" }]} />}>
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-muted-foreground">
          <AlertCircle className="size-10 opacity-40" />
          <p className="text-sm">No se pudieron cargar los datos del dashboard.</p>
        </div>
      </PromoterShell>
    );
  }

  return (
    <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Global Command Center" }]} />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Global Command Center</h1>
          <p className="text-sm text-muted-foreground">
            Vista operativa en tiempo real conectada al backend admin.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="kpi-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Wallet className="size-4 text-primary" /> GMV
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">{fmtCurrency(stats.revenue.estimated)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Hoy vs ayer:{" "}
                <span className={revenueDelta >= 0 ? "text-emerald-300" : "text-red-300"}>
                  {revenueDelta.toFixed(1)}%
                </span>
              </p>
            </CardContent>
          </Card>

          <Card className="kpi-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Activity className="size-4 text-primary" /> Comision Vybe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">{fmtCurrency(vybeCommissionEstimate)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Fee aplicado: {platformFeePercent.toFixed(2)}%
              </p>
            </CardContent>
          </Card>

          <Card className="kpi-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Ticket className="size-4 text-primary" /> Tickets vendidos hoy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">{todayTickets.toLocaleString("es-DO")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Hoy vs ayer:{" "}
                <span className={ticketsDelta >= 0 ? "text-emerald-300" : "text-red-300"}>
                  {ticketsDelta.toFixed(1)}%
                </span>
              </p>
            </CardContent>
          </Card>

          <Card className="kpi-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <RotateCcw className="size-4 text-primary" /> Tasa devoluciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">{refundRate.toFixed(2)}%</p>
              <p className="text-xs text-muted-foreground mt-1">{pendingCancellations} pendientes</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tendencia de mercado (ultimos 7 dias)</CardTitle>
            <CardDescription>Linea real basada en `admin/stats.sparklines.revenue`</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
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
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke={CHART_SERIES_COLOR}
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversión Semana 1</CardTitle>
            <CardDescription>
              View → Checkout → Pago aprobado.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Event viewed</p>
              <p className="text-lg font-semibold">{(funnel?.eventViewed ?? 0).toLocaleString("es-DO")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Checkout started</p>
              <p className="text-lg font-semibold">{(funnel?.checkoutStarted ?? 0).toLocaleString("es-DO")}</p>
              <p className="text-xs text-muted-foreground">
                {(funnel?.viewToCheckoutRatePct ?? 0).toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Checkout completed</p>
              <p className="text-lg font-semibold">{(funnel?.checkoutCompleted ?? 0).toLocaleString("es-DO")}</p>
              <p className="text-xs text-muted-foreground">
                {(funnel?.checkoutToApprovedPaymentRatePct ?? 0).toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payment failed</p>
              <p className="text-lg font-semibold">{(funnel?.paymentFailed ?? 0).toLocaleString("es-DO")}</p>
              <p className="text-xs text-muted-foreground">
                {(funnel?.paymentFailureRatePct ?? 0).toFixed(2)}%
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <ActivityFeed initialItems={initialFeedItems} source={feedSource} />
          <AuditTimeline items={timelineItems} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="size-4 text-primary" /> Observabilidad (60 min)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Auth failures</p>
              <p className="text-lg font-semibold">{observability?.summary.authFailures ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Errores 404</p>
              <p className="text-lg font-semibold">{observability?.summary.notFound ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Errores 5xx</p>
              <p className="text-lg font-semibold">{observability?.summary.serverErrors ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Latencia p95</p>
              <p className="text-lg font-semibold">{observability?.summary.p95LatencyMs ?? 0} ms</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conciliacion de payouts</CardTitle>
            <CardDescription>
              Diferencia entre transacciones `SUCCESS` y payouts realmente `PAID`.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Cobertura pagada</p>
              <p className="text-lg font-semibold">
                {payoutReconciliation?.totals.paidCoveragePct?.toFixed(2) ?? "0.00"}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gap abierto</p>
              <p className="text-lg font-semibold">
                {(payoutReconciliation?.gap.count ?? 0).toLocaleString("es-DO")} ·{" "}
                {fmtCurrency(payoutReconciliation?.gap.amount ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Atrasados &gt; 48h</p>
              <p className="text-lg font-semibold">
                {(payoutReconciliation?.gap.staleCount ?? 0).toLocaleString("es-DO")} ·{" "}
                {fmtCurrency(payoutReconciliation?.gap.staleAmount ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Alertas activas</p>
              <p className="text-lg font-semibold">
                {(payoutReconciliation?.alerts.activeCount ?? 0).toLocaleString("es-DO")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PromoterShell>
  );
}
