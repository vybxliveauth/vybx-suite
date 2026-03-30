"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { getQueryClient } from "@/lib/query-client";
import { PageTransitions } from "@/components/layout/PageTransitions";

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="system"
      storageKey="vybx.web.theme"
      enableSystem
      disableTransitionOnChange={false}
    >
      <QueryClientProvider client={queryClient}>
        <PageTransitions>{children}</PageTransitions>
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
