"use client";

import { useEffect, useMemo, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { getQueryClient } from "@/lib/query-client";
import { resolveClientApiBaseUrl } from "@/lib/api-base-url";
import { PageTransitions } from "@/components/layout/PageTransitions";
import { OfflineBanner } from "@/components/features/OfflineBanner";

function parseBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceResolved, setMaintenanceResolved] = useState(false);
  const maintenanceEndpoint = useMemo(() => {
    if (typeof window === "undefined") return "";
    const base = resolveClientApiBaseUrl(window.location.origin);
    return `${base}/config/MAINTENANCE_MODE`;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!maintenanceEndpoint) {
        setMaintenanceResolved(true);
        return;
      }

      try {
        const response = await fetch(maintenanceEndpoint, {
          cache: "no-store",
          credentials: "include",
        });
        if (!response.ok) return;

        const payload = (await response.json()) as { value?: string | boolean };
        if (!cancelled) {
          setMaintenanceMode(parseBoolean(payload?.value, false));
        }
      } catch {
        // Keep platform available if runtime flag cannot be read.
      } finally {
        if (!cancelled) {
          setMaintenanceResolved(true);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [maintenanceEndpoint]);

  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="system"
      storageKey="vybx.web.theme"
      enableSystem
      disableTransitionOnChange={false}
    >
      <QueryClientProvider client={queryClient}>
        {maintenanceResolved && maintenanceMode ? (
          <main
            id="main-content"
            className="flex min-h-screen flex-1 items-center justify-center px-6 py-24"
          >
            <section className="mx-auto w-full max-w-2xl rounded-2xl border border-white/15 bg-black/35 p-8 text-center backdrop-blur-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-300">
                Modo Mantenimiento
              </p>
              <h1 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">
                Estamos mejorando la plataforma
              </h1>
              <p className="mt-4 text-sm text-white/80 sm:text-base">
                Vybx está temporalmente en mantenimiento. Regresa en unos minutos para continuar
                comprando tus tickets.
              </p>
            </section>
          </main>
        ) : (
          <>
            <OfflineBanner />
            <PageTransitions>{children}</PageTransitions>
          </>
        )}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--bg-dark)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-light)",
              fontFamily: "var(--font-body)",
              fontSize: "0.88rem",
              backdropFilter: "blur(16px)",
            },
          }}
          gap={8}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
