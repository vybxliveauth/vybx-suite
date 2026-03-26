"use client";

import { useEffect, useState, useRef } from "react";
import {
  UserCog, Users, Clock, Search,
} from "lucide-react";
import {
  Badge, Card, CardContent, CardHeader, CardTitle,
  Input,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@vybx/ui";
import { BackofficeShell } from "@/components/layout/BackofficeShell";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/page-states";
import { Pagination } from "@/components/shared/pagination";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import type { UserRecord, PromoterAppStatus, Paginated } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────
function appStatusClass(s: PromoterAppStatus) {
  if (s === "APPROVED")         return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (s === "PENDING_APPROVAL") return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  if (s === "REJECTED")         return "bg-red-500/10 text-red-400 border-red-500/20";
  return "bg-slate-500/10 text-slate-300 border-slate-500/20";
}

function appStatusLabel(s: PromoterAppStatus) {
  if (s === "APPROVED")         return "Aprobado";
  if (s === "PENDING_APPROVAL") return "Pendiente";
  if (s === "REJECTED")         return "Rechazado";
  return "Sin solicitud";
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PromotersPage() {
  const [result, setResult]   = useState<Paginated<UserRecord>>({ data: [], total: 0, page: 1, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState("");

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function load(p = page, q = search) {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ page: String(p), limit: "20", role: "PROMOTER" });
    if (q.trim()) qs.set("q", q.trim());
    api
      .get<Paginated<UserRecord>>(`/users?${qs}`)
      .then(setResult)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }


  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { load(1, search); setPage(1); }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const promoters = result.data;
  const visible = promoters.filter((u) => {
    const q = search.toLowerCase();
    return (
      !q ||
      u.email.toLowerCase().includes(q) ||
      (u.firstName ?? "").toLowerCase().includes(q) ||
      (u.lastName ?? "").toLowerCase().includes(q) ||
      (u.promoterLegalName ?? "").toLowerCase().includes(q)
    );
  });

  const totalCount   = promoters.length;
  const onPageCount  = visible.length;
  const pendingCount = promoters.filter((u) => u.promoterApplicationStatus === "PENDING_APPROVAL").length;

  return (
    <BackofficeShell>
      <div className="space-y-7">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Promotores</h1>
          <p className="text-sm text-slate-400">
            Cuentas con rol de promotor registradas en la plataforma
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total promotores",      value: totalCount,   icon: UserCog, color: "text-blue-400" },
            { label: "En esta página",         value: onPageCount,  icon: Users,   color: "text-cyan-400" },
            { label: "Solicitudes pendientes", value: pendingCount, icon: Clock,   color: "text-amber-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="bo-card">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-400">{label}</CardTitle>
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-600" />
            <Input
              placeholder="Buscar por nombre, email o razón social…"
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
              <TableSkeleton rows={5} cols={4} />
            ) : visible.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <div className="bo-table-wrap">
                  <Table>
                    <TableHeader className="bg-[#121b27]">
                      <TableRow className="border-[#1f2b3a] hover:bg-transparent">
                        <TableHead className="text-slate-400 font-medium h-10">Nombre</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10">Email</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10">Estado solicitud</TableHead>
                        <TableHead className="text-slate-400 font-medium h-10 hidden md:table-cell">Registro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visible.map((user) => (
                        <TableRow key={user.id} className="border-[#1f2b3a] hover:bg-[#131e2c] transition-colors">
                          <TableCell className="py-4">
                            <p className="text-slate-200 font-medium">
                              {user.firstName} {user.lastName}
                            </p>
                            {user.promoterLegalName && (
                              <p className="text-xs text-slate-400">{user.promoterLegalName}</p>
                            )}
                          </TableCell>
                          <TableCell className="py-4 text-slate-400 text-sm">
                            {user.email}
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant="outline" className={appStatusClass(user.promoterApplicationStatus)}>
                              {appStatusLabel(user.promoterApplicationStatus)}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 text-slate-500 text-xs hidden md:table-cell whitespace-nowrap">
                            {fmtDate(user.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="px-4">
                  <Pagination
                    page={page}
                    pageSize={result.pageSize}
                    total={result.total}
                    onPageChange={(p) => { setPage(p); load(p); }}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </BackofficeShell>
  );
}
