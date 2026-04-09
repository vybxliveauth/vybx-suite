// ─── Enums ────────────────────────────────────────────────────────────────────

import type { PublicEventStatus } from "@vybx/types";

export type EventStatus = PublicEventStatus;
export type TierName = "VIP" | "General" | "Premium" | "Student";
export type SeatStatus = "available" | "reserved" | "sold";

// ─── Venue ────────────────────────────────────────────────────────────────────

export interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  capacity: number;
  mapUrl?: string;
}

// ─── Ticket Tier ─────────────────────────────────────────────────────────────

export interface TicketTier {
  id: string;
  name: TierName;
  description: string;
  price: number; // in cents to avoid float issues
  currency: string;
  stock: number;
  maxPerOrder: number;
  benefits: string[];
}

// ─── Seat ─────────────────────────────────────────────────────────────────────

export interface Seat {
  id: string;
  row: string;
  number: number;
  tierId: string;
  status: SeatStatus;
}

// ─── Event ────────────────────────────────────────────────────────────────────

export interface Event {
  id: string; // UUID
  title: string;
  slug: string;
  description: string;
  imageUrl: string;
  thumbnailUrl: string;
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  doorsOpen: string; // ISO 8601
  venue: Venue;
  status: EventStatus;
  tiers: TicketTier[];
  tags: string[];
  category?: string | null;
  isFeatured?: boolean;
  isTrending?: boolean;
  trendingScore?: number;
  ticketsSold?: number;
  sellThroughRate?: number;
  organizerId: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Cart Item ────────────────────────────────────────────────────────────────

export interface CartItem {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  tierId: string;
  tierName: TierName;
  quantity: number;
  unitPrice: number; // in cents
  currency: string;
  seatIds?: string[]; // for assigned seating events
}

// ─── Checkout Session ─────────────────────────────────────────────────────────

export interface CheckoutSession {
  id: string; // UUID generated client-side
  items: CartItem[];
  subtotal: number; // in cents
  fees: number; // in cents
  total: number; // in cents
  currency: string;
  reservedAt: number; // timestamp ms — when the reservation started
  expiresAt: number; // timestamp ms — reservedAt + TTL (10 min default)
  isExpired: boolean;
}

// ─── Optimistic Seat Update ───────────────────────────────────────────────────

export interface OptimisticSeatUpdate {
  seatId: string;
  status: SeatStatus;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}
