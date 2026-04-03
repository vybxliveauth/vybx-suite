// ── Auth ─────────────────────────────────────────────────────────────────────

import type {
  ApiError as SharedApiError,
  BackofficeEventCore,
  BackofficeEventDetailCore,
  BackofficeEventMetrics,
  AuthUserCore,
  BackofficeEventStatus,
  BackofficeTicketType,
  CancellationStatus as SharedCancellationStatus,
  DashboardResponse as SharedDashboardResponse,
  DashboardSummary as SharedDashboardSummary,
  DashboardTopEvent as SharedDashboardTopEvent,
  LoginResponseCore,
  NotificationItem as SharedNotificationItem,
  NotificationsResponse as SharedNotificationsResponse,
  NotificationSeverity as SharedNotificationSeverity,
  PaginatedResponse as SharedPaginatedResponse,
  RefundRequestCore as SharedRefundRequestCore,
  RefundStatus as SharedRefundStatus,
  UserRole as SharedUserRole,
} from "@vybx/types";

export type UserRole = SharedUserRole;

export interface AuthUser extends AuthUserCore {}

export type LoginResponse = LoginResponseCore<AuthUser>;

// ── Events ───────────────────────────────────────────────────────────────────

/** Backend EventStatus enum */
export type EventStatus = BackofficeEventStatus;

export type TicketType = BackofficeTicketType;

export type EventMetrics = BackofficeEventMetrics;

export type Event = Omit<BackofficeEventCore, "isFeatured"> & {
  isFeatured: boolean;
};

export type EventDetail = BackofficeEventDetailCore<Event, TicketType>;

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface TicketTypeAnalytics {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sold: number;
  revenue: number;
  payments: number;
  occupancyRate: number;
}

export interface EventAnalyticsResponse {
  grossRevenue: number;
  successfulPayments: number;
  refundSummary: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
  };
  ticketTypes: TicketTypeAnalytics[];
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export type DashboardSummary = SharedDashboardSummary;
export type DashboardTopEvent = SharedDashboardTopEvent;
export type DashboardResponse = SharedDashboardResponse;

// ── Notifications ─────────────────────────────────────────────────────────────

export type NotificationSeverity = SharedNotificationSeverity;
export type NotificationItem = SharedNotificationItem;
export type NotificationsResponse = SharedNotificationsResponse;

// ── Refunds ───────────────────────────────────────────────────────────────────

export type CancellationStatus = SharedCancellationStatus;
export type RefundStatus = SharedRefundStatus;
export type DisputeStatus = "NONE" | "OPEN" | "RESOLVED" | "DISMISSED";

export interface RefundRequest extends SharedRefundRequestCore {
  disputeStatus?: DisputeStatus;
}

// ── Staff ─────────────────────────────────────────────────────────────────────

export type StaffRole = "SCANNER" | "SUPERVISOR";

export interface StaffAssignment {
  id: string;
  userId: string;
  role: StaffRole;
  isActive: boolean;
  createdAt: string;
  user: { id: string; email: string; firstName?: string; lastName?: string } | null;
  createdBy: { id: string; email: string; firstName?: string; lastName?: string } | null;
}

export interface StaffListResponse {
  items: StaffAssignment[];
  total: number;
  page: number;
  pageSize: number;
}

// ── Pagination ────────────────────────────────────────────────────────────────

export type PaginatedResponse<T> = SharedPaginatedResponse<T>;

export type ApiError = SharedApiError;

// ── Admin ────────────────────────────────────────────────────────────────────

export interface AdminStatsResponse {
  users: { total: number };
  events: { total: number; active: number };
  tickets: { sold: number };
  revenue: {
    estimated: number;
    successfulPayments: number;
    platformFeePercent?: number;
    vybeCommissionEstimated?: number;
  };
  sparklines: {
    revenue: Array<{ v: number }>;
    tickets: Array<{ v: number }>;
    events: Array<{ v: number }>;
  };
}

export interface AdminObservabilitySummary {
  totalRequests: number;
  authFailures: number;
  notFound: number;
  serverErrors: number;
  clientErrors: number;
  p95LatencyMs: number;
  avgLatencyMs: number;
}

export interface AdminObservabilityHotPath {
  path: string;
  requests: number;
  authFailures: number;
  notFound: number;
  serverErrors: number;
}

export interface AdminObservabilityAlertItem {
  key: string;
  label: string;
  value: number;
  unit: "count" | "ms" | "pct";
  warning: number;
  critical: number;
  level: "ok" | "warning" | "critical";
}

export interface AdminObservabilityResponse {
  windowMinutes: number;
  generatedAt: string;
  summary: AdminObservabilitySummary;
  hotPaths: AdminObservabilityHotPath[];
  alerts: {
    level: "ok" | "warning" | "critical";
    activeCount: number;
    items: AdminObservabilityAlertItem[];
    activeItems: AdminObservabilityAlertItem[];
    thresholds: Record<string, { warning: number; critical: number }>;
  };
}

export type AdminFraudDimension = "IP" | "USER" | "DEVICE";
export type AdminFraudSeverity = "low" | "medium" | "high";

export interface AdminFraudUserLite {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
}

export interface AdminFraudCheckoutCase {
  id: string;
  source: "checkout_anti_abuse";
  dimension: AdminFraudDimension;
  severity: AdminFraudSeverity;
  event: {
    id: string;
    title: string;
    date: string;
    status: string;
  } | null;
  identifier: string;
  attemptsInWindow: number;
  lockTtlSeconds: number;
  user: AdminFraudUserLite | null;
  recommendedAction: "BLOCK_USER" | "USER_ALREADY_BLOCKED" | "MONITOR";
}

export interface AdminFraudBlockedUser {
  userId: string;
  ttlSeconds: number;
  expiresInSeconds: number | null;
  isPermanent: boolean;
  user: AdminFraudUserLite | null;
  reason: string | null;
  blockedAt: string | null;
  expiresAt: string | null;
  blockedByUserId: string | null;
  blockedByRole: string | null;
}

export interface AdminFraudSignalsResponse {
  generatedAt: string;
  summary: {
    checkoutLocksCount: number;
    managedUserBlocksCount: number;
    highRiskCount: number;
    distinctEvents: number;
    distinctUsers: number;
    dimensions: {
      ip: number;
      user: number;
      device: number;
    };
  };
  checkoutCases: AdminFraudCheckoutCase[];
  blockedUsers: AdminFraudBlockedUser[];
}

export interface AdminOpsChecklistItem {
  key: string;
  label: string;
  pendingCount: number;
  href: string;
  level: "ok" | "warning" | "breach";
  oldestAt: string | null;
  oldestAgeHours: number | null;
  targetHours: number;
  latestAuditAt?: string | null;
}

export interface AdminOpsChecklistResponse {
  generatedAt: string;
  summary: {
    totalItems: number;
    completedItems: number;
    warningItems: number;
    breachedItems: number;
  };
  items: Record<string, AdminOpsChecklistItem>;
}

export interface AdminTransaction {
  id: string;
  orderNumber: string;
  provider: string;
  status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" | string;
  amount: number;
  currency: string;
  userId: string;
  eventId: string;
  ticketTypeId?: string | null;
  reservationId?: string | null;
  providerTxId?: string | null;
  responseCode?: string | null;
  responseMessage?: string | null;
  errorDescription?: string | null;
  finalizedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  event: {
    id: string;
    title: string;
    date: string;
    status: EventStatus;
    isActive: boolean;
  } | null;
}

export interface AdminTransactionsResponse {
  summary: {
    totalAmount: number;
    totalCount: number;
    successCount: number;
    successAmount: number;
    statusBreakdown: Array<{ status: string; count: number; amount: number }>;
  };
  data: AdminTransaction[];
  total: number;
  page: number;
  pageSize: number;
}

export type AdminPayoutStatus = "PENDING" | "IN_REVIEW" | "PAID" | "FAILED";

export interface AdminPayoutItem {
  id: string;
  transactionId: string;
  orderNumber: string;
  provider: string;
  providerTxId?: string | null;
  transactionStatus: string;
  currency: string;
  grossSales: number;
  vybeCommission: number;
  itbis: number;
  netPayout: number;
  payoutStatus: AdminPayoutStatus;
  payoutNote?: string | null;
  payoutExternalReference?: string | null;
  payoutUpdatedAt?: string | null;
  payoutUpdatedByUserId?: string | null;
  payoutUpdatedByRole?: string | null;
  createdAt: string;
  finalizedAt?: string | null;
  event: {
    id: string;
    title: string;
    date: string;
    status: EventStatus;
    isActive: boolean;
  } | null;
  promoter: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    legalName?: string | null;
  } | null;
}

export interface AdminPayoutsResponse {
  summary: {
    grossSales: number;
    vybeCommission: number;
    itbis: number;
    netPayout: number;
    totalCount: number;
    statusBreakdown: Array<{
      status: AdminPayoutStatus;
      count: number;
      netPayout: number;
    }>;
  };
  data: AdminPayoutItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminPayoutReconciliationResponse {
  generatedAt: string;
  scan: {
    scanLimit: number;
    scanned: number;
  };
  totals: {
    successfulTransactions: number;
    paidPayouts: number;
    openPayouts: number;
    failedPayouts: number;
    paidCoveragePct: number;
  };
  gap: {
    count: number;
    amount: number;
    staleCount: number;
    staleAmount: number;
    oldestStaleCreatedAt: string | null;
  };
  hygiene: {
    paidWithoutReferenceCount: number;
    derivedStatusCount: number;
  };
  alerts: {
    level: "ok" | "warning" | "critical";
    activeCount: number;
    items: Array<{
      key: string;
      label: string;
      level: "ok" | "warning" | "critical";
      count: number;
      amount?: number;
    }>;
  };
  samples: {
    staleOpenPayouts: Array<{
      transactionId: string;
      orderNumber: string;
      eventTitle: string | null;
      promoterEmail: string | null;
      ageHours: number;
      netPayout: number;
      payoutStatus: AdminPayoutStatus;
    }>;
    paidWithoutReference: Array<{
      transactionId: string;
      orderNumber: string;
      eventTitle: string | null;
      promoterEmail: string | null;
      netPayout: number;
      payoutUpdatedAt: string | null;
    }>;
  };
  job?: {
    ranAt: string;
    autoEscalatedCount: number;
    autoEscalationCutoffHours: number;
  } | null;
}

export interface AdminPayoutBatchSummary {
  requestedCount?: number;
  eligibleCount?: number;
  updatedCount?: number;
  processedCount?: number;
  skippedCount: number;
  failedCount: number;
  totalNetPayout?: number;
}

export interface AdminBulkPayoutStatusUpdateResponse {
  batch: {
    id: string;
    executedAt: string;
    mode: "bulk_selection";
    targetStatus: AdminPayoutStatus;
  };
  summary: AdminPayoutBatchSummary;
  updatedItems: AdminPayoutItem[];
  skipped: Array<{
    transactionId: string;
    reason: string;
  }>;
  failed: Array<{
    transactionId: string;
    reason: string;
  }>;
}

export interface AdminExecutePayoutBatchResponse {
  batch: {
    id: string;
    executedAt: string;
    mode: "queue_execution";
    sourceStatuses: AdminPayoutStatus[];
    targetStatus: AdminPayoutStatus;
    limit: number;
  };
  summary: AdminPayoutBatchSummary;
  processedItems: AdminPayoutItem[];
  skipped: Array<{
    transactionId: string;
    reason: string;
  }>;
  failed: Array<{
    transactionId: string;
    reason: string;
  }>;
}

export interface AdminPayoutBatchHistoryItem {
  id: string;
  mode: "bulk_selection" | "queue_execution";
  targetStatus: AdminPayoutStatus;
  sourceStatuses?: AdminPayoutStatus[];
  limit?: number;
  executedAt: string;
  actorUserId: string | null;
  actorRole: string | null;
  summary: AdminPayoutBatchSummary;
  skipped: Array<{ transactionId: string; reason: string }>;
  failed: Array<{ transactionId: string; reason: string }>;
}

export interface AdminPayoutBatchHistoryResponse {
  generatedAt: string;
  pagination: {
    limit: number;
    returned: number;
  };
  items: AdminPayoutBatchHistoryItem[];
}

export interface AdminAuditActor {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: UserRole | string;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  entityType: "USER" | "EVENT" | string;
  entityId: string;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  actorUserId: string | null;
  actorRole: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: AdminAuditActor | null;
}

export interface AdminAuditLogsResponse {
  data: AdminAuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

export type PromoterApplicationStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED";

export type PromoterPayoutMethod = "STRIPE_CONNECT" | "PAYPAL" | "BANK_TRANSFER";

export interface AdminPromoterApplication {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: UserRole | string;
  promoterApplicationStatus: PromoterApplicationStatus;
  promoterLegalName?: string | null;
  promoterDocumentId?: string | null;
  promoterInstagram?: string | null;
  promoterEventDescription?: string | null;
  promoterApplicationFeedback?: string | null;
  promoterApplicationSubmittedAt?: string | null;
  promoterApplicationReviewedAt?: string | null;
  promoterApplicationReviewedByUserId?: string | null;
  promoterPayoutMethod?: PromoterPayoutMethod | null;
  promoterBankAccountHolder?: string | null;
  promoterBankAccountMasked?: string | null;
  promoterBankVerificationNotes?: string | null;
  promoterBankVerifiedAt?: string | null;
  promoterBankVerifiedByUserId?: string | null;
  createdAt: string;
  kyc?: {
    legalNamePresent: boolean;
    documentIdPresent: boolean;
    instagramPresent: boolean;
    eventDescriptionPresent: boolean;
    eventDescriptionLength: number;
    completenessScore: number;
    submittedAgeHours: number | null;
    documentCollisionCount: number;
    legalNameCollisionCount: number;
    riskLevel: "low" | "medium" | "high";
    riskFlags: string[];
  };
}

export interface AdminPromoterApplicationsOverviewResponse {
  generatedAt: string;
  summary: {
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    totalReviewed: number;
  };
  queue: {
    oldestPendingAt: string | null;
    averagePendingAgeHours: number;
    over24hCount: number;
    over48hCount: number;
  };
  kyc: {
    completeProfilesCount: number;
    missingDocumentCount: number;
    missingLegalNameCount: number;
    missingDescriptionCount: number;
  };
  risk: {
    highRiskCount: number;
    mediumRiskCount: number;
    duplicateDocumentCases: number;
  };
  bank: {
    verifiedPromotersCount: number;
    unverifiedPromotersCount: number;
    pendingWithBankDataCount: number;
  };
  samples: {
    highRiskPending: Array<{
      id: string;
      email: string;
      firstName?: string | null;
      lastName?: string | null;
      submittedAt: string;
      riskLevel: "low" | "medium" | "high";
      riskFlags: string[];
      completenessScore: number;
      submittedAgeHours: number | null;
    }>;
  };
}

export interface AdminUserRecord {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: UserRole | string;
  promoterApplicationStatus?: PromoterApplicationStatus;
  promoterApplicationSubmittedAt?: string | null;
  promoterApplicationReviewedAt?: string | null;
  promoterPayoutMethod?: PromoterPayoutMethod | null;
  promoterBankAccountHolder?: string | null;
  promoterBankAccountMasked?: string | null;
  promoterBankVerificationNotes?: string | null;
  promoterBankVerifiedAt?: string | null;
  promoterBankVerifiedByUserId?: string | null;
  createdAt: string;
}

export interface AdminUserManageRecord {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  phoneNumbers?: string[];
  phoneNumbersVerified?: string[];
  dateOfBirth?: string | null;
  gender?: string | null;
  genderCustom?: string | null;
  country?: string | null;
  stateProvince?: string | null;
  city?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  role: UserRole | string;
  promoterApplicationStatus?: PromoterApplicationStatus;
  promoterApplicationSubmittedAt?: string | null;
  promoterApplicationReviewedAt?: string | null;
  promoterPayoutMethod?: PromoterPayoutMethod | null;
  promoterBankAccountHolder?: string | null;
  promoterBankAccountMasked?: string | null;
  promoterBankVerificationNotes?: string | null;
  promoterBankVerifiedAt?: string | null;
  promoterBankVerifiedByUserId?: string | null;
  createdAt: string;
}

export type TicketCancellationRefundStatus =
  | "NONE"
  | "PENDING"
  | "REFUNDED"
  | "FAILED";

export type TicketCancellationDisputeStatus =
  | "NONE"
  | "OPEN"
  | "RESOLVED"
  | "DISMISSED";

export interface AdminTicketCancellationRequest {
  id: string;
  ticketId: string;
  requesterUserId: string;
  paymentTransactionId?: string | null;
  status: CancellationStatus;
  refundStatus: TicketCancellationRefundStatus;
  refundAmount: number | null;
  disputeStatus: TicketCancellationDisputeStatus;
  disputeReason: string | null;
  disputeOpenedAt: string | null;
  disputeResolvedAt: string | null;
  refundProviderRef: string | null;
  refundFailureReason: string | null;
  refundUpdatedAt: string | null;
  reason: string | null;
  requestedAt: string;
  reviewNotes: string | null;
  reviewedAt: string | null;
  ticket: {
    id: string;
    paymentTransactionId?: string | null;
    paidAmount?: number | null;
    user?: {
      id: string;
      email: string;
      firstName?: string | null;
      lastName?: string | null;
    } | null;
    ticketType: {
      id: string;
      name: string;
      price: number;
      event: {
        id: string;
        title: string;
      };
    };
  };
  requester: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  reviewer: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
}

export interface AdminTicketCancellationListResponse {
  data: AdminTicketCancellationRequest[];
  total: number;
  page: number;
  pageSize: number;
}
