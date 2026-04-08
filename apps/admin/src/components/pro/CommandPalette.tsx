"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Command, Search, ArrowUpRight, Loader2 } from "lucide-react";
import { Input, Button } from "@vybx/ui";
import { api } from "@/lib/api";
import { usePermissions } from "@/lib/use-permissions";
import type { Permission } from "@/lib/permissions";
import { useAdminActionDialog } from "@/components/shared/use-admin-action-dialog";

type CommandSource = "module" | "event" | "promoter" | "application" | "transaction";

type ActionTarget =
  | { kind: "event"; id: string; status: string }
  | { kind: "application"; id: string; status: string };

type CommandItem = {
  id: string;
  label: string;
  description: string;
  href: string;
  keywords: string[];
  source: CommandSource;
  permission?: Permission;
  actionTarget?: ActionTarget;
};

const ITEMS: CommandItem[] = [
  {
    id: "dashboard",
    label: "Centro de mando global",
    description: "KPIs, actividad y salud general de la plataforma",
    href: "/dashboard",
    keywords: ["kpi", "centro", "metricas", "inicio"],
    source: "module",
    permission: "dashboard:view",
  },
  {
    id: "events",
    label: "Moderación de eventos",
    description: "Pausar, publicar, rechazar y ejecutar acciones masivas",
    href: "/events",
    keywords: ["eventos", "moderacion", "bulk", "aprobar", "rechazar"],
    source: "module",
    permission: "events:view",
  },
  {
    id: "promoters",
    label: "Promotores (KYC)",
    description: "Aprobación de promotores y verificación de documentos",
    href: "/promoters",
    keywords: ["kyc", "promotor", "verificacion", "documentos"],
    source: "module",
    permission: "promoters:view",
  },
  {
    id: "payouts",
    label: "Liquidaciones",
    description: "Cola de pagos y estado de Stripe",
    href: "/payouts",
    keywords: ["payout", "liquidaciones", "pagos", "stripe", "batch"],
    source: "module",
    permission: "payouts:view",
  },
  {
    id: "sales",
    label: "Ventas",
    description: "Actividad de transacciones, volumen y tendencias",
    href: "/sales",
    keywords: ["ventas", "transacciones", "ingresos", "gmv"],
    source: "module",
    permission: "sales:view",
  },
  {
    id: "revenue-ops",
    label: "Operaciones de ingresos",
    description: "Cabina comercial con embudo, suministro, riesgo y ranking",
    href: "/revenue-ops",
    keywords: ["ingresos", "operaciones", "embudo", "suministro", "riesgo", "ranking"],
    source: "module",
    permission: "sales:view",
  },
  {
    id: "refunds",
    label: "Reembolsos y Disputas",
    description: "Gestión de solicitudes y aprobaciones rápidas",
    href: "/refunds",
    keywords: ["refund", "disputa", "devolucion"],
    source: "module",
    permission: "refunds:view",
  },
  {
    id: "users",
    label: "Usuarios",
    description: "Gestion de usuarios, roles, bloqueos y acceso",
    href: "/users",
    keywords: ["usuarios", "roles", "bloqueo", "reset", "acceso"],
    source: "module",
    permission: "users:view",
  },
  {
    id: "security",
    label: "Seguridad y Fraude",
    description: "Señales de abuso, bloqueos y respuesta operativa",
    href: "/security",
    keywords: ["fraude", "abuse", "riesgo", "seguridad", "block"],
    source: "module",
    permission: "security:view",
  },
  {
    id: "audit",
    label: "Registro de auditoría",
    description: "Timeline de cambios por usuario",
    href: "/audit",
    keywords: ["logs", "auditoria", "timeline", "historial"],
    source: "module",
    permission: "audit:view",
  },
  {
    id: "staff",
    label: "Personal",
    description: "Asignación operativa de escáneres y supervisores",
    href: "/staff",
    keywords: ["staff", "scanner", "supervisor", "checkin"],
    source: "module",
    permission: "staff:view",
  },
  {
    id: "categories",
    label: "Categorías",
    description: "Catálogo de categorías e íconos para eventos",
    href: "/categories",
    keywords: ["categorias", "catalogo", "iconos", "tags"],
    source: "module",
    permission: "settings:view",
  },
  {
    id: "settings",
    label: "Configuración",
    description: "Ajustes de cuenta y seguridad",
    href: "/settings",
    keywords: ["perfil", "seguridad", "password"],
    source: "module",
    permission: "settings:view",
  },
];

type SearchResult = {
  data: Array<Record<string, unknown>>;
};

function fmtShortDate(input?: string | null) {
  if (!input) return "";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-DO", { day: "2-digit", month: "short" });
}

function sourceBadge(source: CommandItem["source"]) {
  if (source === "event") return "Evento";
  if (source === "promoter") return "Promotor";
  if (source === "application") return "Solicitud";
  if (source === "transaction") return "Pago";
  return "Módulo";
}

type QuickActionId =
  | "event_approve"
  | "event_reject"
  | "application_approve"
  | "application_reject";

type QuickAction = {
  id: QuickActionId;
  label: string;
  tone: "default" | "danger";
};

export function CommandPalette() {
  const router = useRouter();
  const qc = useQueryClient();
  const { can } = usePermissions();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [remoteItems, setRemoteItems] = useState<CommandItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [actionBusyKey, setActionBusyKey] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const actionDialog = useAdminActionDialog();

  const openPalette = () => {
    setOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
        return;
      }

      const isModifier = e.metaKey || e.ctrlKey;
      const key = e.key?.toLowerCase?.() ?? "";
      const isShortcut = key === "k" || e.code === "KeyK";

      if (isModifier && isShortcut) {
        e.preventDefault();
        e.stopPropagation();
        openPalette();
      }
    }

    function onOpenRequest() {
      openPalette();
    }

    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("vybx:open-command-palette", onOpenRequest as EventListener);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("vybx:open-command-palette", onOpenRequest as EventListener);
    };
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2) {
      setRemoteItems([]);
      setIsSearching(false);
      return;
    }

    const canSearchEvents = can("events:view");
    const canSearchPromoters = can("promoters:view");
    const canSearchTransactions = can("sales:view");

    if (!canSearchEvents && !canSearchPromoters && !canSearchTransactions) {
      setRemoteItems([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const [eventsRes, promotersRes, applicationsRes, txRes] = await Promise.all([
          canSearchEvents
            ? api.get<SearchResult>(`/events/admin/all?page=1&limit=5&q=${encodeURIComponent(q)}`)
            : Promise.resolve({ data: [] }),
          canSearchPromoters
            ? api.get<SearchResult>(`/users/promoters?page=1&limit=5&q=${encodeURIComponent(q)}`)
            : Promise.resolve({ data: [] }),
          canSearchPromoters
            ? api.get<SearchResult>(
                `/users/promoter-applications?status=PENDING_APPROVAL&page=1&limit=5&q=${encodeURIComponent(q)}`
              )
            : Promise.resolve({ data: [] }),
          canSearchTransactions
            ? api.get<SearchResult>(`/admin/transactions?page=1&limit=5&q=${encodeURIComponent(q)}`)
            : Promise.resolve({ data: [] }),
        ]);

        if (cancelled) return;

        const eventItems = (eventsRes.data ?? []).map((entry) => {
          const id = String(entry.id ?? "");
          const title = String(entry.title ?? "Evento");
          const status = String(entry.status ?? "PENDING");
          const location = String(entry.location ?? "Sin ubicacion");
          const date = fmtShortDate(String(entry.date ?? ""));

          return {
            id: `event:${id}`,
            label: title,
            description: `${status} · ${location}${date ? ` · ${date}` : ""}`,
            href: `/events/${id}`,
            keywords: [],
            source: "event" as const,
            actionTarget: {
              kind: "event" as const,
              id,
              status,
            },
          };
        });

        const promoterItems = (promotersRes.data ?? []).map((entry) => {
          const id = String(entry.id ?? "");
          const email = String(entry.email ?? "promotor@vybx.live");
          const firstName = String(entry.firstName ?? "").trim();
          const lastName = String(entry.lastName ?? "").trim();
          const fullName = `${firstName} ${lastName}`.trim() || email;

          return {
            id: `promoter:${id}`,
            label: fullName,
            description: `${email} · Promotor activo`,
            href: "/promoters",
            keywords: [],
            source: "promoter" as const,
          };
        });

        const applicationItems = (applicationsRes.data ?? []).map((entry) => {
          const id = String(entry.id ?? "");
          const email = String(entry.email ?? "usuario@vybx.live");
          const legalName = String(entry.promoterLegalName ?? "Sin razon social");
          const status = String(entry.promoterApplicationStatus ?? "PENDING_APPROVAL");
          const submittedAt = fmtShortDate(String(entry.promoterApplicationSubmittedAt ?? entry.createdAt ?? ""));

          return {
            id: `application:${id}`,
            label: legalName,
            description: `${email} · ${status}${submittedAt ? ` · ${submittedAt}` : ""}`,
            href: "/promoters",
            keywords: [],
            source: "application" as const,
            actionTarget: {
              kind: "application" as const,
              id,
              status,
            },
          };
        });

        const transactionItems = (txRes.data ?? []).map((entry) => {
          const id = String(entry.id ?? "");
          const status = String(entry.status ?? "PENDING");
          const provider = String(entry.provider ?? "pasarela");
          const amount = Number(entry.amount ?? 0);
          const currency = String(entry.currency ?? "USD").toUpperCase();
          const event = (entry.event as { title?: string } | undefined)?.title ?? "Evento";
          const amountFmt = new Intl.NumberFormat("es-DO", {
            style: "currency",
            currency,
            maximumFractionDigits: 2,
          }).format(amount);

          return {
            id: `tx:${id}`,
            label: `Pago ${id.slice(0, 8)}`,
            description: `${status} · ${provider} · ${amountFmt} · ${event}`,
            href: "/sales",
            keywords: [],
            source: "transaction" as const,
          };
        });

        setRemoteItems([
          ...eventItems,
          ...promoterItems,
          ...applicationItems,
          ...transactionItems,
        ]);
      } catch {
        if (!cancelled) {
          setRemoteItems([]);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [open, query, can]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const allowedModules = ITEMS.filter((item) => !item.permission || can(item.permission));
    const modules = !q
      ? allowedModules
      : ITEMS.filter((item) => {
          if (item.permission && !can(item.permission)) return false;
          const haystack = [item.label, item.description, ...item.keywords].join(" ").toLowerCase();
          return haystack.includes(q);
        });

    if (q.length < 2) return modules;

    const seen = new Set(modules.map((item) => item.id));
    const dynamic = remoteItems.filter((item) => !seen.has(item.id));
    return [...modules, ...dynamic];
  }, [query, remoteItems, can]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    setRemoteItems([]);
    setActionNotice(null);
    router.push(href);
  }

  const getQuickActions = (item: CommandItem): QuickAction[] => {
    if (!item.actionTarget) return [];
    if (item.actionTarget.kind === "event") {
      if (!can("events:edit")) return [];
      const status = item.actionTarget.status.toUpperCase();
      if (status === "PENDING") {
        return [
          { id: "event_approve", label: "Aprobar", tone: "default" },
          { id: "event_reject", label: "Rechazar", tone: "danger" },
        ];
      }
      if (status === "REJECTED") {
        return [{ id: "event_approve", label: "Aprobar", tone: "default" }];
      }
      if (status === "APPROVED") {
        return [{ id: "event_reject", label: "Rechazar", tone: "danger" }];
      }
      return [];
    }

    if (item.actionTarget.kind === "application") {
      if (!can("promoters:view")) return [];
      const status = item.actionTarget.status.toUpperCase();
      if (status !== "PENDING_APPROVAL") return [];
      return [
        { id: "application_approve", label: "Aprobar KYC", tone: "default" },
        { id: "application_reject", label: "Rechazar KYC", tone: "danger" },
      ];
    }

    return [];
  };

  const invalidateAfterQuickAction = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["admin", "events"] }),
      qc.invalidateQueries({ queryKey: ["admin", "promoter-applications"] }),
      qc.invalidateQueries({ queryKey: ["admin", "promoters"] }),
      qc.invalidateQueries({ queryKey: ["admin", "audit-logs"] }),
      qc.invalidateQueries({ queryKey: ["admin", "ops-checklist"] }),
      qc.invalidateQueries({ queryKey: ["admin", "stats"] }),
    ]);
  };

  const updateItemStatus = (itemId: string, nextStatus: string) => {
    setRemoteItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId || !item.actionTarget) return item;
        return {
          ...item,
          description:
            item.actionTarget.kind === "application"
              ? item.description.replace(item.actionTarget.status, nextStatus)
              : item.description.replace(item.actionTarget.status, nextStatus),
          actionTarget: {
            ...item.actionTarget,
            status: nextStatus,
          },
        };
      })
    );
  };

  const runQuickAction = async (item: CommandItem, action: QuickAction) => {
    if (!item.actionTarget) return;

    const busyKey = `${item.id}:${action.id}`;
    setActionBusyKey(busyKey);
    setActionNotice(null);

    try {
      if (action.id === "event_approve" && item.actionTarget.kind === "event") {
        await api.patch(`/events/${item.actionTarget.id}/approval`, {
          status: "APPROVED",
        });
        updateItemStatus(item.id, "APPROVED");
        setActionNotice({
          type: "success",
          text: `Evento aprobado: ${item.label}`,
        });
      }

      if (action.id === "event_reject" && item.actionTarget.kind === "event") {
        await api.patch(`/events/${item.actionTarget.id}/approval`, {
          status: "REJECTED",
        });
        updateItemStatus(item.id, "REJECTED");
        setActionNotice({
          type: "success",
          text: `Evento rechazado: ${item.label}`,
        });
      }

      if (
        action.id === "application_approve" &&
        item.actionTarget.kind === "application"
      ) {
        await api.patch(`/users/promoter-applications/${item.actionTarget.id}/approve`, {});
        updateItemStatus(item.id, "APPROVED");
        setActionNotice({
          type: "success",
          text: `Solicitud aprobada: ${item.label}`,
        });
      }

      if (
        action.id === "application_reject" &&
        item.actionTarget.kind === "application"
      ) {
        const feedback =
          (await actionDialog.prompt({
            title: "Rechazar solicitud KYC",
            description: "Debes incluir feedback de al menos 8 caracteres.",
            label: "Feedback",
            defaultValue: "Documentacion incompleta para aprobacion.",
            multiline: true,
            required: true,
            minLength: 8,
            confirmLabel: "Rechazar",
            tone: "destructive",
          })) ?? "";
        const normalized = feedback.trim();
        if (normalized.length < 8) {
          setActionNotice({
            type: "error",
            text: "Rechazo cancelado: feedback minimo de 8 caracteres.",
          });
          return;
        }
        await api.patch(`/users/promoter-applications/${item.actionTarget.id}/reject`, {
          feedback: normalized,
        });
        updateItemStatus(item.id, "REJECTED");
        setActionNotice({
          type: "success",
          text: `Solicitud rechazada: ${item.label}`,
        });
      }

      await invalidateAfterQuickAction();
    } catch (error) {
      setActionNotice({
        type: "error",
        text: (error as Error).message || "No se pudo ejecutar la accion.",
      });
    } finally {
      setActionBusyKey(null);
    }
  };

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-[120] flex items-start justify-center p-4 md:p-6"
          onMouseDown={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <div
            className="relative w-full max-w-2xl mt-8 border border-white/10 bg-background/95 rounded-xl overflow-hidden shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-2">
              <p className="text-base flex items-center gap-2 font-semibold">
                <Command className="size-4 text-primary" />
                Command Palette
              </p>
              <p className="text-sm text-muted-foreground">
                Navega en segundos. Atajo:{" "}
                <kbd className="rounded border border-white/10 px-1.5 py-0.5 text-[11px]">Cmd/Ctrl + K</kbd>
              </p>
            </div>

            <div className="px-5 pb-5 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  autoFocus
                  placeholder="Buscar modulo o accion..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-2">
                {isSearching ? (
                  <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    Buscando en eventos, promotores, solicitudes y pagos...
                  </div>
                ) : null}
                {actionNotice ? (
                  <div
                    className={
                      actionNotice.type === "success"
                        ? "rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200"
                        : "rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200"
                    }
                  >
                    {actionNotice.text}
                  </div>
                ) : null}
                {filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No se encontraron resultados.</p>
                ) : (
                  filtered.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.16, delay: idx * 0.02 }}
                    >
                      <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-3">
                        <button
                          type="button"
                          className="w-full text-left flex items-start justify-between gap-3 hover:opacity-90"
                          onClick={() => go(item.href)}
                        >
                          <span>
                            <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                              {item.label}
                              <span className="rounded border border-white/15 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                                {sourceBadge(item.source)}
                              </span>
                            </span>
                            <span className="block text-xs text-muted-foreground mt-0.5">{item.description}</span>
                          </span>
                          <ArrowUpRight className="size-4 text-muted-foreground shrink-0" />
                        </button>

                        {getQuickActions(item).length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {getQuickActions(item).map((action) => {
                              const busy = actionBusyKey === `${item.id}:${action.id}`;
                              return (
                                <Button
                                  key={action.id}
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={busy || !!actionBusyKey}
                                  onClick={() => void runQuickAction(item, action)}
                                  className={
                                    action.tone === "danger"
                                      ? "h-7 px-2 text-xs border-red-500/30 text-red-300 hover:bg-red-500/10"
                                      : "h-7 px-2 text-xs border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                                  }
                                >
                                  {busy ? (
                                    <>
                                      <Loader2 className="size-3 mr-1 animate-spin" />
                                      Procesando...
                                    </>
                                  ) : (
                                    action.label
                                  )}
                                </Button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {actionDialog.dialog}
    </>
  );
}
