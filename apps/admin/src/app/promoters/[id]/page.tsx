"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  ShieldAlert,
  Ticket,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
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
  useAdminEvents,
  useAdminRevenueOpsLeaderboard,
  usePromoterApplications,
  usePromoters,
} from "@/lib/queries";
import { fmtCurrency, fmtDate } from "@/lib/format";
import type { PromoterApplicationStatus } from "@/lib/types";

// ── Helpers ────────────────────────────────────────────────────────────────────

function displayName(input: { firstName?: string | null; lastName?: string | null; email: string }) {
  const full = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();
  return full || input.email;
}

function statusBadge(status?: PromoterApplicationStatus) {
  if (status === "APPROVED") {
    return <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-400/30">Aprobado</Badge>;
  }
  if (status === "REJECTED") {
    return <Badge variant="destructive">Rechazado</Badge>;
  }
  return (
    <Badge variant="outline" className="text-amber-300 border-amber-400/40 bg-amber-500/10">
      Pendiente
    </Badge>
  );
}

function eventStatusBadge(status: string) {
  if (status === "APPROVED") return <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-400/30 text-xs">Aprobado</Badge>;
  if (status === "REJECTED") return <Badge variant="destructive" className="text-xs">Rechazado</Badge>;
  return <Badge variant="outline" className="text-amber-300 border-amber-400/40 bg-amber-500/10 text-xs">Pendiente</Badge>;
}

function riskColor(level?: "low" | "medium" | "high") {
  if (level === "high") return "text-red-400";
  if (level === "medium") return "text-amber-400";
  return "text-emerald-400";
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PromoterDetailPage() {
  const { id } = useParams<{ id: string }>();

  const promotersQuery   = usePromoters();
  const applicationsQuery = usePromoterApplications("ALL");
  const leaderboardQuery = useAdminRevenueOpsLeaderboard(30);
  const eventsQuery      = useAdminEvents(1, 100);

  const promoter = useMemo(
    () => (promotersQuery.data?.data ?? []).find((p) => p.id === id) ?? null,
    [promotersQuery.data, id]
  );

  const application = useMemo(
    () => (applicationsQuery.data?.data ?? []).find((a) => a.id === id) ?? null,
    [applicationsQuery.data, id]
  );

  const leaderboardRow = useMemo(
    () => (leaderboardQuery.data?.rows ?? []).find((r) => r.promoterId === id) ?? null,
    [leaderboardQuery.data, id]
  );

  const promoterEvents = useMemo(
    () => (eventsQuery.data?.data ?? []).filter((e) => e.ownerId === id),
    [eventsQuery.data, id]
  );

  const isLoading = promotersQuery.isLoading;
  const name = promoter ? displayName(promoter) : application ? displayName(application) : "Cargando...";

  if (isLoading) {
    return (
      <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Promotores", href: "/promoters" }, { label: "Cargando..." }]} />}>
        <div className="flex items-center justify-center py-32 text-muted-foreground gap-2">
          <Loader2 className="size-5 animate-spin" /> Cargando promotor…
        </div>
      </PromoterShell>
    );
  }

  if (!promoter && !application) {
    return (
      <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Promotores", href: "/promoters" }, { label: "No encontrado" }]} />}>
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-muted-foreground">
          <AlertCircle className="size-10 opacity-40" />
          <p className="text-sm">Promotor no encontrado</p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/promoters"><ArrowLeft className="size-3.5 mr-1" /> Volver</Link>
          </Button>
        </div>
      </PromoterShell>
    );
  }

  const kyc = application?.kyc;
  const payoutMethod = (promoter ?? application)?.promoterPayoutMethod;
  const bankMasked = (promoter ?? application)?.promoterBankAccountMasked;
  const appStatus = (promoter ?? application)?.promoterApplicationStatus;

  const totalRevenue = leaderboardRow?.revenue ?? 0;
  const ticketsSold = leaderboardRow?.ticketsSold ?? 0;
  const conversionPct = leaderboardRow?.conversionRatePct ?? 0;
  const eventsCreated = leaderboardRow?.eventsCreated ?? promoterEvents.length;

  const approvedEvents = promoterEvents.filter((e) => e.status === "APPROVED").length;
  const pendingEvents  = promoterEvents.filter((e) => e.status === "PENDING").length;

  return (
    <PromoterShell
      breadcrumb={
        <PageBreadcrumb items={[{ label: "Promotores", href: "/promoters" }, { label: name }]} />
      }
    >
      <div className="space-y-6">

        {/* Back + header */}
        <div className="flex items-start gap-4 flex-wrap">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/promoters"><ArrowLeft className="size-3.5 mr-1" /> Todos los promotores</Link>
          </Button>
        </div>

        {/* Profile hero */}
        <div className="rounded-xl border border-border bg-muted/20 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 border border-primary/20 shrink-0">
            <span className="text-2xl font-bold text-primary">
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">{name}</h1>
              {statusBadge(appStatus)}
              {kyc?.riskLevel && (
                <Badge variant="outline" className={`text-xs ${riskColor(kyc.riskLevel)}`}>
                  Riesgo {kyc.riskLevel === "low" ? "bajo" : kyc.riskLevel === "medium" ? "medio" : "alto"}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {(promoter ?? application)?.email}
            </p>
            {application?.promoterLegalName && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Building2 className="size-3" /> {application.promoterLegalName}
              </p>
            )}
          </div>
          <div className="shrink-0 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/promoters?q=${encodeURIComponent((promoter ?? application)?.email ?? "")}`}>
                <ExternalLink className="size-3.5 mr-1" /> Ver en lista
              </Link>
            </Button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Ingresos (30d)", value: fmtCurrency(totalRevenue), icon: TrendingUp, color: "text-primary" },
            { label: "Boletos vendidos", value: ticketsSold.toLocaleString("es-DO"), icon: Ticket, color: "text-cyan-400" },
            { label: "Conversión", value: `${conversionPct.toFixed(2)}%`, icon: CreditCard, color: "text-emerald-400" },
            { label: "Eventos creados", value: eventsCreated.toLocaleString("es-DO"), icon: Users, color: "text-amber-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="kpi-card">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</CardTitle>
                <Icon className={`size-4 ${color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Body: 2-col layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT — events table */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Eventos del promotor</CardTitle>
                <CardDescription>
                  {approvedEvents} aprobados · {pendingEvents} pendientes · {promoterEvents.length} total
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Evento</TableHead>
                      <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventsQuery.isLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={4} className="py-3">
                            <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : promoterEvents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                          Este promotor no tiene eventos registrados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      promoterEvents.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell>
                            <p className="font-medium text-sm truncate max-w-[200px]">{event.title}</p>
                            {event.location && (
                              <p className="text-xs text-muted-foreground truncate">{event.location}</p>
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                            {fmtDate(event.date)}
                          </TableCell>
                          <TableCell>{eventStatusBadge(event.status)}</TableCell>
                          <TableCell className="text-right">
                            <Button asChild variant="ghost" size="icon" className="size-7">
                              <Link href={`/events/${event.id}`}>
                                <ExternalLink className="size-3.5" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Leaderboard extra stats */}
            {leaderboardRow && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Métricas de rendimiento (30 días)</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Checkouts completados</p>
                    <p className="text-lg font-semibold tabular-nums">{leaderboardRow.checkoutCompleted.toLocaleString("es-DO")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tasa de publicación</p>
                    <p className="text-lg font-semibold tabular-nums">{leaderboardRow.publishRatePct.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vel. primer evento</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {leaderboardRow.firstPublishLeadHours != null
                        ? `${leaderboardRow.firstPublishLeadHours.toFixed(1)}h`
                        : "N/D"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vel. publicación media</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {leaderboardRow.averagePublishVelocityHours != null
                        ? `${leaderboardRow.averagePublishVelocityHours.toFixed(1)}h`
                        : "N/D"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT — KYC + payout */}
          <div className="space-y-6">

            {/* KYC card */}
            {kyc ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BadgeCheck className="size-4 text-primary" /> KYC / Verificación
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Score de completitud</span>
                    <span className={`font-semibold ${kyc.completenessScore >= 80 ? "text-emerald-400" : kyc.completenessScore >= 50 ? "text-amber-400" : "text-red-400"}`}>
                      {kyc.completenessScore}%
                    </span>
                  </div>
                  <Separator />
                  {[
                    { label: "Nombre legal", ok: kyc.legalNamePresent },
                    { label: "Documento ID", ok: kyc.documentIdPresent },
                    { label: "Instagram", ok: kyc.instagramPresent },
                    { label: "Descripción de evento", ok: kyc.eventDescriptionPresent },
                  ].map(({ label, ok }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{label}</span>
                      {ok
                        ? <CheckCircle2 className="size-4 text-emerald-400" />
                        : <XCircle className="size-4 text-muted-foreground/40" />
                      }
                    </div>
                  ))}
                  {kyc.riskFlags.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <ShieldAlert className="size-3.5 text-amber-400" /> Señales de riesgo
                        </p>
                        <ul className="space-y-1">
                          {kyc.riskFlags.map((flag: string) => (
                            <li key={flag} className="text-xs text-amber-300">• {flag}</li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BadgeCheck className="size-4 text-muted-foreground" /> KYC
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Sin datos de KYC disponibles.</p>
                </CardContent>
              </Card>
            )}

            {/* Payout info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="size-4 text-primary" /> Método de pago
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Método</span>
                  <span className="font-medium">{payoutMethod ?? "No configurado"}</span>
                </div>
                {bankMasked && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Cuenta</span>
                    <span className="font-mono text-xs">{bankMasked}</span>
                  </div>
                )}
                {(promoter ?? application)?.promoterBankVerifiedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Verificado</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="size-3.5" />
                      {fmtDate((promoter ?? application)!.promoterBankVerifiedAt!)}
                    </span>
                  </div>
                )}
                {(promoter ?? application)?.promoterBankVerificationNotes && (
                  <p className="text-xs text-muted-foreground mt-2 p-2 rounded bg-muted/30 border border-border/50">
                    {(promoter ?? application)?.promoterBankVerificationNotes}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Application timeline */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="size-4 text-primary" /> Línea de tiempo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Registro</span>
                  <span>{fmtDate((promoter ?? application)?.createdAt ?? "")}</span>
                </div>
                {(promoter ?? application)?.promoterApplicationSubmittedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Solicitud enviada</span>
                    <span>{fmtDate((promoter ?? application)!.promoterApplicationSubmittedAt!)}</span>
                  </div>
                )}
                {(promoter ?? application)?.promoterApplicationReviewedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Revisado</span>
                    <span>{fmtDate((promoter ?? application)!.promoterApplicationReviewedAt!)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Description */}
            {application?.promoterEventDescription && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Descripción de eventos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {application.promoterEventDescription}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PromoterShell>
  );
}
