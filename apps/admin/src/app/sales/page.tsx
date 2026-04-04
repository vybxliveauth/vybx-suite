"use client";

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
import { ArrowRight, RotateCcw, TrendingUp, Ticket, CreditCard } from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@vybx/ui";
import { PromoterShell } from "@/components/layout/PromoterShell";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { useAdminRefunds, useAdminStats, useAdminTransactions } from "@/lib/queries";
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

export default function SalesPage() {
  const statsQuery = useAdminStats();
  const refundsQuery = useAdminRefunds(1, 100, "REQUESTED");
  const transactionsQuery = useAdminTransactions(1, 25);

  const totalRevenue = statsQuery.data?.revenue.estimated ?? 0;
  const successfulPayments = statsQuery.data?.revenue.successfulPayments ?? 0;
  const soldTickets = statsQuery.data?.tickets.sold ?? 0;
  const pendingRefunds = refundsQuery.data?.total ?? 0;
  const sparkline = buildSparkline(statsQuery.data?.sparklines.revenue ?? []);
  const transactions = transactionsQuery.data?.data ?? [];

  const kpis = [
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
          <p className="text-sm text-muted-foreground">Ingresos y actividad de toda la plataforma.</p>
        </div>

        {(statsQuery.isError || transactionsQuery.isError) && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Error al cargar datos de ventas: {(statsQuery.error ?? transactionsQuery.error) instanceof Error ? (statsQuery.error ?? transactionsQuery.error)?.message : "No se pudo conectar con el servidor."}
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ingresos (últimos 7 días)</CardTitle>
            <CardDescription>Serie real basada en `admin/stats`.</CardDescription>
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
                  formatter={(v: number) => [fmtCurrency(v), "Ingresos"]}
                  labelFormatter={fmtDate}
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

        {pendingRefunds > 0 && (
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
            <CardTitle className="text-base">Transacciones recientes</CardTitle>
            <CardDescription>Tabla conectada al endpoint `/admin/transactions`.</CardDescription>
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
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      No hay transacciones recientes.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
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
