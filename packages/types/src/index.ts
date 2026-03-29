export type UserRole = "USER" | "PROMOTER" | "ADMIN" | "SUPER_ADMIN";

export interface AuthUserCore {
  userId: string;
  email: string;
  role: UserRole;
  permissions?: string[];
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

export interface LoginResponseCore<TUser extends AuthUserCore = AuthUserCore> {
  access_token: string;
  refresh_token: string;
  user: TUser;
}

export type BackofficeEventStatus = "PENDING" | "APPROVED" | "REJECTED";
export type PublicEventStatus = "live" | "sold_out" | "draft" | "upcoming";

export interface BackofficeTicketType {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sold: number;
}

export interface BackofficeEventMetrics {
  totalCapacity: number;
  totalSold: number;
  occupancyRate: number;
  grossRevenue: number;
  successfulPayments: number;
}

export interface BackofficeEventCore {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  location: string | null;
  tags: string[];
  date: string;
  status: BackofficeEventStatus;
  isActive: boolean;
  isFeatured?: boolean;
  categoryId: string | null;
  ownerId: string;
  metrics?: BackofficeEventMetrics;
}

export type BackofficeEventDetailCore<
  TEvent extends BackofficeEventCore = BackofficeEventCore,
  TTicketType extends BackofficeTicketType = BackofficeTicketType,
> = TEvent & { ticketTypes: TTicketType[] };

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

export type CancellationStatus = "REQUESTED" | "APPROVED" | "REJECTED";
export type RefundStatus = "NONE" | "PENDING" | "REFUNDED" | "FAILED";

export interface RefundTicketReference {
  id: string;
  ticketType: {
    name: string;
    price: number;
    event: { id: string; title: string };
  };
}

export interface RefundRequestCore {
  id: string;
  status: CancellationStatus;
  refundStatus: RefundStatus;
  reason: string | null;
  requestedAt: string;
  ticket: RefundTicketReference;
}

export interface PublicAuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  emailVerified: boolean;
  profileImageUrl: string | null;
}
