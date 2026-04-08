"use client";

import { useEffect, useState } from "react";
import { fmtCurrency, fmtDateLong } from "@/lib/format";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Pencil,
  Trash2,
  CalendarDays,
  MapPin,
  Ticket,
  TrendingUp,
  Users,
  Loader2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Copy,
  Clock,
  Tag,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  CircleDot,
  ExternalLink,
} from "lucide-react";
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Separator,
} from "@vybx/ui";
import { PromoterShell } from "@/components/layout/PromoterShell";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { useAdminActionDialog } from "@/components/shared/use-admin-action-dialog";
import { useEventDetail, useEventAnalytics, useToggleEvent, useDuplicateEvent, useDeleteEvent, useUpdateEventApproval } from "@/lib/queries";
import type { EventDetail, EventStatus } from "@/lib/types";

// ── Helpers ────────────────────────────────────────────────────────────────────
function getStatusBadge(ev: EventDetail): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (!ev.isActive && ev.status === "APPROVED") return { label: "Inactivo", variant: "secondary" };
  const map: Record<EventStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    APPROVED: { label: "Publicado", variant: "default" },
    PENDING:  { label: "Pendiente aprobación", variant: "outline" },
    REJECTED: { label: "Rechazado", variant: "destructive" },
  };
  return map[ev.status];
}

function useCountdown(targetIso: string) {
  const [diff, setDiff] = useState(new Date(targetIso).getTime() - Date.now());
  useEffect(() => {
    const t = setInterval(() => setDiff(new Date(targetIso).getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [targetIso]);
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hrs  = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return { days, hrs, mins, secs };
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center bg-muted/40 border border-border rounded-lg px-3 py-2 min-w-[52px]">
      <span className="text-xl font-bold tabular-nums leading-none">{String(value).padStart(2, "0")}</span>
      <span className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">{label}</span>
    </div>
  );
}

function OccupancyBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const color = pct >= 90 ? "#f43f5e" : pct >= 65 ? "#f59e0b" : "hsl(var(--primary))";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">{value} / {max}</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: 9999, transition: "width 0.6s ease" }}
        />
      </div>
      <p className="text-right text-xs text-muted-foreground">{pct}% ocupado</p>
    </div>
  );
}

const CHART_COLORS = ["hsl(var(--primary))", "#22d3ee", "#34d399"];
const CHART_TICK_COLOR = "hsl(var(--muted-foreground))";
const CHART_TOOLTIP_BG = "hsl(var(--popover))";
const CHART_TOOLTIP_BORDER = "1px solid hsl(var(--border))";
const CHART_VOLUME_COLOR = "hsl(var(--secondary-foreground) / 0.35)";

// ── Page ───────────────────────────────────────────────────────────────────────
export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [approvalProcessing, setApprovalProcessing] = useState(false);
  const actionDialog = useAdminActionDialog();

  const eventQuery      = useEventDetail(id);
  const analyticsQuery  = useEventAnalytics(id);
  const toggleEvent     = useToggleEvent();
  const duplicateEvent  = useDuplicateEvent();
  const deleteEvent     = useDeleteEvent();
  const approvalMutation = useUpdateEventApproval();

  const event     = eventQuery.data ?? null;
  const analytics = analyticsQuery.data ?? null;
  const loading   = eventQuery.isLoading || analyticsQuery.isLoading;

  const countdown = useCountdown(event?.date ?? new Date().toISOString());

  function handleCopyLink() {
    if (!event) return;
    navigator.clipboard.writeText(`${window.location.origin}/events/${event.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleToggleActive() {
    if (!event) return;
    toggleEvent.mutate({ id: event.id, isActive: !event.isActive });
  }

  async function handleDuplicate() {
    if (!event) return;
    duplicateEvent.mutate(event.id, {
      onSuccess: (cloned) => router.push(`/events/${cloned.id}`),
    });
  }

  async function handleDelete() {
    if (!event) return;
    const confirmed = await actionDialog.confirm({
      title: "Eliminar evento",
      description: `¿Eliminar "${event.title}"? Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      tone: "destructive",
    });
    if (!confirmed) return;
    deleteEvent.mutate(event.id, {
      onSuccess: () => router.push("/events"),
    });
  }

  async function handleApproval(status: "APPROVED" | "REJECTED") {
    if (!event) return;
    const confirmed = await actionDialog.confirm({
      title: status === "APPROVED" ? "Aprobar evento" : "Rechazar evento",
      description: status === "APPROVED"
        ? `¿Aprobar "${event.title}"? El evento se hará visible al público si el promotor lo activa.`
        : `¿Rechazar "${event.title}"? El promotor será notificado.`,
      confirmLabel: status === "APPROVED" ? "Aprobar" : "Rechazar",
      tone: status === "APPROVED" ? "default" : "destructive",
    });
    if (!confirmed) return;
    setApprovalProcessing(true);
    try {
      await approvalMutation.mutateAsync({ id: event.id, status });
      await eventQuery.refetch();
    } finally {
      setApprovalProcessing(false);
    }
  }

  // ── States ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Eventos", href: "/events" }, { label: "Cargando..." }]} />}>
        <div className="flex items-center justify-center py-32 text-muted-foreground gap-2">
          <Loader2 className="size-5 animate-spin" /> Cargando evento…
        </div>
      </PromoterShell>
    );
  }

  if (eventQuery.isError || !event) {
    return (
      <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Eventos", href: "/events" }, { label: "No encontrado" }]} />}>
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-muted-foreground">
          <AlertCircle className="size-10 opacity-40" />
          <p className="text-sm">Evento no encontrado</p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/events">Volver a eventos</Link>
          </Button>
        </div>
      </PromoterShell>
    );
  }

  const st = getStatusBadge(event);
  const totalSold = event.ticketTypes.reduce((a, t) => a + t.sold, 0);
  const totalCapacity = event.ticketTypes.reduce((a, t) => a + t.quantity, 0);
  const isPast = new Date(event.date) < new Date();

  const chartData = (analytics?.ticketTypes ?? []).map((t, i) => ({
    name: t.name,
    ingresos: t.revenue,
    vendidos: t.sold,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <PromoterShell
      breadcrumb={
        <PageBreadcrumb items={[{ label: "Eventos", href: "/events" }, { label: event.title }]} />
      }
    >
      <div className="space-y-6">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="relative rounded-xl overflow-hidden border border-border">
          <div
            className="absolute inset-0"
            style={{
              background: event.image
                ? `url(${event.image}) center/cover no-repeat`
                : "linear-gradient(135deg, hsl(262.1 83.3% 12%) 0%, hsl(224 71.4% 8%) 60%, hsl(262.1 40% 6%) 100%)",
            }}
          />
          {event.image && <div className="absolute inset-0 backdrop-blur-sm bg-black/55" />}

          <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row sm:items-end gap-6 min-h-[200px]">
            <div className="flex-1 space-y-3">
              {event.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {event.tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-white/20 text-white/70 bg-white/5">
                      <Tag className="size-2.5" />{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">{event.title}</h1>
                <Badge variant={st.variant} className="shrink-0">{st.label}</Badge>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-white/70">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-primary" />
                  {fmtDateLong(event.date)}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-primary" />
                    {event.location}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={handleCopyLink} className="bg-white/5 border-white/20 text-white hover:bg-white/15">
                {copied ? <CheckCircle2 className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                {copied ? "Copiado" : "Copiar link"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleToggleActive} disabled={toggleEvent.isPending} className="bg-white/5 border-white/20 text-white hover:bg-white/15">
                {toggleEvent.isPending ? <Loader2 className="size-4 animate-spin" /> : event.isActive ? <ToggleRight className="size-4 text-emerald-400" /> : <ToggleLeft className="size-4" />}
                {event.isActive ? "Activo" : "Inactivo"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={duplicateEvent.isPending} className="bg-white/5 border-white/20 text-white hover:bg-white/15">
                {duplicateEvent.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
                Duplicar
              </Button>
              <Button size="sm" asChild>
                <Link href={`/events/${event.id}/edit`}>
                  <Pencil className="size-4" /> Editar
                </Link>
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteEvent.isPending}>
                {deleteEvent.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Layout: 2 cols on lg ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT COLUMN (2/3) ─────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* KPI cards */}
            {analyticsQuery.isError && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                Error al cargar analíticas: {analyticsQuery.error instanceof Error ? analyticsQuery.error.message : "No se pudo conectar."}
              </div>
            )}
            {analytics && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Ingresos", value: fmtCurrency(analytics.grossRevenue), icon: TrendingUp, color: "text-primary" },
                  { label: "Vendidos", value: `${totalSold} / ${totalCapacity}`, icon: Ticket, color: "text-cyan-400" },
                  { label: "Pagos", value: String(analytics.successfulPayments), icon: CheckCircle2, color: "text-emerald-400" },
                  { label: "Reembolsos pend.", value: String(analytics.refundSummary.pending), icon: AlertCircle, color: analytics.refundSummary.pending > 0 ? "text-amber-400" : "text-muted-foreground" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <Card key={label}>
                    <CardHeader className="pb-1 flex flex-row items-center justify-between">
                      <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</CardTitle>
                      <Icon className={`size-3.5 ${color}`} />
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-bold tabular-nums">{value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Revenue chart */}
            {analytics && chartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Ingresos por tipo de boleto</CardTitle>
                  <CardDescription>Comparación de ingresos y boletos vendidos</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={6}>
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: CHART_TICK_COLOR }} axisLine={false} tickLine={false} />
                      <YAxis
                        yAxisId="rev"
                        orientation="left"
                        tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 11, fill: CHART_TICK_COLOR }}
                        axisLine={false} tickLine={false} width={42}
                      />
                      <YAxis
                        yAxisId="qty"
                        orientation="right"
                        tick={{ fontSize: 11, fill: CHART_TICK_COLOR }}
                        axisLine={false} tickLine={false} width={32}
                      />
                      <Tooltip
                        contentStyle={{ background: CHART_TOOLTIP_BG, border: CHART_TOOLTIP_BORDER, borderRadius: "0.5rem", fontSize: 12 }}
                        formatter={(v, name) => {
                          const numeric = Number(v ?? 0);
                          const key = String(name ?? "");
                          return [
                            key === "ingresos" ? fmtCurrency(numeric) : `${numeric} boletos`,
                            key === "ingresos" ? "Ingresos" : "Vendidos",
                          ];
                        }}
                      />
                      <Bar yAxisId="rev" dataKey="ingresos" radius={[4, 4, 0, 0]} maxBarSize={48}>
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                        ))}
                      </Bar>
                      <Bar yAxisId="qty" dataKey="vendidos" radius={[4, 4, 0, 0]} fill={CHART_VOLUME_COLOR} maxBarSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Ticket tiers detail */}
            <Card>
              <CardHeader>
                <CardTitle>Ocupación por tier</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {event.ticketTypes.map((tier) => (
                  <OccupancyBar
                    key={tier.id}
                    label={`${tier.name} — ${fmtCurrency(tier.price)}`}
                    value={tier.sold}
                    max={tier.quantity}
                  />
                ))}
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <div className="flex items-center gap-4">
                    <span className="font-medium tabular-nums">{totalSold} / {totalCapacity} boletos</span>
                    {analytics && (
                      <span className="font-bold text-primary tabular-nums">{fmtCurrency(analytics.grossRevenue)}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT COLUMN (1/3) ────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Approval actions (only for PENDING events) */}
            {event.status === "PENDING" && (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertCircle className="size-4 text-amber-400" />
                    Revisión pendiente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Este evento está esperando aprobación antes de poder publicarse.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                      disabled={approvalProcessing}
                      onClick={() => handleApproval("APPROVED")}
                    >
                      {approvalProcessing ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <><CheckCircle2 className="size-3.5 mr-1" /> Aprobar</>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      disabled={approvalProcessing}
                      onClick={() => handleApproval("REJECTED")}
                    >
                      {approvalProcessing ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <><XCircle className="size-3.5 mr-1" /> Rechazar</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Countdown or Past badge */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Clock className="size-4 text-primary" />
                  {isPast ? "Evento finalizado" : "Cuenta regresiva"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isPast ? (
                  <p className="text-sm text-muted-foreground">Este evento ya ocurrió.</p>
                ) : countdown ? (
                  <div className="flex gap-2">
                    <CountdownUnit value={countdown.days} label="días" />
                    <CountdownUnit value={countdown.hrs} label="hrs" />
                    <CountdownUnit value={countdown.mins} label="min" />
                    <CountdownUnit value={countdown.secs} label="seg" />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">El evento está por comenzar.</p>
                )}
              </CardContent>
            </Card>

            {/* Description */}
            {event.description && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Descripción</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Refunds summary */}
            {analytics && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Reembolsos</CardTitle>
                    {analytics.refundSummary.pending > 0 && (
                      <Badge variant="outline" className="text-amber-400 border-amber-400/40 text-xs">
                        {analytics.refundSummary.pending} pendientes
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {[
                    { label: "Total solicitados", value: analytics.refundSummary.total, icon: CircleDot, color: "text-muted-foreground" },
                    { label: "Aprobados", value: analytics.refundSummary.approved, icon: CheckCircle2, color: "text-emerald-400" },
                    { label: "Rechazados", value: analytics.refundSummary.rejected, icon: XCircle, color: "text-destructive" },
                    { label: "Pendientes", value: analytics.refundSummary.pending, icon: AlertCircle, color: "text-amber-400" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Icon className={`size-3.5 ${color}`} />{label}
                      </span>
                      <span className="font-medium tabular-nums">{value}</span>
                    </div>
                  ))}
                  {analytics.refundSummary.pending > 0 && (
                    <>
                      <Separator />
                      <Button variant="outline" size="sm" className="w-full" asChild>
                        <Link href="/sales?tab=refunds">
                          <ExternalLink className="size-3.5" /> Revisar reembolsos
                        </Link>
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Event info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Información</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Users className="size-3.5" />Tipos de boleto</span>
                  <span className="font-medium">{event.ticketTypes.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Ticket className="size-3.5" />Capacidad total</span>
                  <span className="font-medium tabular-nums">{totalCapacity.toLocaleString("es-DO")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Estado</span>
                  <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Visibilidad</span>
                  <span className={`text-xs font-medium ${event.isActive ? "text-emerald-400" : "text-muted-foreground"}`}>
                    {event.isActive ? "Visible al público" : "Oculto"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {actionDialog.dialog}
    </PromoterShell>
  );
}
