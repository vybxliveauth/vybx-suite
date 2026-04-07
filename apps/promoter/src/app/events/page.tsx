"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, CalendarDays, MoreHorizontal, Eye, Pencil, Trash2, Loader2, ScanLine } from "lucide-react";
import {
  Button,
  Input,
  Badge,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@vybx/ui";
import { PromoterShell } from "@/components/layout/PromoterShell";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { useEvents, useDeleteEvent } from "@/lib/queries";
import type { Event, EventStatus } from "@/lib/types";

type StatusBadge = { label: string; variant: "default" | "secondary" | "destructive" | "outline" };

function getStatusBadge(event: Event): StatusBadge {
  if (!event.isActive && event.status === "APPROVED") return { label: "Inactivo", variant: "secondary" };
  const map: Record<EventStatus, StatusBadge> = {
    APPROVED: { label: "Publicado", variant: "default" },
    PENDING:  { label: "Pendiente", variant: "outline" },
    REJECTED: { label: "Rechazado", variant: "destructive" },
  };
  return map[event.status];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}

export default function EventsPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useEvents();
  const deleteEvent = useDeleteEvent();

  const events = data?.data ?? [];

  const filtered = events.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.location ?? "").toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`¿Eliminar "${title}"? Esta acción no se puede deshacer.`)) return;
    deleteEvent.mutate(id);
  }

  return (
    <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Eventos" }]} />}>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Eventos</h1>
            <p className="text-sm text-muted-foreground">{events.length} eventos en total</p>
          </div>
          <Button asChild size="sm">
            <Link href="/events/new">
              <Plus className="size-4" />
              Nuevo evento
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="pt-4 overflow-x-auto">
            <div className="relative mb-4 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar eventos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead className="hidden md:table-cell">Fecha</TableHead>
                  <TableHead className="hidden sm:table-cell">Estado</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Boletos</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      <Loader2 className="mx-auto size-5 animate-spin mb-2" />
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      <CalendarDays className="mx-auto size-8 mb-2 opacity-40" />
                      No se encontraron eventos
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((ev) => {
                    const st = getStatusBadge(ev);
                    const m = ev.metrics;
                    const isDeleting = deleteEvent.isPending && deleteEvent.variables === ev.id;
                    return (
                      <TableRow key={ev.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{ev.title}</p>
                          {ev.location && (
                            <p className="text-xs text-muted-foreground">{ev.location}</p>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {fmtDate(ev.date)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-right text-sm tabular-nums">
                          {m ? `${m.totalSold} / ${m.totalCapacity}` : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono">
                          {m ? fmtCurrency(m.grossRevenue) : "—"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                {isDeleting ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <MoreHorizontal className="size-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/events/${ev.id}`}>
                                  <Eye className="size-4" />
                                  Ver detalles
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/scan/${ev.id}`}>
                                  <ScanLine className="size-4" />
                                  Escanear boletos
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/events/${ev.id}/edit`}>
                                  <Pencil className="size-4" />
                                  Editar
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDelete(ev.id, ev.title)}
                              >
                                <Trash2 className="size-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PromoterShell>
  );
}
