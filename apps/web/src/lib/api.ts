import { Event, TicketTier, TierName, PaginatedResponse } from "@/types";
import {
  EVENT_IMAGE_FALLBACK,
  EVENT_IMAGE_THUMBNAIL_FALLBACK,
  normalizeEventImageUrl,
} from "@/lib/images";
import { createApiClient } from "@vybx/api-client";
import type { PublicAuthUser, UserRole } from "@vybx/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3004/api/v1";

// ─── HTTP Client ──────────────────────────────────────────────────────────────

const client = createApiClient({
  baseUrl: BASE_URL,
  retryOnUnauthorized: false,
});

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return client.request<T>(path, init);
}

// ─── Backend raw types ────────────────────────────────────────────────────────
// These reflect the actual shape the backend returns.

interface BackendTicketType {
  id: string;
  eventId: string;
  name: string;
  price: string; // decimal string e.g. "85.00"
  quantity: number;
  sold: number;
}

interface BackendCategory {
  id: string;
  name: string;
  icon: string;
}

interface BackendEvent {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  location: string | null;
  tags: string[];
  date: string; // ISO-8601
  isActive: boolean;
  isFeatured?: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
  categoryId: string | null;
  ownerId: string | null;
  createdAt: string;
  category?: BackendCategory | null;
  ticketTypes: BackendTicketType[];
}

interface LegacyBackendListResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

interface BackendPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface CurrentBackendListResponse<T> {
  items: T[];
  pagination: BackendPagination;
}

// ─── Adapters ─────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// Backend price is a whole number string ("1200") → parse directly
function priceToCents(price: string): number {
  return parseFloat(price);
}

// Best-effort tier name normalization
function normalizeTierName(name: string): TierName {
  const lower = name.toLowerCase();
  if (lower.includes("vip")) return "VIP";
  if (lower.includes("premium")) return "Premium";
  if (lower.includes("student") || lower.includes("estudiante")) return "Student";
  return "General";
}

function calculateTrendingMetrics(raw: BackendEvent) {
  const ticketsSold = raw.ticketTypes.reduce((sum, ticketType) => sum + ticketType.sold, 0);
  const totalInventory = raw.ticketTypes.reduce((sum, ticketType) => sum + ticketType.quantity, 0);
  const sellThroughRate = totalInventory > 0 ? ticketsSold / totalInventory : 0;

  const now = Date.now();
  const eventTime = new Date(raw.date).getTime();
  const daysUntilEvent = Math.ceil((eventTime - now) / (1000 * 60 * 60 * 24));

  // Hybrid signal:
  // - sales volume (ticketsSold)
  // - sell-through quality (ratio sold/quantity)
  // - near-term relevance (upcoming events get a mild boost)
  const volumeScore = ticketsSold * 1.6;
  const conversionScore = sellThroughRate * 140;
  const recencyScore = daysUntilEvent >= 0 ? Math.max(0, 30 - Math.min(30, daysUntilEvent)) : -20;
  const liveBoost = raw.isActive ? 5 : 0;

  const trendingScore = Math.round(volumeScore + conversionScore + recencyScore + liveBoost);

  return {
    ticketsSold,
    sellThroughRate,
    trendingScore,
  };
}

export function adaptEvent(raw: BackendEvent): Event {
  const trending = calculateTrendingMetrics(raw);
  const imageUrl = normalizeEventImageUrl(raw.image);
  const tiers: TicketTier[] = raw.ticketTypes.map((tt) => ({
    id: tt.id,
    name: normalizeTierName(tt.name),
    description: tt.name,
    price: priceToCents(tt.price),
    currency: "USD",
    stock: tt.quantity - tt.sold,
    maxPerOrder: 6,
    benefits: [],
  }));

  // Use a reserved delimiter so we can recover any backend ID shape (UUID, prefixed, cuid, etc).
  const slug = `${slugify(raw.title)}__${encodeURIComponent(raw.id)}`;

  return {
    id: raw.id,
    title: raw.title,
    slug,
    description: raw.description ?? "",
    imageUrl,
    thumbnailUrl:
      imageUrl === EVENT_IMAGE_FALLBACK
        ? EVENT_IMAGE_THUMBNAIL_FALLBACK
        : imageUrl,
    startDate: raw.date,
    endDate: raw.date,
    doorsOpen: raw.date,
    venue: {
      id: raw.id,
      name: raw.location ?? "Venue TBD",
      address: raw.location ?? "",
      city: raw.location?.split(",").at(-1)?.trim() ?? "",
      country: "DO",
      capacity: 0,
    },
    status: raw.isActive ? "live" : "upcoming",
    tiers,
    tags: raw.tags.length > 0 ? raw.tags : [raw.category?.name ?? "Event"],
    isFeatured: Boolean(raw.isFeatured),
    isTrending: trending.trendingScore > 0,
    trendingScore: trending.trendingScore,
    ticketsSold: trending.ticketsSold,
    sellThroughRate: trending.sellThroughRate,
    organizerId: raw.ownerId ?? "unknown",
    createdAt: raw.createdAt,
    updatedAt: raw.createdAt,
  };
}

function sortByFeaturedAndTrend(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    if (Boolean(a.isFeatured) !== Boolean(b.isFeatured)) {
      return a.isFeatured ? -1 : 1;
    }
    const trendDiff = (b.trendingScore ?? 0) - (a.trendingScore ?? 0);
    if (trendDiff !== 0) return trendDiff;
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function fetchEvents(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedResponse<Event>> {
  const query = new URLSearchParams({
    page: String(params?.page ?? 1),
    limit: String(params?.limit ?? 20),
  });
  if (params?.search) query.set("q", params.search);

  const raw = await request<
    LegacyBackendListResponse<BackendEvent> | CurrentBackendListResponse<BackendEvent>
  >(`/events?${query}`);

  // Current backend contract: { items, pagination }; keep legacy fallback for compatibility.
  if ("items" in raw && "pagination" in raw) {
    const { items, pagination } = raw;
    const data = sortByFeaturedAndTrend(items.map(adaptEvent));
    return {
      data,
      total: pagination.total,
      page: pagination.page,
      pageSize: pagination.limit,
      hasNextPage: pagination.page < pagination.totalPages,
    };
  }

  const data = sortByFeaturedAndTrend(raw.data.map(adaptEvent));
  return {
    data,
    total: raw.total,
    page: raw.page,
    pageSize: raw.limit,
    hasNextPage: raw.hasMore,
  };
}

export async function fetchEventById(id: string): Promise<Event> {
  const raw = await request<BackendEvent>(`/events/${id}`);
  return adaptEvent(raw);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export type AuthUser = PublicAuthUser & {
  marketingEmailOptIn?: boolean;
};

interface BackendAuthUser {
  userId: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  marketingEmailOptIn?: boolean;
}

function adaptAuthUser(raw: BackendAuthUser): AuthUser {
  return {
    id: raw.userId,
    email: raw.email,
    firstName: raw.firstName ?? "",
    lastName: raw.lastName ?? "",
    role: raw.role,
    emailVerified: true,
    profileImageUrl: raw.profileImageUrl ?? null,
    marketingEmailOptIn: raw.marketingEmailOptIn ?? true,
  };
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  turnstileToken: string;
}

export async function register(payload: RegisterPayload) {
  return request<{ success: boolean; needsVerification?: boolean; message?: string }>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export type LoginSuccessResponse = {
  success: true;
  user: AuthUser;
};

export type LoginTwoFactorChallengeResponse = {
  success: false;
  requiresTwoFactor: true;
  challengeId: string;
  expiresInSeconds: number;
  message?: string;
};

export type LoginResponse = LoginSuccessResponse | LoginTwoFactorChallengeResponse;

function isTwoFactorChallenge(
  value:
    | { user: BackendAuthUser; success?: boolean }
    | {
        success: false;
        requiresTwoFactor: true;
        challengeId: string;
        expiresInSeconds: number;
        message?: string;
      },
): value is {
  success: false;
  requiresTwoFactor: true;
  challengeId: string;
  expiresInSeconds: number;
  message?: string;
} {
  return "requiresTwoFactor" in value && value.requiresTwoFactor === true;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const res = await request<
    | { user: BackendAuthUser; success?: boolean }
    | {
        success: false;
        requiresTwoFactor: true;
        challengeId: string;
        expiresInSeconds: number;
        message?: string;
      }
  >(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  if (isTwoFactorChallenge(res)) {
    return {
      success: false,
      requiresTwoFactor: true,
      challengeId: res.challengeId,
      expiresInSeconds: res.expiresInSeconds,
      message: res.message,
    };
  }

  return {
    success: true,
    user: adaptAuthUser(res.user),
  };
}

export async function verifyLoginTwoFactor(payload: {
  challengeId: string;
  code: string;
}): Promise<AuthUser> {
  const res = await request<{ user: BackendAuthUser; success?: boolean }>(
    "/auth/login/2fa",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return adaptAuthUser(res.user);
}

export async function logout(): Promise<void> {
  await request("/auth/logout", { method: "POST" });
}

export async function refresh(): Promise<{ access_token: string }> {
  return request<{ access_token: string }>("/auth/refresh", { method: "POST" });
}

export async function fetchProfile(): Promise<AuthUser> {
  const raw = await request<BackendAuthUser>("/auth/profile");
  return adaptAuthUser(raw);
}

// ─── Categories ───────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  icon?: string;
}

export async function fetchCategories(): Promise<Category[]> {
  const categories = await request<Category[]>("/categories");
  return categories;
}

// ─── Checkout / Tickets ───────────────────────────────────────────────────────

export interface CreateIntentPayload {
  ticketTypeId: string;
  quantity: number;
  eventId: string;
  turnstileToken: string;
}

export interface CreateCartIntentItemPayload {
  ticketTypeId: string;
  quantity: number;
}

export interface CreateCartIntentPayload {
  eventId: string;
  items: CreateCartIntentItemPayload[];
  turnstileToken?: string;
}

export interface PaymentIntentResponse {
  provider: "STRIPE";
  reference: string;
  amount: number;
  currency: string;
  checkoutUrl: string;
  expiresAt: string;
}

export async function apiPaymentsCreateIntent(payload: CreateIntentPayload) {
  return request<PaymentIntentResponse>("/payments/create-intent", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiPaymentsCreateCartIntent(payload: CreateCartIntentPayload) {
  return request<PaymentIntentResponse>("/payments/create-cart-intent", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface MyTicket {
  id: string;
  [key: string]: unknown;
}

export async function apiMyTickets() {
  return request<MyTicket[]>("/tickets/my");
}

export interface JoinQueuePayload {
  eventId: string;
  turnstileToken?: string;
  deviceId?: string;
}

export interface QueueJoinResponse {
  queueEnabled: boolean;
  eventId: string;
  status?: "QUEUED" | "ADMITTED";
  position?: number;
  aheadOfYou?: number;
  activeSlots?: number;
  estimatedWaitSeconds?: number;
  queueToken?: string;
  expiresAt?: string;
  message?: string;
}

export async function apiPaymentsJoinQueue(payload: JoinQueuePayload) {
  const deviceId = payload.deviceId?.trim();
  const bodyPayload: JoinQueuePayload = {
    eventId: payload.eventId,
    ...(payload.turnstileToken ? { turnstileToken: payload.turnstileToken } : {}),
  };
  return request<QueueJoinResponse>("/payments/queue/join", {
    method: "POST",
    headers: deviceId ? { "x-device-id": deviceId } : undefined,
    body: JSON.stringify(bodyPayload),
  });
}

export interface IssueQueueTokenPayload {
  eventId: string;
  deviceId?: string;
}

export interface IssueQueueTokenResponse {
  queueEnabled: boolean;
  tokenRequired?: boolean;
  eventId: string;
  queueToken?: string;
  expiresAt?: string;
  message?: string;
}

export async function apiPaymentsIssueQueueToken(payload: IssueQueueTokenPayload) {
  const deviceId = payload.deviceId?.trim();
  const bodyPayload: IssueQueueTokenPayload = { eventId: payload.eventId };
  return request<IssueQueueTokenResponse>("/payments/queue/token", {
    method: "POST",
    headers: deviceId ? { "x-device-id": deviceId } : undefined,
    body: JSON.stringify(bodyPayload),
  });
}

export async function apiUpdateEmailPreferences(marketingEmailOptIn: boolean) {
  return request<{
    id: string;
    email: string;
    marketingEmailOptIn: boolean;
    marketingEmailOptOutAt?: string | null;
  }>("/users/me/email-preferences", {
    method: "PATCH",
    body: JSON.stringify({ marketingEmailOptIn }),
  });
}

export async function apiExportMyData() {
  return request<{
    generatedAt: string;
    data: unknown;
  }>("/users/me/export", {
    method: "GET",
  });
}

export async function apiDeleteMyAccount(payload: {
  currentPassword: string;
  reason?: string;
}) {
  return request<{ success: boolean; deletedAt?: string; alreadyDeleted?: boolean }>(
    "/users/me",
    {
      method: "DELETE",
      body: JSON.stringify(payload),
    },
  );
}

export async function apiUnsubscribeByToken(token: string) {
  return request<{ success: boolean; message?: string }>("/auth/unsubscribe", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

// ─── Generic HTTP helpers ─────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
