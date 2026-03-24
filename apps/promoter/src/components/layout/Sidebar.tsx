"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  BarChart3,
  Settings,
  Zap,
  X,
} from "lucide-react";
import { cn } from "@vybx/ui";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/events", label: "Eventos", icon: CalendarDays },
  { href: "/sales", label: "Ventas", icon: BarChart3 },
  { href: "/settings", label: "Configuración", icon: Settings },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="sidebar-overlay md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={cn("sidebar flex flex-col h-screen sticky top-0", open && "open")}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-border shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-base">
            <Zap className="size-5 text-primary fill-primary" />
            <span className="text-foreground">VybeTickets</span>
          </Link>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1 rounded text-muted-foreground hover:text-foreground"
              aria-label="Cerrar menú"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn("nav-link", active && "active")}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
          v0.1.0
        </div>
      </aside>
    </>
  );
}
