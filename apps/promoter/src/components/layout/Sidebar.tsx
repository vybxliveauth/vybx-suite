"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  BarChart3,
  RotateCcw,
  Settings,
  Users,
  Zap,
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@vybx/ui";
import { api } from "@/lib/api";
import { clearSession } from "@/lib/auth";
import { usePermissions } from "@/lib/use-permissions";
import type { Permission } from "@/lib/permissions";

const NAV: { href: string; label: string; icon: React.ElementType; permission: Permission }[] = [
  { href: "/dashboard", label: "Dashboard",     icon: LayoutDashboard, permission: "dashboard:view" },
  { href: "/events",    label: "Eventos",       icon: CalendarDays,    permission: "events:view"    },
  { href: "/sales",     label: "Ventas",        icon: BarChart3,       permission: "sales:view"     },
  { href: "/refunds",   label: "Reembolsos",    icon: RotateCcw,       permission: "refunds:view"   },
  { href: "/staff",     label: "Staff",         icon: Users,           permission: "staff:assign"   },
  { href: "/settings",  label: "Configuración", icon: Settings,        permission: "settings:view"  },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname   = usePathname();
  const router     = useRouter();
  const { can }    = usePermissions();

  const visibleNav = NAV.filter((item) => can(item.permission));

  async function handleLogout() {
    try { await api.post("/auth/logout", {}); } catch { /* ignore */ }
    clearSession();
    router.replace("/login");
  }

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
        <div className="flex items-center justify-between px-5 h-14 border-b border-border/60 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-base">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground shrink-0">
              <Zap className="size-3.5 fill-current" />
            </div>
            <span className="text-foreground">Vybx</span>
          </Link>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="md:hidden p-1 rounded text-muted-foreground hover:text-foreground"
              aria-label="Cerrar menú"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {visibleNav.map(({ href, label, icon: Icon }) => {
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
        <div className="px-3 py-3 border-t border-border/60 space-y-1">
          <button
            type="button"
            onClick={handleLogout}
            className="nav-link w-full text-left text-destructive/80 hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="size-4 shrink-0" />
            Cerrar sesión
          </button>
          <p className="text-[11px] text-muted-foreground px-3">v0.1.0</p>
        </div>
      </aside>
    </>
  );
}
