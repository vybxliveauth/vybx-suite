"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import {
  Search,
  Users,
  CalendarCheck2,
  ReceiptText,
  Tags,
  ShieldCheck,
  ClipboardCheck,
  UserCog,
  TicketX,
} from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] sm:pt-[20vh]">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#030014]/60 backdrop-blur-sm transition-opacity" 
        onClick={() => setOpen(false)}
      />
      
      {/* Dialog container */}
      <div className="relative z-50 w-full max-w-2xl px-4">
        <Command
          className="flex w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#030014]/95 text-slate-200 shadow-[0_0_40px_rgba(59,130,246,0.10)] ring-1 ring-white/5 backdrop-blur-xl transition-all"
          shouldFilter={true}
        >
          <div className="flex items-center border-b border-white/10 px-3 flex-row gap-2">
            <Search className="h-5 w-5 shrink-0 text-slate-400" />
            <Command.Input
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Busca por usuarios, eventos, rutas..."
              autoFocus
            />
            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded bg-white/5 px-1.5 font-mono text-[10px] font-medium text-slate-400 border border-white/5">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
            <Command.Empty className="py-6 text-center text-sm text-slate-400">
              No se encontraron resultados.
            </Command.Empty>

            <Command.Group heading="Navegación Rápida" className="text-xs font-medium text-slate-500 p-1">
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard"))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none aria-selected:bg-blue-600/20 aria-selected:text-blue-300 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 transition-colors"
                value="dashboard inicio estadisticas"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/5">
                    <Search className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <span>Dashboard (Estadísticas)</span>
                </div>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/events"))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none aria-selected:bg-blue-600/20 aria-selected:text-blue-300 transition-colors"
                value="eventos events"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400">
                    <CalendarCheck2 className="h-3.5 w-3.5" />
                  </div>
                  <span>Eventos Activos</span>
                </div>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/transactions"))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none aria-selected:bg-blue-600/20 aria-selected:text-blue-300 transition-colors"
                value="transacciones ventas pagos transactions"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
                    <ReceiptText className="h-3.5 w-3.5" />
                  </div>
                  <span>Transacciones & Pagos</span>
                </div>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Gestión" className="text-xs font-medium text-slate-500 p-1 mt-2">
              <Command.Item
                onSelect={() => runCommand(() => router.push("/users"))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none aria-selected:bg-blue-600/20 aria-selected:text-blue-300 transition-colors"
                value="usuarios clientes users"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/10 text-sky-400">
                    <Users className="h-3.5 w-3.5" />
                  </div>
                  <span>Usuarios del Sistema</span>
                </div>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/promoters"))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none aria-selected:bg-blue-600/20 aria-selected:text-blue-300 transition-colors"
                value="promotores promoters organizadores"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-500/10 text-rose-400">
                    <UserCog className="h-3.5 w-3.5" />
                  </div>
                  <span>Promotores & Organizadores</span>
                </div>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/categories"))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none aria-selected:bg-blue-600/20 aria-selected:text-blue-300 transition-colors"
                value="categorias tags categories"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-500/10 text-purple-400">
                    <Tags className="h-3.5 w-3.5" />
                  </div>
                  <span>Categorías de Eventos</span>
                </div>
              </Command.Item>
            </Command.Group>
            
            <Command.Group heading="Operativa" className="text-xs font-medium text-slate-500 p-1 mt-2">
              <Command.Item
                onSelect={() => runCommand(() => router.push("/promoter-applications"))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none aria-selected:bg-blue-600/20 aria-selected:text-blue-300 transition-colors"
                value="solicitudes applications"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/10 text-violet-400">
                    <ClipboardCheck className="h-3.5 w-3.5" />
                  </div>
                  <span>Solicitudes Pendientes</span>
                </div>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/cancellations"))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none aria-selected:bg-blue-600/20 aria-selected:text-blue-300 transition-colors"
                value="cancelaciones refunds cancellations"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500/10 text-red-500">
                    <TicketX className="h-3.5 w-3.5" />
                  </div>
                  <span>Cancelaciones / Reembolsos</span>
                </div>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/audit-logs"))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none aria-selected:bg-blue-600/20 aria-selected:text-blue-300 transition-colors"
                value="auditoria logs bitacora audit"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-500/20 text-slate-300">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </div>
                  <span>Bitácora de Auditoría</span>
                </div>
              </Command.Item>
            </Command.Group>

          </Command.List>
        </Command>
      </div>
    </div>
  );
}
