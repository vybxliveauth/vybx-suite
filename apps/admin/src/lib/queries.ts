import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type {
  AdminAuditLogsResponse,
  AdminObservabilityResponse,
  AdminOpsChecklistResponse,
  AdminBulkPayoutStatusUpdateResponse,
  AdminExecutePayoutBatchResponse,
  AdminFraudSignalsResponse,
  AdminPayoutBatchHistoryResponse,
  AdminPayoutReconciliationResponse,
  AdminPayoutStatus,
  AdminPayoutsResponse,
  AdminPromoterApplicationsOverviewResponse,
  AdminPromoterApplication,
  AdminStatsResponse,
  AdminTicketCancellationListResponse,
  AdminTransactionsResponse,
  AdminUserManageRecord,
  AdminUserRecord,
  Event,
  EventAnalyticsResponse,
  EventDetail,
  EventStatus,
  PaginatedResponse,
  PromoterApplicationStatus,
  PromoterPayoutMethod,
  UserRole,
} from "./types";

function makeQueryString(params: Record<string, string | number | undefined | null>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    qs.set(key, String(value));
  });
  return qs.toString();
}

function parseDownloadFilename(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) return fallback;

  const utf8Match = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const simpleMatch = contentDisposition.match(/filename\s*=\s*"?([^";]+)"?/i);
  if (simpleMatch?.[1]) {
    return simpleMatch[1];
  }
  return fallback;
}

// ── Query keys ────────────────────────────────────────────────────────────────
export const qk = {
  dashboard: ["dashboard"] as const,
  adminStats: ["admin", "stats"] as const,
  adminOpsChecklist: ["admin", "ops-checklist"] as const,
  adminObservability: (windowMinutes: number) =>
    ["admin", "observability", windowMinutes] as const,
  adminTransactions: (page: number, pageSize: number, status?: string) =>
    ["admin", "transactions", page, pageSize, status ?? "ALL"] as const,
  adminPayouts: (page: number, pageSize: number, status?: string) =>
    ["admin", "payouts", page, pageSize, status ?? "ALL"] as const,
  adminPayoutReconciliation: ["admin", "payouts", "reconciliation"] as const,
  adminPayoutBatchHistory: (limit: number) =>
    ["admin", "payouts", "batches", "history", limit] as const,
  adminAuditLogs: (page: number, pageSize: number, q?: string) =>
    ["admin", "audit-logs", page, pageSize, q ?? ""] as const,
  adminEvents: (page: number, pageSize: number, status?: EventStatus) =>
    ["admin", "events", page, pageSize, status ?? "ALL"] as const,
  events: (page: number, pageSize: number) => ["events", page, pageSize] as const,
  event: (id: string) => ["event", id] as const,
  eventAnalytics: (id: string) => ["event-analytics", id] as const,
  adminRefunds: (page: number, pageSize: number, status?: string) =>
    ["admin", "refunds", page, pageSize, status ?? "ALL"] as const,
  promoterApplications: (status: PromoterApplicationStatus | "ALL", q?: string) =>
    ["admin", "promoter-applications", status, q ?? ""] as const,
  promoterApplicationsOverview: ["admin", "promoter-applications", "overview"] as const,
  promoters: (q?: string) => ["admin", "promoters", q ?? ""] as const,
  users: (page: number, pageSize: number, role: string, q: string) =>
    ["admin", "users", page, pageSize, role, q] as const,
  adminFraudSignals: (limit: number, dimension: string) =>
    ["admin", "fraud", "signals", limit, dimension] as const,
  adminCategories: ["admin", "categories"] as const,
} as const;

// ── Legacy/promoter hooks reused by existing screens ─────────────────────────
export interface DashboardResponse {
  summary: {
    totalEvents: number;
    activeEvents: number;
    pendingEvents: number;
    upcomingEvents: number;
    soldTickets: number;
    cancelledTickets: number;
    successfulPayments: number;
    grossRevenue: number;
    refundRequestsPending: number;
  };
  topEvents: Array<{
    eventId: string;
    title: string;
    revenue: number;
    successfulPayments: number;
    soldTickets: number;
  }>;
}

export interface AdminCategory {
  id: string;
  name: string;
  icon: string | null;
  order: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function useDashboard() {
  return useQuery({
    queryKey: qk.dashboard,
    queryFn: () => api.get<DashboardResponse>("/promoter/dashboard"),
    staleTime: 2 * 60 * 1000,
  });
}

export function useEvents(page = 1, pageSize = 50) {
  return useQuery({
    queryKey: qk.events(page, pageSize),
    queryFn: () =>
      api.get<PaginatedResponse<Event>>(`/promoter/events?${makeQueryString({ page, limit: pageSize })}`),
  });
}

export function useEventDetail(id: string) {
  return useQuery({
    queryKey: qk.event(id),
    queryFn: () => api.get<EventDetail>(`/promoter/events/${id}`),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

export function useEventAnalytics(id: string) {
  return useQuery({
    queryKey: qk.eventAnalytics(id),
    queryFn: () => api.get<EventAnalyticsResponse>(`/promoter/events/${id}/analytics`),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

// ── Admin hooks ───────────────────────────────────────────────────────────────
export function useAdminStats() {
  return useQuery({
    queryKey: qk.adminStats,
    queryFn: () => api.get<AdminStatsResponse>("/admin/stats"),
    staleTime: 60 * 1000,
  });
}

export function useAdminOpsChecklist() {
  return useQuery({
    queryKey: qk.adminOpsChecklist,
    queryFn: () => api.get<AdminOpsChecklistResponse>("/admin/ops-checklist"),
    staleTime: 60 * 1000,
  });
}

export function useAdminObservability(windowMinutes = 60) {
  return useQuery({
    queryKey: qk.adminObservability(windowMinutes),
    queryFn: () =>
      api.get<AdminObservabilityResponse>(
        `/admin/observability?${makeQueryString({ windowMinutes })}`
      ),
    staleTime: 30 * 1000,
  });
}

export function useAdminFraudSignals(
  limit = 80,
  dimension: "ALL" | "IP" | "USER" | "DEVICE" = "ALL",
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: qk.adminFraudSignals(limit, dimension),
    queryFn: () =>
      api.get<AdminFraudSignalsResponse>(
        `/admin/fraud/signals?${makeQueryString({
          limit,
          dimension,
        })}`
      ),
    staleTime: 30 * 1000,
    enabled: options?.enabled,
  });
}

export function useAdminCategories() {
  return useQuery({
    queryKey: qk.adminCategories,
    queryFn: () => api.get<AdminCategory[]>("/categories"),
    staleTime: 60 * 1000,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      name: string;
      icon?: string;
      order?: number;
      isActive?: boolean;
    }) => api.post<AdminCategory>("/categories", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminCategories });
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        name?: string;
        icon?: string;
        order?: number;
        isActive?: boolean;
      };
    }) => api.patch<AdminCategory>(`/categories/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminCategories });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminCategories });
    },
  });
}

export function useAdminTransactions(page = 1, pageSize = 50, status?: string) {
  return useQuery({
    queryKey: qk.adminTransactions(page, pageSize, status),
    queryFn: () =>
      api.get<AdminTransactionsResponse>(
        `/admin/transactions?${makeQueryString({
          page,
          limit: pageSize,
          status: status && status !== "ALL" ? status : undefined,
        })}`
      ),
    staleTime: 30 * 1000,
  });
}

export function useAdminPayouts(
  page = 1,
  pageSize = 100,
  status?: AdminPayoutStatus | "ALL"
) {
  const safePageSize = Math.min(100, Math.max(1, pageSize));
  return useQuery({
    queryKey: qk.adminPayouts(page, safePageSize, status),
    queryFn: () =>
      api.get<AdminPayoutsResponse>(
        `/admin/payouts?${makeQueryString({
          page,
          limit: safePageSize,
          status: status && status !== "ALL" ? status : undefined,
        })}`
      ),
    staleTime: 30 * 1000,
  });
}

export function useAdminPayoutReconciliation() {
  return useQuery({
    queryKey: qk.adminPayoutReconciliation,
    queryFn: () => api.get<AdminPayoutReconciliationResponse>("/admin/payouts/reconciliation"),
    staleTime: 60 * 1000,
  });
}

export function useAdminPayoutBatchHistory(limit = 20) {
  return useQuery({
    queryKey: qk.adminPayoutBatchHistory(limit),
    queryFn: () =>
      api.get<AdminPayoutBatchHistoryResponse>(
        `/admin/payouts/batches/history?${makeQueryString({ limit })}`
      ),
    staleTime: 30 * 1000,
  });
}

export function useExportAdminPayoutFiscalReport() {
  return useMutation({
    mutationFn: async ({
      status,
      provider,
      from,
      to,
      q,
    }: {
      status?: AdminPayoutStatus | "ALL";
      provider?: string;
      from?: string;
      to?: string;
      q?: string;
    }) => {
      const query = makeQueryString({
        status: status && status !== "ALL" ? status : undefined,
        provider: provider?.trim() || undefined,
        from,
        to,
        q: q?.trim() || undefined,
      });

      const today = new Date().toISOString().slice(0, 10);
      const fallbackFileName = `admin-payouts-fiscal-report-${today}.csv`;
      const res = await api.raw(`/admin/payouts/fiscal-report/export${query ? `?${query}` : ""}`, {
        method: "GET",
      });

      const fileName = parseDownloadFilename(
        res.headers.get("content-disposition"),
        fallbackFileName
      );
      const blob = await res.blob();
      return { blob, fileName };
    },
  });
}

export function useExportAdminPayoutFiscalReceipt() {
  return useMutation({
    mutationFn: async (transactionId: string) => {
      const fallbackFileName = `comprobante-payout-${transactionId}.csv`;
      const res = await api.raw(`/admin/payouts/${transactionId}/fiscal-receipt/export`, {
        method: "GET",
      });
      const fileName = parseDownloadFilename(
        res.headers.get("content-disposition"),
        fallbackFileName
      );
      const blob = await res.blob();
      return { blob, fileName };
    },
  });
}

export function useAdminAuditLogs(page = 1, pageSize = 50, q?: string) {
  return useQuery({
    queryKey: qk.adminAuditLogs(page, pageSize, q),
    queryFn: () =>
      api.get<AdminAuditLogsResponse>(
        `/admin/audit-logs?${makeQueryString({
          page,
          limit: pageSize,
          q: q?.trim() || undefined,
        })}`
      ),
    staleTime: 30 * 1000,
  });
}

export function useAdminEvents(page = 1, pageSize = 100, status?: EventStatus | "ALL") {
  return useQuery({
    queryKey: qk.adminEvents(page, pageSize, status && status !== "ALL" ? status : undefined),
    queryFn: () =>
      api.get<PaginatedResponse<Event>>(
        `/events/admin/all?${makeQueryString({
          page,
          limit: pageSize,
          status: status && status !== "ALL" ? status : undefined,
        })}`
      ),
    staleTime: 30 * 1000,
  });
}

export function useAdminRefunds(page = 1, pageSize = 100, status?: string) {
  const safePageSize = Math.min(100, Math.max(1, pageSize));
  return useQuery({
    queryKey: qk.adminRefunds(page, safePageSize, status),
    queryFn: () =>
      api.get<AdminTicketCancellationListResponse>(
        `/tickets/cancellations/admin?${makeQueryString({
          page,
          limit: safePageSize,
          status: status && status !== "ALL" ? status : undefined,
        })}`
      ),
    staleTime: 30 * 1000,
  });
}

export function usePromoterApplications(status: PromoterApplicationStatus | "ALL" = "PENDING_APPROVAL", q?: string) {
  return useQuery({
    queryKey: qk.promoterApplications(status, q),
    queryFn: async () => {
      if (status !== "ALL") {
        return api.get<PaginatedResponse<AdminPromoterApplication>>(
          `/users/promoter-applications?${makeQueryString({
            status,
            page: 1,
            limit: 100,
            q: q?.trim() || undefined,
          })}`
        );
      }

      const [pending, rejected] = await Promise.all([
        api.get<PaginatedResponse<AdminPromoterApplication>>(
          `/users/promoter-applications?${makeQueryString({
            status: "PENDING_APPROVAL",
            page: 1,
            limit: 100,
            q: q?.trim() || undefined,
          })}`
        ),
        api.get<PaginatedResponse<AdminPromoterApplication>>(
          `/users/promoter-applications?${makeQueryString({
            status: "REJECTED",
            page: 1,
            limit: 100,
            q: q?.trim() || undefined,
          })}`
        ),
      ]);

      const data = [...pending.data, ...rejected.data];
      return {
        data,
        total: data.length,
        page: 1,
        pageSize: data.length || 100,
      } satisfies PaginatedResponse<AdminPromoterApplication>;
    },
    staleTime: 30 * 1000,
  });
}

export function usePromoterApplicationsOverview() {
  return useQuery({
    queryKey: qk.promoterApplicationsOverview,
    queryFn: () =>
      api.get<AdminPromoterApplicationsOverviewResponse>(
        "/users/promoter-applications/overview"
      ),
    staleTime: 30 * 1000,
  });
}

export function usePromoters(q?: string) {
  return useQuery({
    queryKey: qk.promoters(q),
    queryFn: () =>
      api.get<PaginatedResponse<AdminUserRecord>>(
        `/users/promoters?${makeQueryString({
          page: 1,
          limit: 100,
          q: q?.trim() || undefined,
        })}`
      ),
    staleTime: 30 * 1000,
  });
}

export function useUsers(
  page = 1,
  pageSize = 50,
  role: UserRole | "ALL" = "ALL",
  q?: string,
  options?: { enabled?: boolean },
) {
  const normalizedSearch = q?.trim() ?? "";
  return useQuery({
    queryKey: qk.users(page, pageSize, role, normalizedSearch),
    queryFn: () =>
      api.get<PaginatedResponse<AdminUserManageRecord>>(
        `/users?${makeQueryString({
          page,
          limit: pageSize,
          role: role !== "ALL" ? role : undefined,
          q: normalizedSearch || undefined,
        })}`
      ),
    staleTime: 30 * 1000,
    enabled: options?.enabled,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────
export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/events/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["admin", "events"] });
    },
  });
}

export function useToggleEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/events/${id}/status`, { isActive }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: qk.event(id) });
      qc.invalidateQueries({ queryKey: ["admin", "events"] });
    },
  });
}

export function useUpdateEventApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: EventStatus }) =>
      api.patch(`/events/${id}/approval`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "events"] }),
  });
}

export function useUpdateEventFeatured() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isFeatured }: { id: string; isFeatured: boolean }) =>
      api.patch(`/events/${id}/featured`, { isFeatured }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: qk.event(id) });
      qc.invalidateQueries({ queryKey: ["admin", "events"] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useDuplicateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<EventDetail>(`/promoter/events/${id}/duplicate`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useReviewAdminRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      reviewNotes,
    }: {
      id: string;
      decision: "APPROVE" | "REJECT";
      reviewNotes?: string;
    }) => api.patch(`/tickets/cancellations/${id}/review`, { decision, reviewNotes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "refunds"] }),
  });
}

export function useUpdateAdminRefundExecution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      refundAmount,
      providerReference,
      note,
    }: {
      id: string;
      action: "MARK_PENDING" | "MARK_REFUNDED" | "MARK_FAILED";
      refundAmount?: number;
      providerReference?: string;
      note?: string;
    }) =>
      api.patch(`/tickets/cancellations/${id}/refund`, {
        action,
        refundAmount,
        providerReference,
        note,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "refunds"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      qc.invalidateQueries({ queryKey: ["admin", "transactions"] });
    },
  });
}

export function useUpdateAdminRefundDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      note,
    }: {
      id: string;
      action: "OPEN" | "RESOLVE" | "DISMISS";
      note?: string;
    }) =>
      api.patch(`/tickets/cancellations/${id}/dispute`, {
        action,
        note,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "refunds"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

export function useBlockFraudUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      reason,
      durationMinutes,
    }: {
      id: string;
      reason: string;
      durationMinutes?: number;
    }) =>
      api.patch(`/admin/fraud/users/${id}/block`, {
        reason,
        durationMinutes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "fraud"] });
    },
  });
}

export function useUnblockFraudUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      api.patch(`/admin/fraud/users/${id}/unblock`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "fraud"] });
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      email,
      password,
      role,
    }: {
      email: string;
      password: string;
      role: UserRole;
    }) => api.post("/users", { email, password, role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      api.patch(`/users/${id}/role`, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}

export function useDeleteUserAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "fraud"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}

export function useSendUserPasswordReset() {
  return useMutation({
    mutationFn: (email: string) =>
      api.post("/auth/request-password-reset", {
        email,
      }),
  });
}

export function useApprovePromoterApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/users/promoter-applications/${id}/approve`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "promoter-applications"] });
      qc.invalidateQueries({ queryKey: qk.promoterApplicationsOverview });
      qc.invalidateQueries({ queryKey: ["admin", "promoters"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}

export function useRejectPromoterApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, feedback }: { id: string; feedback: string }) =>
      api.patch(`/users/promoter-applications/${id}/reject`, { feedback }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "promoter-applications"] });
      qc.invalidateQueries({ queryKey: qk.promoterApplicationsOverview });
      qc.invalidateQueries({ queryKey: ["admin", "promoters"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}

export function useUpdatePromoterBankVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      isVerified,
      payoutMethod,
      accountHolder,
      accountMasked,
      notes,
    }: {
      id: string;
      isVerified: boolean;
      payoutMethod?: PromoterPayoutMethod;
      accountHolder?: string;
      accountMasked?: string;
      notes?: string;
    }) =>
      api.patch(`/users/${id}/promoter-bank-verification`, {
        isVerified,
        payoutMethod,
        accountHolder,
        accountMasked,
        notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "promoter-applications"] });
      qc.invalidateQueries({ queryKey: qk.promoterApplicationsOverview });
      qc.invalidateQueries({ queryKey: ["admin", "promoters"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}

export function useUpdateAdminPayoutStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      note,
      externalReference,
    }: {
      id: string;
      status: AdminPayoutStatus;
      note?: string;
      externalReference?: string;
    }) => api.patch(`/admin/payouts/${id}/status`, { status, note, externalReference }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "payouts"] });
      qc.invalidateQueries({ queryKey: ["admin", "transactions"] });
    },
  });
}

export function useBulkUpdateAdminPayoutStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      transactionIds,
      status,
      note,
      externalReference,
      externalReferencePrefix,
    }: {
      transactionIds: string[];
      status: AdminPayoutStatus;
      note?: string;
      externalReference?: string;
      externalReferencePrefix?: string;
    }) =>
      api.patch<AdminBulkPayoutStatusUpdateResponse>("/admin/payouts/status/bulk", {
        transactionIds,
        status,
        note,
        externalReference,
        externalReferencePrefix,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "payouts"] });
      qc.invalidateQueries({ queryKey: ["admin", "transactions"] });
      qc.invalidateQueries({ queryKey: ["admin", "payouts", "reconciliation"] });
      qc.invalidateQueries({ queryKey: ["admin", "payouts", "batches", "history"] });
      qc.invalidateQueries({ queryKey: ["admin", "ops-checklist"] });
    },
  });
}

export function useExecuteAdminPayoutBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sourceStatuses,
      targetStatus,
      limit,
      note,
      externalReferencePrefix,
    }: {
      sourceStatuses?: AdminPayoutStatus[];
      targetStatus: AdminPayoutStatus;
      limit?: number;
      note?: string;
      externalReferencePrefix?: string;
    }) =>
      api.patch<AdminExecutePayoutBatchResponse>("/admin/payouts/batches/execute", {
        sourceStatuses,
        targetStatus,
        limit,
        note,
        externalReferencePrefix,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "payouts"] });
      qc.invalidateQueries({ queryKey: ["admin", "transactions"] });
      qc.invalidateQueries({ queryKey: ["admin", "payouts", "reconciliation"] });
      qc.invalidateQueries({ queryKey: ["admin", "payouts", "batches", "history"] });
      qc.invalidateQueries({ queryKey: ["admin", "ops-checklist"] });
    },
  });
}
