"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@vybx/ui";
import { AlertTriangle, Building2, FileCheck2, Loader2, ShieldCheck } from "lucide-react";
import { PromoterShell } from "@/components/layout/PromoterShell";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { ProDataTable } from "@/components/pro/ProDataTable";
import { BulkActionBar } from "@/components/pro/BulkActionBar";
import {
  useApprovePromoterApplication,
  usePromoterApplications,
  usePromoterApplicationsOverview,
  usePromoters,
  useRejectPromoterApplication,
  useUpdatePromoterBankVerification,
} from "@/lib/queries";
import type { PromoterApplicationStatus, PromoterPayoutMethod } from "@/lib/types";

type PromoterReviewRow = {
  id: string;
  name: string;
  email: string;
  company: string;
  documentsOk: boolean;
  bankVerified: boolean;
  payoutMethod?: PromoterPayoutMethod | null;
  bankAccountMasked?: string | null;
  bankVerificationNotes?: string | null;
  status: PromoterApplicationStatus;
  submittedAt: string;
  reviewedAt?: string | null;
  completenessScore: number;
  riskLevel: "low" | "medium" | "high";
  riskFlags: string[];
  submittedAgeHours: number | null;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function displayName(input: { firstName?: string | null; lastName?: string | null; email: string }) {
  const full = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();
  return full || input.email;
}

function statusBadge(status: PromoterApplicationStatus) {
  if (status === "APPROVED") {
    return <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-400/30">Aprobado</Badge>;
  }
  if (status === "REJECTED") {
    return <Badge variant="destructive">Rechazado</Badge>;
  }
  return (
    <Badge variant="outline" className="text-amber-300 border-amber-400/40 bg-amber-500/10">
      Pendiente
    </Badge>
  );
}

function riskBadge(level: "low" | "medium" | "high") {
  if (level === "high") {
    return <Badge variant="destructive">Riesgo alto</Badge>;
  }
  if (level === "medium") {
    return (
      <Badge variant="outline" className="text-amber-300 border-amber-400/40 bg-amber-500/10">
        Riesgo medio
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-emerald-300 border-emerald-400/30 bg-emerald-500/10">
      Riesgo bajo
    </Badge>
  );
}

function payoutMethodLabel(method?: PromoterPayoutMethod | null) {
  if (!method) return "Sin metodo";
  if (method === "AZUL") return "Azul";
  if (method === "CARDNET") return "Cardnet";
  return "Transferencia";
}

export default function PromotersPage() {
  const [selected, setSelected] = useState<PromoterReviewRow[]>([]);
  const [bulkNotice, setBulkNotice] = useState<{
    tone: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const overviewQuery = usePromoterApplicationsOverview();
  const pendingQuery = usePromoterApplications("PENDING_APPROVAL");
  const rejectedQuery = usePromoterApplications("REJECTED");
  const approvedQuery = usePromoters();

  const approveMutation = useApprovePromoterApplication();
  const rejectMutation = useRejectPromoterApplication();
  const bankVerificationMutation = useUpdatePromoterBankVerification();

  const rows = useMemo<PromoterReviewRow[]>(() => {
    const pending = (pendingQuery.data?.data ?? []).map<PromoterReviewRow>((item) => ({
      id: item.id,
      name: displayName(item),
      email: item.email,
      company: item.promoterLegalName?.trim() || "Sin razon social",
      documentsOk: item.kyc?.documentIdPresent ?? Boolean(item.promoterDocumentId),
      bankVerified: Boolean(item.promoterBankVerifiedAt),
      payoutMethod: item.promoterPayoutMethod ?? null,
      bankAccountMasked: item.promoterBankAccountMasked ?? null,
      bankVerificationNotes: item.promoterBankVerificationNotes ?? null,
      status: "PENDING_APPROVAL",
      submittedAt: item.promoterApplicationSubmittedAt ?? item.createdAt,
      reviewedAt: item.promoterApplicationReviewedAt,
      completenessScore: item.kyc?.completenessScore ?? 0,
      riskLevel: item.kyc?.riskLevel ?? "medium",
      riskFlags: item.kyc?.riskFlags ?? [],
      submittedAgeHours: item.kyc?.submittedAgeHours ?? null,
    }));

    const rejected = (rejectedQuery.data?.data ?? []).map<PromoterReviewRow>((item) => ({
      id: item.id,
      name: displayName(item),
      email: item.email,
      company: item.promoterLegalName?.trim() || "Sin razon social",
      documentsOk: item.kyc?.documentIdPresent ?? Boolean(item.promoterDocumentId),
      bankVerified: Boolean(item.promoterBankVerifiedAt),
      payoutMethod: item.promoterPayoutMethod ?? null,
      bankAccountMasked: item.promoterBankAccountMasked ?? null,
      bankVerificationNotes: item.promoterBankVerificationNotes ?? null,
      status: "REJECTED",
      submittedAt: item.promoterApplicationSubmittedAt ?? item.createdAt,
      reviewedAt: item.promoterApplicationReviewedAt,
      completenessScore: item.kyc?.completenessScore ?? 0,
      riskLevel: item.kyc?.riskLevel ?? "medium",
      riskFlags: item.kyc?.riskFlags ?? [],
      submittedAgeHours: item.kyc?.submittedAgeHours ?? null,
    }));

    const approved = (approvedQuery.data?.data ?? []).map<PromoterReviewRow>((item) => ({
      id: item.id,
      name: displayName(item),
      email: item.email,
      company: "Promotor activo",
      documentsOk: true,
      bankVerified: Boolean(item.promoterBankVerifiedAt),
      payoutMethod: item.promoterPayoutMethod ?? null,
      bankAccountMasked: item.promoterBankAccountMasked ?? null,
      bankVerificationNotes: item.promoterBankVerificationNotes ?? null,
      status: "APPROVED",
      submittedAt: item.promoterApplicationSubmittedAt ?? item.createdAt,
      reviewedAt: item.promoterApplicationReviewedAt ?? null,
      completenessScore: 100,
      riskLevel: "low",
      riskFlags: [],
      submittedAgeHours: null,
    }));

    const all = [...pending, ...rejected, ...approved];
    return all.sort((a, b) => +new Date(b.submittedAt) - +new Date(a.submittedAt));
  }, [approvedQuery.data?.data, pendingQuery.data?.data, rejectedQuery.data?.data]);

  const loading = pendingQuery.isLoading || rejectedQuery.isLoading || approvedQuery.isLoading;

  const columns = useMemo<ColumnDef<PromoterReviewRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            aria-label="Seleccionar todos"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="size-4 accent-blue-500"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label="Seleccionar fila"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="size-4 accent-blue-500"
          />
        ),
      },
      {
        accessorKey: "name",
        header: "Promotor",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-sm">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          </div>
        ),
      },
      {
        accessorKey: "company",
        header: "Empresa",
      },
      {
        id: "kyc",
        header: "KYC",
        cell: ({ row }) => (
          <div className="text-xs space-y-1">
            <p className="text-muted-foreground">Score: {row.original.completenessScore.toFixed(0)}%</p>
            {riskBadge(row.original.riskLevel)}
          </div>
        ),
      },
      {
        id: "bank",
        header: "Banco RD",
        cell: ({ row }) => (
          <div className="text-xs space-y-1">
            {row.original.bankVerified ? (
              <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-400/30">Verificado</Badge>
            ) : (
              <Badge variant="outline" className="text-amber-300 border-amber-400/40 bg-amber-500/10">
                Pendiente
              </Badge>
            )}
            <p className="text-muted-foreground">
              {payoutMethodLabel(row.original.payoutMethod)}
              {row.original.bankAccountMasked ? ` · ${row.original.bankAccountMasked}` : ""}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Estatus",
        cell: ({ row }) => statusBadge(row.original.status),
      },
      {
        accessorKey: "submittedAt",
        header: "Enviado",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{fmtDate(row.original.submittedAt)}</span>,
      },
      {
        id: "age",
        header: "SLA",
        cell: ({ row }) => {
          if (row.original.status !== "PENDING_APPROVAL" || row.original.submittedAgeHours == null) {
            return <span className="text-xs text-muted-foreground">-</span>;
          }
          const hours = Math.round(row.original.submittedAgeHours);
          const cls =
            hours >= 48
              ? "text-destructive"
              : hours >= 24
              ? "text-amber-300"
              : "text-emerald-300";
          return <span className={`text-xs font-medium ${cls}`}>{hours}h</span>;
        },
      },
    ],
    []
  );

  const pendingCount =
    overviewQuery.data?.summary.pendingCount ??
    rows.filter((x) => x.status === "PENDING_APPROVAL").length;
  const approvedCount =
    overviewQuery.data?.summary.approvedCount ??
    rows.filter((x) => x.status === "APPROVED").length;
  const docsReadyCount =
    overviewQuery.data?.kyc.completeProfilesCount ??
    rows.filter((x) => x.completenessScore >= 100).length;
  const bankVerifiedCount =
    overviewQuery.data?.bank.verifiedPromotersCount ??
    rows.filter((x) => x.bankVerified).length;
  const highRiskCount =
    overviewQuery.data?.risk.highRiskCount ?? rows.filter((x) => x.riskLevel === "high").length;

  function settledStats(results: PromiseSettledResult<unknown>[]) {
    const success = results.filter((result) => result.status === "fulfilled").length;
    const failed = results.length - success;
    return { success, failed };
  }

  async function approveSelected() {
    const pending = selected.filter((x) => x.status === "PENDING_APPROVAL");
    if (pending.length === 0) {
      setBulkNotice({ tone: "info", text: "No hay solicitudes pendientes seleccionadas para aprobar." });
      return;
    }
    const results = await Promise.allSettled(pending.map((item) => approveMutation.mutateAsync(item.id)));
    const stats = settledStats(results);
    setBulkNotice({
      tone: stats.failed > 0 ? "error" : "success",
      text: `Resumen aprobacion -> Aprobadas: ${stats.success}/${pending.length}, Errores: ${stats.failed}.`,
    });
    setSelected([]);
  }

  async function rejectSelected() {
    const pending = selected.filter((x) => x.status === "PENDING_APPROVAL");
    if (pending.length === 0) {
      setBulkNotice({ tone: "info", text: "No hay solicitudes pendientes seleccionadas para rechazar." });
      return;
    }
    const feedback = window.prompt(
      "Feedback para rechazar (minimo 8 caracteres):",
      "Documentacion incompleta para aprobacion."
    );
    if (!feedback || feedback.trim().length < 8) return;
    const results = await Promise.allSettled(
      pending.map((item) =>
        rejectMutation.mutateAsync({
          id: item.id,
          feedback: feedback.trim(),
        })
      )
    );
    const stats = settledStats(results);
    setBulkNotice({
      tone: stats.failed > 0 ? "error" : "success",
      text: `Resumen rechazo -> Rechazadas: ${stats.success}/${pending.length}, Errores: ${stats.failed}.`,
    });
    setSelected([]);
  }

  async function verifyBankSelected() {
    const targets = selected.filter((x) => x.status !== "REJECTED");
    if (targets.length === 0) {
      setBulkNotice({ tone: "info", text: "Selecciona promotores pendientes o aprobados para verificar banco." });
      return;
    }

    const methodInput = window.prompt(
      "Metodo de liquidacion (AZUL, CARDNET, BANK_TRANSFER):",
      "BANK_TRANSFER"
    );
    if (!methodInput) return;
    const normalizedMethod = methodInput.trim().toUpperCase();
    if (!["AZUL", "CARDNET", "BANK_TRANSFER"].includes(normalizedMethod)) {
      setBulkNotice({ tone: "error", text: "Metodo invalido. Usa AZUL, CARDNET o BANK_TRANSFER." });
      return;
    }

    const accountMasked = window.prompt("Cuenta enmascarada (ej. ***1234 o 8290****123):", "***1234");
    if (!accountMasked || accountMasked.trim().length < 4) {
      setBulkNotice({ tone: "error", text: "Cuenta enmascarada invalida." });
      return;
    }
    const accountHolder = window.prompt("Titular de cuenta (opcional):", "");

    const confirmed = window.confirm(
      `Verificar banco para ${targets.length} promotor(es)?\n\n` +
        `Metodo: ${normalizedMethod}\n` +
        `Cuenta: ${accountMasked.trim()}`
    );
    if (!confirmed) return;

    const results = await Promise.allSettled(
      targets.map((item) =>
        bankVerificationMutation.mutateAsync({
          id: item.id,
          isVerified: true,
          payoutMethod: normalizedMethod as PromoterPayoutMethod,
          accountMasked: accountMasked.trim(),
          accountHolder: accountHolder?.trim() || undefined,
          notes: "Verificado por admin via bulk action.",
        })
      )
    );
    const stats = settledStats(results);
    setBulkNotice({
      tone: stats.failed > 0 ? "error" : "success",
      text: `Resumen verificacion bancaria -> Verificados: ${stats.success}/${targets.length}, Errores: ${stats.failed}.`,
    });
    setSelected([]);
  }

  async function reopenBankVerificationSelected() {
    const targets = selected.filter((x) => x.bankVerified);
    if (targets.length === 0) {
      setBulkNotice({ tone: "info", text: "No hay cuentas bancarias verificadas en la seleccion." });
      return;
    }

    const confirmed = window.confirm(
      `Marcar ${targets.length} cuenta(s) como pendientes de verificacion bancaria?`
    );
    if (!confirmed) return;

    const results = await Promise.allSettled(
      targets.map((item) =>
        bankVerificationMutation.mutateAsync({
          id: item.id,
          isVerified: false,
          notes: "Reabierta para revision de datos bancarios.",
        })
      )
    );
    const stats = settledStats(results);
    setBulkNotice({
      tone: stats.failed > 0 ? "error" : "success",
      text: `Resumen banco pendiente -> Actualizados: ${stats.success}/${targets.length}, Errores: ${stats.failed}.`,
    });
    setSelected([]);
  }

  return (
    <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Promotores (KYC)" }]} />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Gestión de Promotores (KYC)</h1>
          <p className="text-sm text-muted-foreground">
            Flujo real de revisión: aprobar/rechazar solicitudes y validar onboarding.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="kpi-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" /> Pendientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card className="kpi-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileCheck2 className="size-4 text-primary" /> Docs listos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{docsReadyCount}</p>
            </CardContent>
          </Card>
          <Card className="kpi-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="size-4 text-primary" /> Aprobados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{approvedCount}</p>
            </CardContent>
          </Card>
          <Card className="kpi-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" /> Banco verificado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{bankVerifiedCount}</p>
            </CardContent>
          </Card>
          <Card className="kpi-card md:col-span-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="size-4 text-primary" /> Riesgo y SLA
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm text-muted-foreground md:grid-cols-4">
              <p>Alto riesgo: <span className="text-foreground font-semibold">{highRiskCount}</span></p>
              <p>Cola &gt;24h: <span className="text-foreground font-semibold">{overviewQuery.data?.queue.over24hCount ?? 0}</span></p>
              <p>Cola &gt;48h: <span className="text-foreground font-semibold">{overviewQuery.data?.queue.over48hCount ?? 0}</span></p>
              <p>Promedio cola: <span className="text-foreground font-semibold">{Math.round(overviewQuery.data?.queue.averagePendingAgeHours ?? 0)}h</span></p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="size-4 animate-spin" /> Cargando solicitudes...
          </div>
        ) : (
          <ProDataTable
            data={rows}
            columns={columns}
            enableRowSelection
            onSelectionChange={setSelected}
            searchPlaceholder="Buscar promotor, email o empresa..."
            emptyMessage="No hay promotores en la cola."
          />
        )}
        {bulkNotice && (
          <div
            className={
              bulkNotice.tone === "success"
                ? "rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
                : bulkNotice.tone === "error"
                  ? "rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                  : "rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-200"
            }
          >
            {bulkNotice.text}
          </div>
        )}

        <BulkActionBar
          selectedCount={selected.length}
          onClear={() => setSelected([])}
          actions={[
            {
              id: "approve",
              label: approveMutation.isPending ? "Aprobando..." : "Aprobar seleccionados",
              onClick: () => void approveSelected(),
              variant: "default",
            },
            {
              id: "reject",
              label: rejectMutation.isPending ? "Rechazando..." : "Rechazar seleccionados",
              onClick: () => void rejectSelected(),
              variant: "destructive",
            },
            {
              id: "verify-bank",
              label: bankVerificationMutation.isPending ? "Verificando banco..." : "Verificar banco",
              onClick: () => void verifyBankSelected(),
              variant: "secondary",
            },
            {
              id: "reopen-bank",
              label: bankVerificationMutation.isPending ? "Actualizando..." : "Reabrir verificacion banco",
              onClick: () => void reopenBankVerificationSelected(),
              variant: "outline",
            },
          ]}
        />
      </div>
    </PromoterShell>
  );
}
