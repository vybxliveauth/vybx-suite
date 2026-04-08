"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell, Menu, LogOut, User as UserIcon, ChevronDown, Search,
  AlertTriangle, Command,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Input,
} from "@vybx/ui";
import { clearSession, useAuthUser, displayName } from "@/lib/auth";
import { api } from "@/lib/api";
import type { AdminOpsChecklistItem, AdminOpsChecklistResponse } from "@/lib/types";

const MODULES = [
  { label: "Dashboard",      href: "/dashboard",  keywords: ["dashboard", "inicio", "command"] },
  { label: "Eventos",        href: "/events",     keywords: ["events", "eventos", "moderacion"] },
  { label: "Promotores",     href: "/promoters",  keywords: ["promotores", "kyc", "verification"] },
  { label: "Liquidaciones",  href: "/payouts",    keywords: ["payouts", "pagos", "stripe", "batches"] },
  { label: "Ventas",         href: "/sales",      keywords: ["sales", "ventas", "ingresos"] },
  { label: "Reembolsos",     href: "/refunds",    keywords: ["refunds", "reembolsos", "cancelaciones"] },
  { label: "Usuarios",       href: "/users",      keywords: ["usuarios", "roles", "bloqueo", "acceso"] },
  { label: "Seguridad",      href: "/security",   keywords: ["fraude", "seguridad", "abuse", "risk", "bloqueo"] },
  { label: "Audit Logs",     href: "/audit",      keywords: ["audit", "logs", "timeline"] },
  { label: "Staff",          href: "/staff",      keywords: ["staff", "escaner", "scanner", "personal"] },
  { label: "Categorías",     href: "/categories", keywords: ["categorias", "categories", "catalogo"] },
  { label: "Configuración",  href: "/settings",   keywords: ["settings", "configuracion", "perfil"] },
  { label: "Nuevo evento",   href: "/events/new", keywords: ["new", "crear", "nuevo", "create"] },
];

interface HeaderProps {
  onMenuClick?: () => void;
  breadcrumb?: React.ReactNode;
}

export function Header({ onMenuClick, breadcrumb }: HeaderProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const user     = useAuthUser();

  const [opsAlerts,      setOpsAlerts]       = useState<AdminOpsChecklistItem[]>([]);
  const [opsSummary,     setOpsSummary]      = useState<AdminOpsChecklistResponse["summary"] | null>(null);
  const [moduleSearch,   setModuleSearch]    = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeAlertsCount = useMemo(() => {
    if (!opsSummary) return 0;
    return (opsSummary.warningItems ?? 0) + (opsSummary.breachedItems ?? 0);
  }, [opsSummary]);

  async function loadOpsAlerts() {
    try {
      const res = await api.get<AdminOpsChecklistResponse>("/admin/ops-checklist");
      setOpsSummary(res.summary ?? null);
      const ranked = Object.values(res.items ?? {})
        .filter((item) => item.level !== "ok" || item.pendingCount > 0)
        .sort((a, b) => {
          const weight = (level: AdminOpsChecklistItem["level"]) => {
            if (level === "breach") return 3;
            if (level === "warning") return 2;
            return 1;
          };
          return (
            weight(b.level) - weight(a.level) ||
            (b.pendingCount ?? 0) - (a.pendingCount ?? 0) ||
            (b.oldestAgeHours ?? 0) - (a.oldestAgeHours ?? 0)
          );
        });
      setOpsAlerts(ranked);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    void loadOpsAlerts();
    intervalRef.current = setInterval(() => void loadOpsAlerts(), 45_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  function handleAlertClick(alert: AdminOpsChecklistItem) {
    if (alert.href && pathname !== alert.href) router.push(alert.href);
  }

  function handleSearch(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const q = moduleSearch.trim().toLowerCase();
    if (!q) return;
    const match = MODULES.find(
      (m) => m.label.toLowerCase().includes(q) || m.keywords.some((k) => k.includes(q))
    );
    if (match) {
      setModuleSearch("");
      router.push(match.href);
    }
  }

  async function handleLogout() {
    try {
      await api.post("/auth/logout", {});
    } catch {
      // ignore network/logout errors and clear local session anyway
    }
    clearSession();
    router.replace("/login");
  }

  function openMobileMenu() {
    onMenuClick?.();
  }

  function openCommandPalette() {
    window.dispatchEvent(new Event("vybx:open-command-palette"));
  }

  const name = displayName(user);
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-6 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl"
      style={{ height: "var(--header-height)" }}
    >
      <button
        type="button"
        onClick={openMobileMenu}
        onTouchStart={(e) => {
          e.preventDefault();
          openMobileMenu();
        }}
        className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5"
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
      </button>

      <div className="flex-1 min-w-0">{breadcrumb}</div>

      {/* Module search */}
      <div className="relative hidden sm:block w-44 lg:w-56">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar módulo…"
          value={moduleSearch}
          onChange={(e) => setModuleSearch(e.target.value)}
          onKeyDown={handleSearch}
          className="pl-8 h-8 text-sm bg-white/[0.04] border-white/[0.08] focus-visible:ring-primary/50 placeholder:text-muted-foreground/60"
        />
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={openCommandPalette}
        className="hidden lg:inline-flex gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <Command className="size-3.5" />
        Cmd/Ctrl + K
      </Button>

      <div className="flex items-center gap-1 shrink-0">
        {/* Notifications dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-white/5" aria-label="Notificaciones">
              <Bell className="size-4" />
              {activeAlertsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground leading-none">
                  {activeAlertsCount > 9 ? "9+" : activeAlertsCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Alertas operativas</span>
              <span className="text-[11px] text-muted-foreground">
                {activeAlertsCount > 0 ? `${activeAlertsCount} activas` : "Todo al día"}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {opsAlerts.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                Sin alertas pendientes.
              </div>
            ) : (
              opsAlerts.slice(0, 8).map((alert) => (
                <DropdownMenuItem
                  key={alert.key}
                  onClick={() => handleAlertClick(alert)}
                  className="items-start gap-2"
                >
                  <AlertTriangle
                    className={`mt-0.5 size-3.5 shrink-0 ${
                      alert.level === "breach"
                        ? "text-red-300"
                        : alert.level === "warning"
                          ? "text-amber-300"
                          : "text-sky-300"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {alert.label}
                    </p>
                    <p className="truncate text-xs text-muted-foreground mt-0.5">
                      {alert.pendingCount} pendientes · SLA {alert.targetHours}h
                      {typeof alert.oldestAgeHours === "number"
                        ? ` · más antiguo ${Math.round(alert.oldestAgeHours)}h`
                        : ""}
                    </p>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-white/5 transition-colors">
              <Avatar className="size-7">
                {user?.profileImageUrl && (
                  <AvatarImage src={user.profileImageUrl} alt={name} />
                )}
                <AvatarFallback className="text-xs bg-primary/20 text-primary font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
                {name}
              </span>
              <ChevronDown className="size-3.5 text-muted-foreground hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium">{name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <UserIcon className="size-4" />
              Mi perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => void handleLogout()}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
