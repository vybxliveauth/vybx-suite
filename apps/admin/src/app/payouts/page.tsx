"use client";

import { useCallback, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@vybx/ui";
import { Calculator, CircleDollarSign, FileDown, FileText, Landmark, Loader2 } from "lucide-react";
import { PromoterShell } from "@/components/layout/PromoterShell";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { ProDataTable } from "@/components/pro/ProDataTable";
import { BulkActionBar } from "@/components/pro/BulkActionBar";
import { useAdminActionDialog } from "@/components/shared/use-admin-action-dialog";
import type { AdminPayoutItem, AdminPayoutStatus } from "@/lib/types";
import {
  useAdminPayoutBatchHistory,
  useAdminPayouts,
  useBulkUpdateAdminPayoutStatus,
  useExportAdminPayoutFiscalReceipt,
  useExportAdminPayoutFiscalReport,
  useExecuteAdminPayoutBatch,
} from "@/lib/queries";

type PayoutRow = AdminPayoutItem;

type NoticeTone = "success" | "error" | "info";

function money(value: number, currency = "USD", decimals: 0 | 2 = 2) {
  const safeCurrency =
    typeof currency === "string" && currency.trim().length === 3
      ? currency.toUpperCase()
      : "USD";
  return new Intl.NumberFormat("es-US", {
    style: "currency",
    currency: safeCurrency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function statusBadge(status: AdminPayoutStatus) {
  if (status === "PAID") {
    return (
      <Badge variant="outline" className="text-emerald-300 border-emerald-400/40 bg-emerald-500/10">
        Pagado
      </Badge>
    );
  }
  if (status === "FAILED") {
    return (
      <Badge variant="outline" className="text-rose-300 border-rose-400/40 bg-rose-500/10">
        Fallido
      </Badge>
    );
  }
  if (status === "IN_REVIEW") {
    return (
      <Badge variant="outline" className="text-sky-300 border-sky-400/40 bg-sky-500/10">
        En revision
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-amber-300 border-amber-400/40 bg-amber-500/10">
      Pendiente
    </Badge>
  );
}

export default function PayoutsPage() {
  const [selected, setSelected] = useState<PayoutRow[]>([]);
  const [receiptLoadingId, setReceiptLoadingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(null);
  const actionDialog = useAdminActionDialog();
  const payoutQuery = useAdminPayouts(1, 100, "ALL");
  const historyQuery = useAdminPayoutBatchHistory(12);
  const bulkUpdatePayoutStatus = useBulkUpdateAdminPayoutStatus();
  const executePayoutBatch = useExecuteAdminPayoutBatch();
  const exportPayoutFiscalReport = useExportAdminPayoutFiscalReport();
  const exportPayoutFiscalReceipt = useExportAdminPayoutFiscalReceipt();

  const rows = useMemo<PayoutRow[]>(() => {
    return payoutQuery.data?.data ?? [];
  }, [payoutQuery.data?.data]);

  const downloadPayoutReceipt = useCallback(
    async (row: PayoutRow) => {
      if (row.payoutStatus !== "PAID") {
        setNotice({
          tone: "info",
          text: "El comprobante fiscal solo se habilita para pagos marcados como pagados.",
        });
        return;
      }

      try {
        setReceiptLoadingId(row.id);
        setNotice(null);
        const { blob, fileName } = await exportPayoutFiscalReceipt.mutateAsync(row.id);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        setNotice({
          tone: "success",
          text: `Comprobante fiscal descargado para orden ${row.orderNumber}.`,
        });
      } catch (error) {
        setNotice({
          tone: "error",
          text:
            (error as Error)?.message ||
            "No se pudo generar el comprobante fiscal de este pago.",
        });
      } finally {
        setReceiptLoadingId(null);
      }
    },
    [exportPayoutFiscalReceipt]
  );

  const columns = useMemo<ColumnDef<PayoutRow>[]>(
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
        accessorKey: "event",
        header: "Evento / Beneficiario",
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-medium">{row.original.event?.title ?? "Evento sin titulo"}</p>
            <p className="text-xs text-muted-foreground">Orden: {row.original.orderNumber}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.promoter?.legalName ?? row.original.promoter?.email ?? "Promotor no asociado"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "provider",
        header: "Gateway",
        cell: ({ row }) => <span className="font-mono text-xs uppercase">{row.original.provider}</span>,
      },
      {
        accessorKey: "grossSales",
        header: "Venta total",
        cell: ({ row }) => (
          <span className="font-mono text-sm">
            {money(row.original.grossSales, row.original.currency)}
          </span>
        ),
      },
      {
        id: "formula",
        header: "Calculo neto",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {money(row.original.grossSales, row.original.currency)} -{" "}
            {money(row.original.vybeCommission, row.original.currency)} -{" "}
            {money(row.original.itbis, row.original.currency)} (impuesto sobre comisión)
          </span>
        ),
      },
      {
        accessorKey: "netPayout",
        header: "Pago neto",
        cell: ({ row }) => (
          <span className="font-semibold text-sm">
            {money(row.original.netPayout, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: "payoutStatus",
        header: "Estatus",
        cell: ({ row }) => statusBadge(row.original.payoutStatus),
      },
      {
        id: "receipt",
        header: "Comprobante",
        cell: ({ row }) =>
          row.original.payoutStatus === "PAID" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void downloadPayoutReceipt(row.original)}
              disabled={
                exportPayoutFiscalReceipt.isPending &&
                receiptLoadingId === row.original.id
              }
            >
              {exportPayoutFiscalReceipt.isPending &&
              receiptLoadingId === row.original.id ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Generando...
                </>
              ) : (
                <>
                  <FileText className="mr-2 size-4" /> Comprobante
                </>
              )}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">Disponible al pagar</span>
          ),
      },
    ],
    [downloadPayoutReceipt, exportPayoutFiscalReceipt.isPending, receiptLoadingId]
  );

  const pendingAmount = useMemo(() => {
    const breakdown = payoutQuery.data?.summary.statusBreakdown;
    if (!breakdown?.length) {
      return rows.filter((x) => x.payoutStatus !== "PAID").reduce((acc, cur) => acc + cur.netPayout, 0);
    }
    return breakdown.filter((item) => item.status !== "PAID").reduce((acc, item) => acc + item.netPayout, 0);
  }, [payoutQuery.data?.summary.statusBreakdown, rows]);

  const payableCount = useMemo(() => {
    const breakdown = payoutQuery.data?.summary.statusBreakdown;
    if (!breakdown?.length) {
      return rows.filter((x) => x.payoutStatus !== "PAID").length;
    }
    return breakdown.filter((item) => item.status !== "PAID").reduce((acc, item) => acc + item.count, 0);
  }, [payoutQuery.data?.summary.statusBreakdown, rows]);

  async function bulkSetStatus(status: AdminPayoutStatus, externalReference?: string) {
    if (selected.length === 0) {
      setNotice({ tone: "info", text: "Selecciona al menos una liquidación." });
      return;
    }
    try {
      setNotice(null);
      const result = await bulkUpdatePayoutStatus.mutateAsync({
        transactionIds: selected.map((row) => row.id),
        status,
        externalReference,
      });
      const updated = result.summary.updatedCount ?? 0;
      const skipped = result.summary.skippedCount ?? 0;
      const failed = result.summary.failedCount ?? 0;
      const tone: NoticeTone = failed > 0 ? "error" : "success";
      setNotice({
        tone,
        text: `Batch ${result.batch.id}: actualizados ${updated}, omitidos ${skipped}, fallidos ${failed}.`,
      });
      setSelected([]);
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          (error as Error)?.message || "No se pudo actualizar estatus de liquidaciones.",
      });
    }
  }

  async function executeQueueBatch(source: AdminPayoutStatus[], target: AdminPayoutStatus) {
    const limitInput = await actionDialog.prompt({
      title: "Ejecutar lote",
      description: "Define cuántas transacciones procesar en este batch.",
      label: "Cantidad máxima (1-500)",
      defaultValue: "50",
      inputType: "number",
      required: true,
      validate: (value) => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          return "Ingresa un número válido mayor que 0.";
        }
        return null;
      },
      confirmLabel: "Continuar",
    });
    if (!limitInput) return;
    const parsed = Number(limitInput);
    if (!Number.isFinite(parsed) || parsed <= 0) return;

    const externalReferencePrefix =
      target === "PAID"
        ? (
            await actionDialog.prompt({
              title: "Prefijo de referencia externa",
              description: "Opcional: se usará para el lote marcado como pagado.",
              label: "Prefijo",
              defaultValue: "",
              confirmLabel: "Aplicar",
            })
          ) ?? undefined
        : undefined;

    try {
      setNotice(null);
      const result = await executePayoutBatch.mutateAsync({
        sourceStatuses: source,
        targetStatus: target,
        limit: Math.min(500, Math.max(1, Math.round(parsed))),
        externalReferencePrefix:
          externalReferencePrefix && externalReferencePrefix.trim().length > 0
            ? externalReferencePrefix.trim()
            : undefined,
      });
      const eligible = result.summary.eligibleCount ?? 0;
      const processed = result.summary.processedCount ?? 0;
      const totalNet = result.summary.totalNetPayout ?? 0;
      setNotice({
        tone: "success",
        text: `Batch ${result.batch.id}: elegibles ${eligible}, procesados ${processed}, monto neto ${money(totalNet)}.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          (error as Error)?.message ||
          "No se pudo ejecutar el batch de liquidaciones.",
      });
    }
  }

  async function copySelectedIds() {
    const text = selected.map((x) => x.id).join("\n");
    if (!text) {
      setNotice({ tone: "info", text: "No hay IDs seleccionados para copiar." });
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setNotice({ tone: "success", text: "IDs copiados al portapapeles." });
      setSelected([]);
    } catch (error) {
      setNotice({
        tone: "error",
        text: (error as Error)?.message || "No se pudieron copiar los IDs.",
      });
    }
  }

  async function copySelectedOrders() {
    const text = selected.map((x) => x.orderNumber).join("\n");
    if (!text) {
      setNotice({ tone: "info", text: "No hay órdenes seleccionadas para copiar." });
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setNotice({ tone: "success", text: "Órdenes copiadas al portapapeles." });
      setSelected([]);
    } catch (error) {
      setNotice({
        tone: "error",
        text: (error as Error)?.message || "No se pudieron copiar las órdenes.",
      });
    }
  }

  async function downloadFiscalReport() {
    try {
      setNotice(null);
      const { blob, fileName } = await exportPayoutFiscalReport.mutateAsync({
        status: "ALL",
      });

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setNotice({
        tone: "success",
        text: "Reporte fiscal descargado correctamente.",
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          (error as Error)?.message ||
          "No se pudo exportar el reporte fiscal. Revisa permisos o conexión.",
      });
    }
  }

  return (
    <PromoterShell breadcrumb={<PageBreadcrumb items={[{ label: "Liquidaciones" }]} />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Motor de Liquidaciones (Payouts)</h1>
          <p className="text-sm text-muted-foreground">
            Cola real de liquidaciones desde backend ({rows.length}) con estado persistente.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void executeQueueBatch(["PENDING"], "IN_REVIEW")}
              disabled={executePayoutBatch.isPending}
            >
              Encolar pendientes a revision
            </Button>
            <Button
              size="sm"
              onClick={() => void executeQueueBatch(["IN_REVIEW"], "PAID")}
              disabled={executePayoutBatch.isPending}
            >
              Ejecutar lote IN_REVIEW a PAID
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void downloadFiscalReport()}
              disabled={exportPayoutFiscalReport.isPending}
            >
              {exportPayoutFiscalReport.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Generando reporte...
                </>
              ) : (
                <>
                  <FileDown className="mr-2 size-4" /> Descargar reporte fiscal (CSV)
                </>
              )}
            </Button>
          </div>
        </div>

        {notice && (
          <div
            className={
              notice.tone === "success"
                ? "rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
                : notice.tone === "info"
                  ? "rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-200"
                  : "rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            }
          >
            {notice.text}
          </div>
        )}

        {(payoutQuery.isError || historyQuery.isError) && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            No se pudieron cargar algunas secciones de liquidaciones.
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="ml-3 h-7"
              onClick={() => {
                void payoutQuery.refetch();
                void historyQuery.refetch();
              }}
            >
              Reintentar
            </Button>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="kpi-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CircleDollarSign className="size-4 text-primary" /> Monto pendiente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{money(pendingAmount)}</p>
            </CardContent>
          </Card>
          <Card className="kpi-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Landmark className="size-4 text-primary" /> Transacciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{payableCount}</p>
            </CardContent>
          </Card>
          <Card className="kpi-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calculator className="size-4 text-primary" /> Formula neta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Venta total - Comisión Vybx - impuesto de plataforma
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="kpi-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Historial de Batches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {historyQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando historial...</p>
            ) : historyQuery.data?.items?.length ? (
              historyQuery.data.items.map((item) => (
                <div key={item.id} className="rounded-md border border-border/50 bg-card/40 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{item.id}</p>
                    {statusBadge(item.targetStatus)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.mode === "queue_execution" ? "Batch de cola" : "Batch manual"} •{" "}
                    {new Date(item.executedAt).toLocaleString("es-US", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Procesados: {item.summary.processedCount ?? item.summary.updatedCount ?? 0} | Omitidos:{" "}
                    {item.summary.skippedCount} | Fallidos: {item.summary.failedCount}
                    {typeof item.summary.totalNetPayout === "number"
                      ? ` | Neto: ${money(item.summary.totalNetPayout)}`
                      : ""}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Todavia no hay batches ejecutados.</p>
            )}
          </CardContent>
        </Card>

        {payoutQuery.isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="size-4 animate-spin" /> Cargando liquidaciones...
          </div>
        ) : (
          <ProDataTable
            data={rows}
            columns={columns}
            enableRowSelection
            onSelectionChange={setSelected}
            searchPlaceholder="Buscar evento, orden o proveedor..."
            emptyMessage="Sin pagos en cola."
          />
        )}

        <BulkActionBar
          selectedCount={selected.length}
          onClear={() => setSelected([])}
          actions={[
            {
              id: "mark-review",
              label: bulkUpdatePayoutStatus.isPending ? "Procesando..." : "Marcar en revision",
              onClick: () => void bulkSetStatus("IN_REVIEW"),
              variant: "outline",
            },
            {
              id: "mark-paid",
              label: bulkUpdatePayoutStatus.isPending ? "Procesando..." : "Marcar pagado",
              onClick: async () => {
                const externalReference =
                  (await actionDialog.prompt({
                    title: "Referencia externa",
                    description: "Opcional para conciliación manual.",
                    label: "Referencia",
                    defaultValue: "",
                    confirmLabel: "Continuar",
                  })) ?? undefined;
                void bulkSetStatus("PAID", externalReference);
              },
              variant: "default",
            },
            {
              id: "mark-failed",
              label: bulkUpdatePayoutStatus.isPending ? "Procesando..." : "Marcar fallido",
              onClick: () => void bulkSetStatus("FAILED"),
              variant: "outline",
            },
            { id: "copy-orders", label: "Copiar ordenes", onClick: () => void copySelectedOrders(), variant: "outline" },
            { id: "copy-ids", label: "Copiar IDs", onClick: () => void copySelectedIds(), variant: "outline" },
          ]}
        />
        {actionDialog.dialog}
      </div>
    </PromoterShell>
  );
}
