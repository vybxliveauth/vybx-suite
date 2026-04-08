"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  TrendingUp,
  Ticket,
  CalendarCheck,
  ArrowUpRight,
  AlertCircle,
  Loader2,
  MapPin,
  Clock,
  ChevronDown,
  CheckCircle2,
  CircleDashed,
  ScanLine,
  Users,
  FilePlus2,
  ClipboardCheck,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Button,
} from "@vybx/ui";
import { PromoterShell } from "@/components/layout/PromoterShell";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { useDashboard, useEvents, useEventCharts, usePromoterProfile } from "@/lib/queries";
import { useAuthUser } from "@/lib/auth";
import { getEventStatusBadge, getPublicationFeedback } from "@/lib/event-status";
import type { Event, PromoterApplicationStatus } from "@/lib/types";

// ── Constants ────────────────────────────────────────────────────────────────

const PURPLE      = "hsl(262.1 83.3% 57.8%)";
const CYAN        = "#22d3ee";
const MUTED_CLR   = "hsl(217.9 10.6% 54.9%)";
const GRID_CLR    = "hsl(215 27.9% 16.9%)";
const TOOLTIP_STY = {
  background: "hsl(224 71.4% 6%)",
  border: `1px solid ${GRID_CLR}`,
  borderRadius: "0.5rem",
  fontSize: 12,
};
const RANGES = [
  { label: "7d",  value: 7  },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

type EventWithLifecycle = Event & {
  createdAt?: string | null;
  updatedAt?: string | null;
  approvedAt?: string | null;
  publishedAt?: string | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency", currency: "MXN", maximumFractionDigits: 0,
  }).format(n);
}

function fmtShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-DO", { month: "short", day: "numeric" });
}

function fmtHour(h: number) {
  const suffix = h < 12 ? "am" : "pm";
  const d = h % 12 === 0 ? 12 : h % 12;
  return `${d}${suffix}`;
}

function hourColor(count: number, max: number) {
  if (max === 0) return MUTED_CLR;
  const r = count / max;
  if (r >= 0.75) return "#f43f5e";
  if (r >= 0.45) return "#f59e0b";
  return PURPLE;
}

function parseIsoMs(input?: string | null): number | null {
  if (!input || input.trim().length === 0) return null;
  const ms = Date.parse(input);
  return Number.isFinite(ms) ? ms : null;
}

function fmtLeadHours(hours: number | null): string {
  if (hours === null) return "N/D";
  if (hours < 1) return "< 1h";
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = hours / 24;
  if (days < 7) return `${days.toFixed(1)} días`;
  const weeks = days / 7;
  return `${weeks.toFixed(1)} sem`;
}

function resolveAccountReviewState(
  status: PromoterApplicationStatus | undefined,
  pendingEventsCount: number,
  rejectedEventsCount: number,
  approvedEventsCount: number,
): { label: string; detail: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (status === "PENDING_APPROVAL") {
    return {
      label: "Cuenta en revisión",
      detail: "Tu perfil de promotor está siendo revisado por el equipo.",
      variant: "outline",
    };
  }
  if (status === "REJECTED") {
    return {
      label: "Cuenta con ajustes",
      detail: "Actualiza tu perfil para continuar con la publicación.",
      variant: "destructive",
    };
  }
  if (status === "APPROVED") {
    return {
      label: "Cuenta aprobada",
      detail: "Puedes crear, publicar y vender eventos normalmente.",
      variant: "default",
    };
  }
  if (rejectedEventsCount > 0) {
    return {
      label: "Eventos con observaciones",
      detail: "Tienes eventos rechazados que requieren corrección.",
      variant: "destructive",
    };
  }
  if (pendingEventsCount > 0) {
    return {
      label: "Eventos en revisión",
      detail: "Tu publicación está en cola de aprobación.",
      variant: "outline",
    };
  }
  if (approvedEventsCount > 0) {
    return {
      label: "Publicación activa",
      detail: "Ya tienes eventos publicados y vendiendo.",
      variant: "default",
    };
  }
  return {
    label: "Listo para empezar",
    detail: "Completa el checklist para publicar tu primer evento.",
    variant: "secondary",
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [days, setDays]           = useState(30);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [showEventPicker, setShowEventPicker] = useState(false);

  const authUser = useAuthUser();
  const { data: promoterProfile } = usePromoterProfile();
  const { data: dashData, isLoading: dashLoading, isError: dashError } = useDashboard();
  const { data: eventsData } = useEvents(1, 50);

  // Pick first event with sales by default
  const events = useMemo(
    () => (eventsData?.data ?? []) as EventWithLifecycle[],
    [eventsData?.data],
  );
  const activeEventId = selectedEvent ?? events[0]?.id ?? null;

  const { data: charts, isLoading: chartsLoading } = useEventCharts(
    activeEventId ?? "",
    days,
  );

  const activeEventTitle = events.find((e) => e.id === activeEventId)?.title ?? "Selecciona un evento";

  const latestEvent = useMemo(() => {
    if (events.length === 0) return null;
    return [...events].sort((a, b) => {
      const bMs = parseIsoMs(b.createdAt ?? b.updatedAt ?? b.date) ?? 0;
      const aMs = parseIsoMs(a.createdAt ?? a.updatedAt ?? a.date) ?? 0;
      return bMs - aMs;
    })[0] ?? null;
  }, [events]);

  const approvedEventsCount = useMemo(
    () => events.filter((event) => event.status === "APPROVED").length,
    [events],
  );
  const pendingEventsCount = useMemo(
    () => events.filter((event) => event.status === "PENDING").length,
    [events],
  );
  const rejectedEventsCount = useMemo(
    () => events.filter((event) => event.status === "REJECTED").length,
    [events],
  );

  const firstPublishedLeadHours = useMemo(() => {
    const publishedCandidates = events
      .map((event) => ({
        createdMs: parseIsoMs(event.createdAt),
        publishedMs: parseIsoMs(event.publishedAt ?? event.approvedAt ?? event.updatedAt),
      }))
      .filter((event): event is { createdMs: number; publishedMs: number } => (
        event.createdMs !== null && event.publishedMs !== null && event.publishedMs >= event.createdMs
      ))
      .sort((a, b) => a.publishedMs - b.publishedMs);

    const first = publishedCandidates[0];
    if (!first) return null;
    return (first.publishedMs - first.createdMs) / (1000 * 60 * 60);
  }, [events]);

  const profileSource = promoterProfile ?? authUser;
  const profileReady = Boolean(
    (profileSource?.firstName ?? "").trim().length > 0 &&
    (profileSource?.email ?? "").trim().length > 0,
  );

  const onboardingSteps = [
    {
      id: "profile",
      title: "Completa tu perfil",
      detail: "Datos de cuenta y contacto listos para operar.",
      done: profileReady,
      href: "/settings",
      cta: profileReady ? "Editar perfil" : "Completar perfil",
    },
    {
      id: "event",
      title: "Crea tu primer evento",
      detail: "Define fecha, boletos y detalles del show.",
      done: events.length > 0,
      href: "/events/new",
      cta: events.length > 0 ? "Crear otro evento" : "Crear evento",
    },
    {
      id: "publish",
      title: "Publica tu primer evento",
      detail: "Cuando esté aprobado, comienzas a vender.",
      done: approvedEventsCount > 0,
      href: latestEvent ? `/events/${latestEvent.id}` : "/events/new",
      cta: approvedEventsCount > 0 ? "Ver evento publicado" : "Ver estado de revisión",
    },
  ] as const;

  const onboardingCompleted = onboardingSteps.filter((step) => step.done).length;
  const onboardingProgressPct = Math.round((onboardingCompleted / onboardingSteps.length) * 100);

  const accountReview = resolveAccountReviewState(
    promoterProfile?.promoterApplicationStatus,
    pendingEventsCount,
    rejectedEventsCount,
    approvedEventsCount,
  );

  const latestPublicationFeedback = latestEvent ? getPublicationFeedback(latestEvent) : null;
  const latestPublicationBadge = latestEvent
    ? getEventStatusBadge(latestEvent, { pendingLabel: "Pendiente aprobación" })
    : null;

  // ── Loading / error states ────────────────────────────────────────────────
  if (dashLoading) {
    return (
      <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Centro de mando" }]} />}>
        <div className="flex items-center justify-center py-32 text-muted-foreground gap-2">
          <Loader2 className="size-5 animate-spin" /> Cargando dashboard…
        </div>
      </PromoterShell>
    );
  }

  if (dashError || !dashData) {
    return (
      <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Centro de mando" }]} />}>
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-muted-foreground">
          <AlertCircle className="size-10 opacity-40" />
          <p className="text-sm">No se pudieron cargar los datos del dashboard.</p>
        </div>
      </PromoterShell>
    );
  }

  const { summary, topEvents } = dashData;

  const kpis = [
    {
      label: "Ingresos totales",
      value: fmtCurrency(summary.grossRevenue),
      icon: TrendingUp,
      sub: `${summary.successfulPayments} pagos exitosos`,
    },
    {
      label: "Boletos vendidos",
      value: summary.soldTickets.toLocaleString("es-DO"),
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
      label: "Pendientes / Reembolsos",
      value: String(summary.pendingEvents),
      icon: AlertCircle,
      sub:
        summary.refundRequestsPending > 0
          ? `${summary.refundRequestsPending} reembolsos pendientes`
          : "Sin reembolsos pendientes",
    },
  ];

  const maxHour = charts
    ? Math.max(...charts.ticketsByHour.map((h) => h.count), 0)
    : 0;

  return (
    <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Centro de mando" }]} />}>
      <div className="space-y-6">

        {/* Title */}
        <div>
          <h1 className="text-xl font-semibold">Centro de mando</h1>
          <p className="text-sm text-muted-foreground">Resumen de ventas, publicación y operación diaria</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="xl:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ClipboardCheck className="size-4 text-primary" />
                Onboarding del promotor
              </CardTitle>
              <CardDescription>
                Objetivo: pasar de alta a primer evento publicado y cobrando lo más rápido posible.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border/70 bg-card/40 p-3">
                  <p className="text-xs text-muted-foreground">Checklist completado</p>
                  <p className="text-xl font-semibold tabular-nums mt-1">
                    {onboardingCompleted}/{onboardingSteps.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{onboardingProgressPct}% de avance</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-card/40 p-3">
                  <p className="text-xs text-muted-foreground">Tiempo a primer evento publicado</p>
                  <p className="text-xl font-semibold tabular-nums mt-1">{fmtLeadHours(firstPublishedLeadHours)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    KPI principal de activación para promotores nuevos.
                  </p>
                </div>
              </div>

              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500"
                  style={{ width: `${onboardingProgressPct}%` }}
                />
              </div>

              <div className="space-y-2.5">
                {onboardingSteps.map((step) => (
                  <div
                    key={step.id}
                    className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 ${
                      step.done ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/70 bg-card/40"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium flex items-center gap-2">
                        {step.done ? (
                          <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                        ) : (
                          <CircleDashed className="size-4 text-muted-foreground shrink-0" />
                        )}
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>
                    </div>
                    <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs shrink-0">
                      <Link href={step.href}>{step.cta}</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Revisión y publicación</CardTitle>
              <CardDescription>Estado actual y accesos rápidos de operación.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border/70 bg-card/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">Revisión de cuenta</p>
                  <Badge variant={accountReview.variant}>{accountReview.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">{accountReview.detail}</p>
                {promoterProfile?.promoterApplicationFeedback && (
                  <p className="text-xs text-amber-300 mt-2">
                    Feedback: {promoterProfile.promoterApplicationFeedback}
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-border/70 bg-card/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">Último resultado de publicación</p>
                  {latestPublicationBadge ? (
                    <Badge variant={latestPublicationBadge.variant}>{latestPublicationBadge.label}</Badge>
                  ) : (
                    <Badge variant="secondary">Sin eventos</Badge>
                  )}
                </div>
                <p className="text-sm font-medium mt-1">
                  {latestPublicationFeedback?.title ?? "Crea tu primer evento para iniciar revisión"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {latestPublicationFeedback?.detail ?? "Te guiaremos paso a paso desde el checklist."}
                </p>
              </div>

              <div className="rounded-lg border border-border/70 bg-card/40 p-3">
                <p className="text-xs text-muted-foreground">Ventas y cobros confirmados</p>
                <p className="text-sm font-semibold mt-1">
                  {summary.successfulPayments.toLocaleString("es-DO")} pagos · {fmtCurrency(summary.grossRevenue)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Reembolsos pendientes: {summary.refundRequestsPending.toLocaleString("es-DO")}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button asChild variant="outline" size="sm" className="justify-start">
                  <Link href="/events/new">
                    <FilePlus2 className="size-4" /> Nuevo evento
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="justify-start">
                  <Link href="/sales">
                    <TrendingUp className="size-4" /> Ver ventas
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="justify-start">
                  <Link href="/staff">
                    <Users className="size-4" /> Gestionar personal
                  </Link>
                </Button>
                {activeEventId ? (
                  <Button asChild variant="outline" size="sm" className="justify-start">
                    <Link href={`/scan/${activeEventId}`}>
                      <ScanLine className="size-4" /> Escanear boletos
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="justify-start" disabled>
                    <ScanLine className="size-4" /> Escanear boletos
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── KPI Cards ──────────────────────────────────────────────────── */}
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
                    <ArrowUpRight className="size-3" />{sub}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Event picker + range ────────────────────────────────────────── */}
        {events.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            {/* Event selector */}
            <div className="relative">
              <button
                onClick={() => setShowEventPicker((p) => !p)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/30 text-sm font-medium hover:bg-muted/60 transition-colors max-w-[260px] truncate"
              >
                <span className="truncate">{activeEventTitle}</span>
                <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
              </button>
              {showEventPicker && (
                <div className="absolute top-full left-0 mt-1 z-50 w-72 rounded-xl border border-border bg-background shadow-xl overflow-hidden">
                  <div className="max-h-56 overflow-y-auto p-1">
                    {events.map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => { setSelectedEvent(ev.id); setShowEventPicker(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          ev.id === activeEventId
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted/60 text-foreground"
                        }`}
                      >
                        <p className="truncate font-medium">{ev.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(ev.date).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Range selector */}
            <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setDays(r.value)}
                  className={`px-3 py-1.5 transition-colors ${
                    days === r.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {activeEventId && (
              <Link
                href={`/events/${activeEventId}`}
                className="text-xs text-primary hover:underline ml-auto"
              >
                Ver evento completo →
              </Link>
            )}
          </div>
        )}

        {/* ── Revenue + Tickets per day ──────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              <CardTitle className="text-sm">Ingresos y boletos por día</CardTitle>
            </div>
            <CardDescription className="text-xs">
              {activeEventId && charts
                ? `${fmtCurrency(charts.revenueByDay.reduce((s, d) => s + d.revenue, 0))} en últimos ${days} días`
                : events.length === 0
                ? "Crea tu primer evento para ver datos"
                : "Selecciona un evento"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartsLoading ? (
              <div className="flex items-center justify-center h-[240px] text-muted-foreground gap-2">
                <Loader2 className="size-4 animate-spin" /> Cargando…
              </div>
            ) : charts ? (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={charts.revenueByDay} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashRevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={PURPLE} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={PURPLE} stopOpacity={0}   />
                      </linearGradient>
                      <linearGradient id="dashTixGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={CYAN}   stopOpacity={0.25} />
                        <stop offset="95%" stopColor={CYAN}   stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_CLR} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={fmtShortDate}
                      tick={{ fontSize: 11, fill: MUTED_CLR }}
                      axisLine={false} tickLine={false}
                      interval={days <= 7 ? 0 : days <= 30 ? 4 : 13}
                    />
                    <YAxis
                      yAxisId="rev"
                      tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
                      tick={{ fontSize: 11, fill: MUTED_CLR }}
                      axisLine={false} tickLine={false} width={46}
                    />
                    <YAxis
                      yAxisId="tix"
                      orientation="right"
                      tick={{ fontSize: 11, fill: MUTED_CLR }}
                      axisLine={false} tickLine={false} width={28}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STY}
                      labelFormatter={(l) => typeof l === "string" ? fmtShortDate(l) : String(l)}
                      formatter={(v, name) => {
                        const num = Number(v ?? 0);
                        const key = String(name);
                        return [key === "revenue" ? fmtCurrency(num) : `${num} boletos`, key === "revenue" ? "Ingresos" : "Boletos"];
                      }}
                    />
                    <Area yAxisId="rev" type="monotone" dataKey="revenue"
                      stroke={PURPLE} strokeWidth={2} fill="url(#dashRevGrad)" dot={false} />
                    <Area yAxisId="tix" type="monotone" dataKey="tickets"
                      stroke={CYAN} strokeWidth={1.5} fill="url(#dashTixGrad)" dot={false} strokeDasharray="4 2" />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex gap-5 mt-2 justify-end text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-5 h-0.5 rounded" style={{ background: PURPLE }} /> Ingresos
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-5 border-t border-dashed" style={{ borderColor: CYAN }} /> Boletos
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">
                Sin datos disponibles
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Bottom row: Hour heatmap + Geo ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Tickets per hour */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                <CardTitle className="text-sm">Ventas por hora del día</CardTitle>
              </div>
              <CardDescription className="text-xs">Identifica picos de demanda (hora UTC)</CardDescription>
            </CardHeader>
            <CardContent>
              {chartsLoading ? (
                <div className="flex items-center justify-center h-[160px] text-muted-foreground gap-2">
                  <Loader2 className="size-4 animate-spin" />
                </div>
              ) : charts && charts.ticketsByHour.some((h) => h.count > 0) ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={charts.ticketsByHour} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <XAxis
                      dataKey="hour"
                      tickFormatter={fmtHour}
                      tick={{ fontSize: 10, fill: MUTED_CLR }}
                      axisLine={false} tickLine={false}
                      interval={2}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: MUTED_CLR }}
                      axisLine={false} tickLine={false} width={22}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STY}
                      labelFormatter={(h) => `${fmtHour(Number(h))} — ${fmtHour(Number(h) + 1)}`}
                      formatter={(v) => [`${v} ventas`, "Boletos"]}
                    />
                    <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={24}>
                      {charts.ticketsByHour.map((entry, i) => (
                        <Cell key={i} fill={hourColor(entry.count, maxHour)} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[160px] text-muted-foreground text-xs">
                  Sin datos en el período
                </div>
              )}
            </CardContent>
          </Card>

          {/* Geo heat list */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                <CardTitle className="text-sm">Top ciudades de compradores</CardTitle>
              </div>
              <CardDescription className="text-xs">Basado en perfil de usuario</CardDescription>
            </CardHeader>
            <CardContent>
              {chartsLoading ? (
                <div className="flex items-center justify-center h-[160px] text-muted-foreground gap-2">
                  <Loader2 className="size-4 animate-spin" />
                </div>
              ) : charts && charts.topLocations.length > 0 ? (
                <div className="space-y-2.5 py-1">
                  {charts.topLocations.slice(0, 7).map(({ location, buyers }, i) => {
                    const max = charts.topLocations[0]?.buyers ?? 1;
                    const pct = Math.round((buyers / max) * 100);
                    const opacity = 0.2 + (pct / 100) * 0.65;
                    return (
                      <div key={location} className="flex items-center gap-2.5">
                        <span className="text-xs text-muted-foreground w-3.5 text-right tabular-nums shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-medium truncate">{location}</span>
                            <span className="text-xs text-muted-foreground tabular-nums ml-2 shrink-0">{buyers}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div style={{ width: `${pct}%`, height: "100%", borderRadius: 9999, background: `rgba(124,58,237,${opacity})`, transition: "width 0.5s ease" }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[160px] text-xs text-muted-foreground text-center px-4">
                  Sin datos geográficos. Los compradores deben completar su perfil de ubicación.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Top Events table ────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Top eventos por ingreso</CardTitle>
            <CardDescription>Rendimiento global de tus eventos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aún no hay eventos con ventas.</p>
            ) : (
              topEvents.map((ev, i) => (
                <Link
                  key={ev.eventId}
                  href={`/events/${ev.eventId}`}
                  className="flex items-center gap-3 group rounded-lg px-2 py-1.5 -mx-2 hover:bg-muted/40 transition-colors"
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {ev.soldTickets.toLocaleString("es-DO")} boletos · {ev.successfulPayments} pagos
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 font-mono text-xs">
                    {fmtCurrency(ev.revenue)}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

      </div>
    </PromoterShell>
  );
}
