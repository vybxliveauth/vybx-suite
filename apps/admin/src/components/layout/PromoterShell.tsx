"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { CommandPalette } from "@/components/pro/CommandPalette";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useAuthUser } from "@/lib/auth";

interface PromoterShellProps {
  children: React.ReactNode;
  breadcrumb?: React.ReactNode;
}

export function PromoterShell({ children, breadcrumb }: PromoterShellProps) {
  useAuthGuard();
  const user = useAuthUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Gate children rendering on auth readiness.  This prevents data-fetching
  // hooks inside pages from firing before the session JWT is established,
  // which would race with the auth-client refresh and cause 401 cascades.
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "transparent" }}>
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-sm">Verificando sesión…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "transparent" }}>
      <CommandPalette />
      {/* Sidebar — hidden on mobile unless open */}
      <div className="hidden md:flex md:shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      <div className="md:hidden">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          breadcrumb={breadcrumb}
        />
        <main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
