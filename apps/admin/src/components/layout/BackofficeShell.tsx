"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3, CalendarCheck2, ChevronLeft, ChevronRight, ClipboardCheck,
  LogOut, ReceiptText, ShieldCheck, Tags, TicketX, UserCog, Users,
  Menu, Search, Bell, X,
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
    <div className="flex flex-col h-full bg-[#030014]/60 backdrop-blur-xl border-r border-white/5 shadow-2xl">
      {/* Logo */}
      <div className="flex items-center justify-between p-5 border-b border-white/5">
        <strong className="text-white font-bold tracking-tight truncate flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-black shadow-[0_0_15px_rgba(124,58,237,0.5)] shrink-0">
            VT
          </div>
          {(!collapsed || isMobile) && (
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              VybeTickets
            </span>
          )}
        </strong>
        {!isMobile && onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
            onClick={onToggleCollapse}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>
        )}
        {isMobile && (
          <button onClick={onNavigate} className="text-slate-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto pl-4 pr-3 py-2 flex flex-col gap-1.5 w-full">
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
                  "flex items-center gap-3 p-2.5 rounded-lg transition-all duration-300",
                  active
                    ? "bg-violet-600/15 text-violet-300 font-medium border border-violet-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent",
                  collapsed && !isMobile ? "justify-center" : "",
                ].join(" ")}
              >
                <Icon
                  size={18}
                  className={["shrink-0", active ? "text-violet-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.5)]" : ""].join(" ")}
                />
                {(!collapsed || isMobile) && (
                  <span className="flex-1 truncate tracking-wide text-sm">{label}</span>
                )}
                {(!collapsed || isMobile) && badge > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-violet-500/80 text-[10px] font-bold text-white shrink-0">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            );

            if (collapsed && !isMobile) {
              return (
                <Tooltip key={href}>
                  <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                  <TooltipContent side="right" className="bg-[#030014]/90 backdrop-blur-xl text-slate-200 border-white/10 rounded-lg shadow-xl">
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
      <div className="p-4 border-t border-white/5 pb-6 space-y-1">
        {(!collapsed || isMobile) && (
          profile
            ? <p className="text-[11px] text-slate-500 px-2 truncate mb-2">{profile.email}</p>
            : <Skeleton className="h-3 w-32 mx-2 mb-2" />
        )}
        <Button
          variant="ghost"
          className={[
            "w-full flex items-center text-red-400/80 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all border border-transparent hover:border-red-500/20",
            collapsed && !isMobile ? "justify-center p-0" : "justify-start gap-3",
          ].join(" ")}
          onClick={onLogout}
        >
          <LogOut size={18} className="shrink-0" />
          {(!collapsed || isMobile) && <span className="tracking-wide text-sm">Cerrar sesión</span>}
        </Button>
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

  return (
    <div className="min-h-dvh flex bg-[#030014] text-slate-200 overflow-hidden font-sans selection:bg-violet-500/30">
      {/* Background glows */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none -z-10" />

      {/* Desktop sidebar */}
      <aside
        className={[
          "hidden md:block transition-all duration-300 ease-in-out border-r border-white/5 relative z-10 shrink-0",
          collapsed ? "w-[80px]" : "w-[260px]",
        ].join(" ")}
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
        <SheetContent side="left" className="p-0 w-[260px] bg-slate-950 border-r-slate-800">
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Header */}
        <header className="h-16 border-b border-white/5 px-6 flex items-center justify-between bg-[#030014]/60 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-4">
            {/* Mobile menu */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-slate-400 hover:text-slate-200 hover:bg-white/5"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </Button>

            {/* Breadcrumb */}
            <nav className="hidden sm:flex items-center gap-2 text-sm">
              <Link href="/dashboard" className="text-slate-400 hover:text-slate-200 transition-colors">
                Admin
              </Link>
              <span className="text-slate-600">/</span>
              <span className="text-slate-200 font-medium">{currentLabel}</span>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Search (decorative — Cmd+K hint) */}
            <button className="hidden sm:flex items-center gap-2 text-slate-400 bg-[#030014] border border-white/10 hover:bg-white/5 hover:border-white/20 hover:text-slate-200 h-9 px-3 w-56 justify-start rounded-full transition-all shadow-inner text-xs tracking-wide">
              <Search size={14} />
              <span>Buscar...</span>
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded bg-white/5 px-1.5 font-mono text-[10px] font-medium text-slate-400 border border-white/5">
                <span className="text-xs">⌘</span>K
              </kbd>
            </button>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-slate-400 hover:text-slate-200 hover:bg-white/5 h-9 w-9 rounded-full transition-all"
                >
                  <Bell size={18} />
                  {total > 0 && (
                    <span className="absolute top-2 right-2.5 flex h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.3)]" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-80 bg-[#030014]/95 backdrop-blur-xl border border-white/10 text-slate-200 shadow-2xl rounded-xl"
                align="end"
              >
                <DropdownMenuLabel className="px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold tracking-tight text-slate-100">Notificaciones</p>
                    <p className="text-xs text-slate-400">{total} pendientes</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                {[
                  { label: "Solicitudes de promotor pendientes", href: "/promoter-applications", count: counts.pendingApplications },
                  { label: "Cancelaciones por revisar",           href: "/cancellations",         count: counts.pendingCancellations },
                  { label: "Transacciones en estado PENDING",     href: "/transactions",           count: counts.pendingTransactions },
                  { label: "Eventos pendientes de revisión",      href: "/events",                 count: counts.pendingEvents },
                ].map(({ label, href, count }) => (
                  <DropdownMenuItem
                    key={href}
                    className="focus:bg-white/5 focus:text-slate-100 cursor-pointer rounded-md mx-1 flex items-center justify-between"
                    onClick={() => router.push(href)}
                  >
                    <span className="text-sm">{label}</span>
                    <span className="text-xs font-mono text-slate-400 ml-2">
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
                  className="relative h-9 w-9 rounded-full p-0 border border-white/10 hover:border-violet-500/50 transition-all hover:shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                >
                  {profileLoading && !profile ? (
                    <Skeleton className="h-9 w-9 rounded-full" />
                  ) : (
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-gradient-to-br from-violet-600/20 to-indigo-600/20 text-violet-300 text-xs font-bold border border-violet-500/20">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 bg-[#030014]/95 backdrop-blur-xl border border-white/10 text-slate-200 shadow-2xl rounded-xl"
                align="end"
              >
                <DropdownMenuLabel className="font-normal px-3 py-2.5">
                  {profileLoading && !profile ? (
                    <div className="flex flex-col gap-1.5">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold tracking-tight text-slate-100">
                        {profile?.firstName
                          ? `${profile.firstName}${profile.lastName ? ` ${profile.lastName}` : ""}`
                          : "Administrador"}
                      </p>
                      <p className="text-xs text-slate-400">{profile?.email ?? ""}</p>
                    </div>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem className="focus:bg-white/5 focus:text-slate-100 cursor-pointer rounded-md mx-1">
                  Ajustes
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem
                  className="text-red-400 focus:bg-red-500/10 focus:text-red-300 cursor-pointer rounded-md mx-1"
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
          <div className="p-4 md:p-8 lg:p-10 w-full max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
