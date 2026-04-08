"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ScanLine,
  Calendar,
  MapPin,
  LogOut,
  ChevronRight,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Badge } from "@vybx/ui";
import { api } from "@/lib/api";
import { useAuthUser, clearSession, displayName, hydrateUserFromSession } from "@/lib/auth";
import type { StaffEvent } from "@/lib/types";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EventsPage() {
  const router = useRouter();
  const user = useAuthUser();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    void hydrateUserFromSession().finally(() => {
      if (mounted) setAuthChecked(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (authChecked && user === null) router.replace("/login");
  }, [authChecked, user, router]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["staff-events"],
    queryFn: () => api.get<{ items: StaffEvent[] }>("/event-staff/my-events"),
    enabled: authChecked && !!user,
  });

  const events = (data as any)?.items ?? [];
  const scannable = events.filter((e: StaffEvent) => e.permissions.canScan);

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <ScanLine className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Vybx Staff</p>
            <p className="text-xs text-muted-foreground mt-0.5">{displayName(user ?? null)}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-secondary"
        >
          <LogOut className="size-3.5" />
          Salir
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-5 space-y-4 max-w-lg mx-auto w-full">
        <div>
          <h2 className="text-base font-semibold">Tus eventos asignados</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Solo se muestran los eventos en los que tienes permiso para escanear.
          </p>
        </div>

        {!authChecked && (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-sm">Verificando sesión…</span>
          </div>
        )}

        {authChecked && isLoading && (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-sm">Cargando eventos…</span>
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <AlertCircle className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No pudimos cargar tus eventos.</p>
            <button
              onClick={() => void refetch()}
              className="text-xs text-primary underline underline-offset-2"
            >
              Reintentar
            </button>
          </div>
        )}

        {!isLoading && !isError && scannable.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <ScanLine className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No tienes eventos asignados para escanear.<br />
              Pide al promotor que te asigne a un evento.
            </p>
          </div>
        )}

        {scannable.map((event: StaffEvent) => (
          <button
            key={event.id}
            onClick={() => router.push(`/scan/${event.id}`)}
            className="w-full text-left rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5 transition-colors p-4 group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold truncate">{event.title}</p>
                  <Badge
                    variant="outline"
                    className="text-[10px] border-primary/30 text-primary shrink-0"
                  >
                    {event.assignmentRole}
                  </Badge>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="size-3 shrink-0" />
                    {fmtDate(event.date)}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="size-3 shrink-0" />
                      {event.location}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/70 transition-all"
                      style={{
                        width: event.metrics.totalCapacity > 0
                          ? `${Math.min(100, Math.round((event.metrics.totalSold / event.metrics.totalCapacity) * 100))}%`
                          : "0%",
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                    {event.metrics.totalSold} / {event.metrics.totalCapacity}
                  </span>
                </div>
              </div>

              <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-0.5" />
            </div>
          </button>
        ))}
      </main>
    </div>
  );
}
