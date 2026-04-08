"use client";

import { useState } from "react";
import { Loader2, ShieldAlert, TrendingUp, Users, Wallet, Clock3, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
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
  useUpdateEventApproval,
} from "@/lib/queries";
import { useAuthUser } from "@/lib/auth";
import { fmtCurrency, fmtDateShort as fmtDate } from "@/lib/format";
import Link from "next/link";

type RevenueOpsView = "funnel" | "supply" | "risk" | "leaderboard";

const VIEW_OPTIONS: Array<{ id: RevenueOpsView; label: string }> = [
  { id: "funnel", label: "Embudo diario" },
  { id: "supply", label: "Operaciones de suministro" },
  { id: "risk", label: "Operaciones de riesgo" },
  { id: "leaderboard", label: "Ranking de promotores" },
];

const FUNNEL_WINDOWS = [
  { label: "Hoy", value: 1 },
  { label: "7 días", value: 7 },
  { label: "30 días", value: 30 },
];

export default function RevenueOpsPage() {
  const [activeView, setActiveView] = useState<RevenueOpsView>("funnel");
  const [funnelWindowDays, setFunnelWindowDays] = useState(1);

  const user = useAuthUser();
  const authReady = user !== null;

  const [processingId, setProcessingId] = useState<string | null>(null);

  const funnelQuery = useAdminRevenueOpsFunnel(funnelWindowDays, { enabled: authReady });
  const supplyQuery = useAdminRevenueOpsSupply(30, { enabled: authReady });
  const riskQuery = useAdminRevenueOpsRisk(7, 60, { enabled: authReady });
  const leaderboardQuery = useAdminRevenueOpsLeaderboard(30, { enabled: authReady });
  const approvalMutation = useUpdateEventApproval();

  async function handleApproval(id: string, status: "APPROVED" | "REJECTED") {
    setProcessingId(id);
    try {
      await approvalMutation.mutateAsync({ id, status });
      supplyQuery.refetch();
    } finally {
      setProcessingId(null);
    }
  }

  const activeError =
    activeView === "funnel" ? funnelQuery.isError
    : activeView === "supply" ? supplyQuery.isError
    : activeView === "risk" ? riskQuery.isError
    : leaderboardQuery.isError;

  const funnel = funnelQuery.data;
  const supply = supplyQuery.data;
  const risk = riskQuery.data;
  const leaderboard = leaderboardQuery.data;

  return (
    <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Operaciones de ingresos" }]} />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Operaciones de ingresos</h1>
          <p className="text-sm text-muted-foreground">
            Cabina de crecimiento: conversión, suministro, riesgo y rendimiento comercial.
          </p>
        </div>

        {activeError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Error al cargar datos. Revisa conectividad con el backend.
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
                <Loader2 className="size-4 animate-spin" /> Cargando embudo...
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
                      <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Inicios de compra</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{funnel.totals.checkoutStarted.toLocaleString("es-DO")}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Visita → Inicio de compra: {funnel.totals.viewToCheckoutRatePct.toFixed(2)}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="kpi-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Pagos aprobados</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{funnel.totals.paymentApproved.toLocaleString("es-DO")}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Inicio de compra → Pago: {funnel.totals.checkoutToApprovedPaymentRatePct.toFixed(2)}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="kpi-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Pagos fallidos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{funnel.totals.paymentFailed.toLocaleString("es-DO")}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tasa de fallo: {funnel.totals.paymentFailureRatePct.toFixed(2)}%
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
                          <TableHead>Visitas</TableHead>
                          <TableHead>Inicios de compra</TableHead>
                          <TableHead>Aprobados</TableHead>
                          <TableHead>Fallidos</TableHead>
                          <TableHead className="text-right">Conversión</TableHead>
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
                <Loader2 className="size-4 animate-spin" /> Cargando operaciones de suministro...
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
                      <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Promotores esperando revisión</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{supply.summary.promotersPendingReview.toLocaleString("es-DO")}</p>
                    </CardContent>
                  </Card>
                  <Card className="kpi-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Tiempo al primer evento publicado</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{supply.summary.averageFirstPublishLeadTimeHours.toFixed(2)}h</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Base: {supply.summary.firstPublishMeasuredPromoters} promotores
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Cola de eventos pendientes</CardTitle>
                      <CardDescription>Aprueba o rechaza directamente sin salir de esta vista.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {supply.queue.pendingEvents.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hay eventos pendientes.</p>
                      ) : (
                        supply.queue.pendingEvents.map((event) => {
                          const isProcessing = processingId === event.id;
                          return (
                            <div key={event.id} className="rounded-md border border-border/70 p-3 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{event.title}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {fmtDate(event.eventDate)} · {event.ownerName ?? "Sin responsable"}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Badge variant="outline" className="text-xs">{Math.round(event.ageHours)}h</Badge>
                                  <Button
                                    asChild
                                    variant="ghost"
                                    size="icon"
                                    className="size-7"
                                  >
                                    <Link href={`/events/${event.id}`} title="Ver evento completo">
                                      <ExternalLink className="size-3.5" />
                                    </Link>
                                  </Button>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-3 text-xs flex-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                                  disabled={isProcessing}
                                  onClick={() => handleApproval(event.id, "APPROVED")}
                                >
                                  {isProcessing ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : (
                                    <><CheckCircle2 className="size-3.5 mr-1" /> Aprobar</>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-3 text-xs flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                  disabled={isProcessing}
                                  onClick={() => handleApproval(event.id, "REJECTED")}
                                >
                                  {isProcessing ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : (
                                    <><XCircle className="size-3.5 mr-1" /> Rechazar</>
                                  )}
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Cola de revisión de promotores</CardTitle>
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
                <Loader2 className="size-4 animate-spin" /> Cargando operaciones de riesgo...
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
                      <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Fallos de autenticación</CardTitle>
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
                                Puntuación {row.score}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Casos {row.cases} · Intentos {row.attempts} · Alto riesgo {row.highRiskCases}
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
                <Loader2 className="size-4 animate-spin" /> Cargando ranking...
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="kpi-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                        <Wallet className="size-4 text-primary" /> Ingresos totales
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{fmtCurrency(leaderboard.summary.totalRevenue)}</p>
                    </CardContent>
                  </Card>
                  <Card className="kpi-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                        <Users className="size-4 text-primary" /> Promotores activos
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
                        <Clock3 className="size-4 text-primary" /> Velocidad de publicación
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{leaderboard.summary.averagePublishVelocityHours.toFixed(2)}h</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Ranking de promotores</CardTitle>
                    <CardDescription>
                      Ingresos, tickets vendidos, conversión y velocidad de publicación.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Promotor</TableHead>
                          <TableHead>Ingresos</TableHead>
                          <TableHead>Tickets</TableHead>
                          <TableHead>Conversión</TableHead>
                          <TableHead>Eventos</TableHead>
                          <TableHead>Tasa de publicación</TableHead>
                          <TableHead className="text-right">Velocidad</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaderboard.rows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                              Sin datos del ranking en la ventana seleccionada.
                            </TableCell>
                          </TableRow>
                        ) : (
                          leaderboard.rows.map((row) => (
                            <TableRow key={row.promoterId}>
                              <TableCell className="font-medium">
                                <Link
                                  href={`/promoters/${row.promoterId}`}
                                  className="hover:text-primary hover:underline transition-colors"
                                >
                                  {row.promoterName}
                                </Link>
                              </TableCell>
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
              <p className="text-sm font-medium">Embudo diario</p>
              <p className="text-xs text-muted-foreground mt-1">Visitas, inicios de compra y pagos reales por día.</p>
            </div>
            <div className="rounded-md border border-border/70 p-3">
              <p className="text-sm font-medium">Operaciones de suministro</p>
              <p className="text-xs text-muted-foreground mt-1">SLA de aprobación y cola de incorporación de promotores.</p>
            </div>
            <div className="rounded-md border border-border/70 p-3">
              <p className="text-sm font-medium">Operaciones de riesgo</p>
              <p className="text-xs text-muted-foreground mt-1">Fallos por proveedor, cancelaciones y abuso.</p>
            </div>
            <div className="rounded-md border border-border/70 p-3">
              <p className="text-sm font-medium">Ranking</p>
              <p className="text-xs text-muted-foreground mt-1">Ingresos por promotor y velocidad de publicación.</p>
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
            <p>Embudo: {funnelWindowDays} día(s)</p>
            <p>Suministro: 30 días</p>
            <p>Riesgo: 7 días · observabilidad 60 min</p>
            <p>Ranking: 30 días</p>
          </CardContent>
        </Card>
      </div>
    </PromoterShell>
  );
}
