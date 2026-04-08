"use client";

import { useState } from "react";
import { Loader2, ShieldAlert, TrendingUp, Users, Wallet, Clock3 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@vybx/ui";
import { PromoterShell } from "@/components/layout/PromoterShell";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import {
  useAdminRevenueOpsFunnel,
  useAdminRevenueOpsLeaderboard,
  useAdminRevenueOpsRisk,
  useAdminRevenueOpsSupply,
} from "@/lib/queries";
import { fmtCurrency, fmtDateShort as fmtDate } from "@/lib/format";

type RevenueOpsView = "funnel" | "supply" | "risk" | "leaderboard";

const VIEW_OPTIONS: Array<{ id: RevenueOpsView; label: string }> = [
  { id: "funnel", label: "Funnel diario" },
  { id: "supply", label: "Supply ops" },
  { id: "risk", label: "Risk ops" },
  { id: "leaderboard", label: "Promoter leaderboard" },
];

const FUNNEL_WINDOWS = [
  { label: "Hoy", value: 1 },
  { label: "7 días", value: 7 },
  { label: "30 días", value: 30 },
];

export default function RevenueOpsPage() {
  const [activeView, setActiveView] = useState<RevenueOpsView>("funnel");
  const [funnelWindowDays, setFunnelWindowDays] = useState(1);

  const funnelQuery = useAdminRevenueOpsFunnel(funnelWindowDays);
  const supplyQuery = useAdminRevenueOpsSupply(30);
  const riskQuery = useAdminRevenueOpsRisk(7, 60);
  const leaderboardQuery = useAdminRevenueOpsLeaderboard(30);

  const hasAnyError =
    funnelQuery.isError ||
    supplyQuery.isError ||
    riskQuery.isError ||
    leaderboardQuery.isError;

  const funnel = funnelQuery.data;
  const supply = supplyQuery.data;
  const risk = riskQuery.data;
  const leaderboard = leaderboardQuery.data;

  return (
    <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Revenue Ops" }]} />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Revenue Ops</h1>
          <p className="text-sm text-muted-foreground">
            Cabina de crecimiento: conversion, supply, riesgo y performance comercial.
          </p>
        </div>

        {hasAnyError && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Algunos bloques no pudieron cargarse. Revisa conectividad backend/admin.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {VIEW_OPTIONS.map((view) => (
            <Button
              key={view.id}
              type="button"
              variant={activeView === view.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveView(view.id)}
            >
              {view.label}
            </Button>
          ))}
        </div>

        {activeView === "funnel" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {FUNNEL_WINDOWS.map((item) => (
                <Button
                  key={item.value}
                  variant={funnelWindowDays === item.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFunnelWindowDays(item.value)}
                >
                  {item.label}
                </Button>
              ))}
            </div>

            {funnelQuery.isLoading || !funnel ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
                <Loader2 className="size-4 animate-spin" /> Cargando funnel...
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="kpi-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Visitas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{funnel.totals.visits.toLocaleString("es-DO")}</p>
                    </CardContent>
                  </Card>
                  <Card className="kpi-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Checkout started</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{funnel.totals.checkoutStarted.toLocaleString("es-DO")}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        View → Checkout: {funnel.totals.viewToCheckoutRatePct.toFixed(2)}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="kpi-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Payment approved</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{funnel.totals.paymentApproved.toLocaleString("es-DO")}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Checkout → Pago: {funnel.totals.checkoutToApprovedPaymentRatePct.toFixed(2)}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="kpi-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Payment failed</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{funnel.totals.paymentFailed.toLocaleString("es-DO")}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Failure rate: {funnel.totals.paymentFailureRatePct.toFixed(2)}%
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Serie diaria</CardTitle>
                    <CardDescription>Evolución diaria del funnel comercial.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Día</TableHead>
                          <TableHead>Views</TableHead>
                          <TableHead>Checkout</TableHead>
                          <TableHead>Aprobados</TableHead>
                          <TableHead>Fallidos</TableHead>
                          <TableHead className="text-right">Conv.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {funnel.byDay.map((row) => (
                          <TableRow key={row.date}>
                            <TableCell>{fmtDate(row.date)}</TableCell>
                            <TableCell>{row.eventViewed.toLocaleString("es-DO")}</TableCell>
                            <TableCell>{row.checkoutStarted.toLocaleString("es-DO")}</TableCell>
                            <TableCell>{row.paymentApproved.toLocaleString("es-DO")}</TableCell>
                            <TableCell>{row.paymentFailed.toLocaleString("es-DO")}</TableCell>
                            <TableCell className="text-right">{row.checkoutToApprovedPaymentRatePct.toFixed(2)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {activeView === "supply" && (
          <div className="space-y-4">
            {supplyQuery.isLoading || !supply ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
                <Loader2 className="size-4 animate-spin" /> Cargando supply ops...
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="kpi-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Eventos pendientes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{supply.summary.pendingEvents.toLocaleString("es-DO")}</p>
                    </CardContent>
                  </Card>
                  <Card className="kpi-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Tiempo medio aprobación</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{supply.summary.averageApprovalLeadTimeHours.toFixed(2)}h</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Base: {supply.summary.approvalsMeasured} eventos
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="kpi-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Promoters esperando revisión</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{supply.summary.promotersPendingReview.toLocaleString("es-DO")}</p>
                    </CardContent>
                  </Card>
                  <Card className="kpi-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Tiempo a primer publish</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{supply.summary.averageFirstPublishLeadTimeHours.toFixed(2)}h</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Base: {supply.summary.firstPublishMeasuredPromoters} promoters
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Cola de eventos pendientes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {supply.queue.pendingEvents.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hay eventos pendientes.</p>
                      ) : (
                        supply.queue.pendingEvents.map((event) => (
                          <div key={event.id} className="rounded-md border border-border/70 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium truncate">{event.title}</p>
                              <Badge variant="outline">{Math.round(event.ageHours)}h</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {fmtDate(event.eventDate)} · {event.ownerName ?? "Sin owner"}
                            </p>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Cola de revisión de promoters</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {supply.queue.pendingPromoterApplications.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hay solicitudes pendientes.</p>
                      ) : (
                        supply.queue.pendingPromoterApplications.map((row) => (
                          <div key={row.id} className="rounded-md border border-border/70 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium truncate">{row.email}</p>
                              <Badge variant="outline">{Math.round(row.ageHours)}h</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Enviado: {fmtDate(row.submittedAt)}
                            </p>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        )}

        {activeView === "risk" && (
          <div className="space-y-4">
            {riskQuery.isLoading || !risk ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
                <Loader2 className="size-4 animate-spin" /> Cargando risk ops...
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="kpi-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Pagos fallidos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{risk.summary.paymentFailed.toLocaleString("es-DO")}</p>
                    </CardContent>
                  </Card>
                  <Card className="kpi-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Cancelaciones</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{risk.summary.cancellationsTotal.toLocaleString("es-DO")}</p>
                    </CardContent>
                  </Card>
                  <Card className="kpi-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Auth failures</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{risk.summary.authFailures.toLocaleString("es-DO")}</p>
                    </CardContent>
                  </Card>
                  <Card className="kpi-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Señales de abuso</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{risk.summary.abuseHighRiskCount.toLocaleString("es-DO")}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Pagos fallidos por proveedor</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {risk.paymentFailuresByProvider.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sin datos de fallos.</p>
                      ) : (
                        risk.paymentFailuresByProvider.map((row) => (
                          <div key={row.provider} className="rounded-md border border-border/70 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium">{row.provider}</p>
                              <p className="text-xs text-muted-foreground">{row.failureRatePct.toFixed(2)}%</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {row.failedCount} / {row.totalCount} · {fmtCurrency(row.failedAmount)}
                            </p>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Anomalías por evento</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {risk.anomaliesByEvent.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sin anomalías activas.</p>
                      ) : (
                        risk.anomaliesByEvent.slice(0, 8).map((row) => (
                          <div key={row.eventId} className="rounded-md border border-border/70 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium truncate">{row.eventTitle}</p>
                              <Badge variant={row.highRiskCases > 0 ? "destructive" : "outline"}>
                                Score {row.score}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Casos {row.cases} · Intentos {row.attempts} · High risk {row.highRiskCases}
                            </p>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        )}

        {activeView === "leaderboard" && (
          <div className="space-y-4">
            {leaderboardQuery.isLoading || !leaderboard ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
                <Loader2 className="size-4 animate-spin" /> Cargando leaderboard...
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="kpi-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                        <Wallet className="size-4 text-primary" /> Revenue total
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{fmtCurrency(leaderboard.summary.totalRevenue)}</p>
                    </CardContent>
                  </Card>
                  <Card className="kpi-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                        <Users className="size-4 text-primary" /> Promoters activos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{leaderboard.summary.activePromoters.toLocaleString("es-DO")}</p>
                    </CardContent>
                  </Card>
                  <Card className="kpi-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                        <TrendingUp className="size-4 text-primary" /> Conversión media
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{leaderboard.summary.averageConversionRatePct.toFixed(2)}%</p>
                    </CardContent>
                  </Card>
                  <Card className="kpi-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                        <Clock3 className="size-4 text-primary" /> Velocidad publish
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{leaderboard.summary.averagePublishVelocityHours.toFixed(2)}h</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Promoter leaderboard</CardTitle>
                    <CardDescription>
                      Revenue, tickets vendidos, conversión y velocidad de publicación.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Promoter</TableHead>
                          <TableHead>Revenue</TableHead>
                          <TableHead>Tickets</TableHead>
                          <TableHead>Conversión</TableHead>
                          <TableHead>Eventos</TableHead>
                          <TableHead>Publish rate</TableHead>
                          <TableHead className="text-right">Velocidad</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaderboard.rows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                              Sin datos de leaderboard en la ventana seleccionada.
                            </TableCell>
                          </TableRow>
                        ) : (
                          leaderboard.rows.map((row) => (
                            <TableRow key={row.promoterId}>
                              <TableCell className="font-medium">{row.promoterName}</TableCell>
                              <TableCell>{fmtCurrency(row.revenue)}</TableCell>
                              <TableCell>{row.ticketsSold.toLocaleString("es-DO")}</TableCell>
                              <TableCell>{row.conversionRatePct.toFixed(2)}%</TableCell>
                              <TableCell>{row.eventsCreated.toLocaleString("es-DO")}</TableCell>
                              <TableCell>{row.publishRatePct.toFixed(2)}%</TableCell>
                              <TableCell className="text-right">
                                {row.averagePublishVelocityHours === null
                                  ? "N/D"
                                  : `${row.averagePublishVelocityHours.toFixed(2)}h`}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Estado</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border border-border/70 p-3">
              <p className="text-sm font-medium">Funnel diario</p>
              <p className="text-xs text-muted-foreground mt-1">Views, checkout y pagos reales por día.</p>
            </div>
            <div className="rounded-md border border-border/70 p-3">
              <p className="text-sm font-medium">Supply ops</p>
              <p className="text-xs text-muted-foreground mt-1">SLA de aprobación y cola de onboarding promoter.</p>
            </div>
            <div className="rounded-md border border-border/70 p-3">
              <p className="text-sm font-medium">Risk ops</p>
              <p className="text-xs text-muted-foreground mt-1">Fallos por provider, cancelaciones y abuso.</p>
            </div>
            <div className="rounded-md border border-border/70 p-3">
              <p className="text-sm font-medium">Leaderboard</p>
              <p className="text-xs text-muted-foreground mt-1">Revenue por promoter y velocidad de publicación.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-1.5">
              <ShieldAlert className="size-4 text-primary" /> Ventanas activas
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>Funnel: {funnelWindowDays} día(s)</p>
            <p>Supply: 30 días</p>
            <p>Risk: 7 días · observabilidad 60 min</p>
            <p>Leaderboard: 30 días</p>
          </CardContent>
        </Card>
      </div>
    </PromoterShell>
  );
}
