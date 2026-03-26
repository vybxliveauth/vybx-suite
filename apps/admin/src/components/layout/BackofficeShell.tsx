"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3, CalendarCheck2, ChevronLeft, ChevronRight, ClipboardCheck,
  LogOut, ReceiptText, Settings, ShieldCheck, Tags, TicketX, UserCog, Users,
  Menu, Bell, X,
} from "lucide-react";
import {
  Avatar, AvatarFallback,
  Button,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  Sheet, SheetContent, SheetHeader, SheetTitle,
  Skeleton,
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@vybx/ui";
import { auth } from "@/lib/api";
import type { Profile } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { useNotificationsStore, type NotifCounts } from "@/store/notifications";
import { CommandPalette } from "./CommandPalette";

// ── Nav ───────────────────────────────────────────────────────────────────────
const LINKS = [
  { href: "/dashboard",             label: "Estadísticas",  icon: BarChart3 },
  { href: "/events",                label: "Eventos",       icon: CalendarCheck2 },
  { href: "/transactions",          label: "Transacciones", icon: ReceiptText },
  { href: "/cancellations",         label: "Cancelaciones", icon: TicketX },
  { href: "/categories",            label: "Categorías",    icon: Tags },
  { href: "/users",                 label: "Usuarios",      icon: Users },
  { href: "/audit-logs",            label: "Bitácora",      icon: ShieldCheck },
  { href: "/promoter-applications", label: "Solicitudes",   icon: ClipboardCheck },
  { href: "/promoters",             label: "Promotores",    icon: UserCog },
  { href: "/settings",              label: "Configuración", icon: Settings },
] as const;

// ── Sidebar content ───────────────────────────────────────────────────────────
function SidebarContent({
  collapsed = false,
  isMobile = false,
  profile,
  counts,
  onNavigate,
  onLogout,
  onToggleCollapse,
}: {
  collapsed?: boolean;
  isMobile?: boolean;
  profile: Profile | null;
  counts: NotifCounts;
  onNavigate?: () => void;
  onLogout: () => void;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col border-r border-[#243243] bg-[#0c121a]/95 shadow-[18px_0_40px_rgba(2,8,23,0.45)] backdrop-blur-xl">
      {/* Brand */}
      <div className="flex items-center justify-between border-b border-[#243243] px-4 py-4">
        <strong className="flex items-center gap-2.5 truncate text-sm font-bold tracking-tight text-[#e8edf3]">
          <div
            className="flex items-center justify-center rounded-lg font-black text-white shrink-0"
            style={{
              width: 32, height: 32,
              background: "linear-gradient(135deg, #1b3659, #2f5588)",
              border: "1px solid #2f5588",
              boxShadow: "0 0 18px rgba(59,130,246,0.22)",
              fontSize: 12,
            }}
          >
            VT
          </div>
          {(!collapsed || isMobile) && (
            <span className="bg-gradient-to-r from-[#e8edf3] to-[#9db6d8] bg-clip-text text-transparent">
              VybeTickets Admin
            </span>
          )}
        </strong>
        {!isMobile && onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-[#243243] bg-transparent text-[#9aa6b5] transition-all hover:border-[#2d4e7c] hover:bg-[#111925] hover:text-[#d7e4f5]"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}
        {isMobile && (
          <button type="button" onClick={onNavigate} className="text-[#9aa6b5] transition-colors hover:text-[#d7e4f5]">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3.5">
        <TooltipProvider delayDuration={0}>
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            const badge = href === "/promoter-applications" ? counts.pendingApplications
              : href === "/cancellations" ? counts.pendingCancellations
              : href === "/transactions" ? counts.pendingTransactions
              : href === "/events" ? counts.pendingEvents
              : 0;

            const linkEl = (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                className={[
                  "group flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-sm transition-all duration-200",
                  active
                    ? "border-[#2d4e7c] bg-[#16263a] text-[#d2e5ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                    : "border-transparent text-[#9aa6b5] hover:border-[#243243] hover:bg-[#111925] hover:text-[#e8edf3]",
                  collapsed && !isMobile ? "justify-center" : "",
                ].join(" ")}
                style={{ textDecoration: "none" }}
              >
                <Icon size={17} className="shrink-0" />
                {(!collapsed || isMobile) && (
                  <span className="flex-1 truncate text-sm">{label}</span>
                )}
                {(!collapsed || isMobile) && badge > 0 && (
                  <span
                    className="flex items-center justify-center rounded-full text-white font-bold shrink-0"
                    style={{ minWidth: 20, height: 20, fontSize: 10, background: "#3b82f6", padding: "0 4px" }}
                  >
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            );

            if (collapsed && !isMobile) {
              return (
                <Tooltip key={href}>
                  <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="rounded-lg border border-[#243243] bg-[#121922] text-[#e8edf3] shadow-xl"
                  >
                    {label}{badge > 0 ? ` (${badge})` : ""}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkEl;
          })}
        </TooltipProvider>
      </nav>

      {/* Footer */}
      <div className="border-t border-[#243243] px-3 py-3.5">
        {(!collapsed || isMobile) && (
          profile
            ? <p className="mb-2 truncate px-2 text-[11px] text-[#9aa6b5]">{profile.email}</p>
            : <Skeleton className="h-3 w-32 mx-2 mb-2" />
        )}
        <button
          type="button"
          onClick={onLogout}
          className={[
            "flex w-full items-center rounded-lg border border-[#4b1f24] bg-[#27161a] text-[#ffc9cf] transition-all",
            "hover:border-[#63313a] hover:bg-[#2f1a1f]",
            collapsed && !isMobile ? "justify-center" : "gap-2.5",
          ].join(" ")}
          style={{
            padding: "0.55rem 0.65rem",
            cursor: "pointer",
          }}
        >
          <LogOut size={17} className="shrink-0" />
          {(!collapsed || isMobile) && <span className="text-sm">Cerrar sesión</span>}
        </button>
      </div>
    </div>
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────────
export function BackofficeShell({
  children,
  pageTitle,
}: {
  children: React.ReactNode;
  pageTitle?: string;
}) {
  const router   = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const profile                     = useAuthStore((s) => s.profile);
  const profileLoading              = useAuthStore((s) => s.loading);
  const { counts, total, loading: notifLoading } = useNotificationsStore();

  const currentLabel = LINKS.find(l => l.href === pathname)?.label ?? pageTitle ?? "Backoffice";

  const initials = profile
    ? ((profile.firstName?.[0] ?? "") + (profile.lastName?.[0] ?? "")).toUpperCase() || (profile.email?.[0] ?? "A").toUpperCase()
    : "AD";

  async function handleLogout() {
    try { await auth.logout(); } catch { /* ignore */ }
    router.replace("/login");
  }

  function openMobileMenu() {
    setMobileOpen(true);
  }

  return (
    <div className="relative flex min-h-dvh overflow-hidden text-[#e8edf3] selection:bg-blue-500/20" style={{ background: "#0b0f14" }}>
      {/* Background glows */}
      <div className="pointer-events-none fixed left-[-12%] top-[-24%] h-[52%] w-[52%] rounded-full bg-blue-500/12 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-[-24%] right-[-10%] h-[52%] w-[52%] rounded-full bg-sky-400/10 blur-[120px]" />

      {/* Desktop sidebar */}
      <aside
        className="relative z-10 hidden shrink-0 transition-all duration-200 md:block"
        style={{ width: collapsed ? 80 : 260 }}
      >
        <div className="sticky top-0 h-screen overflow-hidden">
          <SidebarContent
            collapsed={collapsed}
            profile={profile}
            counts={counts}
            onLogout={handleLogout}
            onToggleCollapse={() => setCollapsed(v => !v)}
          />
        </div>
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[85vw] max-w-[280px] border-r border-[#243243] bg-[#0c121a]/95 p-0 backdrop-blur-xl">
          <SheetHeader className="sr-only">
            <SheetTitle>Menú de navegación</SheetTitle>
          </SheetHeader>
          <SidebarContent
            isMobile
            profile={profile}
            counts={counts}
            onNavigate={() => setMobileOpen(false)}
            onLogout={handleLogout}
          />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header
          className="flex h-16 items-center justify-between border-b border-[#243243] bg-[#0b0f14]/90 px-3 backdrop-blur-xl sm:px-5 md:px-6 shrink-0"
        >
          <div className="flex items-center gap-4">
            {/* Mobile menu */}
            <button
              type="button"
              className="rounded-md border border-transparent p-1 text-[#9aa6b5] transition-all hover:border-[#243243] hover:bg-[#111925] hover:text-[#d7e4f5] md:hidden"
              onClick={openMobileMenu}
              onTouchStart={(e) => {
                e.preventDefault();
                openMobileMenu();
              }}
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumb */}
            <nav className="hidden sm:flex items-center gap-2 text-sm">
              <Link href="/dashboard" className="text-[#9aa6b5] transition-colors hover:text-[#d7e4f5]">
                Admin
              </Link>
              <span className="text-[#344658]">/</span>
              <span className="font-medium text-[#e8edf3]">{currentLabel}</span>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-8 w-8 rounded-lg border border-transparent text-[#9aa6b5] transition-all hover:border-[#243243] hover:bg-[#111925] hover:text-[#d7e4f5]"
                >
                  <Bell size={16} />
                  {total > 0 && (
                    <span
                      className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full"
                      style={{ background: "#3b82f6" }}
                    />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[min(92vw,20rem)] sm:w-80 rounded-xl border border-[#243243] bg-[#121922]/95 text-[#e8edf3] shadow-xl backdrop-blur-xl"
                align="end"
              >
                <DropdownMenuLabel className="px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#e8edf3]">Notificaciones</p>
                    <p className="text-xs text-[#9aa6b5]">{total} pendientes</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#243243]" />
                {[
                  { label: "Solicitudes de promotor pendientes", href: "/promoter-applications", count: counts.pendingApplications },
                  { label: "Cancelaciones por revisar",           href: "/cancellations",         count: counts.pendingCancellations },
                  { label: "Transacciones en estado PENDING",     href: "/transactions",           count: counts.pendingTransactions },
                  { label: "Eventos pendientes de revisión",      href: "/events",                 count: counts.pendingEvents },
                ].map(({ label, href, count }) => (
                  <DropdownMenuItem
                    key={href}
                    className="mx-1 flex cursor-pointer items-center justify-between rounded-md text-[#e8edf3] transition-colors focus:bg-[#16263a]"
                    onClick={() => router.push(href)}
                  >
                    <span className="min-w-0 flex-1 truncate pr-2 text-sm">{label}</span>
                    <span className="ml-2 text-xs font-mono text-[#9aa6b5]">
                      {notifLoading ? "…" : count}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full border border-[#243243] p-0 transition-all hover:border-[#2d4e7c]"
                >
                  {profileLoading && !profile ? (
                    <Skeleton className="h-8 w-8 rounded-full" />
                  ) : (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback
                        className="text-xs font-bold"
                        style={{ background: "#16263a", color: "#d2e5ff", border: "1px solid #2d4e7c", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" }}
                      >
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[min(88vw,13rem)] sm:w-52 rounded-xl border border-[#243243] bg-[#121922]/95 text-[#e8edf3] shadow-xl backdrop-blur-xl"
                align="end"
              >
                <DropdownMenuLabel className="font-normal px-3 py-2.5">
                  {profileLoading && !profile ? (
                    <div className="flex flex-col gap-1.5">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-0.5">
                      <p className="text-sm font-semibold text-[#e8edf3]">
                        {profile?.firstName
                          ? `${profile.firstName}${profile.lastName ? ` ${profile.lastName}` : ""}`
                          : "Administrador"}
                      </p>
                      <p className="text-xs text-[#9aa6b5]">{profile?.email ?? ""}</p>
                    </div>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#243243]" />
                <DropdownMenuItem
                  className="mx-1 cursor-pointer rounded-md text-[#ffc9cf] transition-colors focus:bg-[#2f1a1f]"
                  onClick={handleLogout}
                >
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1560px] p-4 md:p-8 lg:p-10">
            {children}
          </div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
