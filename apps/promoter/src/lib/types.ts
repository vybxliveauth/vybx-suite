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

export type Event = BackofficeEventCore;

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

export type RefundRequest = SharedRefundRequestCore;

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
