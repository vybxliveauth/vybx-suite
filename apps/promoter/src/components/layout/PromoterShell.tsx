"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useMaintenanceMode } from "@/lib/use-maintenance-mode";

interface PromoterShellProps {
  children: React.ReactNode;
  breadcrumb?: React.ReactNode;
}

export function PromoterShell({ children, breadcrumb }: PromoterShellProps) {
  useAuthGuard();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { maintenanceMode } = useMaintenanceMode();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "transparent" }}>
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
        {maintenanceMode && (
          <div className="mx-4 mt-3 md:mx-6 flex items-center gap-2.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            <AlertTriangle className="size-4 shrink-0" />
            <span>
              <strong>Modo mantenimiento activo.</strong>{" "}
              La plataforma pública está temporalmente suspendida. Los cambios que hagas se aplicarán cuando se desactive.
            </span>
          </div>
        )}
        <main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
