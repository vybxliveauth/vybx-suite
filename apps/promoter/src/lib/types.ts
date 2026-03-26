// ── Auth ─────────────────────────────────────────────────────────────────────

export type UserRole = "USER" | "PROMOTER" | "ADMIN" | "SUPER_ADMIN";

export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

// ── Events ───────────────────────────────────────────────────────────────────

/** Backend EventStatus enum */
export type EventStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface TicketType {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sold: number;
}

export interface EventMetrics {
  totalCapacity: number;
  totalSold: number;
  occupancyRate: number;  // 0-100
  grossRevenue: number;
  successfulPayments: number;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  location: string | null;
  tags: string[];
  date: string; // ISO
  status: EventStatus;
  isActive: boolean;
  categoryId: string | null;
  ownerId: string;
  metrics?: EventMetrics;
}

export interface EventDetail extends Event {
  ticketTypes: TicketType[];
}

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

export interface DashboardSummary {
  totalEvents: number;
  activeEvents: number;
  pendingEvents: number;
  upcomingEvents: number;
  soldTickets: number;
  cancelledTickets: number;
  successfulPayments: number;
  grossRevenue: number;
  refundRequestsPending: number;
}

export interface DashboardTopEvent {
  eventId: string;
  title: string;
  revenue: number;
  successfulPayments: number;
  soldTickets: number;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  topEvents: DashboardTopEvent[];
}

// ── Notifications ─────────────────────────────────────────────────────────────

export type NotificationSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface NotificationItem {
  key: string;
  title: string;
  message: string;
  href: string;
  severity: NotificationSeverity;
  isRead: boolean;
  readAt: string | null;
}

export interface NotificationsResponse {
  unreadCount: number;
  generatedAt: string;
  items: NotificationItem[];
}

// ── Refunds ───────────────────────────────────────────────────────────────────

export type CancellationStatus = "REQUESTED" | "APPROVED" | "REJECTED";
export type RefundStatus = "NONE" | "PENDING" | "REFUNDED" | "FAILED";

export interface RefundRequest {
  id: string;
  status: CancellationStatus;
  refundStatus: RefundStatus;
  reason: string | null;
  requestedAt: string;
  ticket: {
    id: string;
    ticketType: {
      name: string;
      price: number;
      event: { id: string; title: string };
    };
  };
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

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  message: string;
  code?: string;
}
