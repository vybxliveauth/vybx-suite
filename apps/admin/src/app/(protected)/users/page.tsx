"use client";

import { useEffect, useState, useRef } from "react";
import {
  Users, UserCheck, ShieldCheck, Crown,
  Search, Trash2, Save,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, CardHeader, CardTitle,
  Input,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@vybx/ui";
import { BackofficeShell } from "@/components/layout/BackofficeShell";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/page-states";
import { Pagination } from "@/components/shared/pagination";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import type { UserRecord, UserRole, Paginated } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────
function roleBadgeClass(role: UserRole) {
  if (role === "SUPER_ADMIN") return "bg-red-500/10 text-red-400 border-red-500/20";
  if (role === "ADMIN")       return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  if (role === "PROMOTER")    return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
  return "bg-slate-500/10 text-slate-300 border-slate-500/20";
}

function roleLabel(role: UserRole) {
  if (role === "SUPER_ADMIN") return "Super Admin";
  if (role === "ADMIN")       return "Admin";
  if (role === "PROMOTER")    return "Promotor";
  return "Usuario";
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const [result, setResult]   = useState<Paginated<UserRecord>>({ data: [], total: 0, page: 1, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState("");

  // Per-row role edit state: userId -> selected role
  const [roleEdits, setRoleEdits] = useState<Record<string, UserRole>>({});
  const [savingRole, setSavingRole] = useState<string | null>(null);

  // Delete confirm dialog
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [deleting, setDeleting]         = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function load(p = page, q = search) {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ page: String(p), limit: "20" });
    if (q.trim()) qs.set("q", q.trim());
    api
      .get<Paginated<UserRecord>>(`/users?${qs}`)
      .then(setResult)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }


  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      load(1, search);
      setPage(1);
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const users = result.data;

  // Client-side search filter on mock
  const visible = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      !q ||
      u.email.toLowerCase().includes(q) ||
      (u.firstName ?? "").toLowerCase().includes(q) ||
      (u.lastName ?? "").toLowerCase().includes(q)
    );
  });

  // Stats
  const totalCount    = users.length;
  const buyerCount    = users.filter((u) => u.role === "USER").length;
  const promoterCount = users.filter((u) => u.role === "PROMOTER").length;
  const adminCount    = users.filter((u) => u.role === "ADMIN" || u.role === "SUPER_ADMIN").length;

  async function handleSaveRole(userId: string) {
    const newRole = roleEdits[userId];
    if (!newRole) return;
    setSavingRole(userId);
    try {
      await api.patch(`/users/${userId}/role`, { role: newRole });
      setResult((prev) => ({
        ...prev,
        data: prev.data.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      }));
      setRoleEdits((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    } catch {
      // ignore
    } finally {
      setSavingRole(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      setResult((prev) => ({
        ...prev,
        data: prev.data.filter((u) => u.id !== deleteTarget.id),
        total: prev.total - 1,
      }));
      setDeleteTarget(null);
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  }

  return (
    <BackofficeShell>
      <div className="space-y-7">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Usuarios</h1>
          <p className="text-sm text-slate-400">Gestión de cuentas y roles en la plataforma</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total usuarios",  value: totalCount,    icon: Users,      color: "text-violet-400" },
            { label: "Compradores",     value: buyerCount,    icon: UserCheck,  color: "text-cyan-400" },
            { label: "Promotores",      value: promoterCount, icon: Crown,      color: "text-amber-400" },
            { label: "Staff admin",     value: adminCount,    icon: ShieldCheck,color: "text-emerald-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="bo-card">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-400">
                  {label}
                </CardTitle>
                <Icon className={`size-4 ${color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-100">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="bo-filters">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-white/30" />
            <Input
              placeholder="Buscar por email o nombre…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 bg-[#101722] border-[#243243] text-[#e8edf3] placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* Table */}
        <Card className="bo-card">
          <CardContent className="p-0">
            {error ? (
              <ErrorState message={error} onRetry={() => load(page)} />
            ) : loading ? (
              <TableSkeleton rows={8} cols={5} />
            ) : visible.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <div className="bo-table-wrap">
                  <Table>
                    <TableHeader className="bg-[#121b27]">
                      <TableRow className="border-[#1f2b3a] hover:bg-transparent text-[11px] text-slate-400 uppercase tracking-wide">
                        <TableHead className="text-slate-400 font-medium h-10">Email</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10">Rol</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10 hidden sm:table-cell">Verificado</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10 hidden lg:table-cell">Registro</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10 text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visible.map((user) => {
                        const pendingRole = roleEdits[user.id];
                        const isDirty     = pendingRole !== undefined && pendingRole !== user.role;
                        return (
                          <TableRow
                            key={user.id}
                            className="border-[#1f2b3a] hover:bg-[#131e2c] transition-colors"
                          >
                            <TableCell className="py-4">
                              <p className="text-slate-200 text-sm">
                                {user.firstName
                                  ? `${user.firstName} ${user.lastName ?? ""}`
                                  : user.email}
                              </p>
                              {user.firstName && (
                                <p className="text-xs text-slate-400">{user.email}</p>
                              )}
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex items-center gap-2">
                                <Select
                                  value={pendingRole ?? user.role}
                                  onValueChange={(v) =>
                                    setRoleEdits((prev) => ({ ...prev, [user.id]: v as UserRole }))
                                  }
                                >
                                  <SelectTrigger className="h-7 w-36 bg-white/5 border-white/10 text-xs text-slate-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-[#0c121a] border-[#243243] shadow-lg">
                                    <SelectItem value="USER">Usuario</SelectItem>
                                    <SelectItem value="PROMOTER">Promotor</SelectItem>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                                {isDirty && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={savingRole === user.id}
                                    onClick={() => handleSaveRole(user.id)}
                                    className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                  >
                                    <Save className="size-3.5 mr-1" />
                                    Guardar
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-4 hidden sm:table-cell">
                              <Badge
                                variant="outline"
                                className={
                                  user.emailVerified
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                }
                              >
                                {user.emailVerified ? "Verificado" : "Pendiente"}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-4 text-slate-500 text-xs hidden lg:table-cell whitespace-nowrap">
                              {fmtDate(user.createdAt)}
                            </TableCell>
                            <TableCell className="py-4 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteTarget(user)}
                                className="h-7 px-2 text-xs text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="px-4">
                  <Pagination
                    page={page}
                    pageSize={result.pageSize}
                    total={result.total}
                    onPageChange={(p) => {
                      setPage(p);
                      load(p);
                    }}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="bg-[#0c121a] border-[#243243] shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Eliminar usuario</DialogTitle>
            <DialogDescription className="text-slate-400">
              Esta acción es irreversible. El usuario{" "}
              <span className="text-white font-medium">{deleteTarget?.email}</span> será
              eliminado permanentemente de la plataforma.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              className="border-white/10 text-slate-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? "Eliminando…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BackofficeShell>
  );
}
