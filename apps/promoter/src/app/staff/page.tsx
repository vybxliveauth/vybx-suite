"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { RefreshCw, UserPlus, UserX, ShieldCheck, Users } from "lucide-react";
import {
  Badge,
  Button,
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Input,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@vybx/ui";
import { PromoterShell } from "@/components/layout/PromoterShell";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { api } from "@/lib/api";
import type { Event, PaginatedResponse, StaffAssignment, StaffListResponse, StaffRole } from "@/lib/types";

function displayName(u?: { firstName?: string; lastName?: string; email?: string } | null) {
  const full = [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim();
  return full || u?.email || "—";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default function StaffPage() {
  const [events,        setEvents]        = useState<Event[]>([]);
  const [selectedId,   setSelectedId]    = useState("");
  const [assignments,  setAssignments]   = useState<StaffAssignment[]>([]);
  const [statusFilter, setStatusFilter]  = useState<"ALL" | "ACTIVE" | "INACTIVE">("ACTIVE");
  const [roleFilter,   setRoleFilter]    = useState<"ALL" | StaffRole>("ALL");
  const [search,       setSearch]        = useState("");

  const [email,        setEmail]         = useState("");
  const [role,         setRole]          = useState<StaffRole>("SCANNER");

  const [loadingEvents,   setLoadingEvents]   = useState(true);
  const [loadingStaff,    setLoadingStaff]    = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [actingId,        setActingId]        = useState<string | null>(null);
  const [error,           setError]           = useState<string | null>(null);
  const [notice,          setNotice]          = useState<string | null>(null);

  async function loadEvents() {
    setLoadingEvents(true);
    try {
      const res = await api.get<PaginatedResponse<Event>>("/promoter/events?page=1&limit=100");
      const items = res.data ?? [];
      setEvents(items);
      setSelectedId((prev) => {
        if (prev && items.some((e) => e.id === prev)) return prev;
        return items.find((e) => e.isActive)?.id ?? items[0]?.id ?? "";
      });
    } catch { /* ignore */ }
    finally { setLoadingEvents(false); }
  }

  async function loadStaff(eventId = selectedId) {
    if (!eventId) { setAssignments([]); return; }
    setLoadingStaff(true);
    try {
      const qs = new URLSearchParams({ page: "1", limit: "100" });
      if (statusFilter === "ACTIVE")   qs.set("isActive", "true");
      if (statusFilter === "INACTIVE") qs.set("isActive", "false");
      const res = await api.get<StaffListResponse>(
        `/event-staff/events/${eventId}/assignments?${qs}`
      );
      setAssignments(res.items ?? []);
    } catch { setAssignments([]); }
    finally { setLoadingStaff(false); }
  }

  useEffect(() => { void loadEvents(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void loadStaff(); },       // eslint-disable-line react-hooks/exhaustive-deps
    [selectedId, statusFilter]);               // eslint-disable-line react-hooks/exhaustive-deps

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedId) ?? null,
    [events, selectedId]
  );

  const filtered = useMemo(() => {
    return assignments.filter((a) => {
      if (roleFilter !== "ALL" && a.role !== roleFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        displayName(a.user).toLowerCase().includes(q) ||
        (a.user?.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [assignments, roleFilter, search]);

  const summary = useMemo(() => ({
    total:       filtered.length,
    active:      filtered.filter((a) => a.isActive).length,
    supervisors: filtered.filter((a) => a.role === "SUPERVISOR").length,
  }), [filtered]);

  async function handleAssign(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !selectedId) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await api.post(`/event-staff/events/${selectedId}/assign`, { email: trimmed, role });
      setEmail("");
      setNotice("Staff asignado correctamente.");
      void loadStaff();
    } catch (err) {
      const msg = (err as Error).message ?? "";
      setError(/not found|not registered|no user/i.test(msg)
        ? "Solo usuarios registrados pueden ser asignados. Verifica el correo."
        : msg || "Error al asignar staff.");
    } finally { setSaving(false); }
  }

  async function handleDeactivate(id: string) {
    if (!selectedId) return;
    setActingId(id);
    setError(null); setNotice(null);
    try {
      await api.patch(`/event-staff/events/${selectedId}/assignments/${id}/deactivate`, {});
      setAssignments((prev) =>
        prev.map((a) => a.id === id ? { ...a, isActive: false } : a)
      );
      setNotice("Asignación desactivada.");
    } catch (err) { setError((err as Error).message || "Error al desactivar."); }
    finally { setActingId(null); }
  }

  async function handleReactivate(a: StaffAssignment) {
    if (!selectedId) return;
    setActingId(a.id);
    setError(null); setNotice(null);
    try {
      await api.post(`/event-staff/events/${selectedId}/assign`, { userId: a.userId, role: a.role });
      setAssignments((prev) =>
        prev.map((x) => x.id === a.id ? { ...x, isActive: true } : x)
      );
      setNotice("Asignación reactivada.");
    } catch (err) { setError((err as Error).message || "Error al reactivar."); }
    finally { setActingId(null); }
  }

  return (
    <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Staff" }]} />}>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Users className="size-5 text-primary" /> Staff
            </h1>
            <p className="text-sm text-muted-foreground">
              Asigna escáneres y supervisores a tus eventos.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { void loadEvents(); void loadStaff(); }}
            disabled={loadingEvents || loadingStaff}
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${loadingEvents || loadingStaff ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {notice && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            {notice}
          </div>
        )}

        {/* Event selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evento</CardTitle>
            <CardDescription>Selecciona el evento al que asignarás el staff.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Select
                value={selectedId}
                onValueChange={setSelectedId}
                disabled={loadingEvents || events.length === 0}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={loadingEvents ? "Cargando…" : "Selecciona un evento"} />
                </SelectTrigger>
                <SelectContent>
                  {events.map((ev) => (
                    <SelectItem key={ev.id} value={ev.id}>{ev.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Solo activos</SelectItem>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="INACTIVE">Solo inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedEvent && (
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <p className="font-medium text-sm">{selectedEvent.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {fmtDate(selectedEvent.date)} · {selectedEvent.location ?? "Ubicación pendiente"}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ShieldCheck className="size-3.5" />
                    {selectedEvent.status}
                  </span>
                  <Badge
                    variant="outline"
                    className={selectedEvent.isActive
                      ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10 text-[11px]"
                      : "text-slate-400 border-slate-500/20 bg-slate-500/10 text-[11px]"}
                  >
                    {selectedEvent.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assign form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Asignar staff</CardTitle>
            <CardDescription>
              Solo usuarios con cuenta registrada pueden ser asignados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAssign} className="flex flex-col sm:flex-row gap-3">
              <Input
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!selectedId || saving}
                className="flex-1"
              />
              <Select
                value={role}
                onValueChange={(v) => setRole(v as StaffRole)}
                disabled={!selectedId || saving}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCANNER">Scanner</SelectItem>
                  <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={!selectedId || saving} className="shrink-0">
                <UserPlus className="size-4 mr-1.5" />
                {saving ? "Asignando…" : "Asignar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Assignments table */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">Asignaciones actuales</CardTitle>
                <CardDescription>
                  {summary.total} asignaciones · {summary.active} activas · {summary.supervisors} supervisores
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Input
                placeholder="Buscar por nombre o correo…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1"
              />
              <Select
                value={roleFilter}
                onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los roles</SelectItem>
                  <SelectItem value="SCANNER">Scanner</SelectItem>
                  <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden md:table-cell">Asignado por</TableHead>
                  <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingStaff ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6} className="py-3">
                        <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                      {selectedId
                        ? "No hay asignaciones con los filtros actuales."
                        : "Selecciona un evento para ver el staff."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{displayName(a.user)}</p>
                        <p className="text-xs text-muted-foreground">{a.user?.email ?? "—"}</p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={a.role === "SUPERVISOR"
                            ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                            : "bg-sky-500/10 text-sky-400 border-sky-500/20"}
                        >
                          {a.role === "SUPERVISOR" ? "Supervisor" : "Scanner"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm ${a.isActive ? "text-emerald-400" : "text-muted-foreground"}`}>
                          {a.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {displayName(a.createdBy)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {fmtDate(a.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {a.isActive ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={actingId === a.id}
                            onClick={() => void handleDeactivate(a.id)}
                            className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <UserX className="size-3.5 mr-1" />
                            {actingId === a.id ? "…" : "Desactivar"}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={actingId === a.id}
                            onClick={() => void handleReactivate(a)}
                            className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                          >
                            <UserPlus className="size-3.5 mr-1" />
                            {actingId === a.id ? "…" : "Reactivar"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>
    </PromoterShell>
  );
}
