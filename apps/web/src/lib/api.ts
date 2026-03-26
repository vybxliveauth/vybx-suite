import { Event, TicketTier, TierName, PaginatedResponse } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3004";

// ─── HTTP Client ──────────────────────────────────────────────────────────────

function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(isMutating ? { "x-csrf-token": getCsrfToken() } : {}),
      ...init?.headers,
    },
    ...init,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message ?? `Request failed: ${res.status}`);
  }
  return res.json();
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

export function adaptEvent(raw: BackendEvent): Event {
  const tiers: TicketTier[] = raw.ticketTypes.map((tt) => ({
    id: tt.id,
    name: normalizeTierName(tt.name),
    description: tt.name,
    price: priceToCents(tt.price),
    currency: "DOP",
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
    imageUrl: raw.image ?? "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600&q=80",
    thumbnailUrl: raw.image ?? "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&q=80",
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
    organizerId: raw.ownerId ?? "unknown",
    createdAt: raw.createdAt,
    updatedAt: raw.createdAt,
  };
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
    return {
      data: items.map(adaptEvent),
      total: pagination.total,
      page: pagination.page,
      pageSize: pagination.limit,
      hasNextPage: pagination.page < pagination.totalPages,
    };
  }

  return {
    data: raw.data.map(adaptEvent),
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

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "USER" | "PROMOTER" | "ADMIN" | "SUPER_ADMIN";
  emailVerified: boolean;
  profileImageUrl: string | null;
}

interface BackendAuthUser {
  userId: string;
  email: string;
  role: AuthUser["role"];
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

function adaptAuthUser(raw: BackendAuthUser): AuthUser {
  return {
    id: raw.userId,
    email: raw.email,
    firstName: raw.firstName ?? "",
    lastName: raw.lastName ?? "",
    role: raw.role,
    // Login is blocked until verified on backend, and profile endpoint requires auth.
    emailVerified: true,
    profileImageUrl: raw.profileImageUrl ?? null,
  };
}

export async function login(payload: LoginPayload): Promise<AuthUser> {
  const res = await request<{ user: BackendAuthUser; success: boolean }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return adaptAuthUser(res.user);
}

export async function logout(): Promise<void> {
  await request("/auth/logout", { method: "POST" });
}

export async function fetchProfile(): Promise<AuthUser> {
  const raw = await request<BackendAuthUser>("/auth/profile");
  return adaptAuthUser(raw);
}

// ─── Generic HTTP helpers ──────────────────────────────────────────────────────
// Reuse the same request() client so CSRF, credentials, and error handling
// are consistent across all pages that need mutation helpers.

export const api = {
  get:    <T>(path: string)                 => request<T>(path, { method: "GET" }),
  post:   <T>(path: string, body?: unknown) => request<T>(path, { method: "POST",  body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch:  <T>(path: string, body: unknown)  => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string)                 => request<T>(path, { method: "DELETE" }),
};
