import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { reportMobileError } from "../lib/observability";

export interface PublicEvent {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  location: string | null;
  date: string;
  status: string;
  isFeatured?: boolean;
  categoryId: string | null;
  ticketTypes?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    sold: number;
  }>;
}

interface EventsResponse {
  data: PublicEvent[];
  total: number;
  page: number;
  pageSize: number;
}

type BackendPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  nextCursor?: string | null;
};

type BackendTicketType = {
  id: string;
  name: string;
  price: number | string;
  quantity: number;
  sold: number;
};

type BackendEvent = {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  location: string | null;
  date: string;
  status: string;
  isFeatured?: boolean;
  categoryId: string | null;
  ticketTypes?: BackendTicketType[];
};

function toSafeNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function normalizePublicEvent(raw: BackendEvent): PublicEvent {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? null,
    image: raw.image ?? null,
    location: raw.location ?? null,
    date: raw.date,
    status: raw.status,
    isFeatured: Boolean(raw.isFeatured),
    categoryId: raw.categoryId ?? null,
    ticketTypes: (raw.ticketTypes ?? []).map((ticketType) => ({
      id: ticketType.id,
      name: ticketType.name,
      price: toSafeNumber(ticketType.price),
      quantity: ticketType.quantity,
      sold: ticketType.sold,
    })),
  };
}

export function useEvents(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["events", page, pageSize],
    queryFn: async () => {
      try {
        const response = await api.get<{
          data?: BackendEvent[];
          items?: BackendEvent[];
          total?: number;
          page?: number;
          pageSize?: number;
          pagination?: BackendPagination;
        }>(`/events?page=${page}&limit=${pageSize}`);

        const rawEvents = response.data ?? response.items ?? [];
        const resolvedPage = response.page ?? response.pagination?.page ?? page;
        const resolvedPageSize = response.pageSize ?? response.pagination?.limit ?? pageSize;
        const resolvedTotal = response.total ?? response.pagination?.total ?? rawEvents.length;

        return {
          data: rawEvents.map(normalizePublicEvent),
          total: resolvedTotal,
          page: resolvedPage,
          pageSize: resolvedPageSize,
        } satisfies EventsResponse;
      } catch (error) {
        reportMobileError(
          "mobile_events_load_failed",
          {
            endpoint: "/events",
            page,
            page_size: pageSize,
          },
          error,
        );
        throw error;
      }
    },
    staleTime: 1000 * 60 * 2, // 2 min
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      try {
        const response = await api.get<BackendEvent>(`/events/${id}`);
        return normalizePublicEvent(response);
      } catch (error) {
        reportMobileError(
          "mobile_event_detail_load_failed",
          { endpoint: "/events/:id", event_id: id },
          error,
        );
        throw error;
      }
    },
    enabled: Boolean(id),
  });
}
