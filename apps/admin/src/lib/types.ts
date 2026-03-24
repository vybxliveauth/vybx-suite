export type UserRole = "USER" | "PROMOTER" | "ADMIN" | "SUPER_ADMIN";
export type EventStatus = "PENDING" | "APPROVED" | "REJECTED";
export type TxStatus = "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";
export type CancellationStatus = "REQUESTED" | "APPROVED" | "REJECTED";
export type RefundStatus = "NONE" | "PENDING" | "REFUNDED" | "FAILED";
export type PromoterAppStatus = "NONE" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
export type AuditAction =
  | "USER_ROLE_UPDATED"
  | "EVENT_APPROVAL_STATUS_UPDATED"
  | "PROMOTER_APPLICATION_APPROVED"
  | "PROMOTER_APPLICATION_REJECTED";
export type AuditEntityType = "USER" | "EVENT";

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface Profile {
  userId: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export interface DashboardStats {
  totalRevenue: number;
  ticketsSold: number;
  activeEvents: number;
  successRate: number;           // 0-100
  sparklines: { date: string; revenue: number; tickets: number; events: number }[];
}

export interface OpsChecklistItem {
  key: string;
  label: string;
  count: number;
  href: string;
  targetHours: number;
  oldestAgeHours: number | null;
}

export interface OpsChecklistResponse {
  items: OpsChecklistItem[];
  generatedAt: string;
}

export interface ObservabilitySnapshot {
  windowMinutes: number;
  totalRequests: number;
  errorRate: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

// ── Events ────────────────────────────────────────────────────────────────────
export interface TicketTypeRecord {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sold: number;
}

export interface EventRecord {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  location: string | null;
  tags: string[];
  date: string;
  status: EventStatus;
  isActive: boolean;
  categoryId: string | null;
  owner: { id: string; email: string; firstName?: string; lastName?: string };
  ticketTypes: TicketTypeRecord[];
  createdAt: string;
}

// ── Users ─────────────────────────────────────────────────────────────────────
export interface UserRecord {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  emailVerified: boolean;
  promoterApplicationStatus: PromoterAppStatus;
  promoterLegalName?: string;
  promoterDocumentId?: string;
  promoterInstagram?: string;
  promoterEventDescription?: string;
  promoterApplicationSubmittedAt?: string;
  createdAt: string;
}

// ── Transactions ──────────────────────────────────────────────────────────────
export interface TransactionRecord {
  id: string;
  orderId: string;
  status: TxStatus;
  amount: number;
  provider: string;
  providerTxId?: string;
  createdAt: string;
  user: { id: string; email: string; firstName?: string; lastName?: string } | null;
  event: { id: string; title: string } | null;
}

// ── Categories ────────────────────────────────────────────────────────────────
export interface CategoryRecord {
  id: string;
  name: string;
  icon: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Cancellations ─────────────────────────────────────────────────────────────
export interface CancellationRecord {
  id: string;
  status: CancellationStatus;
  refundStatus: RefundStatus;
  reason: string | null;
  reviewNotes: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  ticket: {
    id: string;
    qrCode: string | null;
    ticketType: {
      name: string;
      price: number;
      event: { id: string; title: string };
    };
  };
  requester: { id: string; email: string; firstName?: string; lastName?: string };
  reviewer: { id: string; email: string } | null;
}

// ── Audit Logs ────────────────────────────────────────────────────────────────
export interface AuditLogRecord {
  id: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  summary: string;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: { id: string; email: string; role: UserRole } | null;
}

// ── Pagination ────────────────────────────────────────────────────────────────
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
