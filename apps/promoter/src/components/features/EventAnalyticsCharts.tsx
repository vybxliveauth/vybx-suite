"use client";

import { useState } from "react";
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
import { Loader2, AlertCircle, MapPin, TrendingUp, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@vybx/ui";
import { useEventCharts } from "@/lib/queries";

// ── Helpers ─────────────────────────────────────────────────────────────────

const PURPLE = "hsl(262.1 83.3% 57.8%)";
const CYAN   = "#22d3ee";
const MUTED  = "hsl(217.9 10.6% 54.9%)";
const GRID   = "hsl(215 27.9% 16.9%)";
const TOOLTIP_STYLE = {
  background: "hsl(224 71.4% 6%)",
  border: `1px solid ${GRID}`,
  borderRadius: "0.5rem",
  fontSize: 12,
};

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency", currency: "MXN", maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-DO", { month: "short", day: "numeric" });
}

function fmtHour(h: number) {
  const suffix = h < 12 ? "am" : "pm";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}${suffix}`;
}

// Bar color based on activity level
function hourColor(count: number, max: number): string {
  if (max === 0) return MUTED;
  const ratio = count / max;
  if (ratio >= 0.75) return "#f43f5e";
  if (ratio >= 0.45) return "#f59e0b";
  return PURPLE;
}

// Max count among hours
function maxCount(data: { count: number }[]) {
  return data.reduce((m, d) => Math.max(m, d.count), 0);
}

// ── Range selector ────────────────────────────────────────────────────────────

const RANGES = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function EventAnalyticsCharts({ eventId }: { eventId: string }) {
  const [days, setDays] = useState(30);
  const { data, isLoading, isError } = useEventCharts(eventId, days);

  return (
    <div className="space-y-5">
      {/* Header + range picker */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold">Analytics de ventas</h2>
          <p className="text-xs text-muted-foreground">Ingresos, velocidad y distribución geográfica</p>
        </div>
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
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="size-5 animate-spin" /> Cargando analytics…
        </div>
      )}

      {isError && !isLoading && (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <AlertCircle className="size-4 opacity-50" />
          <span className="text-sm">No se pudieron cargar los datos.</span>
        </div>
      )}

      {data && !isLoading && (
        <>
          {/* ── Revenue + Tickets per day ────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" />
                <CardTitle className="text-sm">Ingresos y boletos por día</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Últimos {days} días ·{" "}
                {fmtCurrency(data.revenueByDay.reduce((s, d) => s + d.revenue, 0))} total
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={data.revenueByDay} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PURPLE} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={PURPLE} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="tixGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CYAN} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={CYAN} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={fmtDate}
                    tick={{ fontSize: 11, fill: MUTED }}
                    axisLine={false} tickLine={false}
                    interval={days <= 7 ? 0 : days <= 30 ? 4 : 13}
                  />
                  <YAxis
                    yAxisId="rev"
                    tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
                    tick={{ fontSize: 11, fill: MUTED }}
                    axisLine={false} tickLine={false} width={46}
                  />
                  <YAxis
                    yAxisId="tix"
                    orientation="right"
                    tick={{ fontSize: 11, fill: MUTED }}
                    axisLine={false} tickLine={false} width={28}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelFormatter={(l) => (typeof l === "string" ? fmtDate(l) : String(l))}
                    formatter={(v, name) => {
                      const num = Number(v ?? 0);
                      const key = String(name);
                      return [key === "revenue" ? fmtCurrency(num) : `${num} boletos`, key === "revenue" ? "Ingresos" : "Boletos"];
                    }}
                  />
                  <Area yAxisId="rev" type="monotone" dataKey="revenue"
                    stroke={PURPLE} strokeWidth={2} fill="url(#revGrad)" dot={false} />
                  <Area yAxisId="tix" type="monotone" dataKey="tickets"
                    stroke={CYAN} strokeWidth={1.5} fill="url(#tixGrad)" dot={false} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex gap-5 mt-2 justify-end text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-6 h-0.5 rounded" style={{ background: PURPLE }} /> Ingresos
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-6 h-0 border-t border-dashed" style={{ borderColor: CYAN }} /> Boletos
                </span>
              </div>
            </CardContent>
          </Card>

          {/* ── Tickets per hour ─────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                <CardTitle className="text-sm">Velocidad de venta por hora del día</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Total de transacciones agrupadas por hora UTC · identifica picos de demanda
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.ticketsByHour.every((h) => h.count === 0) ? (
                <p className="text-center text-xs text-muted-foreground py-8">Sin datos en el período seleccionado.</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data.ticketsByHour} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <XAxis
                      dataKey="hour"
                      tickFormatter={fmtHour}
                      tick={{ fontSize: 10, fill: MUTED }}
                      axisLine={false} tickLine={false}
                      interval={2}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: MUTED }}
                      axisLine={false} tickLine={false} width={24}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      labelFormatter={(h) => `${fmtHour(Number(h))} — ${fmtHour(Number(h) + 1)}`}
                      formatter={(v) => [`${v} ventas`, "Boletos"]}
                    />
                    <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={28}>
                      {data.ticketsByHour.map((entry, i) => (
                        <Cell key={i} fill={hourColor(entry.count, maxCount(data.ticketsByHour))} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* ── Geo heat map (top locations) ─────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                <CardTitle className="text-sm">Distribución geográfica de compradores</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Top ciudades · basado en el perfil del comprador
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.topLocations.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">
                  Sin datos geográficos. Los compradores aún no han completado su perfil de ubicación.
                </p>
              ) : (
                <GeoHeatList locations={data.topLocations} />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ── Geo heat list ─────────────────────────────────────────────────────────────

function GeoHeatList({ locations }: { locations: { location: string; buyers: number }[] }) {
  const max = locations[0]?.buyers ?? 1;

  return (
    <div className="space-y-2.5">
      {locations.map(({ location, buyers }, i) => {
        const pct = Math.round((buyers / max) * 100);
        // Gradient intensity: top location is full purple, rest fade
        const opacity = 0.2 + (pct / 100) * 0.65;
        return (
          <div key={location} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-4 text-right tabular-nums shrink-0">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium truncate">{location}</span>
                <span className="text-xs text-muted-foreground tabular-nums ml-2 shrink-0">
                  {buyers} {buyers === 1 ? "comprador" : "compradores"}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    borderRadius: 9999,
                    background: `rgba(124, 58, 237, ${opacity})`,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
