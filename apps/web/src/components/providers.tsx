"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
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

      </QueryClientProvider>
    </ThemeProvider>
  );
}
